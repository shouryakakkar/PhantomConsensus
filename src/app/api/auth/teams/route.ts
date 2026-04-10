import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Global in-memory state store (use Redis/DB for production)
declare global {
  // eslint-disable-next-line no-var
  var teamsOauthStates: Map<string, { createdAt: number }> | undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loginHint = searchParams.get('login_hint') ?? undefined;

  const clientId = process.env.TEAMS_CLIENT_ID;
  const tenantId = process.env.TEAMS_TENANT_ID || 'common';
  const redirectUri = process.env.TEAMS_REDIRECT_URI || 'http://localhost:3000/api/auth/teams/callback';

  if (!clientId) {
    return NextResponse.json(
      { error: 'TEAMS_CLIENT_ID is not set. Please follow the Azure AD setup guide to register your app.' },
      { status: 500 }
    );
  }

  // Generate a CSRF state token to validate the callback
  const state = crypto.randomBytes(16).toString('hex');

  // Build the Microsoft Identity Platform authorization URL
  const scopes = [
    'offline_access',
    'User.Read',
    'Chat.Read',
    'ChannelMessage.Read.All',
  ].join(' ');

  const oauthParams: Record<string, string> = {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes,
    state,
  };

  // Pre-fill the email on the Microsoft sign-in page if provided
  if (loginHint) {
    oauthParams.login_hint = loginHint;
  }

  const params = new URLSearchParams(oauthParams);
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

  // Store state in global memory (valid for 10 min) - more reliable than cookies for OAuth
  globalThis.teamsOauthStates = globalThis.teamsOauthStates || new Map();
  globalThis.teamsOauthStates.set(state, { createdAt: Date.now() });

  return NextResponse.redirect(authUrl);
}
