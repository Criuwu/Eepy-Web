"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

const defaultProfile = {
  name: "",
  age: "",
  weight: "",
  height: "",
  occupation: "",
  gender: "",
  cycle: false,
};

const demoProfile = {
  name: "Demo Sleeper",
  age: "26",
  weight: "65",
  height: "172",
  occupation: "IoT Developer",
  gender: "Female",
  cycle: true,
};

type Profile = typeof defaultProfile;
type AppUser = Pick<FirebaseUser, "uid" | "email" | "displayName">;

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedUid, setCopiedUid] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isDemo = sessionStorage.getItem("eepy_demo_mode") === "true";

    if (isDemo) {
      const localName = localStorage.getItem("eepy_username") || "Demo Sleeper";
      const localCycle = localStorage.getItem("eepy_profile_cycle");
      queueMicrotask(() => {
        setUser({ uid: "demo_user_123", email: "demo.sleeper@eepy.app", displayName: localName });
        setProfile({
          ...demoProfile,
          name: localName,
          cycle: localCycle !== null ? localCycle === "true" : true,
        });
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
      setProfile({
        ...defaultProfile,
        name: u.displayName || u.email?.split("@")[0] || "",
      });
      try {
        const snap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({ ...defaultProfile, ...data });
        }
      } catch (e) {
        console.warn("Profile load error:", e);
      }
      setLoading(false);
    });
  }, [router]);

  async function save() {
    if (!user) return;

    if (user.uid === "demo_user_123") {
      localStorage.setItem("eepy_profile_cycle", JSON.stringify(profile.cycle));
      if (profile.name) localStorage.setItem("eepy_username", profile.name);
    } else {
      try {
        await setDoc(doc(db, "users", user.uid, "profile", "info"), profile);
      } catch (e) {
        console.warn("Profile save error:", e);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function update<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value };
      if (user?.uid === "demo_user_123") {
        if (field === "cycle") localStorage.setItem("eepy_profile_cycle", JSON.stringify(value));
        if (field === "name" && typeof value === "string") localStorage.setItem("eepy_username", value);
      }
      return updated;
    });
  }

  function copyPairingUid() {
    const uid = user?.uid || "demo_user_123";
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120917] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-pink-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-base font-semibold">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120917] text-white relative pb-20">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">

        {/* Toast Notification */}
        {saved && (
          <div className="fixed bottom-6 right-6 z-50 glass-card px-6 py-4 rounded-2xl shadow-2xl border border-pink-500/50 text-white text-sm font-bold flex items-center gap-3 animate-bounce">
            <span>Profile and settings saved successfully.</span>
          </div>
        )}

        {/* CONNECT MACHINE (RASPBERRY PI) CARD */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-pink-500/30 shadow-xl">
          <div className="flex items-center justify-between border-b border-pink-500/20 pb-4">
            <div>
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block">Hardware Integration</span>
              <h2 className="text-xl font-bold text-white mt-1">Connect Your Machine (Raspberry Pi)</h2>
              <p className="text-xs text-white/70 mt-0.5">
                Link your bedside Raspberry Pi sensor hub to push live accelerometer, microphone, and temperature telemetry.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-600/20 text-pink-300 border border-pink-500/35">
              Node Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-300 block">Your Machine Pairing UID</span>
              <p className="text-xs text-white/60">
                Use this identifier in your Raspberry Pi script to route sleep telemetry to this user account:
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
                  {copiedUid ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-300 block">Pi Telemetry Sync</span>
              <p className="text-xs text-white/60">
                Install dependencies on your Raspberry Pi:
              </p>
              <pre className="p-2.5 rounded-xl bg-black/60 font-mono text-[11px] text-pink-200 overflow-x-auto border border-pink-500/20">
                {`pip install firebase-admin
# Pushes nightly macros to:
# users/{uid}/reports`}
              </pre>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-10 space-y-8 border border-pink-500/30 shadow-xl">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-500/20 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-2xl font-black text-pink-200 font-mono">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {profile.name || "User Profile"}
                </h1>
                <p className="text-sm text-white/70 mt-0.5">
                  Personal parameters used for calibrating baseline sleep metrics.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white border border-pink-500/30 font-bold"
            >
              Dashboard
            </button>
          </div>

          <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Username / Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                  Username / Alias
                </label>
                <input
                  className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-white/30"
                  placeholder="e.g. SleeperOne"
                  value={profile.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                  Age (Years)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-white/30 font-mono"
                  placeholder="e.g. 24"
                  value={profile.age}
                  onChange={(e) => update("age", e.target.value)}
                />
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-white/30 font-mono"
                  placeholder="e.g. 68"
                  value={profile.weight}
                  onChange={(e) => update("weight", e.target.value)}
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                  Height (cm)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-white/30 font-mono"
                  placeholder="e.g. 175"
                  value={profile.height}
                  onChange={(e) => update("height", e.target.value)}
                />
              </div>
            </div>

            {/* Occupation */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                Occupation / Daily Routine
              </label>
              <input
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-white/30"
                placeholder="e.g. Software Engineer, Student, Athlete"
                value={profile.occupation}
                onChange={(e) => update("occupation", e.target.value)}
              />
            </div>

            {/* Gender Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white ml-1 block">
                Gender Identity
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {["Female", "Male", "Other", "Prefer not to say"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update("gender", g)}
                    className={`px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${profile.gender === g
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/40 hover:bg-black/60 text-white/80 border border-pink-500/20"
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Menstrual Cycle Option: Immediately updates localStorage */}
            {profile.gender === "Female" && (
              <div className="space-y-3 p-6 rounded-2xl bg-black/40 border border-pink-500/30">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-white block">
                    Menstrual Cycle Tracking
                  </label>
                  <p className="text-xs text-white/70 mt-1">
                    When enabled, cycle phases will be shown in the Daily Log to correlate with sleep metrics.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => update("cycle", true)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${profile.cycle
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/50 text-white/70 border border-pink-500/20"
                      }`}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => update("cycle", false)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${!profile.cycle
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "bg-black/50 text-white/70 border border-pink-500/20"
                      }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={save}
              className="w-full py-4 px-6 rounded-2xl glow-btn-pink text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4 shadow-lg shadow-pink-600/30"
            >
              <span>{saved ? "Saved Profile Successfully ✓" : "Save Profile Configuration"}</span>
            </button>

          </div>

        </div>
      </main>
    </div>
  );
}