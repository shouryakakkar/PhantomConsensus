import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('[Slack Callback] OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=slack_denied', appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_code', appUrl));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/slack/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=missing_credentials', appUrl));
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('[Slack Callback] Token exchange failed:', tokenData.error);
      return NextResponse.redirect(new URL(`/?error=oauth_failed&reason=${tokenData.error}`, appUrl));
    }

    // CRITICAL: Use the USER token (authed_user.access_token) — not the bot token.
    // The user token lets us read channels the user is a member of.
    // The bot token only sees channels the bot has been explicitly invited to.
    const userToken = tokenData.authed_user?.access_token as string | undefined;
    const botToken = tokenData.access_token as string;
    const teamId = tokenData.team?.id as string;
    const teamName = tokenData.team?.name as string;
    const slackUserId = tokenData.authed_user?.id as string;

    // Prefer user token for channel access, fall back to bot token
    const primaryToken = userToken || botToken;

    // Resolve real user info using bot token (users.info works with bot token)
    let userEmail = `slack-${slackUserId}@${teamId}.slack`;
    let userName = teamName || 'Slack User';

    try {
      const userRes = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      });
      const userData = await userRes.json();
      if (userData.ok && userData.user) {
        userEmail = userData.user.profile?.email || userEmail;
        userName = userData.user.real_name || userData.user.name || userName;
      }
    } catch {
      console.warn('[Slack Callback] Could not fetch user info, using defaults');
    }

    // Upsert user in DB
    
    const cookieHeader = req.headers.get('cookie') || '';
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

    // Upsert account — store the primary token (user token if available)
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: 'slack', providerAccountId: slackUserId || teamId } },
      update: { userId: user.id, access_token: primaryToken, refresh_token: botToken, token_type: userToken ? 'user' : 'bearer' },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'slack',
        providerAccountId: slackUserId || teamId,
        access_token: primaryToken,
        refresh_token: botToken,
        token_type: userToken ? 'user' : 'bearer',
        scope: tokenData.authed_user?.scope || tokenData.scope || '',
      },
    });

    // Trigger background sync
    let syncedSessionId: string | null = null;
    try {
      const syncRes = await fetch(`${appUrl}/api/sync/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const syncData = await syncRes.json();
      console.log('[Slack Callback] Sync result:', syncData);
      if (syncRes.ok) {
        syncedSessionId = syncData.sessionId ?? null;
      } else {
        console.error('[Slack Callback] Sync failed:', syncData);
      }
    } catch (e) {
      console.error('[Slack Callback] Sync error (non-fatal):', e);
    }

    const highlightParam = syncedSessionId ? `&highlight=${syncedSessionId}` : '&warning=no_data';
    const redirectUrl = new URL(`/?sync=success&provider=slack${highlightParam}`, appUrl);

    const res = NextResponse.redirect(redirectUrl);
    // Set a user identity cookie so the home page can check connected providers on refresh
    res.cookies.set('phantom_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // needs to be readable by client-side fetch
      sameSite: 'lax',
    });
    return res;
  } catch (err) {
    console.error('[Slack Callback] Error:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=server_error', appUrl));
  }
}
