"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, documentId } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { login, register, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Report {
  id:        string;
  report:    string;
  timestamp: any;
  macros:    any;
}

export default function Dashboard() {
  const [user,     setUser]     = useState<any>(null);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [isLogin,  setIsLogin]  = useState(true);
  const [error,    setError]    = useState("");
  const [latest,   setLatest]   = useState<Report | null>(null);
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // watch login state — fires whenever user logs in or out
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  // real-time Firestore listener — updates dashboard the moment Pi pushes a report
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "reports"),
      orderBy(documentId(), "desc"),
      limit(7)
    );
    return onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Report))
        .sort((a, b) => b.id.localeCompare(a.id));
      setReports(data);
      setLatest(data[0] || null);
    });
  }, [user]);

  // handle login or register
  async function handleAuth() {
    setError("");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  // show login screen if not logged in
  if (!user) return (
    <div style={s.loginPage}>
      <div style={s.loginCard}>
        <div style={{ textAlign: "center" }}>
          <h1 style={s.loginTitle}>Eepy</h1>
          <p style={s.loginSub}>Sleep insights for your nights</p>
        </div>
        <input
          style={s.input}
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={s.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p style={s.errorText}>{error}</p>}
        <button style={s.btn} onClick={handleAuth}>
          {isLogin ? "Sign In" : "Register"}
        </button>
        <p style={s.toggleAuth} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "No account? Register" : "Have account? Sign In"}
        </p>
      </div>
    </div>
  );

  return (
    <div style={s.dashboardPage}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.mainTitle}>Eepy</h1>
            <p style={s.mainSub}>Your nightly sleep summary.</p>
          </div>
          <div style={s.headerButtons}>
            <button onClick={() => router.push("/log")} style={s.pinkBtn}>
              Log Today
            </button>
            <button onClick={() => router.push("/history")}
              style={s.pinkBtn}>
              History
            </button>
            <button onClick={() => router.push("/profile")}
              style={s.pinkBtn}>
              Profile
            </button>
            <button onClick={logout} style={s.signOutBtn}>
              Sign out
            </button>
          </div>
        </div>

        {/* Latest report card */}
        {latest ? (
          <div style={s.reportCard}>
            <div style={s.cardHeader}>
              <div>
                <h2 style={s.cardTitle}>Last Night</h2>
                <p style={s.cardSub}>Detailed sleep insights from your latest session.</p>
              </div>
              <span style={s.badge}>Report ID: {latest.id}</span>
            </div>

            {/* Sensor stat grid */}
            {latest.macros && (
              <div style={s.grid}>
                {latest.macros.environment?.avg_temperature_c != null && (
                  <Stat label="Avg Temp" value={`${latest.macros.environment.avg_temperature_c}°C`} />
                )}
                {latest.macros.environment?.avg_humidity_pct != null && (
                  <Stat label="Humidity" value={`${latest.macros.environment.avg_humidity_pct}%`} />
                )}
                {latest.macros.sound?.total_spikes != null && (
                  <Stat label="Sound Events" value={latest.macros.sound.total_spikes} />
                )}
                {latest.macros.motion?.restlessness_pct != null && (
                  <Stat label="Restlessness" value={`${latest.macros.motion.restlessness_pct}%`} />
                )}
              </div>
            )}

            {/* AI report text */}
            <div style={s.aiReportBox}>
              {latest.report}
            </div>
          </div>
        ) : (
          <div style={s.emptyCard}>
            No reports yet, run a sleep session on the Pi first.
          </div>
        )}

        {/* Past 7 nights history */}
        {reports.length > 1 && (
          <div style={s.historyCard}>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
              Past 7 Nights
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {reports.slice(1).map(r => (
                <div key={r.id}>
                  <div
                    style={{
                      ...s.historyRow,
                      cursor: "pointer",
                      borderColor: expandedId === r.id
                        ? "rgba(219, 39, 119, 0.7)"
                        : "rgba(219, 39, 119, 0.1)"
                    }}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  width: "100%", alignItems: "center" }}>
                      <span style={{ fontWeight: 500, color: "#fbcfe8" }}>{r.id}</span>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                        {expandedId === r.id ? "▲ collapse" : "▼ expand"}
                      </span>
                    </div>

                    {/* Always visible stats row */}
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" as const,
                                  fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
                      <span>Restlessness: {r.macros?.motion?.restlessness_pct ?? "—"}%</span>
                      <span>Temp: {r.macros?.environment?.avg_temperature_c ?? "—"}°C</span>
                      <span>Humidity: {r.macros?.environment?.avg_humidity_pct ?? "—"}%</span>
                      <span>Sound: {r.macros?.sound?.total_spikes ?? "—"}</span>
                    </div>

                    {/* Expanded report */}
                    {expandedId === r.id && (
                      <div style={{
                        marginTop: "0.75rem",
                        background: "rgba(80, 7, 36, 0.5)",
                        borderRadius: "16px",
                        padding: "1rem",
                        whiteSpace: "pre-wrap" as const,
                        fontSize: "1rem",
                        color: "#fce7f3",
                        lineHeight: 1.6,
                        border: "1px solid rgba(219, 39, 119, 0.2)",
                        width: "100%",
                        boxSizing: "border-box" as const
                      }}>
                        {r.report || "No report text available."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// reusable stat card component
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div style={s.statBox}>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statValue}>{value}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loginPage: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    paddingLeft: "1rem", paddingRight: "1rem", boxSizing: "border-box",
    backgroundImage: `linear-gradient(rgba(18, 3, 27, 0.84), rgba(30, 8, 45, 0.88)), url('/pink_flower.jpeg')`,
    backgroundSize: 'cover', backgroundPosition: 'center'
  },
  loginCard: {
    width: "100%", maxWidth: "448px", background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(219, 39, 119, 0.5)", backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    borderRadius: "24px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem",
    boxSizing: "border-box"
  },
  loginTitle: { fontSize: "2rem", fontWeight: 700, color: "#fbcfe8", margin: 0 },
  loginSub: { marginTop: "0.5rem", fontSize: "1.25rem", color: "rgba(253, 242, 248, 0.8)", margin: 0 },
  input: {
    width: "100%", padding: "0.75rem", borderRadius: "16px", background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid #ec4899", color: "#fdf2f8", fontSize: "1.12rem", outline: "none", boxSizing: "border-box"
  },
  errorText: { color: "#fbcfe8", fontSize: "1rem", margin: 0 },
  btn: {
    width: "100%", background: "#ec4899", color: "#fff", padding: "0.75rem", borderRadius: "16px",
    border: "none", fontSize: "1.05rem", fontWeight: 500, cursor: "pointer", transition: "background 0.2s"
  },
  toggleAuth: {
    textAlign: "center", color: "rgba(253, 242, 248, 0.8)", fontSize: "1rem",
    cursor: "pointer", margin: 0, transition: "color 0.2s"
  },
  dashboardPage: {
    minHeight: "100vh", color: "#fff", padding: "2rem 2rem 3rem", boxSizing: "border-box",
    backgroundImage: `linear-gradient(rgba(20, 4, 35, 0.76), rgba(40, 10, 60, 0.88)), url('/pink_flower.jpeg')`,
    backgroundSize: 'cover', backgroundPosition: 'center'
  },
  container: {
    maxWidth: "88rem", marginLeft: "auto", marginRight: "auto",
    display: "flex", flexDirection: "column", gap: "2.5rem"
  },
  header: {
    display: "flex", flexDirection: "column", gap: "1rem",
    justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap"
  },
  mainTitle: { fontSize: "2rem", fontWeight: 700, color: "#fce7f3", margin: 0 },
  mainSub: { marginTop: "0.5rem", fontSize: "1.25rem", color: "rgba(251, 207, 232, 0.8)", margin: 0 },
  headerButtons: { display: "flex", gap: "0.75rem", flexWrap: "wrap", width: "100%" },
  pinkBtn: {
    fontSize: "1.05rem", background: "#ec4899", color: "#fff",
    border: "none", borderRadius: "8px", padding: "0.4rem 0.9rem",
    cursor: "pointer", fontWeight: 500
  },
  signOutBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "16px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid #db2777",
    paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "0.75rem", paddingBottom: "0.75rem",
    fontSize: "1rem", color: "#fce7f3", cursor: "pointer", transition: "background 0.2s",
    marginLeft: "auto"
  },
  reportCard: {
    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(219, 39, 119, 0.4)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", borderRadius: "24px",
    padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem"
  },
  cardHeader: {
    display: "flex", flexDirection: "column", gap: "0.75rem",
    justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap"
  },
  cardTitle: { fontSize: "1.5rem", fontWeight: 600, color: "#fdf2f8", margin: 0 },
  cardSub: { fontSize: "1.25rem", color: "rgba(251, 207, 232, 0.8)", marginTop: "0.25rem", margin: 0 },
  badge: {
    display: "inline-flex", alignItems: "center", borderRadius: "9999px",
    background: "rgba(219, 39, 119, 0.15)", paddingLeft: "0.75rem", paddingRight: "0.75rem",
    paddingTop: "0.25rem", paddingBottom: "0.25rem", fontSize: "0.75rem", color: "#fce7f3"
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem"
  },
  aiReportBox: {
    background: "rgba(80, 7, 36, 0.5)", borderRadius: "24px", padding: "1.25rem",
    whiteSpace: "pre-wrap", fontSize: "1.12rem", color: "#fce7f3",
    lineHeight: 1.625, border: "1px solid rgba(219, 39, 119, 0.2)"
  },
  emptyCard: {
    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(219, 39, 119, 0.4)",
    borderRadius: "24px", padding: "2rem", color: "#fbcfe8", textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  },
  historyCard: {
    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(219, 39, 119, 0.4)",
    borderRadius: "24px", padding: "2rem", display: "flex", flexDirection: "column",
    gap: "1.25rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
  },
  historyRow: {
    display: "flex", flexDirection: "column", gap: "0.5rem",
    justifyContent: "space-between", alignItems: "flex-start",
    borderRadius: "16px", background: "rgba(80, 7, 36, 0.2)", padding: "1rem",
    border: "1px solid rgba(219, 39, 119, 0.1)", fontSize: "1.12rem", color: "#fce7f3"
  },
  statBox: {
    background: "rgba(80, 7, 36, 0.75)", border: "1px solid rgba(219, 39, 119, 0.4)",
    borderRadius: "24px", padding: "1rem", textAlign: "center",
    boxShadow: "0 10px 15px -3px rgba(219, 39, 119, 0.2)"
  },
  statLabel: {
    color: "#fbcfe8", fontSize: "0.75rem", marginBottom: "0.5rem",
    textTransform: "uppercase", letterSpacing: "0.18em"
  },
  statValue: { color: "#fff", fontSize: "1.125rem", fontWeight: 600 }
};