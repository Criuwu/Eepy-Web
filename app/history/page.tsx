"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

interface Report {
  id: string;
  macros?: {
    environment?: {
      avg_temperature_c?: number;
      avg_humidity_pct?: number;
    };
    motion?: {
      restlessness_pct?: number;
    };
    sound?: {
      total_spikes?: number;
    };
  };
}

interface LogEntry {
  id:           string;
  caffeine:     number;
  alcohol:      number;
  exercise:     boolean;
  stress:       number;
  productivity: number;
  date?:        string;
}

const DEMO_USER = { uid: "demo_user_123", email: "demo.sleeper@eepy.app" };
type AppUser = FirebaseUser | typeof DEMO_USER;

const DEMO_REPORTS: Report[] = [
  { id: "2026-06-02", macros: { environment: { avg_temperature_c: 21.0, avg_humidity_pct: 50 }, motion: { restlessness_pct: 35 }, sound: { total_spikes: 3 } } },
  { id: "2026-06-03", macros: { environment: { avg_temperature_c: 22.4, avg_humidity_pct: 54 }, motion: { restlessness_pct: 28 }, sound: { total_spikes: 2 } } },
  { id: "2026-06-04", macros: { environment: { avg_temperature_c: 20.8, avg_humidity_pct: 49 }, motion: { restlessness_pct: 20 }, sound: { total_spikes: 1 } } },
  { id: "2026-06-05", macros: { environment: { avg_temperature_c: 21.8, avg_humidity_pct: 52 }, motion: { restlessness_pct: 42 }, sound: { total_spikes: 6 } } },
  { id: "2026-06-06", macros: { environment: { avg_temperature_c: 19.5, avg_humidity_pct: 45 }, motion: { restlessness_pct: 11 }, sound: { total_spikes: 0 } } },
  { id: "2026-06-07", macros: { environment: { avg_temperature_c: 23.1, avg_humidity_pct: 55 }, motion: { restlessness_pct: 32 }, sound: { total_spikes: 4 } } },
  { id: "2026-06-08", macros: { environment: { avg_temperature_c: 20.2, avg_humidity_pct: 48 }, motion: { restlessness_pct: 14 }, sound: { total_spikes: 1 } } }
];

const DEMO_LOGS: LogEntry[] = [
  { id: "2026-06-02", caffeine: 2, alcohol: 1, exercise: true,  stress: 6, productivity: 7, date: "2026-06-02" },
  { id: "2026-06-03", caffeine: 1, alcohol: 0, exercise: true,  stress: 4, productivity: 8, date: "2026-06-03" },
  { id: "2026-06-04", caffeine: 1, alcohol: 0, exercise: false, stress: 3, productivity: 9, date: "2026-06-04" },
  { id: "2026-06-05", caffeine: 3, alcohol: 2, exercise: false, stress: 8, productivity: 5, date: "2026-06-05" },
  { id: "2026-06-06", caffeine: 0, alcohol: 0, exercise: true,  stress: 2, productivity: 9, date: "2026-06-06" },
  { id: "2026-06-07", caffeine: 2, alcohol: 1, exercise: false, stress: 5, productivity: 6, date: "2026-06-07" },
  { id: "2026-06-08", caffeine: 1, alcohol: 0, exercise: true,  stress: 3, productivity: 8, date: "2026-06-08" }
];

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const isDemo = sessionStorage.getItem("eepy_demo_mode") === "true";
    if (isDemo) {
      queueMicrotask(() => {
        setUser(DEMO_USER);
        setReports(DEMO_REPORTS);
        setLogs(DEMO_LOGS);
      });
      return;
    }

    return onAuthStateChanged(auth, u => {
      if (!u) { router.push("/"); return; }
      setUser(u);
    });
  }, [router]);

  useEffect(() => {
    if (!user || user.uid === "demo_user_123") return;
    let active = true;
    queueMicrotask(() => {
      if (active) setReports([]);
    });
    const q = query(
      collection(db, "users", user.uid, "reports"),
      orderBy("timestamp", "desc"),
      limit(7)
    );
    const unsubscribe = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setReports(data.reverse());
    }, (err) => {
      console.error("Firestore reports error:", err);
      setReports([]);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.uid === "demo_user_123") return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLogs([]);
    });
    const q = query(
      collection(db, "users", user.uid, "logs"),
      orderBy("date", "desc"),
      limit(7)
    );
    const unsubscribe = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry));
      setLogs(data.reverse());
    }, (err) => {
      console.error("Firestore logs error:", err);
      setLogs([]);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const sortedReportsAsc = [...reports].sort((a, b) => a.id.localeCompare(b.id));
  const restDataAsc  = sortedReportsAsc.map(r => r.macros?.motion?.restlessness_pct ?? 0);
  const tempDataAsc  = sortedReportsAsc.map(r => r.macros?.environment?.avg_temperature_c ?? null);
  const soundDataAsc = sortedReportsAsc.map(r => r.macros?.sound?.total_spikes ?? 0);
  const labelsAsc    = sortedReportsAsc.map(r => r.id.slice(5));

  const caffeineData     = logs.map(l => l.caffeine ?? 0);
  const alcoholData      = logs.map(l => l.alcohol ?? 0);
  const exerciseData     = logs.map(l => (l.exercise ? 1 : 0));
  const stressData       = logs.map(l => l.stress ?? 0);
  const productivityData  = logs.map(l => l.productivity ?? 0);
  const logLabels        = logs.map(l => (l.date ?? l.id).slice(5));

  const maxRest         = 100;
  const maxTemp         = Math.max(...tempDataAsc.filter(Boolean) as number[], 30);
  const maxSound        = Math.max(...soundDataAsc, 5);
  const maxCaffeine     = Math.max(...caffeineData, 5);
  const maxAlcohol      = Math.max(...alcoholData, 5);
  const maxExercise     = 1;
  const maxStress       = 10;
  const maxProductivity = 10;

  return (
    <div className="min-h-screen bg-[#171427] text-slate-100 relative pb-16">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        
        {/* Header */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10 shadow-xl">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/35">
              Telemetry Analytics
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Historical Sleep Telemetry
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">Comparing 7-night environmental telemetry against daily habit logs.</p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 border border-pink-500/35 text-xs font-semibold transition-all flex items-center gap-2"
          >
            ← Return to Dashboard
          </button>
        </div>

        {/* 2-Column Intricate Layout (Left: Sensor Telemetry, Right: Habit Telemetry) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: IoT Telemetry */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-pink-400" />
              <h2 className="text-base font-bold text-pink-100 uppercase tracking-wider">IoT Sensor Telemetry</h2>
            </div>

            {reports.length > 0 ? (
              <>
                <SleekGraph
                  label="Restlessness Index (%)"
                  data={restDataAsc}
                  labels={labelsAsc}
                  max={maxRest}
                  color="#f472b6"
                  unit="%"
                  gradientId="pinkGradRest"
                />
                <SleekGraph
                  label="Avg Temperature (°C)"
                  data={tempDataAsc.map(v => v ?? 0)}
                  labels={labelsAsc}
                  max={maxTemp}
                  color="#fb7185"
                  unit="°C"
                  gradientId="pinkGradTemp"
                />
                <SleekGraph
                  label="Sound Spikes Recorded"
                  data={soundDataAsc}
                  labels={labelsAsc}
                  max={maxSound}
                  color="#ec4899"
                  unit=""
                  gradientId="pinkGradSound"
                />
              </>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-center text-white/60 border border-pink-500/20">
                No telemetry recorded yet.
              </div>
            )}
          </div>

          {/* Right Column: Daily Lifestyle Habits */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-rose-400" />
              <h2 className="text-base font-bold text-pink-100 uppercase tracking-wider">Daily Habit Correlations</h2>
            </div>

            {logs.length > 0 ? (
              <>
                <SleekGraph
                  label="Caffeine Intake (Cups)"
                  data={caffeineData}
                  labels={logLabels}
                  max={maxCaffeine}
                  color="#f472b6"
                  unit=" cups"
                  gradientId="pinkGradCaff"
                />
                <SleekGraph
                  label="Stress Rating (/10)"
                  data={stressData}
                  labels={logLabels}
                  max={maxStress}
                  color="#fb7185"
                  unit="/10"
                  gradientId="pinkGradStress"
                />
                <SleekGraph
                  label="Productivity Output (/10)"
                  data={productivityData}
                  labels={logLabels}
                  max={maxProductivity}
                  color="#ec4899"
                  unit="/10"
                  gradientId="pinkGradProd"
                />
              </>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-center text-white/60 border border-pink-500/20">
                No daily logs recorded yet.
              </div>
            )}
          </div>

        </div>

        {/* Night Summary Breakdown Table */}
        <div className="glass-card-pink rounded-3xl p-6 sm:p-8 border border-pink-500/35 space-y-4">
          <div className="flex items-center justify-between border-b border-pink-500/20 pb-4">
            <h3 className="text-sm font-bold text-pink-100 uppercase tracking-wider">Session Data Summary</h3>
            <span className="text-xs text-pink-300/70 font-mono">{reports.length} Logs Loaded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-pink-500/20 text-[11px] font-semibold text-pink-300/80 uppercase tracking-wider">
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Restlessness Index</th>
                  <th className="py-3 px-4">Avg Temp</th>
                  <th className="py-3 px-4">Humidity</th>
                  <th className="py-3 px-4">Sound Disruption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-500/10 text-xs">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-pink-500/10 transition-colors font-mono">
                    <td className="py-3.5 px-4 font-bold text-pink-200">
                      {r.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getRestBadgeStyle(r.macros?.motion?.restlessness_pct)}`}>
                        {r.macros?.motion?.restlessness_pct ?? "—"}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-pink-100 font-medium">
                      {r.macros?.environment?.avg_temperature_c ?? "—"}°C
                    </td>
                    <td className="py-3.5 px-4 text-pink-100 font-medium">
                      {r.macros?.environment?.avg_humidity_pct ?? "—"}%
                    </td>
                    <td className="py-3.5 px-4 text-pink-100 font-medium">
                      {r.macros?.sound?.total_spikes ?? "—"} Spikes
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-5 px-4 text-center text-white/50">
                      No telemetry recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

function SleekGraph({ label, data, labels, max, color, unit, gradientId }: {
  label: string;
  data: number[];
  labels: string[];
  max: number;
  color: string;
  unit: string;
  gradientId: string;
}) {
  const W = 500, H = 180, padX = 35, padY = 25;

  const points = data.map((v, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (W - padX * 2);
    const clampedV = Math.min(Math.max(v, 0), max);
    const y = H - padY - (clampedV / Math.max(max, 1)) * (H - padY * 2);
    return { x, y, val: v, label: labels[i] || "" };
  });

  const curvePath = buildSmoothPath(points);
  const fillPath = points.length > 0
    ? `${curvePath} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`
    : "";

  return (
    <div className="glass-card rounded-2xl p-5 border border-pink-500/25 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-pink-200 uppercase tracking-wider">{label}</h3>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
          Max {max}{unit}
        </span>
      </div>

      <div className="w-full aspect-[5/2] relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map(t => {
            const y = H - padY - t * (H - padY * 2);
            return (
              <line
                key={t}
                x1={padX}
                y1={y}
                x2={W - padX}
                y2={y}
                stroke="rgba(244, 114, 182, 0.15)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {fillPath && <path d={fillPath} fill={`url(#${gradientId})`} />}

          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="6" fill={color} fillOpacity="0.2" />
              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
              <text
                x={pt.x}
                y={pt.y - 9}
                fill="#fdf2f8"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                className="font-mono"
              >
                {pt.val}{unit}
              </text>
              <text
                x={pt.x}
                y={H - 6}
                fill="rgba(253, 242, 248, 0.5)"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                className="font-mono"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return d;
}

function getRestBadgeStyle(v?: number) {
  if (v == null) return "bg-pink-950/40 text-pink-400 border border-pink-500/20";
  if (v < 30) return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  if (v < 60) return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
}