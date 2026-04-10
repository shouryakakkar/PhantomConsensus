"use client";

import { MessageSquare, Mic, Quote } from "lucide-react";
import { ParticipantBelief } from "@/lib/types";

export function EvidencePanel({ belief }: { belief: ParticipantBelief }) {
  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* AI Reasoning */}
      <div className="glass rounded-xl p-4 border border-violet-500/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
            <Quote className="w-3 h-3 text-violet-600 dark:text-violet-400" />
          </div>
          <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">AI Reasoning</h4>
        </div>
        <p className="text-sm text-foreground/60 leading-relaxed">{belief.reasoning}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transcript Quotes */}
        {belief.transcriptQuotes.length > 0 && (
          <div className="glass rounded-xl p-4 border border-foreground/[0.07] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                <Mic className="w-3 h-3 text-foreground/60" />
              </div>
              <h4 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">From Transcript</h4>
            </div>
            <ul className="space-y-2.5">
              {belief.transcriptQuotes.map((quote, idx) => (
                <li key={idx} className="flex gap-2.5">
                  <span className="mt-1 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-slate-300/80 to-slate-300/20 dark:from-white/30 dark:to-white/5 self-stretch min-h-[1rem]" />
                  <p className="text-xs text-foreground/50 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Slack Quotes */}
        {belief.slackQuotes.length > 0 && (
          <div className="glass rounded-xl p-4 border border-violet-500/15 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              </div>
              <h4 className="text-xs font-semibold text-violet-600/80 dark:text-violet-400/80 uppercase tracking-wider">From Slack</h4>
            </div>
            <ul className="space-y-2.5">
              {belief.slackQuotes.map((quote, idx) => (
                <li key={idx} className="flex gap-2.5">
                  <span className="mt-1 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-violet-400/50 to-violet-400/10 self-stretch min-h-[1rem]" />
                  <p className="text-xs text-foreground/50 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Phrases */}
      {belief.keyQuotes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2.5">Key Signal Phrases</h4>
          <div className="flex flex-wrap gap-2">
            {belief.keyQuotes.map((kq, i) => (
              <span
                key={i}
                className="glass text-xs text-foreground/60 px-3 py-1 rounded-full border border-foreground/10"
              >
                &ldquo;{kq}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
