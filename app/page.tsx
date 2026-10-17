"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { login, register, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

interface MacroEnvironment {
  avg_temperature_c?: number;
  avg_humidity_pct?: number;
}

interface MacroMotion {
  restlessness_pct?: number;
}

interface MacroSound {
  total_spikes?: number;
}

interface Macros {
  environment?: MacroEnvironment;
  motion?: MacroMotion;
  sound?: MacroSound;
}

interface Report {
  id: string;
  report: string;
  timestamp: string;
  macros?: Macros;
}

interface DemoUser {
  uid: string;
  email: string;
  displayName?: string;
  isDemo?: boolean;
}

const DEMO_REPORTS: Report[] = [
  {
    id: "2026-06-08",
    report: "Your sleep last night was restful. Room temperature remained in the optimal zone (20.2°C) with 48% humidity. Only 1 mild sound spike was detected at 03:15 AM. Low restlessness (14%) indicates uninterrupted sleep cycles.",
    timestamp: "2026-06-08T08:00:00Z",
    macros: {
      environment: { avg_temperature_c: 20.2, avg_humidity_pct: 48 },
      motion: { restlessness_pct: 14 },
      sound: { total_spikes: 1 }
    }
  },
  {
    id: "2026-06-07",
    report: "Moderate restlessness observed (32%). Room temperature averaged 23.1°C. 4 sound spikes detected around midnight.",
    timestamp: "2026-06-07T08:00:00Z",
    macros: {
      environment: { avg_temperature_c: 23.1, avg_humidity_pct: 55 },
      motion: { restlessness_pct: 32 },
      sound: { total_spikes: 4 }
    }
  },
  {
    id: "2026-06-06",
    report: "Excellent sleep session recorded. Minimal noise events, cool environment (19.5°C), and restlessness below 12%.",
    timestamp: "2026-06-06T08:00:00Z",
    macros: {
      environment: { avg_temperature_c: 19.5, avg_humidity_pct: 45 },
      motion: { restlessness_pct: 11 },
      sound: { total_spikes: 0 }
    }
  },
  {
    id: "2026-06-05",
    report: "Higher restlessness (42%) coinciding with 6 sound spikes during the night.",
    timestamp: "2026-06-05T08:00:00Z",
    macros: {
      environment: { avg_temperature_c: 21.8, avg_humidity_pct: 52 },
      motion: { restlessness_pct: 42 },
      sound: { total_spikes: 6 }
    }
  }
];

export default function Dashboard() {
  const [user, setUser] = useState<DemoUser | FirebaseUser | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<Report | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedDemo = typeof window !== "undefined" && sessionStorage.getItem("eepy_demo_mode");
    if (savedDemo === "true") {
      const storedName = localStorage.getItem("eepy_username") || "Demo Sleeper";
      queueMicrotask(() => {
        setIsDemoMode(true);
        setUser({ uid: "demo_user_123", email: "demo.sleeper@eepy.app", displayName: storedName, isDemo: true });
        setReports(DEMO_REPORTS);
        setLatest(DEMO_REPORTS[0]);
      });
    }

    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsDemoMode(false);
        sessionStorage.removeItem("eepy_demo_mode");
      }
    });
  }, []);

  useEffect(() => {
    if (!user || isDemoMode) return;

    queueMicrotask(() => {
      setReports([]);
      setLatest(null);
    });

    const q = query(
      collection(db, "users", user.uid, "reports"),
      orderBy("timestamp", "desc"),
      limit(7)
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Report))
          .sort((a, b) => b.id.localeCompare(a.id));
        setReports(data);
        setLatest(data[0] || null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setReports([]);
        setLatest(null);
      }
    );
  }, [user, isDemoMode]);

  function enableDemoMode() {
    sessionStorage.setItem("eepy_demo_mode", "true");
    const chosenName = username.trim() || "Demo Sleeper";
    localStorage.setItem("eepy_username", chosenName);
    setIsDemoMode(true);
    setUser({ uid: "demo_user_123", email: "demo.sleeper@eepy.app", displayName: chosenName, isDemo: true });
    setReports(DEMO_REPORTS);
    setLatest(DEMO_REPORTS[0]);
  }

  async function handleLogout() {
    sessionStorage.removeItem("eepy_demo_mode");
    localStorage.removeItem("eepy_demo_mode");
    localStorage.removeItem("eepy_username");
    setIsDemoMode(false);
    setReports([]);
    setLatest(null);
    setUser(null);
    await logout();
  }

  async function handleAuth() {
    setError("");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const cleanName = username.trim() || email.split("@")[0];
        await register(email, password, cleanName);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Authentication error. Please check credentials or configuration.");
      }
    }
  }

  function handleCopyReport(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPairingUid() {
    const uid = user?.uid || "demo_user_123";
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  }

  const sleepScore = calculateSleepScore(latest);

  // ENLARGED, SPACIOUS SIGN IN PAGE
  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-[#120917]">
        {/* Subtle Pink Ambient Lighting */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 relative z-10 border border-pink-500/25 shadow-2xl">
          
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-background.png"
              alt="Eepy"
              className="w-20 h-20 rounded-2xl mx-auto mb-4 border border-pink-500/35 object-contain shadow-xl shadow-pink-500/15"
            />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Eepy
            </h1>
            <p className="text-sm text-white/70 mt-1 font-medium">Nightly sleep telemetry & station</p>
          </div>

          {/* Quick Demo Mode Card */}
          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-3">
            <div>
              <span className="text-xs font-bold text-pink-300 uppercase tracking-wider block">
                Instant Demo Access
              </span>
              <p className="text-xs text-white/60 mt-0.5">Explore the app without setting up credentials.</p>
            </div>
            
            <input
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-white/30"
              placeholder="Enter a username (e.g. Sleeper)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <button
              onClick={enableDemoMode}
              className="w-full py-3 px-4 rounded-xl glow-btn-pink text-white font-bold text-sm tracking-wide shadow-md shadow-pink-600/30"
            >
              Enter Demo Mode
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-pink-500/20" />
            <span className="flex-shrink mx-3 text-xs text-white/40 uppercase font-mono tracking-wider">
              {isLogin ? "Or Sign In With Account" : "Create An Account"}
            </span>
            <div className="flex-grow border-t border-pink-500/20" />
          </div>

          {/* Authentication Form with Username Support */}
          <div className="space-y-4 mt-4">
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5 ml-1">
                  Username
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-white/30"
                  placeholder="e.g. SleepMaster"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5 ml-1">
                Email Address
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-white/30"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5 ml-1">
                Password
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-white/30"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-pink-950/80 border border-pink-500/40 text-pink-200 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-pink-500/30 text-white font-bold text-sm transition-all shadow-sm"
            >
              {isLogin ? "Sign In" : "Register Account"}
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-xs text-pink-300 hover:text-white font-semibold"
              >
                {isLogin ? "Need an account? Register with username" : "Have an account? Sign in"}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120917] text-white relative pb-20">
      
      {/* SIDE AMBIENT GLOW RAILS: Adds depth to the left and right gutters */}
      <div className="fixed top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-pink-500/30 to-transparent pointer-events-none hidden xl:block shadow-[0_0_15px_rgba(236,72,153,0.3)]" />
      <div className="fixed top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-pink-500/30 to-transparent pointer-events-none hidden xl:block shadow-[0_0_15px_rgba(236,72,153,0.3)]" />

      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        
        {/* Demo Mode Notice */}
        {isDemoMode && (
          <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/30 text-white text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
              <span>
                <strong>Demo Mode Active:</strong> Welcome, <strong>{user?.displayName || "Sleeper"}</strong>!
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              Sign Out of Demo
            </button>
          </div>
        )}

        {/* ENLARGED HERO HEADER BAR */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-pink-500/25 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30">
                IoT Station
              </span>
              <span className="text-xs text-white/60">Bedside Telemetry Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Sleep Dashboard
            </h1>
            <p className="text-sm sm:text-base text-white/70 mt-1">
              Real-time environmental sensor logs, sleep score, and machine connection.
            </p>
          </div>

          {/* Action Buttons: Scaled up */}
          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-black/40 hover:bg-black/60 text-pink-300 border border-pink-500/40 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Connect Machine (Pi)</span>
            </button>

            <button
              onClick={() => router.push("/camera")}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl glow-btn-pink text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-pink-600/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Live Cam</span>
            </button>

            <button
              onClick={() => router.push("/log")}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-pink-500/30 text-sm font-bold transition-all"
            >
              Daily Log
            </button>
          </div>
        </div>

        {/* CONNECT MACHINE (RASPBERRY PI) MODAL / CARD */}
        {showConnectModal && (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-pink-500/40 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center border border-pink-500/40">
                  <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Connect Your Raspberry Pi Machine</h3>
                  <p className="text-xs text-white/60">Link your physical bed sensor hardware to sync sleep telemetry directly into this account.</p>
                </div>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="text-xs text-white/50 hover:text-white px-2 py-1">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pairing Info */}
              <div className="p-5 rounded-2xl bg-black/40 border border-pink-500/25 space-y-3">
                <span className="text-xs font-bold text-pink-300 uppercase tracking-wider block">Your Machine Pairing UID</span>
                <p className="text-xs text-white/70 leading-relaxed">
                  Provide this User ID to your Raspberry Pi script so it pushes nightly reports to your account:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={user?.uid || "demo_user_123"}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-pink-500/30 text-xs font-mono text-white"
                  />
                  <button
                    onClick={copyPairingUid}
                    className="px-4 py-2 rounded-xl text-xs font-bold glow-btn-pink text-white"
                  >
                    {copiedUid ? "Copied!" : "Copy UID"}
                  </button>
                </div>
              </div>

              {/* Status & Code */}
              <div className="p-5 rounded-2xl bg-black/40 border border-pink-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">Machine Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-600/20 text-pink-300 border border-pink-500/30">
                    Ready For Pairing
                  </span>
                </div>
                <p className="text-xs text-white/70">
                  Run on your Raspberry Pi:
                </p>
                <pre className="p-2.5 rounded-xl bg-black/60 font-mono text-[11px] text-pink-200 overflow-x-auto border border-pink-500/20">
{`pip install firebase-admin
python3 -c "print('Machine node ready to push telemetry to Firestore')"`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Left Section (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {latest ? (
              <div className="space-y-8">
                
                {/* ENLARGED PRIMARY SLEEP SCORE CARD */}
                <div className="glass-card rounded-3xl p-7 sm:p-9 border border-pink-500/30 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    
                    <div className="flex items-center gap-6">
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-black/50"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                            strokeDasharray={`${sleepScore}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl sm:text-4xl font-black text-white font-mono">{sleepScore}</span>
                          <span className="text-[10px] uppercase font-bold text-pink-300 tracking-wider">Score</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block">Latest Session</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">Sleep Quality Analysis</h2>
                        <div className="flex items-center gap-2.5 mt-2">
                          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 text-white border border-pink-500/30">
                            {latest.id}
                          </span>
                          <span className="text-sm font-semibold text-white/90">
                            {getSleepQualityText(sleepScore)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-white/50 block font-medium">Target Benchmark</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">85+</span>
                    </div>

                  </div>
                </div>

                {/* 4 ENLARGED METRIC CARDS (Strictly Pink, Dark, White) */}
                {latest.macros && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Temperature */}
                    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-pink-500/25 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center border border-pink-500/35">
                            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">Temperature</span>
                            <span className="text-[11px] text-white/60">Target: 19°C – 21°C</span>
                          </div>
                        </div>
                        <span className="text-lg font-mono font-black px-3 py-1 rounded-xl bg-pink-600/20 text-pink-200 border border-pink-500/35">
                          {latest.macros.environment?.avg_temperature_c ?? "—"}°C
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-pink-500/20">
                          <div
                            className="h-full bg-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(((latest.macros.environment?.avg_temperature_c || 20) / 30) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-white/50 font-mono">
                          <span>16°C</span>
                          <span className="text-pink-300 font-semibold">Optimal</span>
                          <span>28°C</span>
                        </div>
                      </div>
                    </div>

                    {/* Humidity */}
                    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-pink-500/25 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center border border-pink-500/35">
                            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.022.547l-1.748 1.748a2 2 0 00.586 3.414l7.854 2.618a2 2 0 001.46 0l7.854-2.618a2 2 0 00.586-3.414l-1.748-1.748z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">Air Humidity</span>
                            <span className="text-[11px] text-white/60">Target: 40% – 55%</span>
                          </div>
                        </div>
                        <span className="text-lg font-mono font-black px-3 py-1 rounded-xl bg-pink-600/20 text-pink-200 border border-pink-500/35">
                          {latest.macros.environment?.avg_humidity_pct ?? "—"}%
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-pink-500/20">
                          <div
                            className="h-full bg-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${latest.macros.environment?.avg_humidity_pct || 40}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-white/50 font-mono">
                          <span>30%</span>
                          <span className="text-pink-300 font-semibold">Healthy Range</span>
                          <span>80%</span>
                        </div>
                      </div>
                    </div>

                    {/* Restlessness */}
                    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-pink-500/25 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center border border-pink-500/35">
                            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">Restlessness Index</span>
                            <span className="text-[11px] text-white/60">Body Tossing & Motion</span>
                          </div>
                        </div>
                        <span className="text-lg font-mono font-black px-3 py-1 rounded-xl bg-pink-600/20 text-pink-200 border border-pink-500/35">
                          {latest.macros.motion?.restlessness_pct ?? "—"}%
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-pink-500/20">
                          <div
                            className="h-full bg-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${latest.macros.motion?.restlessness_pct || 20}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-white/50 font-mono">
                          <span>Calm</span>
                          <span className="text-pink-300 font-semibold">Target &lt; 20%</span>
                          <span>Restless</span>
                        </div>
                      </div>
                    </div>

                    {/* Sound Spikes */}
                    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-pink-500/25 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-300 flex items-center justify-center border border-pink-500/35">
                            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">Sound Spikes</span>
                            <span className="text-[11px] text-white/60">Night Noise Events</span>
                          </div>
                        </div>
                        <span className="text-lg font-mono font-black px-3 py-1 rounded-xl bg-pink-600/20 text-pink-200 border border-pink-500/35">
                          {latest.macros.sound?.total_spikes ?? 0}
                        </span>
                      </div>

                      <div className="flex items-end justify-between h-6 pt-1 px-1 gap-1.5 bg-black/40 p-2 rounded-xl border border-pink-500/20">
                        {[40, 20, 60, 15, 80, 25, 45, 10, 30, 70, 20, 50, 15, 35].map((h, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-pink-500 rounded-sm"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* Session Report */}
                <div className="glass-card rounded-3xl p-6 sm:p-8 border border-pink-500/25 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-pink-500/20 pb-4">
                    <h3 className="text-sm font-bold text-pink-300 uppercase tracking-wider">
                      Automated Sleep Intelligence Summary
                    </h3>
                    <button
                      onClick={() => handleCopyReport(latest.report)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-pink-500/30 transition-all shadow-sm"
                    >
                      {copied ? "Copied" : "Copy Summary"}
                    </button>
                  </div>

                  <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal whitespace-pre-wrap">
                    {latest.report}
                  </p>
                </div>

              </div>
            ) : (
              <div className="glass-card rounded-3xl p-10 text-center text-white/60 border border-pink-500/20">
                No telemetry recorded yet.
              </div>
            )}

          </div>

          {/* Right Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Habit Log Card */}
            <div className="glass-card rounded-3xl p-6 border border-pink-500/25 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-pink-300 uppercase tracking-wider">Today&apos;s Habit Log</h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Record caffeine, stress, and exercise to calculate automated correlation with sleep quality.
              </p>
              <button
                onClick={() => router.push("/log")}
                className="w-full py-3 px-4 rounded-xl glow-btn-pink text-white font-bold text-sm tracking-wide shadow-md shadow-pink-600/30"
              >
                Open Daily Log Form
              </button>
            </div>

            {/* Past 7 Sessions */}
            {reports.length > 1 && (
              <div className="glass-card rounded-3xl p-6 border border-pink-500/25 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-pink-300 uppercase tracking-wider">Recent Nights</h3>
                  <button
                    onClick={() => router.push("/history")}
                    className="text-xs text-pink-400 hover:text-white font-bold"
                  >
                    View History →
                  </button>
                </div>

                <div className="space-y-3">
                  {reports.slice(1).map((r) => {
                    const isExpanded = expandedId === r.id;
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden transition-all"
                      >
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="p-4 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-white text-sm">{r.id}</span>
                            <div className="text-xs text-white/60 mt-0.5">
                              Restlessness: {r.macros?.motion?.restlessness_pct ?? "—"}%
                            </div>
                          </div>
                          <span className="text-xs font-bold text-pink-400">
                            {isExpanded ? "Less" : "More"}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-pink-500/20 bg-black/60 text-xs text-white/80 font-mono leading-relaxed">
                            {r.report || "No summary text."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}

function calculateSleepScore(latest: Report | null): number {
  if (!latest || !latest.macros) return 82;
  const rest = latest.macros.motion?.restlessness_pct ?? 20;
  const temp = latest.macros.environment?.avg_temperature_c ?? 20;
  const spikes = latest.macros.sound?.total_spikes ?? 1;

  let score = 100;
  score -= rest * 0.5;
  score -= Math.abs(temp - 20) * 3;
  score -= spikes * 3;

  return Math.max(Math.min(Math.round(score), 99), 45);
}

function getSleepQualityText(score: number): string {
  if (score >= 85) return "Optimal";
  if (score >= 70) return "Moderate";
  return "Restless";
}