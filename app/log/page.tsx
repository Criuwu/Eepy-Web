"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

const today = new Date().toISOString().split("T")[0];

const defaultLog = {
  date: today,
  caffeine: 0,
  alcohol: 0,
  exercise: false,
  cycleToday: false,
  medication: "",
  stress: 5,
  productivity: 5,
  notes: ""
};

type DailyLog = typeof defaultLog;
type AppUser = Pick<FirebaseUser, "uid" | "email">;

export default function LogPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [log, setLog] = useState<DailyLog>(defaultLog);
  const [trackCycle, setTrackCycle] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isDemo = sessionStorage.getItem("eepy_demo_mode") === "true";

    if (isDemo) {
      queueMicrotask(() => {
        const storedCycle = localStorage.getItem("eepy_profile_cycle");
        setUser({ uid: "demo_user_123", email: "demo.sleeper@eepy.app" });
        setTrackCycle(storedCycle !== null ? storedCycle === "true" : false);
        setLoading(false);
      });
      return;
    }

    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/");
        return;
      }
      setUser(u);
      setLog(defaultLog);
      setTrackCycle(false);
      try {
        const ref = doc(db, "users", u.uid, "logs", today);
        const snap = await getDoc(ref);
        if (snap.exists()) setLog({ ...defaultLog, ...snap.data() });
      } catch (e) {
        console.warn("Log fetch error:", e);
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const checkCycleTracking = async () => {
      if (user.uid === "demo_user_123") {
        const storedCycle = localStorage.getItem("eepy_profile_cycle");
        setTrackCycle(storedCycle !== null ? storedCycle === "true" : false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid, "profile", "info"));
        if (profileSnap.exists()) {
          setTrackCycle(profileSnap.data()?.cycle === true);
        }
      } catch (e) {
        console.warn("Profile fetch error:", e);
      }
    };

    checkCycleTracking();
  }, [user]);

  async function save() {
    if (!user) return;
    if (user.uid !== "demo_user_123") {
      try {
        await setDoc(doc(db, "users", user.uid, "logs", today), log);
      } catch (e) {
        console.warn("Log save error:", e);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function update<K extends keyof DailyLog>(field: K, value: DailyLog[K]) {
    setLog((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120917] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-pink-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-base font-semibold">Loading daily log...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120917] text-white relative pb-20">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* Toast Notification */}
        {saved && (
          <div className="fixed bottom-6 right-6 z-50 glass-card px-6 py-4 rounded-2xl shadow-2xl border border-pink-500/50 text-white text-sm font-bold flex items-center gap-3 animate-bounce">
            <span>Log saved successfully.</span>
          </div>
        )}

        <div className="glass-card rounded-3xl p-6 sm:p-10 space-y-8 border border-pink-500/25 shadow-xl">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-500/20 pb-6">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Daily Entry
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">Daily Habit & Lifestyle Log</h1>
              <p className="text-sm text-white/70 mt-1">Correlate caffeine, stress, and routine against automated sleep scores.</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-xl text-sm font-mono font-bold bg-black/40 text-pink-200 border border-pink-500/30">
                {today}
              </span>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white border border-pink-500/30 font-bold"
              >
                Dashboard
              </button>
            </div>
          </div>

          <div className="space-y-7">
            
            {/* Caffeine */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold uppercase tracking-wider text-white flex items-center justify-between">
                <span>Caffeine Consumption</span>
                <span className="text-sm text-pink-300 font-mono font-bold">{log.caffeine} cups</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("caffeine", n)}
                    className={`px-5 py-3 rounded-xl text-sm font-bold font-mono transition-all ${
                      log.caffeine === n
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/40 hover:bg-black/60 text-white/80 border border-pink-500/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Alcohol */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold uppercase tracking-wider text-white flex items-center justify-between">
                <span>Alcohol Consumption</span>
                <span className="text-sm text-pink-300 font-mono font-bold">{log.alcohol} units</span>
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("alcohol", n)}
                    className={`px-5 py-3 rounded-xl text-sm font-bold font-mono transition-all ${
                      log.alcohol === n
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/40 hover:bg-black/60 text-white/80 border border-pink-500/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Exercise */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold uppercase tracking-wider text-white block">
                Physical Exercise
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update("exercise", true)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                    log.exercise
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                      : "bg-black/40 text-white/70 border border-pink-500/20"
                  }`}
                >
                  Worked Out Today
                </button>
                <button
                  type="button"
                  onClick={() => update("exercise", false)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                    !log.exercise
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                      : "bg-black/40 text-white/70 border border-pink-500/20"
                  }`}
                >
                  Rest Day / None
                </button>
              </div>
            </div>

            {/* MENSTRUAL CYCLE PHASE: Only shown if cycle tracking is enabled in Profile */}
            {trackCycle && (
              <div className="space-y-3 p-6 rounded-2xl bg-black/40 border border-pink-500/30">
                <label className="text-sm font-bold uppercase tracking-wider text-white block">
                  Cycle Phase Active Today
                </label>
                <p className="text-xs text-white/70">
                  Correlates cycle phases against sleep continuity and temperature variance.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => update("cycleToday", true)}
                    className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                      log.cycleToday
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/50 text-white/70 border border-pink-500/25"
                    }`}
                  >
                    Active Phase
                  </button>
                  <button
                    type="button"
                    onClick={() => update("cycleToday", false)}
                    className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                      !log.cycleToday
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/50 text-white/70 border border-pink-500/25"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            )}

            {/* Stress level */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wider text-white">Stress Rating</label>
                <span className="text-base font-black text-pink-300 font-mono">{log.stress} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={log.stress}
                onChange={(e) => update("stress", Number(e.target.value))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-xs text-white/50 font-mono">
                <span>Relaxed (1)</span>
                <span>Moderate (5)</span>
                <span>High Stress (10)</span>
              </div>
            </div>

            {/* Productivity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wider text-white">Productivity Rating</label>
                <span className="text-base font-black text-pink-300 font-mono">{log.productivity} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={log.productivity}
                onChange={(e) => update("productivity", Number(e.target.value))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-xs text-white/50 font-mono">
                <span>Low (1)</span>
                <span>Normal (5)</span>
                <span>Peak (10)</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-white block">
                Evening Notes / Factors
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm text-white placeholder-white/30"
                placeholder="Any late meals, screen time, or travel..."
                value={log.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={save}
              className="w-full py-4 px-6 rounded-2xl glow-btn-pink text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4 shadow-lg shadow-pink-600/30"
            >
              <span>{saved ? "Saved Log Successfully ✓" : "Save Daily Log Entry"}</span>
            </button>

          </div>

        </div>
      </main>
    </div>
  );
}