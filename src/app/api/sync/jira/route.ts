import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractAllBeliefs } from '@/lib/extractBeliefs';

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: {
      content?: {
        type: string;
        content?: { text?: string }[];
      }[];
    } | null;
    assignee?: { displayName: string; emailAddress?: string } | null;
    reporter?: { displayName: string; emailAddress?: string } | null;
    updated: string;
    status: { name: string };
    comment?: {
      comments: {
        author: { displayName: string };
        body: {
          content?: { content?: { text?: string }[] }[];
        };
        created: string;
      }[];
    };
  };
}

function looksLikeDecision(text: string): boolean {
  const keywords = [
    'decided', 'decision', 'approve', 'approved', 'confirmed', 'resolved',
    'closed', 'won\'t fix', 'done', 'accepted', 'rejected', 'blocked',
    'priority', 'milestone', 'release', 'launch', 'ship', 'deadline',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Extract plain text from Atlassian Document Format (ADF)
function adfToText(adf: JiraIssue['fields']['description']): string {
  if (!adf || !adf.content) return '';
  const texts: string[] = [];
  for (const block of adf.content) {
    if (block.content) {
      for (const inline of block.content) {
        if (inline.text) texts.push(inline.text);
      }
    }
  }
  return texts.join(' ').trim();
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { userId, provider: 'jira' },
    });

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Jira account not linked' }, { status: 404 });
    }

    const cloudId = account.providerAccountId;
    const token = account.access_token;

    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    let headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    // 1. Search for recently updated issues (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
    const jqlQuery = `updated >= "${sevenDaysAgo}" ORDER BY updated DESC`;

    let searchRes = await fetch(
      `${baseUrl}/search/jql`,
      { 
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jql: jqlQuery,
          maxResults: 30,
          fields: ['summary', 'description', 'assignee', 'reporter', 'updated', 'status', 'comment']
        })
      }
    );

    // Auto-refresh token if 401 Unauthorized
    if (searchRes.status === 401 && account.refresh_token && process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET) {
      console.log('[Jira Sync] Token expired (401). Attempting to refresh...');
      const refreshRes = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.JIRA_CLIENT_ID,
          client_secret: process.env.JIRA_CLIENT_SECRET,
          refresh_token: account.refresh_token,
        }),
      });

      if (refreshRes.ok) {
        const newTokens = await refreshRes.json();
        // Update DB
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || account.refresh_token,
          },
        });
        console.log('[Jira Sync] Token refreshed successfully. Retrying...');
        
        headers = { Authorization: `Bearer ${newTokens.access_token}`, Accept: 'application/json' };
        searchRes = await fetch(
          `${baseUrl}/search/jql`,
          { 
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jql: jqlQuery,
              maxResults: 30,
              fields: ['summary', 'description', 'assignee', 'reporter', 'updated', 'status', 'comment']
            })
          }
        );
      } else {
        console.error('[Jira Sync] Token refresh failed:', await refreshRes.text());
      }
    }

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('[Jira Sync] Search failed:', err);
      return NextResponse.json({ error: `Jira search failed: ${err}` }, { status: 500 });
    }

    const searchData = await searchRes.json();
    const issues: JiraIssue[] = searchData.issues || [];
    console.log(`[Jira Sync] Found ${issues.length} recently updated issues`);

    if (issues.length === 0) {
      return NextResponse.json({ message: 'No recently updated issues found', sessionId: null });
    }

    // 2. Build messages from issues + comments
    const messages: { speaker: string; text: string; issue: string }[] = [];

    for (const issue of issues.slice(0, 20)) {
      const descText = adfToText(issue.fields.description);
      const issueKey = issue.key;
      const summary = issue.fields.summary;

      if (issue.fields.reporter && (summary || descText)) {
        messages.push({
          speaker: issue.fields.reporter.displayName,
          text: `[${issue.fields.status?.name}] ${summary}${descText ? ': ' + descText.slice(0, 300) : ''}`,
          issue: issueKey,
        });
      }

      // Add comments
      for (const comment of issue.fields.comment?.comments || []) {
        const commentBody = comment.body?.content
          ?.flatMap(b => b.content || [])
          .map(c => c.text || '')
          .join(' ')
          .trim();

        if (commentBody && commentBody.length > 5) {
          messages.push({
            speaker: comment.author.displayName,
            text: commentBody.slice(0, 400),
            issue: issueKey,
          });
        }
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ message: 'No readable content in issues', sessionId: null });
    }

    // 3. Build transcript
    const fullTranscript = messages
      .map(m => `[${m.issue}] ${m.speaker}: ${m.text}`)
      .join('\n');

    if (!looksLikeDecision(fullTranscript)) {
      return NextResponse.json({ message: 'No decision signals detected in recent issues', sessionId: null });
    }

    // 4. Unique participants
    const participantNames = Array.from(new Set(messages.map(m => m.speaker)));

    // 5. Extract decision topic
    const topicPrompt = `Based on these Jira issue updates from the last 7 days, identify the single most significant decision the team is making or has made. Respond with ONLY a short topic (10 words max, no punctuation):\n\n${fullTranscript.slice(0, 4000)}`;

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

    console.log(`[Jira Sync] Extracted "${decisionTopic}" from ${messages.length} messages across ${issues.length} issues. Session: ${session.id}`);
    return NextResponse.json({ success: true, sessionId: session.id, topic: decisionTopic });
  } catch (error) {
    console.error('[Jira Sync] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
