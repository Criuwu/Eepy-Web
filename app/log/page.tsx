"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

const today = new Date().toISOString().split("T")[0];

const defaultLog = {
  date:       today,
  caffeine:   0,
  alcohol:    0,
  exercise:   false,
  cycleToday: false,
  medication: "",
  stress:     5,
  productivity: 5,
  notes:      ""
};

export default function LogPage() {
  const [user,       setUser]       = useState<any>(null);
  const [log,        setLog]        = useState(defaultLog);
  const [trackCycle, setTrackCycle] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [loading,    setLoading]    = useState(true);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      // load today's log if it exists
      const ref  = doc(db, "users", u.uid, "logs", today);
      const snap = await getDoc(ref);
      if (snap.exists()) setLog({ ...defaultLog, ...snap.data() });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const profileSnap = await getDoc(doc(db, "users", user.uid, "profile", "info"));
      setTrackCycle(profileSnap.exists() && profileSnap.data()?.cycle === true);
    };
    loadProfile();
  }, [user]);

  async function save() {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "logs", today), log);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(field: string, value: any) {
    setLog(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div style={s.page}><p style={{color:"#aaa"}}>Loading...</p></div>;

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.header}>
          <div>
            <h1 style={s.title}>Today's Log</h1>
            <p style={s.date}>{today}</p>
          </div>
            <span style={s.back} onClick={() => router.push("/")}>Return to Dashboard</span>        
          </div>
        <p style={s.sub}>Track your daily habits so Eepy can find patterns in your sleep.</p>

        {/* Caffeine */}
        <div style={s.field}>
          <label style={s.label}>Caffeine (cups)</label>
          <div style={s.row}>
            {[0,1,2,3,4,5].map(n => (
              <button key={n} style={log.caffeine === n ? s.chipOn : s.chipOff}
                onClick={() => update("caffeine", n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Alcohol */}
        <div style={s.field}>
          <label style={s.label}>Alcohol (drinks)</label>
          <div style={s.row}>
            {[0,1,2,3,4,5].map(n => (
              <button key={n} style={log.alcohol === n ? s.chipOn : s.chipOff}
                onClick={() => update("alcohol", n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Exercise */}
        <div style={s.field}>
          <label style={s.label}>Exercise today</label>
          <div style={s.row}>
            <button style={log.exercise ? s.chipOn : s.chipOff}
              onClick={() => update("exercise", true)}>Yes</button>
            <button style={!log.exercise ? s.chipOn : s.chipOff}
              onClick={() => update("exercise", false)}>No</button>
          </div>
        </div>

        {trackCycle && (
          <div style={s.field}>
            <label style={s.label}>Cycle today</label>
            <div style={s.row}>
              <button style={log.cycleToday ? s.chipOn : s.chipOff}
                onClick={() => update("cycleToday", true)}>Yes</button>
              <button style={!log.cycleToday ? s.chipOn : s.chipOff}
                onClick={() => update("cycleToday", false)}>No</button>
            </div>
            <p style={{ color: "#f2d9ff", fontSize: "1rem", marginTop: "0.75rem" }}>
              This only appears when menstrual cycle tracking is enabled in your profile.
            </p>
          </div>
        )}

        {/* Stress */}
        <div style={s.field}>
          <label style={s.label}>Stress level: <strong>{log.stress}/10</strong></label>
          <input type="range" min={1} max={10} value={log.stress}
            onChange={e => update("stress", Number(e.target.value))}
            style={s.slider}/>
        </div>

        {/* Productivity */}
        <div style={s.field}>
          <label style={s.label}>Productivity: <strong>{log.productivity}/10</strong></label>
          <input type="range" min={1} max={10} value={log.productivity}
            onChange={e => update("productivity", Number(e.target.value))}
            style={s.slider}/>
        </div>

        {/* Medication */}
        <div style={s.field}>
          <label style={s.label}>Medication (optional)</label>
          <input style={s.input} placeholder="e.g. melatonin, antihistamine"
            value={log.medication}
            onChange={e => update("medication", e.target.value)}/>
        </div>

        {/* Notes */}
        <div style={s.field}>
          <label style={s.label}>Notes (optional)</label>
          <textarea style={s.textarea} placeholder="Anything unusual today?"
            value={log.notes}
            onChange={e => update("notes", e.target.value)}/>
        </div>

        <button style={saved ? s.btnSaved : s.btn} onClick={save}>
          {saved ? "✓ Saved!" : "Save Today's Log"}
        </button>

        <p style={s.back} onClick={() => router.push("/")}>← Return to dashboard</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:     { 
    minHeight:"100vh", 
    display:"flex",
    justifyContent:"center", 
    alignItems:"flex-start", 
    padding:"3rem 2rem",          
    backgroundImage:`linear-gradient(rgba(20, 4, 35, 0.76), rgba(40, 10, 60, 0.88)), url('/pink_guitar.jpeg')`,
          backgroundSize:"cover", 
          backgroundPosition:"center" 
  },

  card:     { 
    background:"rgba(255,255,255,0.12)", 
    borderRadius:"24px", 
    padding:"2.5rem",          
    width:"100%", 
    maxWidth:"760px", 
    border:"1px solid rgba(219, 39, 119, 0.4)" 
  },

  header:   { 
    display:"flex", 
    justifyContent:"space-between", 
    alignItems:"center", 
    gap:"1rem", 
    flexWrap:"wrap" 
  },

  title:    { 
    color:"#ffe4fb", 
    fontSize:"2rem", 
    fontWeight:700, 
    margin:0 
  },

  date:     { 
    color:"#f5c6ff", 
    fontSize:"1.25rem" 
  },

  sub:      { 
    color:"#f2d9ff", 
    fontSize:"1.25rem", 
    marginTop:"0.75rem", 
    marginBottom:"1.75rem", 
    lineHeight:1.5 
  },

  field:    { 
    marginBottom:"1.6rem" 
  },

  label:    { 
    color:"#f6e3ff", 
    fontSize:"1.12rem", 
    display:"block", 
    marginBottom:"0.65rem" 
  },

  row:      { 
    display:"flex", 
    gap:"0.6rem", 
    flexWrap:"wrap" 
  },
  
  chipOff:  { 
    background:"rgba(255,255,255,0.08)", 
    color:"#ecc8ff", 
    border:"1px solid rgba(219, 39, 119, 0.4)",
              borderRadius:"999px", 
              padding:"0.45rem 1rem", 
              cursor:"pointer", 
              fontSize:"1rem", 
              transition:"all 0.2s ease" 
            },

  chipOn:   { 
    background:"#ec4899", 
    color:"#fff", 
    border:"1px solid #dba3bf",
              borderRadius:"999px", 
              padding:"0.45rem 1rem", 
              cursor:"pointer", 
              fontSize:"1rem", 
              transition:"all 0.2s ease" 
            },

  slider:   { 
    width:"100%", 
    accentColor:"#ec4899" 
  },

  input:    { 
    width:"100%", 
    background:"rgba(255,255,255,0.08)", 
    border:"1px solid rgba(219, 39, 119, 0.4)",
              borderRadius:"16px", padding:"0.75rem 1rem", color:"#fff",
              fontSize:"1.12rem", boxSizing:"border-box", outline:"none" 
            },

  textarea: { 
    width:"100%", 
    background:"rgba(255,255,255,0.08)", 
    border:"1px solid rgba(219, 39, 119, 0.4)",
              borderRadius:"16px", padding:"0.75rem 1rem", color:"#fff",
              fontSize:"1.12rem", minHeight:"100px", resize:"vertical",
              boxSizing:"border-box", outline:"none" 
            },

  btn:      { 
    width:"100%", 
    background:"#ec4899", 
    color:"#fff", 
    border:"none",
              borderRadius:"14px", padding:"0.75rem", fontSize:"1.05rem",
              cursor:"pointer", marginTop:"0.75rem", marginBottom:"1rem"
            },

  btnSaved: { 
    width:"100%", 
    background:"#6d1a43", 
    color:"#fff", 
    border:"none",
              borderRadius:"14px", padding:"0.75rem", fontSize:"1.05rem",
              cursor:"pointer", marginTop:"0.75rem", marginBottom:"1rem"
            },

  back: {
    fontSize: "1.05rem", background: "#ec4899", color: "#fff",
    border: "none", borderRadius: "8px", padding: "0.6rem 1rem",
    cursor: "pointer", fontWeight: 500
  }
};