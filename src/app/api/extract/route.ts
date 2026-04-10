import { NextResponse } from "next/server";
import { extractSpeakers } from "@/lib/parseTranscript";
import { extractAllBeliefs } from "@/lib/extractBeliefs";
import { computeGapScore } from "@/lib/computeDivergence";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { transcript, decisionTopic, slackChannel } = await req.json();

    if (!transcript || !decisionTopic) {
      return NextResponse.json({ error: "Missing transcript or decisionTopic" }, { status: 400 });
    }
    
    // Pass slackChannel for reference
    console.log("Slack channel context:", slackChannel);

    const speakers = extractSpeakers(transcript);
    if (speakers.length === 0) {
      return NextResponse.json({ error: "No speakers could be identified from the transcript" }, { status: 400 });
    }

    // Extract beliefs for all speakers in a single batched API call to drastically save tokens and prevent rate limit warnings.
    const slackMessagesContext: Record<string, string> = {};
    for (const name of speakers) {
      // TODO (Phase 4): Fetch real slack messages for each speaker
      slackMessagesContext[name] = "";
    }

    const results = await extractAllBeliefs(
      transcript,
      speakers,
      slackMessagesContext,
      decisionTopic
    );

    // Compute Gap Score
    const confidences = results.map(r => r.extracted.confidence);
    const gapScore = computeGapScore(confidences);

    // Save to DB
    const session = await prisma.session.create({
      data: {
        decisionTopic,
        gapScore,
      }
    });

    for (const res of results) {
      const participant = await prisma.participant.create({
        data: {
          sessionId: session.id,
          name: res.name,
        }
      });

      await prisma.belief.create({
        data: {
          sessionId: session.id,
          participantId: participant.id,
          beliefStatement: res.extracted.belief_statement,
          confidence: res.extracted.confidence,
          reasoning: res.extracted.reasoning,
          keyQuotes: JSON.stringify(res.extracted.key_quotes),
          signalType: res.extracted.signal_type,
        }
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      gapScore,
      results
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
