"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DivergenceMap } from "@/components/DivergenceMap";
import { sampleSession } from "@/lib/sampleData";
import { dbSessionToSessionData, type SessionData } from "@/lib/types";
import { ArrowLeft, Download, Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);
  const isDemo = !sessionId;

  useEffect(() => {
    if (!sessionId) {
      setSession(sampleSession);
      setLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load session");
        setSession(dbSessionToSessionData(data));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6">
      {/* Top bar */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between gap-4 flex-wrap print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          New Analysis
        </Link>

        <div className="flex items-center gap-3">
          {isDemo && (
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-300 border border-violet-500/20">
              <Sparkles className="w-3 h-3" />
              Demo mode — sample data
            </div>
          )}
          {!isDemo && session && (
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              Live analysis
            </div>
          )}
          <button className="glass glass-hover rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 hover:text-foreground flex items-center gap-2 transition-all border border-foreground/10">
            <Send className="w-3.5 h-3.5" />
            Slack Digest
          </button>
          <button onClick={() => window.print()} className="glass glass-hover rounded-lg px-3 py-2 text-xs font-medium text-foreground/60 hover:text-foreground flex items-center gap-2 transition-all border border-black/10 dark:border-foreground/10">
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-16 h-16 rounded-2xl glass border border-violet-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-foreground/70 font-medium">Loading your analysis…</p>
            <p className="text-foreground/30 text-sm mt-1">Fetching beliefs from the database</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-6 border border-rose-500/25 bg-rose-500/10 dark:bg-rose-500/5 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-700 dark:text-rose-300 mb-1">Failed to load session</h3>
              <p className="text-sm text-rose-600/80 dark:text-rose-200/60">{error}</p>
              <Link href="/" className="inline-block mt-3 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
                ← Start a new analysis
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && session && (
        <DivergenceMap session={session} />
      )}

      <p className="text-center text-xs text-foreground/20 mt-12">
        Powered by Llama 3.3 · Phantom Consensus
      </p>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
