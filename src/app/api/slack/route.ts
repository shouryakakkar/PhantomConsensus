import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI || "http://localhost:3000/api/slack/callback";
  
  if (!clientId) {
    return NextResponse.json({ error: "Missing SLACK_CLIENT_ID configuration" }, { status: 500 });
  }

  // Bot scopes (for users.list and users.info)
  const botScopes = [
    "users:read",
    "users:read.email",
    "channels:read",
  ].join(",");

  // User scopes — these allow reading channels/DMs the actual user belongs to
  const userScopes = [
    "channels:history",
    "groups:history",
    "im:history",
    "mpim:history",
    "channels:read",
    "groups:read",
    "users:read"
  ].join(",");

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${botScopes}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
