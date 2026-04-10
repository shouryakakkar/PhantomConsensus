import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractAllBeliefs } from '@/lib/extractBeliefs';

interface GraphChat {
  id: string;
  topic: string | null;
  chatType: string;
}

interface GraphMessage {
  id: string;
  from?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  createdDateTime: string;
}

interface ChatWithMessages {
  chatId: string;
  topic: string;
  messages: GraphMessage[];
}

// Strips HTML tags from Teams message content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Heuristic: check if a conversation thread likely contains a decision
function looksLikeDecision(text: string): boolean {
  const keywords = [
    'decided', 'decision', 'agree', 'approved', 'confirmed', 'going with',
    'lock', 'finalized', 'moving forward', 'let\'s do', 'we will', 'plan is',
    'ship', 'deadline', 'launch', 'milestone',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Fetch all chats for the user from Graph API
async function fetchChats(accessToken: string): Promise<GraphChat[]> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/chats?$top=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.warn(`[Teams Sync] Graph /me/chats failed: ${err}`);
    if (err.includes('No authorization information present on the request') || err.includes('Forbidden')) {
      throw new Error('TEAMS_CONSUMER_ACCOUNT');
    }
    return [];
  }
  
  const data = await res.json();
  return data.value ?? [];
}

// Fetch messages from a specific chat (last 50, sorted by newest first)
async function fetchRecentMessages(accessToken: string, chatId: string): Promise<GraphMessage[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  // Note: $filter on createdDateTime requires specific delegated permissions in some tenants
  // so we fetch top 50 sorted by date and filter client-side instead
  const url = `https://graph.microsoft.com/v1.0/me/chats/${chatId}/messages?$top=50&$orderby=createdDateTime%20desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Teams Sync] Could not fetch messages for chat ${chatId}:`, errText);
    // Some chat types may not support message listing — skip gracefully
    return [];
  }

  const data = await res.json();
  const messages = (data.value ?? []) as GraphMessage[];

  // Filter to last 7 days in-code
  return messages.filter(
    (m) => new Date(m.createdDateTime).getTime() >= since.getTime()
  );
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get the stored access token for this user from DB
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'microsoft-teams' },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Teams account not linked or token missing' }, { status: 404 });
    }
    const accessToken = account.access_token;

    let chats = [];
    try {
      // 1. Fetch the user's chats from Graph API
      chats = await fetchChats(accessToken);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'TEAMS_CONSUMER_ACCOUNT') {
        return NextResponse.json(
          { error: 'Microsoft Teams analysis requires a Work or School account. Personal accounts (@outlook.com) are not supported by the Microsoft Graph Chat API.' },
          { status: 403 }
        );
      }
      throw err;
    }

    // 2. For each chat, fetch messages from last 7 days
    const chatData: ChatWithMessages[] = [];
    for (const chat of chats.slice(0, 10)) { // limit to 10 chats to stay within rate limits
      const messages = await fetchRecentMessages(accessToken, chat.id);
      if (messages.length > 0) {
        chatData.push({
          chatId: chat.id,
          topic: chat.topic ?? `Chat ${chat.chatType}`,
          messages,
        });
      }
    }

    if (chatData.length === 0) {
      return NextResponse.json({ message: 'No recent chat activity found in the last 7 days', sessionId: null });
    }

    // 3. Build a unified transcript from all messages and filter for decision-heavy threads
    const allMessages = chatData.flatMap(c =>
      c.messages
        .filter(m => m.from?.user && (m.body.contentType === 'html' || m.body.contentType === 'text'))
        .map(m => ({
          speaker: m.from!.user!.displayName,
          // Strip HTML for html messages, use raw text for text messages
          text: m.body.contentType === 'html' ? stripHtml(m.body.content) : m.body.content.trim(),
          chat: c.topic,
        }))
        .filter(m => m.text.length > 5)
    );

    if (allMessages.length === 0) {
      return NextResponse.json({ message: 'No readable messages found', sessionId: null });
    }

    // 4. Build a flat transcript string
    const fullTranscript = allMessages
      .map(m => `[${m.chat}] ${m.speaker}: ${m.text}`)
      .join('\n');

    // 5. Check if there's anything worth analyzing
    if (!looksLikeDecision(fullTranscript)) {
      return NextResponse.json({ message: 'No decision signals detected in the last 7 days', sessionId: null });
    }

    // 6. Extract unique participant names
    const participantNames = Array.from(new Set(allMessages.map(m => m.speaker)));

    // 7. Use Groq/Llama to extract decision topic and beliefs
    // First pass: extract the most significant decision topic from the messages
    const topicPrompt = `Based on the following Teams chat messages from the last 7 days, identify the single most significant decision the team is making or has made. Respond with ONLY a short decision topic (10 words max, no punctuation):\n\n${fullTranscript.slice(0, 4000)}`;

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

    // 8. Run the existing belief extraction logic across all participants
    const beliefs = await extractAllBeliefs(
      fullTranscript.slice(0, 8000), // keep within context limits
      participantNames,
      {}, // no separate Slack context needed — Teams is the source
      decisionTopic
    );

    // 9. Calculate gap score: spread of confidence levels, normalized
    const confidences = beliefs.map(b => b.extracted.confidence);
    const maxConf = Math.max(...confidences);
    const minConf = Math.min(...confidences);
    const gapScore = confidences.length > 1 ? (maxConf - minConf) / 100 : 0.5;

    // 10. Save to database
    const session = await prisma.session.create({
      data: { decisionTopic, gapScore, source: 'teams' },
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

    console.log(`[Teams Sync] Extracted "${decisionTopic}" from ${allMessages.length} messages across ${chatData.length} chats. Session: ${session.id}`);

    return NextResponse.json({ success: true, sessionId: session.id, topic: decisionTopic });
  } catch (error) {
    console.error('Teams Sync Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
