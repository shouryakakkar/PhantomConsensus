import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractAllBeliefs } from '@/lib/extractBeliefs';

interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  type: string;
  subtype?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

interface SlackUser {
  id: string;
  real_name?: string;
  name: string;
  is_bot?: boolean;
}

// Decision signal heuristic
function looksLikeDecision(text: string): boolean {
  const keywords = [
    'decided', 'decision', 'agree', 'approved', 'confirmed', 'going with',
    'lock', 'finalized', 'moving forward', "let's do", 'we will', 'plan is',
    'ship', 'deadline', 'launch', 'milestone', 'resolved', 'closing',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Fetch joined public channels
async function fetchChannels(token: string): Promise<SlackChannel[]> {
  const res = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50&exclude_archived=true',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack conversations.list failed: ${data.error}`);
  return (data.channels as SlackChannel[]).filter(c => c.is_member);
}

// Fetch recent messages from a channel (last 7 days)
async function fetchChannelMessages(token: string, channelId: string): Promise<SlackMessage[]> {
  const oldest = (Math.floor(Date.now() / 1000) - 7 * 86400).toString();
  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!data.ok) {
    console.warn(`[Slack Sync] conversations.history failed for ${channelId}: ${data.error}`);
    return [];
  }
  return (data.messages as SlackMessage[]).filter(
    m => m.type === 'message' && !m.subtype && m.text?.length > 5
  );
}

// Resolve user IDs → real names
async function fetchUserMap(token: string): Promise<Map<string, string>> {
  const res = await fetch('https://slack.com/api/users.list?limit=200', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  const data = await res.json();
  console.log(`[fetchUserMap] Response ok: ${data.ok}. Missing scopes? ${data.needed || data.error}`);
  const map = new Map<string, string>();
  if (data.ok) {
    for (const user of data.members as SlackUser[]) {
      if (!user.is_bot) {
        map.set(user.id, user.real_name || user.name);
      }
    }
  }
  return map;
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get stored Slack token from DB
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'slack' },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Slack account not linked or token missing' }, { status: 404 });
    }

    const token = account.access_token;
    // botToken is safely stored in refresh_token. Fallback to access_token if empty.
    let botToken = account.refresh_token;

    // Intelligent Fallback: If this user lacks a botToken (legacy connection),
    // grab ANY active botToken from the database to resolve the workspace directory!
    if (!botToken) {
      const globalBotAccount = await prisma.account.findFirst({
        where: { provider: 'slack', refresh_token: { not: null } },
      });
      botToken = globalBotAccount?.refresh_token || token;
    }

    // 1. Fetch user map for name resolution using the botToken (which has `users:read` scope)
    const userMap = await fetchUserMap(botToken);
    console.log('[Slack Sync] User map keys:', Array.from(userMap.keys()));

    // 2. Fetch joined channels using the userToken
    const channels = await fetchChannels(token);
    console.log(`[Slack Sync] Found ${channels.length} joined channels`);

    if (channels.length === 0) {
      return NextResponse.json({ message: 'No joined channels found', sessionId: null });
    }

    // 3. Fetch messages from up to 10 channels
    const allMessages: { speaker: string; text: string; channel: string }[] = [];

    for (const channel of channels.slice(0, 10)) {
      const messages = await fetchChannelMessages(token, channel.id);
      for (const msg of messages) {
        const speaker = userMap.get(msg.user) || msg.user || 'Unknown';
        allMessages.push({ speaker, text: msg.text, channel: channel.name });
      }
    }

    if (allMessages.length === 0) {
      return NextResponse.json({ message: 'No messages found in the last 7 days', sessionId: null });
    }

    // 4. Build transcript
    const fullTranscript = allMessages
      .map(m => `[#${m.channel}] ${m.speaker}: ${m.text}`)
      .join('\n');

    // 5. Check for decision signals
    if (!looksLikeDecision(fullTranscript)) {
      return NextResponse.json({ message: 'No decision signals detected in the last 7 days', sessionId: null });
    }

    // 6. Extract participants
    const participantNames = Array.from(new Set(allMessages.map(m => m.speaker)));

    // 7. Extract decision topic via Groq
    const topicPrompt = `Based on these Slack messages from the last 7 days, identify the single most significant decision the team is making or has made. Respond with ONLY a short decision topic (10 words max, no punctuation):\n\n${fullTranscript.slice(0, 4000)}`;

    const topicRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: topicPrompt }],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    let decisionTopic = 'Key Team Decision';
    if (topicRes.ok) {
      const topicData = await topicRes.json();
      decisionTopic = topicData.choices[0]?.message?.content?.trim() || decisionTopic;
    }

    // 8. Extract beliefs
    const beliefs = await extractAllBeliefs(
      fullTranscript.slice(0, 8000),
      participantNames,
      {},
      decisionTopic
    );

    // 9. Calculate gap score
    const confidences = beliefs.map(b => b.extracted.confidence);
    const maxConf = Math.max(...confidences);
    const minConf = Math.min(...confidences);
    const gapScore = confidences.length > 1 ? (maxConf - minConf) / 100 : 0.5;

    // 10. Save to DB
    const session = await prisma.session.create({
      data: { decisionTopic, gapScore },
    });

    for (const b of beliefs) {
      const participant = await prisma.participant.create({
        data: { sessionId: session.id, name: b.name },
      });
      await prisma.belief.create({
        data: {
          participantId: participant.id,
          sessionId: session.id,
          beliefStatement: b.extracted.belief_statement,
          confidence: b.extracted.confidence,
          reasoning: b.extracted.reasoning,
          keyQuotes: JSON.stringify(b.extracted.key_quotes),
          signalType: b.extracted.signal_type,
        },
      });
    }

    console.log(`[Slack Sync] Extracted "${decisionTopic}" from ${allMessages.length} messages. Session: ${session.id}`);
    return NextResponse.json({ success: true, sessionId: session.id, topic: decisionTopic });
  } catch (error) {
    console.error('[Slack Sync] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
