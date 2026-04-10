import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractAllBeliefs } from '@/lib/extractBeliefs';

interface NotionBlock {
  type: string;
  paragraph?: { rich_text: { plain_text: string }[] };
  heading_1?: { rich_text: { plain_text: string }[] };
  heading_2?: { rich_text: { plain_text: string }[] };
  heading_3?: { rich_text: { plain_text: string }[] };
  bulleted_list_item?: { rich_text: { plain_text: string }[] };
  numbered_list_item?: { rich_text: { plain_text: string }[] };
  callout?: { rich_text: { plain_text: string }[] };
  quote?: { rich_text: { plain_text: string }[] };
}

interface NotionPage {
  id: string;
  last_edited_time: string;
  properties: Record<string, {
    type: string;
    title?: { plain_text: string }[];
    rich_text?: { plain_text: string }[];
  }>;
  url: string;
}


function extractBlockText(block: NotionBlock): string {
  const richTextSources = [
    block.paragraph?.rich_text,
    block.heading_1?.rich_text,
    block.heading_2?.rich_text,
    block.heading_3?.rich_text,
    block.bulleted_list_item?.rich_text,
    block.numbered_list_item?.rich_text,
    block.callout?.rich_text,
    block.quote?.rich_text,
  ];
  for (const richText of richTextSources) {
    if (richText && richText.length > 0) {
      return richText.map((r: { plain_text: string }) => r.plain_text).join('');
    }
  }
  return '';
}

async function searchRecentPages(token: string): Promise<NotionPage[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 20,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion search failed: ${err}`);
  }

  const data = await res.json();
  const pages = data.results as NotionPage[];
  // Filter to pages edited in the last 7 days
  return pages.filter(p => new Date(p.last_edited_time) >= new Date(sevenDaysAgo));
}

async function fetchPageText(token: string, pageId: string): Promise<string> {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!res.ok) return '';
  const data = await res.json();
  const blocks = data.results as NotionBlock[];
  return blocks.map(extractBlockText).filter(t => t.length > 0).join('\n');
}

function getPageTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title' && prop.title && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text).join('');
    }
  }
  return 'Untitled Page';
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { userId, provider: 'notion' },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Notion account not linked' }, { status: 404 });
    }

    const token = account.access_token;

    // 1. Search for recently edited pages
    const pages = await searchRecentPages(token);
    console.log(`[Notion Sync] Found ${pages.length} recently edited pages`);

    if (pages.length === 0) {
      return NextResponse.json({ message: 'No recently edited pages found', sessionId: null });
    }

    // 2. Fetch content of each page and build a transcript
    const pageContents: { title: string; text: string }[] = [];
    for (const page of pages.slice(0, 10)) {
      const title = getPageTitle(page);
      const text = await fetchPageText(token, page.id);
      if (text.length > 20) {
        pageContents.push({ title, text });
      }
    }

    if (pageContents.length === 0) {
      return NextResponse.json({ message: 'No readable page content found', sessionId: null });
    }

    // 3. Build transcript
    const fullTranscript = pageContents
      .map(p => `[${p.title}]:\n${p.text}`)
      .join('\n\n');

    if (fullTranscript.trim().length < 100) {
      return NextResponse.json({ message: 'Not enough readable content found in recent pages', sessionId: null });
    }

    // 4. Use page titles as participant proxies (decisions often logged by page owner)
    const participantNames = pageContents.map(p => p.title).slice(0, 8);

    // 5. Extract decision topic
    const topicPrompt = `Based on the following Notion pages edited in the last 7 days, identify the single most significant decision or action item. Respond with ONLY a short topic (10 words max, no punctuation):\n\n${fullTranscript.slice(0, 4000)}`;

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

    // 6. Extract beliefs
    const beliefs = await extractAllBeliefs(
      fullTranscript.slice(0, 8000),
      participantNames,
      {},
      decisionTopic
    );

    // 7. Gap score
    const confidences = beliefs.map(b => b.extracted.confidence);
    const maxConf = Math.max(...confidences);
    const minConf = Math.min(...confidences);
    const gapScore = confidences.length > 1 ? (maxConf - minConf) / 100 : 0.5;

    // 8. Save to DB
    const session = await prisma.session.create({
      data: { decisionTopic, gapScore, source: 'notion' },
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

    console.log(`[Notion Sync] Extracted "${decisionTopic}" from ${pageContents.length} pages. Session: ${session.id}`);
    return NextResponse.json({ success: true, sessionId: session.id, topic: decisionTopic });
  } catch (error) {
    console.error('[Notion Sync] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
