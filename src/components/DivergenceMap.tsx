"use client";

import { AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";
import { SessionData } from "@/lib/types";
import { BeliefBar } from "./BeliefBar";

function GapScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const isHigh = score > 40;
  const isLow = score < 20;

  const color = isHigh ? "#F43F5E" : isLow ? "#10B981" : "#F59E0B";

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{
            filter: `drop-shadow(0 0 8px ${color}88)`,
            transition: "stroke-dasharray 1.5s cubic-bezier(0.23,1,0.32,1)",
          }}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-3xl font-bold text-foreground tabular-nums leading-none">{score}</div>
        <div className="text-[10px] text-foreground/40 mt-0.5 uppercase tracking-wider">Gap</div>
      </div>
    </div>
  );
}

export function DivergenceMap({ session }: { session: SessionData }) {
  const isHighGap = session.gapScore > 40;
  const isLowGap = session.gapScore < 20;

  const minConf = Math.min(...session.beliefs.map(b => b.confidence));
  const maxConf = Math.max(...session.beliefs.map(b => b.confidence));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* Header Card */}
      <div className="glass glass-strong gradient-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          
          {/* Gap Score Ring */}
          <GapScoreRing score={session.gapScore} />

          {/* Meta */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-foreground/40 uppercase tracking-wider mb-1">Decision tracked</p>
              <h2 className="text-xl font-bold text-foreground">{session.decisionTopic}</h2>
            </div>
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div>
                <span className="text-foreground/40 text-xs">Participants</span>
                <div className="text-foreground font-semibold">{session.beliefs.length}</div>
              </div>
              <div>
                <span className="text-foreground/40 text-xs">Max Certainty</span>
                <div className="text-emerald-400 font-semibold">{maxConf}%</div>
              </div>
              <div>
                <span className="text-foreground/40 text-xs">Min Certainty</span>
                <div className="text-rose-400 font-semibold">{minConf}%</div>
              </div>
              <div>
                <span className="text-foreground/40 text-xs">Phantom Gap</span>
                <div className="font-semibold text-foreground">{maxConf - minConf} pts</div>
              </div>
            </div>

            {/* Visual spread bar */}
            <div className="space-y-1">
              <div className="text-xs text-foreground/30">Confidence distribution</div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div
                  className="absolute h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all"
                  style={{ left: `${minConf}%`, width: `${maxConf - minConf}%` }}
                />
                {session.beliefs.map((b, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-foreground/40"
                    style={{ left: `${b.confidence}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    title={`${b.participantName}: ${b.confidence}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-foreground/25">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {isHighGap && (
        <div className="glass rounded-2xl p-5 border border-rose-500/25 bg-rose-500/10 dark:bg-rose-500/5 fade-in-item">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-rose-700 dark:text-rose-300">High Misalignment Risk</h3>
                <span className="badge bg-rose-500/20 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">Gap: {session.gapScore}</span>
              </div>
              <p className="text-sm text-rose-700/70 dark:text-rose-200/50">There is a significant belief divergence across your team.</p>
              <div className="mt-3 glass rounded-xl p-3 border border-rose-500/20">
                <div className="text-[10px] text-rose-600/80 dark:text-rose-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" />
                  Suggested Re-alignment Message
                </div>
                <p className="text-sm text-foreground/70 italic">
                  &ldquo;Hi team — quick check-in on <strong className="text-foreground font-medium">{session.decisionTopic}</strong>. Are we fully committed, or is there still anything pending that needs to be resolved before we move forward?&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLowGap && (
        <div className="glass rounded-2xl p-5 border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-500/5 fade-in-item">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">Strong Consensus</h3>
                <span className="badge bg-emerald-500/20 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">Gap: {session.gapScore}</span>
              </div>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-200/50 mt-0.5">Your team is highly aligned on this decision.</p>
            </div>
          </div>
        </div>
      )}

      {!isHighGap && !isLowGap && (
        <div className="glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/5 fade-in-item">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-700 dark:text-amber-300">Moderate Alignment</h3>
                <span className="badge bg-amber-500/20 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">Gap: {session.gapScore}</span>
              </div>
              <p className="text-sm text-amber-700/70 dark:text-amber-200/50 mt-0.5">Some variation in certainty exists — worth a quick check-in.</p>
            </div>
          </div>
        </div>
      )}

      {/* Belief Bars */}
      <div className="space-y-3 stagger">
        {session.beliefs.map((belief, idx) => (
          <BeliefBar key={idx} belief={belief} index={idx} />
        ))}
      </div>
    </div>
  );
}
