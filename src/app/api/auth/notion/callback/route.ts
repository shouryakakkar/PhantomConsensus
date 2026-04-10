import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

declare global {
  // eslint-disable-next-line no-var
  var notionOauthStates: Map<string, { createdAt: number }> | undefined;
}

interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      id: string;
      name: string;
      person?: { email: string };
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('[Notion Callback] OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=notion_denied', appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=no_code', appUrl));
  }

  // Validate CSRF state
  const globalStates = globalThis.notionOauthStates;
  const stateData = globalStates?.get(returnedState ?? '');
  if (!stateData || Date.now() - stateData.createdAt > 10 * 60 * 1000) {
    console.error('[Notion Callback] Invalid or expired state');
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=invalid_state', appUrl));
  }
  globalStates?.delete(returnedState ?? '');

  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;
  const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/auth/notion/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=missing_credentials', appUrl));
  }

  try {
    // Exchange code for token (Notion uses Basic Auth)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Notion Callback] Token exchange failed:', err);
      return NextResponse.redirect(new URL('/?error=oauth_failed&reason=token_exchange', appUrl));
    }

    const tokens: NotionTokenResponse = await tokenRes.json();

    // Extract user info
    const notionUserId = tokens.owner?.user?.id || tokens.bot_id;
    const userName = tokens.owner?.user?.name || tokens.workspace_name || 'Notion User';
    const userEmail = tokens.owner?.user?.person?.email || `notion-${notionUserId}@${tokens.workspace_id}.notion`;

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

    // Upsert account
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: 'notion', providerAccountId: notionUserId } },
      update: { userId: user.id, access_token: tokens.access_token },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'notion',
        providerAccountId: notionUserId,
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        scope: 'read',
      },
    });

    // Trigger background sync
    let syncedSessionId: string | null = null;
    try {
      const syncRes = await fetch('http://localhost:3000/api/sync/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const syncData = await syncRes.json();
      console.log('[Notion Callback] Sync result:', syncData);
      if (syncRes.ok) syncedSessionId = syncData.sessionId ?? null;
    } catch (e) {
      console.error('[Notion Callback] Sync error (non-fatal):', e);
    }

    const highlightParam = syncedSessionId ? `&highlight=${syncedSessionId}` : '&warning=no_data';
    const redirectRes = NextResponse.redirect(new URL(`/?sync=success&provider=notion${highlightParam}`, appUrl));
    redirectRes.cookies.set('phantom_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      sameSite: 'lax',
    });
    return redirectRes;
  } catch (err) {
    console.error('[Notion Callback] Error:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed&reason=server_error', appUrl));
  }
}

