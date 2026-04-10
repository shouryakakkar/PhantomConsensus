"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Upload,
  Sparkles,
  FileText,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Inbox,
  CheckCircle2,
  LayoutDashboard,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProviderIcon } from "@/components/ProviderIcon";

function HomeContent() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [decisionTopic, setDecisionTopic] = useState("");
  const [slackChannel] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"manual" | "autopilot" | null>(null);
  const [hasStoredTokens, setHasStoredTokens] = useState(false);
  const [syncedSessionId, setSyncedSessionId] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/providers/status')
      .then(res => res.json())
      .then(data => {
        if (data.connected && Array.isArray(data.connected)) {
          setConnectedProviders(data.connected);
        }
        if (data.userId) {
          setUserId(data.userId);
        }
      })
      .catch(err => console.error('Failed to fetch provider status:', err));
  }, []);

  useEffect(() => {
    if (searchParams.get("sync") === "success") {
      setHasStoredTokens(true);
      setActiveSection("autopilot");
      setSyncedSessionId(searchParams.get("highlight"));
      const provider = searchParams.get("provider");
      if (provider) setConnectedProvider(provider);
      if (searchParams.get("warning") === "no_data") setSyncWarning("true");
    } else if (searchParams.get("error") === "oauth_failed") {
      const reason = searchParams.get("reason") || "";
      const reasonMessages: Record<string, string> = {
        slack_denied: "Slack connection was cancelled.",
        notion_denied: "Notion connection was cancelled.",
        jira_denied: "Jira connection was cancelled.",
        no_jira_sites: "No Jira sites found on your Atlassian account.",
        invalid_state: "OAuth session expired. Please try again.",
        token_exchange: "Failed to exchange OAuth token. Please try again.",
        server_error: "A server error occurred. Please try again.",
      };
      setError(reasonMessages[reason] || "OAuth authentication failed. Please try again.");
      setActiveSection("autopilot");
    }
  }, [searchParams]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setTranscript(text);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript || !decisionTopic) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, decisionTopic, slackChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      router.push(`/analyze?session=${data.sessionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleConnectedProviderClick = async (providerId: string) => {
    setConnectedProvider(providerId);
    setHasStoredTokens(true);
    setActiveSection("autopilot");
    setSyncWarning(null);
    setSyncedSessionId(null);
    setIsSyncing(true);

    try {
      const res = await fetch(`/api/sync/${providerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      if (data.sessionId) {
        setSyncedSessionId(data.sessionId);
      } else {
        setSyncWarning("true");
      }
    } catch (err: unknown) {
      console.error('Error syncing:', err);
      setSyncWarning(err instanceof Error ? err.message : "true");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center animate-glow">
              <Sparkles className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Phantom Consensus</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass rounded-full px-4 py-1.5 text-xs text-foreground/50 hidden md:block">
              Beta — AI-powered misalignment detection
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-violet-300 border border-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Enterprise-scale belief extraction
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="text-foreground">What did your</span><br /><span className="gradient-text">team actually</span><br /><span className="text-foreground">decide?</span>
          </h1>
          <p className="text-lg text-foreground/50 leading-relaxed max-w-2xl mx-auto">
            Phantom Consensus analyzes internal communications across Teams, Slack, and Notion to reveal hidden misalignment — before it derails your execution.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${activeSection === "autopilot" ? "border-violet-500/40 glass-strong" : "border-foreground/10 hover:border-foreground/20"}`}>
            <button
              onClick={() => setActiveSection(activeSection === "autopilot" ? null : "autopilot")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === "autopilot" ? "bg-violet-500/20 text-violet-300" : "bg-foreground/5 text-foreground/50"}`}>
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Link to Work Email</h3>
                  <p className="text-sm text-foreground/50">Auto-Pilot Mode • Constantly syncs decisions in the background</p>
                </div>
              </div>
              {activeSection === "autopilot" ? <ChevronUp className="w-5 h-5 text-foreground/40" /> : <ChevronDown className="w-5 h-5 text-foreground/40" />}
            </button>
            
            {activeSection === "autopilot" && (
              <div className="px-6 pb-6 pt-2 border-t border-foreground/5 animate-in fade-in slide-in-from-top-2 duration-300">
                {hasStoredTokens ? (
                   <div className="flex flex-col items-center justify-center py-8 space-y-4">
                     <div className="flex w-full justify-start mb-4">
                        <button 
                           onClick={() => setHasStoredTokens(false)} 
                           className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors glass rounded-md px-3 py-1.5 border border-foreground/10"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Providers
                        </button>
                     </div>
                     {isSyncing ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                          </div>
                          <h4 className="text-xl font-medium text-foreground/70">Syncing {connectedProvider}...</h4>
                          <p className="text-sm text-foreground/40 text-center max-w-md">Extracting latest team decisions. This takes standard LLM processing time.</p>
                        </>
                     ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </div>
                          <h4 className="text-xl font-medium">{connectedProvider ? `${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} Synced` : 'Account Synced'}</h4>
                          {syncWarning ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm px-4 py-3 rounded-xl max-w-md text-center">
                              {syncWarning === "true"
                                ? "We couldn't detect any clear decision signals in your recent activity. Your account is connected and will monitor automatically."
                                : syncWarning}
                            </div>
                          ) : (
                            <p className="text-sm text-foreground/50 text-center max-w-md">
                              We&apos;ve synced your recent activity and extracted team decisions.
                            </p>
                          )}
                          <button
                            className="btn-primary py-3 px-8 rounded-xl text-sm font-semibold text-white flex items-center gap-2 mt-2"
                            onClick={() => router.push(syncedSessionId ? `/dashboard?highlight=${syncedSessionId}` : '/dashboard')}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Review your phantom consensus
                          </button>
                          <button className="text-xs text-rose-500/70 hover:text-rose-500 underline mt-8" onClick={() => setHasStoredTokens(false)}>Unlink Account</button>
                        </>
                     )}
                   </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                        Enter Work Email
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          className="glass-input flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="name@company.com"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && workEmail.includes('@')) {
                              window.location.href = `/api/auth/teams?login_hint=${encodeURIComponent(workEmail)}`;
                            }
                          }}
                        />
                        <button
                          className="btn-primary px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={!workEmail.includes('@')}
                          onClick={() => {
                            window.location.href = `/api/auth/teams?login_hint=${encodeURIComponent(workEmail)}`;
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-foreground/5 space-y-4">
                       <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                         Or Connect Providers Directly
                       </label>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                         {['Microsoft Teams', 'Slack', 'Notion', 'Jira'].map((provider) => {
                           const providerId = provider.replace('Microsoft ', '').toLowerCase();
                           const isConnected = connectedProviders.includes(providerId);
                           return (
                             <button key={provider} className="glass rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-foreground/5 transition-colors group" onClick={(e) => {
                                  e.preventDefault();
                                  if (isConnected) {
                                    handleConnectedProviderClick(providerId);
                                  } else {
                                    const routes: Record<string, string> = {
                                      'Microsoft Teams': '/api/auth/teams',
                                      'Slack': '/api/slack',
                                      'Notion': '/api/auth/notion',
                                      'Jira': '/api/auth/jira',
                                    };
                                    const route = routes[provider];
                                    if (route) window.location.href = route;
                                  }
                              }}>
                               <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <ProviderIcon provider={provider} className="w-5 h-5" />
                               </div>
                               <span className="text-xs font-medium text-foreground/70">{provider}</span>
                               {isConnected && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 rounded-full">Connected</span>}
                             </button>
                           );
                         })}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${activeSection === "manual" ? "border-violet-500/40 glass-strong" : "border-foreground/10 hover:border-foreground/20"}`}>
            <button
              onClick={() => setActiveSection(activeSection === "manual" ? null : "manual")}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === "manual" ? "bg-violet-500/20 text-violet-300" : "bg-foreground/5 text-foreground/50"}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Analyze a Meeting</h3>
                  <p className="text-sm text-foreground/50">Manual Mode • Paste transcripts & decision topics</p>
                </div>
              </div>
              {activeSection === "manual" ? <ChevronUp className="w-5 h-5 text-foreground/40" /> : <ChevronDown className="w-5 h-5 text-foreground/40" />}
            </button>
            
            {activeSection === "manual" && (
              <div className="px-6 pb-6 pt-2 border-t border-foreground/5 animate-in fade-in slide-in-from-top-2 duration-300">
                 <form
                  onSubmit={handleAnalyze}
                  className="space-y-6"
                >
                  {error && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                        Meeting Transcript
                      </label>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors glass rounded-md px-2 py-1 border border-black/10 dark:border-foreground/10"
                      >
                        <Upload className="w-3 h-3" />
                        Upload .txt / .vtt
                      </button>
                    </div>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`rounded-xl border transition-all duration-300 ${isDragging ? "border-violet-400/60 bg-violet-500/10" : "border-foreground/10"
                        }`}
                    >
                      <textarea
                        id="transcript-input"
                        className="glass-input w-full h-44 p-4 rounded-xl text-sm resize-none font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder={`Paste transcript here, or drag & drop a file above…\n\nAlice: We're locking in October 1st.\nBob: I'd like to revisit scope first.\nCarol: I thought we were deciding on Friday?`}
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        required
                      />
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".txt,.vtt"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />

                    {transcript && (
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400">{transcript.split(/\s+/).filter(Boolean).length} words loaded</span>
                        <button
                          type="button"
                          onClick={() => setTranscript("")}
                          className="text-xs text-foreground/30 hover:text-foreground/60 ml-auto transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">
                      Decision to Track
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder="e.g. Q3 Launch Date, Budget approval..."
                      value={decisionTopic}
                      onChange={(e) => setDecisionTopic(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!transcript || !decisionTopic || isLoading}
                    id="analyze-button"
                    className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting beliefs…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Detect Phantom Consensus
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto text-center">
        <p className="text-xs font-medium text-foreground/40 hover:text-foreground/60 transition-colors">
          Built with ❤️ by Shourya Kakkar & Kartik Gupta
        </p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
