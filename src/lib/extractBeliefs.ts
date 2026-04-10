export type ExtractedBelief = {
  belief_statement: string;
  confidence: number;
  reasoning: string;
  key_quotes: string[];
  signal_type: "strong_agreement" | "soft_agreement" | "uncertain" | "disagreement";
};

export type ParticipantExtraction = {
  name: string;
  extracted: ExtractedBelief;
};

export async function extractAllBeliefs(
  transcript: string,
  participants: string[],
  slackMessagesContext: { [name: string]: string },
  decisionTopic: string
): Promise<ParticipantExtraction[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in your environment.");
  }

  const systemPrompt = `
You are an expert at reading organizational communication to detect what 
people truly believe vs what they said in a meeting. You look for signals in 
language that reveal actual conviction levels.

Analyze EACH participant's understanding simultaneously. Return ONLY a valid JSON object with a single "participants" array, following this exact schema:
{
  "participants": [
    {
      "name": "participant name",
      "extracted": {
        "belief_statement": "one sentence describing what they believe was decided",
        "confidence": <number between 0 and 100>,
        "reasoning": "why you scored it this way based on their language",
        "key_quotes": ["quote1", "quote2"],
        "signal_type": "strong_agreement" | "soft_agreement" | "uncertain" | "disagreement"
      }
    }
  ]
}

For the "signal_type", you MUST use one of the exact 4 string options provided in the schema above.

Look for:
- Do they refer to the decision as settled or still open?
- Do their follow-up actions assume the decision is made?
- Do they hedge ("I think we said...", "assuming that means...")?
- Do they re-raise the topic as if unresolved?`;

  const userPrompt = `
Meeting transcript:
${transcript}

The decision being tracked: "${decisionTopic}"
Participants to analyze: ${participants.join(", ")}
`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) throw new Error("Empty response from Groq API");

  const parsed = JSON.parse(content);
  const extractedParticipants = parsed.participants as ParticipantExtraction[];

  // Sanitize LLM typings (Llama-3 sometimes outputs strings for numbers or stringifies inner arrays)
  for (const p of extractedParticipants) {
    if (typeof p.extracted.confidence === "string") {
      p.extracted.confidence = parseInt(p.extracted.confidence, 10);
    }
    if (isNaN(p.extracted.confidence) || typeof p.extracted.confidence !== "number") {
      p.extracted.confidence = 50; // default fallback
    }

    if (typeof p.extracted.key_quotes === "string") {
      try {
        p.extracted.key_quotes = JSON.parse(p.extracted.key_quotes);
      } catch (e) {
        p.extracted.key_quotes = [p.extracted.key_quotes as unknown as string];
      }
    }
  }

  return extractedParticipants;
}
