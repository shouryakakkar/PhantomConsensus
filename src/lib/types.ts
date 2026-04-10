// Shared types used both by sampleData and real API responses

export type SignalType =
  | "strong_agreement"
  | "soft_agreement"
  | "uncertain"
  | "disagreement";

export interface ParticipantBelief {
  participantName: string;
  role: string;
  beliefStatement: string;
  confidence: number;
  reasoning: string;
  keyQuotes: string[];
  signalType: SignalType;
  transcriptQuotes: string[];
  slackQuotes: string[];
}

export interface SessionData {
  decisionTopic: string;
  gapScore: number;
  beliefs: ParticipantBelief[];
}

// Shape returned by /api/session/[id]
export interface DbBelief {
  id: string;
  beliefStatement: string;
  confidence: number;
  reasoning: string;
  keyQuotes: string; // JSON-stringified string[]
  signalType: string;
}

export interface DbParticipant {
  id: string;
  name: string;
  role: string | null;
  beliefs: DbBelief[];
}

export interface DbSession {
  id: string;
  decisionTopic: string;
  gapScore: number | null;
  createdAt: string;
  source: string | null;
  participants: DbParticipant[];
}

/** Convert a DB session into the UI's SessionData format */
export function dbSessionToSessionData(db: DbSession): SessionData {
  const beliefs: ParticipantBelief[] = db.participants.map((p) => {
    const belief = p.beliefs[0]; // one belief per participant per session
    let keyQuotes: string[] = [];
    try { keyQuotes = JSON.parse(belief?.keyQuotes ?? "[]"); } catch { /* empty */ }
    return {
      participantName: p.name,
      role: p.role ?? "",
      beliefStatement: belief?.beliefStatement ?? "",
      confidence: belief?.confidence ?? 0,
      reasoning: belief?.reasoning ?? "",
      keyQuotes,
      signalType: (belief?.signalType as SignalType) ?? "uncertain",
      transcriptQuotes: keyQuotes, // key quotes serve as transcript evidence
      slackQuotes: [],
    };
  });

  return {
    decisionTopic: db.decisionTopic,
    gapScore: db.gapScore ?? 0,
    beliefs,
  };
}
