"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface Report {
  id:     string;
  macros: any;
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

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [user,    setUser]    = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (!u) { router.push("/"); return; }
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "reports"),
      orderBy("timestamp", "desc"),
      limit(7)
    );
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setReports(data.reverse()); // oldest first for graph
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "logs"),
      orderBy("date", "desc"),
      limit(7)
    );
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry));
      setLogs(data.reverse());
    });
  }, [user]);

  const restData  = reports.map(r => r.macros?.motion?.restlessness_pct ?? 0);
  const tempData  = reports.map(r => r.macros?.environment?.avg_temperature_c ?? null);
  const soundData = reports.map(r => r.macros?.sound?.total_spikes ?? 0);
  const labels    = reports.map(r => r.id.slice(5)); // "06-08" from "2026-06-08"

  const sortedReportsAsc = [...reports].sort((a, b) => a.id.localeCompare(b.id));
  const restDataAsc  = sortedReportsAsc.map(r => r.macros?.motion?.restlessness_pct ?? 0);
  const tempDataAsc  = sortedReportsAsc.map(r => r.macros?.environment?.avg_temperature_c ?? null);
  const soundDataAsc = sortedReportsAsc.map(r => r.macros?.sound?.total_spikes ?? 0);
  const labelsAsc    = sortedReportsAsc.map(r => r.id.slice(5));

  const caffeineData    = logs.map(l => l.caffeine ?? 0);
  const alcoholData     = logs.map(l => l.alcohol ?? 0);
  const exerciseData    = logs.map(l => (l.exercise ? 1 : 0));
  const stressData      = logs.map(l => l.stress ?? 0);
  const productivityData = logs.map(l => l.productivity ?? 0);
  const logLabels       = logs.map(l => (l.date ?? l.id).slice(5));

  const maxRest       = 100;
  const maxTemp       = Math.max(...tempDataAsc.filter(Boolean) as number[], 30);
  const maxSound      = Math.max(...soundDataAsc, 1);
  const maxCaffeine   = Math.max(...caffeineData, 5);
  const maxAlcohol    = Math.max(...alcoholData, 5);
  const maxExercise   = 1;
  const maxStress     = 10;
  const maxProductivity = 10;
  const hasAnyHistory = reports.length > 0 || logs.length > 0;

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <h1 style={s.title}>Sleep History</h1>
          <span style={s.back} onClick={() => router.push("/")}>Return to Dashboard</span>
        </div>
        <p style={s.sub}>Last 7 nights at a glance.</p>

        {!hasAnyHistory ? (
          <div style={s.empty}>No history yet — run more sleep sessions.</div>
        ) : (
          <>
            {reports.length > 0 && (
              <>
                <div style={s.grid}>
                  <Graph
                    label="Restlessness %"
                    emoji=""
                    data={restDataAsc}
                    labels={labelsAsc}
                    max={maxRest}
                    color="#f9e95e"
                    unit="%"
                  />
                  <Graph
                    label="Avg Temperature °C"
                    emoji=""
                    data={tempDataAsc.map(v => v ?? 0)}
                    labels={labelsAsc}
                    max={maxTemp}
                    color="#f97316"
                    unit="°C"
                  />
                  <Graph
                    label="Sound Events"
                    emoji=""
                    data={soundDataAsc}
                    labels={labelsAsc}
                    max={maxSound}
                    color="#06b6d4"
                    unit=""
                  />
                </div>

            {/* Summary table */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Night Summary</h2>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Date","Restlessness","Temp","Humidity","Sound"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td style={s.td}>{r.id.slice(5)}</td>
                      <td style={{...s.td, color: restColor(r.macros?.motion?.restlessness_pct)}}>
                        {r.macros?.motion?.restlessness_pct ?? "—"}%
                      </td>
                      <td style={s.td}>{r.macros?.environment?.avg_temperature_c ?? "—"}°C</td>
                      <td style={s.td}>{r.macros?.environment?.avg_humidity_pct ?? "—"}%</td>
                      <td style={s.td}>{r.macros?.sound?.total_spikes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                </>
              )}

              {logs.length > 0 && (
                <>
                  <div style={s.card}>
                    <h2 style={s.cardTitleDailyLog}>Daily Log Trends</h2>
                  </div>
                  <div style={s.grid}>
                    <Graph
                      label="Caffeine (cups)"
                      emoji=""
                      data={caffeineData}
                      labels={logLabels}
                      max={maxCaffeine}
                      color="#a27cfa"
                      unit=""
                    />
                    <Graph
                      label="Alcohol (drinks)"
                      emoji=""
                      data={alcoholData}
                      labels={logLabels}
                      max={maxAlcohol}
                      color="#f41212"
                      unit=""
                    />
                    <Graph
                      label="Exercise today"
                      emoji=""
                      data={exerciseData}
                      labels={logLabels}
                      max={maxExercise}
                      color="#22c55e"
                      unit=""
                    />
                    <Graph
                      label="Stress level"
                      emoji=""
                      data={stressData}
                      labels={logLabels}
                      max={maxStress}
                      color="#f59e0b"
                      unit=""
                    />
                    <Graph
                      label="Productivity"
                      emoji=""
                      data={productivityData}
                      labels={logLabels}
                      max={maxProductivity}
                      color="#0ea5e9"
                      unit=""
                    />
                  </div>
                </>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function Graph({ label, emoji, data, labels, max, color, unit }: {
  label: string; emoji: string; data: number[]; labels: string[];
  max: number; color: string; unit: string;
}) {
  const W = 860, H = 220, pad = 40;
  const xs = data.map((_, i) => pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2));
  const ys = data.map(v  => H - pad - ((v / max) * (H - pad * 2)));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const fill = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ")
             + ` L ${xs[xs.length-1]} ${H - pad} L ${xs[0]} ${H - pad} Z`;

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>{emoji} {label}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%", height:"240px", overflow:"visible"}}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map(t => (
          <line key={t}
            x1={pad} y1={H - pad - t*(H-pad*2)}
            x2={W-pad} y2={H - pad - t*(H-pad*2)}
            stroke="#e1c7e0" strokeWidth="1"/>
        ))}
        {/* Fill */}
        <path d={fill} fill={color} fillOpacity="0.15"/>
        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots + labels */}
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="5" fill={color}/>
            <text x={x} y={ys[i] - 14} fill="#f8f1f5" fontSize="20"
                  fontWeight="700" textAnchor="middle">{data[i]}{unit}</text>
            <text x={x} y={H - 4} fill="#f8f1f5" fontSize="20"
                  fontWeight="700" textAnchor="middle">{labels[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function restColor(v?: number) {
  if (v == null) return "#888";
  if (v < 30)   return "#22c55e";
  if (v < 60)   return "#f59e0b";
  return "#ef4444";
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "2rem 1rem",
    color: "#fff",
    backgroundImage: `linear-gradient(rgba(20, 4, 35, 0.76), rgba(40, 10, 60, 0.88)), url('/history_background.jpeg')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxSizing: "border-box"
  },
  wrap: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "1.5rem"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem"
  },
  title: { color: "#fce7f3", fontSize: "2rem", fontWeight: 700, margin: 0 },
  back: {
    fontSize: "1.05rem", background: "#ec4899", color: "#fff",
    border: "none", borderRadius: "8px", padding: "0.6rem 1rem",
    cursor: "pointer", fontWeight: 500
  },
  sub: { color: "rgba(251, 207, 232, 0.9)", fontSize: "1.25rem", margin: "0.5rem 0 1.5rem" },
  empty: {
    color: "#fce7f3",
    textAlign: "center",
    padding: "3rem",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(219, 39, 119, 0.3)"
  },
  card: {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(219, 39, 119, 0.35)",
    borderRadius: "24px",
    padding: "1rem 1.2rem",
    marginBottom: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)"
  },
  cardTitle: {
    color: "#fdf2f8",
    fontSize: "1.5rem",
    fontWeight: 600,
    margin: "0 0 1rem 0"
  },
    cardTitleDailyLog: {
    color: "#fdf2f8",
    textAlign: "center",
    fontSize: "2rem",
    fontWeight: 600,
    margin: "0 0 1rem 0"
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    color: "rgba(251, 207, 232, 0.8)",
    fontSize: "1.25rem",
    textAlign: "left" as const,
    padding: "0.5rem 0.6rem",
    borderBottom: "1px solid rgba(219, 39, 119, 0.3)"
  },
  td: {
    color: "#f8f1f5",
    fontSize: "1.12rem",
    padding: "0.55rem 0.6rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
  },
};