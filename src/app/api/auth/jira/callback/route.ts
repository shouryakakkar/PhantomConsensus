import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface JiraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface JiraResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
}

interface JiraUser {
  account_id: string;
  displayName: string;
  emailAddress?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('[Jira Callback] OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=jira_denied', appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_code', appUrl));
  }

  const clientId = process.env.JIRA_CLIENT_ID!;
  const clientSecret = process.env.JIRA_CLIENT_SECRET!;
  const redirectUri = process.env.JIRA_REDIRECT_URI || 'http://localhost:3000/api/auth/jira/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=missing_credentials', appUrl));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Jira Callback] Token exchange failed:', err);
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=token_exchange', appUrl));
    }

    const tokens: JiraTokenResponse = await tokenRes.json();

    // Get accessible Jira resources (cloud IDs)
    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    });

    if (!resourcesRes.ok) {
      console.error('[Jira Callback] Could not fetch accessible resources');
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_resources', appUrl));
    }

    const resources: JiraResource[] = await resourcesRes.json();
    if (resources.length === 0) {
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_jira_sites', appUrl));
    }

    // Use first available site
    const cloudId = resources[0].id;

    // Get current user info
    const userRes = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    });

    let jiraUser: JiraUser | null = null;
    if (userRes.ok) {
      jiraUser = await userRes.json();
    }

    const accountId = jiraUser?.account_id || `jira-${cloudId}`;
    const userName = jiraUser?.displayName || resources[0].name || 'Jira User';
    const userEmail = jiraUser?.emailAddress || `jira-${accountId}@${cloudId}.atlassian`;

    // Upsert user
    
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
      user = await prisma.user.create({ data: { email: userEmail, name: userName } });
    }

    // Upsert account — store cloudId in providerAccountId so sync can use it
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: 'jira', providerAccountId: cloudId } },
      update: { userId: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'jira',
        providerAccountId: cloudId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
      },
    });

    // Trigger background sync
    let syncedSessionId: string | null = null;
    try {
      const syncRes = await fetch(`${appUrl}/api/sync/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const syncData = await syncRes.json();
      console.log('[Jira Callback] Sync result:', syncData);
      if (syncRes.ok) syncedSessionId = syncData.sessionId ?? null;
    } catch (e) {
      console.error('[Jira Callback] Sync error (non-fatal):', e);
    }

    const highlightParam = syncedSessionId ? `&highlight=${syncedSessionId}` : '&warning=no_data';
    const redirectRes = NextResponse.redirect(new URL(`/?sync=success&provider=jira${highlightParam}`, appUrl));
    redirectRes.cookies.set('phantom_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'lax',
    });
    return redirectRes;
  } catch (err) {
    console.error('[Jira Callback] Error:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=server_error', appUrl));
  }
}

