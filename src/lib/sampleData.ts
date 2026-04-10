// Re-export types from central types file for backward compatibility
export type { SignalType, ParticipantBelief, SessionData } from "@/lib/types";
import type { SessionData } from "@/lib/types";

export const sampleSession: SessionData = {
  decisionTopic: "Q3 Launch Date",
  gapScore: 65,
  beliefs: [
    {
      participantName: "Alice",
      role: "Product Manager",
      beliefStatement: "The launch date is locked in for October 1st.",
      confidence: 95,
      reasoning: "She explicitly stated the date and initiated follow-up communications confirming it.",
      signalType: "strong_agreement",
      transcriptQuotes: [
        "So it's decided then, we're locking in October 1st for the public launch.",
      ],
      slackQuotes: [
        "Hey team, just updating the public roadmap to reflect the Oct 1st launch.",
      ],
      keyQuotes: ["locking in October 1st", "updating the public roadmap"],
    },
    {
      participantName: "Bob",
      role: "Engineering Lead",
      beliefStatement: "The launch is roughly October 1st, assuming scope remains flexible.",
      confidence: 55,
      reasoning: "He agreed to the date but with caveats about the current feature scope and timeline risks.",
      signalType: "soft_agreement",
      transcriptQuotes: [
        "I can commit to October 1st if we drop the reporting dashboard. Otherwise it's tight.",
      ],
      slackQuotes: [
        "We're aiming for Oct 1st, but let's review the remaining tickets on Friday before promising marketing.",
      ],
      keyQuotes: ["I can commit... if we drop", "aiming for Oct 1st, but let's review"],
    },
    {
      participantName: "Charlie",
      role: "Designer",
      beliefStatement: "There is another sync to finalize the launch date on Friday.",
      confidence: 30,
      reasoning: "He clearly believes the decision was deferred pending further asset reviews.",
      signalType: "uncertain",
      transcriptQuotes: [
        "I still need to review the final marketing assets. I thought we were deciding this on Friday?",
      ],
      slackQuotes: [
        "Can someone send over the designs we need to review for the launch date meeting this Friday?",
      ],
      keyQuotes: ["I thought we were deciding this on Friday", "launch date meeting this Friday"],
    },
    {
      participantName: "Dave",
      role: "CEO",
      beliefStatement: "The launch happens in Q3, specifically focusing on the enterprise tier.",
      confidence: 80,
      reasoning: "He believes the date is set but is more focused on segment deliverables rather than the specific day.",
      signalType: "strong_agreement",
      transcriptQuotes: [
        "As long as we hit Q3 with the enterprise tier, I'm happy. Make it happen.",
      ],
      slackQuotes: [
        "Excited for the enterprise rollout next month. Good work.",
      ],
      keyQuotes: ["hit Q3", "enterprise rollout next month"],
    },
  ],
};
