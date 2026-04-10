import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Global in-memory state store (matches route.ts)
declare global {
  // eslint-disable-next-line no-var
  var teamsOauthStates: Map<string, { createdAt: number }> | undefined;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle errors returned from Microsoft
  if (error) {
    console.error(`Teams OAuth Error: ${error} — ${errorDescription}`);
    return NextResponse.redirect(new URL(`/?error=oauth_failed&reason=${encodeURIComponent(error)}`, appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_code', appUrl));
  }

  const clientId = process.env.TEAMS_CLIENT_ID!;
  const clientSecret = process.env.TEAMS_CLIENT_SECRET!;
  const tenantId = process.env.TEAMS_TENANT_ID || 'common';
  const redirectUri = process.env.TEAMS_REDIRECT_URI || 'http://localhost:3000/api/auth/teams/callback';

  if (!clientId || !clientSecret) {
    console.error('TEAMS_CLIENT_ID or TEAMS_CLIENT_SECRET not set');
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=missing_credentials', appUrl));
  }

  try {
    // Step 1: Exchange authorization code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=token_exchange', appUrl));
    }

    const tokens: TokenResponse = await tokenRes.json();

    // Step 2: Get user info from Microsoft Graph
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      console.error('Graph /me failed:', err);
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=graph_user', appUrl));
    }

    const graphUser: GraphUser = await userRes.json();
    const userEmail = graphUser.mail ?? graphUser.userPrincipalName;

    // Step 3: Upsert user in database
    
    const cookieHeader = request.headers.get('cookie') || '';
    const existingUserIdMatch = cookieHeader.match(/phantom_user_id=([^;]+)/);
    const existingUserId = existingUserIdMatch ? existingUserIdMatch[1] : null;
    let user = null;
    
    if (existingUserId) {
      user = await prisma.user.findUnique({ where: { id: existingUserId } });
    }
    
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: { email: userEmail, name: graphUser.displayName },
      });
    }

    // Step 4: Upsert OAuth account record
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'microsoft-teams',
          providerAccountId: graphUser.id,
        },
      },
      update: { userId: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'microsoft-teams',
        providerAccountId: graphUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
      },
    });

    // Step 5: Run background sync to extract decisions from the last 7 days
    // Always use localhost:3000 for internal server-to-server API calls
    let syncedSessionId: string | null = null;
    try {
      const syncRes = await fetch(`${appUrl}/api/sync/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const syncData = await syncRes.json();
      console.log('[Teams Callback] Sync result:', syncData);
      if (syncRes.ok) {
        syncedSessionId = syncData.sessionId ?? null;
      } else {
        console.error('[Teams Callback] Sync failed:', syncData);
      }
    } catch (e) {
      console.error('[Teams Callback] Sync fetch error (non-fatal):', e);
    }

    const highlightParam = syncedSessionId ? `&highlight=${syncedSessionId}` : '&warning=no_data';
    const redirectRes = NextResponse.redirect(
      new URL(`/?sync=success&provider=teams${highlightParam}`, appUrl)
    );
    redirectRes.cookies.set('phantom_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
    });
    return redirectRes;
  } catch (err) {
    console.error('Teams OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=server_error', appUrl));
  }
}

