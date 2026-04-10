import { NextResponse } from 'next/server';
import crypto from 'crypto';

declare global {
  // eslint-disable-next-line no-var
  var jiraOauthStates: Map<string, { createdAt: number }> | undefined;
}

export async function GET() {
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = process.env.JIRA_REDIRECT_URI || 'http://localhost:3000/api/auth/jira/callback';

  if (!clientId) {
    return NextResponse.json({ error: 'JIRA_CLIENT_ID not set' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');

  globalThis.jiraOauthStates = globalThis.jiraOauthStates || new Map();
  globalThis.jiraOauthStates.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: 'read:jira-work read:jira-user offline_access',
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://auth.atlassian.com/authorize?${params.toString()}`);
}
