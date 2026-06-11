"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

const defaultProfile = {
  name:       "",
  age:        "",
  weight:     "",
  height:     "",
  occupation: "",
  gender:     "",
  cycle:      false,
};

export default function ProfilePage() {
  const [user,    setUser]    = useState<any>(null);
  const [profile, setProfile] = useState(defaultProfile);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
      if (snap.exists()) setProfile({ ...defaultProfile, ...snap.data() });
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "profile", "info"), profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(field: string, value: any) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div style={s.page}><p style={{color:"#aaa"}}>Loading...</p></div>;

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.header}>
          <h1 style={s.title}>Profile</h1>
          <span style={s.back} onClick={() => router.push("/")}>Return to Dashboard</span>
        </div>
        <p style={s.sub}>Your profile helps Eepy personalise sleep analysis.</p>

        {/* Name */}
        <div style={s.field}>
          <label style={s.label}>Name</label>
          <input style={s.input} placeholder="e.g. Bulbucosaurus"
            value={profile.name}
            onChange={e => update("name", e.target.value)}/>
        </div>

        {/* Age */}
        <div style={s.field}>
          <label style={s.label}>Age</label>
          <input style={s.input} type="number" placeholder="e.g. 20"
            value={profile.age}
            onChange={e => update("age", e.target.value)}/>
        </div>

        {/* Gender */}
        <div style={s.field}>
          <label style={s.label}>Gender</label>
          <div style={s.row}>
            {["Female","Male","Other","Prefer not to say"].map(g => (
              <button key={g}
                style={profile.gender === g ? s.chipOn : s.chipOff}
                onClick={() => update("gender", g)}>{g}
              </button>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div style={s.field}>
          <label style={s.label}>Weight (kg)</label>
          <input style={s.input} type="number" placeholder="e.g. 60"
            value={profile.weight}
            onChange={e => update("weight", e.target.value)}/>
        </div>

        {/* Height */}
        <div style={s.field}>
          <label style={s.label}>Height (cm)</label>
          <input style={s.input} type="number" placeholder="e.g. 165"
            value={profile.height}
            onChange={e => update("height", e.target.value)}/>
        </div>

        {/* Occupation */}
        <div style={s.field}>
          <label style={s.label}>Occupation</label>
          <input style={s.input} placeholder="e.g. Student"
            value={profile.occupation}
            onChange={e => update("occupation", e.target.value)}/>
        </div>

        {/* Menstrual cycle — show only if Female */}
        {profile.gender === "Female" && (
          <div style={s.field}>
            <label style={s.label}>Track menstrual cycle</label>
            <p style={s.hint}>
              Allows Eepy to correlate hormonal phases with sleep quality.
            </p>
            <div style={s.row}>
              <button style={profile.cycle ? s.chipOn : s.chipOff}
                onClick={() => update("cycle", true)}>Yes</button>
              <button style={!profile.cycle ? s.chipOn : s.chipOff}
                onClick={() => update("cycle", false)}>No</button>
            </div>
          </div>
        )}

        <button style={saved ? s.btnSaved : s.btn} onClick={save}>
          {saved ? "✓ Saved!" : "Save Profile"}
        </button>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "3rem 2rem",
    boxSizing: "border-box",
    color: "#fff",
    backgroundImage: `linear-gradient(rgba(20, 4, 35, 0.76), rgba(40, 10, 60, 0.88)), url('/pink_flower.jpeg')`,
    backgroundSize: "cover",
    backgroundPosition: "center"
  },
  card: {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(219, 39, 119, 0.35)",
    borderRadius: "24px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "700px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem"
  },
  title: { color: "#fce7f3", fontSize: "2rem", fontWeight: 700, margin: 0 },
  back: {
    fontSize: "1.05rem", background: "#ec4899", color: "#fff",
    border: "none", borderRadius: "8px", padding: "0.6rem 1rem",
    cursor: "pointer", fontWeight: 500
  },
  sub: {
    color: "rgba(251, 207, 232, 0.9)",
    fontSize: "1.25rem",
    marginTop: "0.5rem",
    marginBottom: "1.5rem"
  },
  field: { marginBottom: "1.4rem" },
  label: {
    color: "#f8f1f5",
    fontSize: "1.12rem",
    display: "block",
    marginBottom: "0.5rem"
  },
  hint: {
    color: "rgba(251, 207, 232, 0.65)",
    fontSize: "1rem",
    margin: "0 0 0.5rem"
  },
  row: { display: "flex", gap: "0.5rem", flexWrap: "wrap" as const },
  chipOff: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "rgba(251, 207, 232, 0.8)",
    border: "1px solid rgba(219, 39, 119, 0.3)",
    borderRadius: "8px",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s"
  },
  chipOn: {
    background: "#ec4899",
    color: "#fff",
    border: "1px solid #db2777",
    borderRadius: "8px",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s"
  },
  input: {
    width: "100%",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(219, 39, 119, 0.3)",
    borderRadius: "8px",
    padding: "0.6rem 0.8rem",
    color: "#fff",
    fontSize: "1.12rem",
    boxSizing: "border-box" as const
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
};