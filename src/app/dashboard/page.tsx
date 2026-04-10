"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DbSession, dbSessionToSessionData } from "@/lib/types";
import { ProviderIcon } from "@/components/ProviderIcon";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  slack:   { label: 'Slack',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  notion:  { label: 'Notion',  color: 'text-gray-300 bg-gray-500/10 border-gray-500/20' },
  jira:    { label: 'Jira',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  teams:   { label: 'Teams',   color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  manual:  { label: 'Manual',  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const meta = SOURCE_LABELS[source] ?? { label: source, color: 'text-foreground/40 bg-foreground/5 border-foreground/10' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full pl-1.5 pr-2 py-0.5 ${meta.color}`}>
      <ProviderIcon provider={source} className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function GapScoreBadge({ score }: { score: number }) {
  const pct = Math.round((score ?? 0) * 100);
  if (pct >= 70) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2.5 py-1">
        <AlertTriangle className="w-3 h-3" />
        High misalignment · {pct}%
      </span>
    );
  }
  if (pct >= 40) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
        <TrendingUp className="w-3 h-3" />
        Moderate · {pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
      <CheckCircle2 className="w-3 h-3" />
      Aligned · {pct}%
    </span>
  );
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchSessions(showRefreshSpinner = false) {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/sessions", { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to load sessions");
      const data: DbSession[] = await res.json();
      setSessions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-foreground/5 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Home
            </Link>
            <div className="w-px h-4 bg-foreground/10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-foreground tracking-tight">Phantom Consensus</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSessions(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 glass glass-hover rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 hover:text-foreground transition-all border border-foreground/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Team Dashboard</h1>
                <p className="text-sm text-foreground/50">Phantom decisions detected across your linked platforms</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          {!loading && !error && sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                {
                  icon: <BarChart3 className="w-4 h-4" />,
                  label: "Total Decisions Tracked",
                  value: sessions.length,
                  color: "text-violet-400",
                  bg: "bg-violet-500/10",
                },
                {
                  icon: <Users className="w-4 h-4" />,
                  label: "Total Participants",
                  value: sessions.reduce((a, s) => a + s.participants.length, 0),
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                },
                {
                  icon: <AlertTriangle className="w-4 h-4" />,
                  label: "High Misalignment",
                  value: sessions.filter((s) => (s.gapScore ?? 0) >= 0.7).length,
                  color: "text-rose-400",
                  bg: "bg-rose-500/10",
                },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-5 border border-foreground/10">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${stat.bg} ${stat.color} mb-3`}>
                    {stat.icon}
                  </div>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-foreground/40 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-16 h-16 rounded-2xl glass border border-violet-500/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
              <p className="text-foreground/50 text-sm">Loading your team&apos;s decisions…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass rounded-2xl p-6 border border-rose-500/25 bg-rose-500/5 text-center">
              <p className="text-rose-400 font-medium mb-2">Failed to load sessions</p>
              <p className="text-sm text-foreground/40">{error}</p>
              <button onClick={() => fetchSessions()} className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline">Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sessions.length === 0 && (
            <div className="glass rounded-2xl p-16 border border-foreground/10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto border border-foreground/10">
                <BarChart3 className="w-7 h-7 text-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/70">No decisions found yet</h3>
              <p className="text-sm text-foreground/40 max-w-xs mx-auto">
                The background sync is still running. Try refreshing in a moment, or analyze a meeting manually.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => fetchSessions(true)} className="btn-primary py-2 px-6 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <Link href="/" className="glass rounded-xl py-2 px-6 text-sm font-medium text-foreground/60 hover:text-foreground border border-foreground/10 transition-colors">
                  Analyze manually
                </Link>
              </div>
            </div>
          )}

          {/* Sessions list */}
          {!loading && !error && sessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider">Detected Decisions</h2>
              {sessions.map((session) => {
                const sd = dbSessionToSessionData(session);
                const isHighlighted = session.id === highlightId;
                return (
                  <Link
                    key={session.id}
                    href={`/analyze?session=${session.id}`}
                    className={`block glass rounded-2xl p-6 border transition-all duration-200 hover:border-violet-500/40 hover:bg-foreground/[0.02] group ${
                      isHighlighted
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-foreground/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SourceBadge source={session.source} />
                          {isHighlighted && (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 font-medium">
                              ✨ Just synced
                            </span>
                          )}
                          <GapScoreBadge score={sd.gapScore} />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-violet-300 transition-colors truncate">
                          {sd.decisionTopic}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {sd.beliefs.slice(0, 3).map((b, i) => (
                            <span key={i} className="text-xs bg-foreground/5 text-foreground/50 rounded-full px-3 py-1 border border-foreground/5">
                              {b.participantName}
                            </span>
                          ))}
                          {sd.beliefs.length > 3 && (
                            <span className="text-xs text-foreground/30 px-2 py-1">+{sd.beliefs.length - 3} more</span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/40 line-clamp-2">
                          {sd.beliefs[0]?.beliefStatement}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground/30">
                          <Clock className="w-3 h-3" />
                          {timeAgo(session.createdAt)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-foreground/30">
                          <Users className="w-3 h-3" />
                          {session.participants.length} participants
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          View analysis
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
