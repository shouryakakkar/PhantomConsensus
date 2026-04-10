import { NextResponse } from 'next/server';
import crypto from 'crypto';

declare global {
  // eslint-disable-next-line no-var
  var notionOauthStates: Map<string, { createdAt: number }> | undefined;
}

export async function GET() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/auth/notion/callback';

  if (!clientId) {
    return NextResponse.json({ error: 'NOTION_CLIENT_ID not set' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');

  globalThis.notionOauthStates = globalThis.notionOauthStates || new Map();
  globalThis.notionOauthStates.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
    state,
  });

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params.toString()}`);
}
