"use client";

import { useState } from "react";
import { MessageSquare, Mic, ChevronDown, ChevronRight } from "lucide-react";
import { ParticipantBelief } from "@/lib/types";
import { EvidencePanel } from "./EvidencePanel";

function confidenceColor(c: number) {
  if (c >= 80) return { bar: "from-emerald-400 to-green-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20 dark:bg-emerald-500/10", border: "border-emerald-500/30 dark:border-emerald-500/20", glow: "shadow-emerald-500/20" };
  if (c >= 50) return { bar: "from-amber-400 to-orange-400", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/20 dark:bg-amber-500/10", border: "border-amber-500/30 dark:border-amber-500/20", glow: "shadow-amber-500/20" };
  return { bar: "from-rose-500 to-red-400", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/20 dark:bg-rose-500/10", border: "border-rose-500/30 dark:border-rose-500/20", glow: "shadow-rose-500/20" };
}

const signalLabel: Record<string, { label: string; color: string }> = {
  strong_agreement: { label: "Strong Agreement", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 dark:bg-emerald-500/10 border-emerald-500/25" },
  soft_agreement:  { label: "Soft Agreement",   color: "text-amber-700 dark:text-amber-400 bg-amber-500/20 dark:bg-amber-500/10 border-amber-500/25"  },
  uncertain:       { label: "Uncertain",          color: "text-orange-700 dark:text-orange-400 bg-orange-500/20 dark:bg-orange-500/10 border-orange-500/25" },
  disagreement:    { label: "Disagreement",       color: "text-rose-700 dark:text-rose-400 bg-rose-500/20 dark:bg-rose-500/10 border-rose-500/25"   },
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const hue = name.charCodeAt(0) * 13 % 360;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0"
      style={{ background: `hsl(${hue}, 65%, 45%)` }}
    >
      {initials}
    </div>
  );
}

export function BeliefBar({ belief, index }: { belief: ParticipantBelief; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const colors = confidenceColor(belief.confidence);
  const signal = signalLabel[belief.signalType];
  const hasTranscript = belief.transcriptQuotes.length > 0;
  const hasSlack = belief.slackQuotes.length > 0;

  return (
    <div
      className={`fade-in-item glass rounded-2xl overflow-hidden border transition-all duration-300 ${colors.border} ${expanded ? "shadow-lg " + colors.glow : ""}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Main Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-white/[0.03] transition-colors duration-200 group"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-4">
          <Avatar name={belief.participantName} />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Name row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">{belief.participantName}</span>
                <span className="text-xs text-foreground/40">{belief.role}</span>
                {signal && (
                  <span className={`badge border ${signal.color}`}>{signal.label}</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                {hasTranscript && (
                  <div title="Transcript evidence" className="w-6 h-6 glass rounded-full flex items-center justify-center">
                    <Mic className="w-3 h-3 text-foreground/50" />
                  </div>
                )}
                {hasSlack && (
                  <div title="Slack evidence" className="w-6 h-6 glass rounded-full flex items-center justify-center">
                    <MessageSquare className="w-3 h-3 text-violet-400" />
                  </div>
                )}
                <div className={`text-2xl font-bold tabular-nums ${colors.text}`}>
                  {belief.confidence}
                  <span className="text-sm font-normal text-foreground/40">%</span>
                </div>
                <div className="text-foreground/30 group-hover:text-foreground/60 transition-colors">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Belief statement */}
            <p className="text-sm text-foreground/70 leading-relaxed">
              &ldquo;{belief.beliefStatement}&rdquo;
            </p>

            {/* Confidence bar */}
            <div className="confidence-bar-track">
              <div
                className={`h-full bg-gradient-to-r ${colors.bar} bar-reveal rounded-full`}
                style={{ width: `${belief.confidence}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Evidence Panel */}
      {expanded && (
        <div className="border-t border-foreground/[0.06]">
          <EvidencePanel belief={belief} />
        </div>
      )}
    </div>
  );
}
