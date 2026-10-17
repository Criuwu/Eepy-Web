"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface AppUser {
  uid: string;
  email: string | null;
}

interface Snapshot {
  id: string;
  url: string;
  timestamp: string;
}

export default function CameraPage() {
  const [user, setUser] = useState<AppUser | FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Connection State (Defaults to disconnected - will NEVER auto-activate on enter)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [tunnelUrl, setTunnelUrl] = useState<string>("");
  const [activeStreamSrc, setActiveStreamSrc] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Stream controls
  const [nightVision, setNightVision] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [demoFeedActive, setDemoFeedActive] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Auth & Initial Configuration
  useEffect(() => {
    const isDemo = typeof window !== "undefined" && sessionStorage.getItem("eepy_demo_mode") === "true";
    if (isDemo) {
      queueMicrotask(() => {
        setUser({ uid: "demo_user_123", email: "demo.sleeper@eepy.app" });
        setLoading(false);
      });
    } else {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (!u) {
          router.push("/");
          return;
        }
        setUser(u);
        setLoading(false);
      });
      return () => unsubscribe();
    }

    const savedUrl = localStorage.getItem("eepy_camera_tunnel_url");
    if (savedUrl) {
      setTunnelUrl(savedUrl);
    } else {
      setTunnelUrl("https://your-pi-tunnel.trycloudflare.com");
    }
  }, [router]);

  const handleSaveTunnelUrl = (newUrl: string) => {
    const cleaned = newUrl.trim().replace(/\/+$/, "");
    setTunnelUrl(cleaned);
    localStorage.setItem("eepy_camera_tunnel_url", cleaned);
    setShowConfig(false);
  };

  // 2. Disconnect Handler
  const disconnectStream = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.src = "";
    }
    setActiveStreamSrc("");
    setConnectionStatus("disconnected");
    setDemoFeedActive(false);

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setDurationSeconds(0);

    if (tunnelUrl && !tunnelUrl.includes("your-pi-tunnel")) {
      try {
        fetch(`${tunnelUrl}/stop`, { mode: "no-cors", keepalive: true }).catch(() => {});
      } catch {
        // Ignore network errors
      }
    }
  }, [tunnelUrl]);

  // 3. Connect Handler (Manual user action required)
  const connectStream = useCallback(() => {
    setErrorMessage("");
    setConnectionStatus("connecting");

    if (!tunnelUrl || tunnelUrl.includes("your-pi-tunnel")) {
      setErrorMessage("Please configure your Raspberry Pi Cloudflare Tunnel URL or start Demo Mode.");
      setConnectionStatus("error");
      return;
    }

    const streamEndpoint = `${tunnelUrl}/stream?t=${Date.now()}`;
    setActiveStreamSrc(streamEndpoint);

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, [tunnelUrl]);

  // Connect Simulated Demo Feed
  const connectDemoFeed = () => {
    setErrorMessage("");
    setConnectionStatus("connecting");
    setDemoFeedActive(true);

    setTimeout(() => {
      setConnectionStatus("connected");
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }, 400);
  };

  // 4. Close connection if left open when leaving page or closing tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnectStream();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      disconnectStream();
    };
  }, [disconnectStream]);

  const handleImageLoaded = () => {
    setConnectionStatus("connected");
    setErrorMessage("");
  };

  const handleImageError = () => {
    if (connectionStatus === "connecting" || connectionStatus === "connected") {
      setConnectionStatus("error");
      setErrorMessage("Could not connect to camera stream. Check that the script and tunnel are running.");
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
  };

  const takeSnapshot = () => {
    if (connectionStatus !== "connected") return;

    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 150);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if (demoFeedActive) {
      if (canvasRef.current) {
        const url = canvasRef.current.toDataURL("image/jpeg", 0.9);
        setSnapshots((prev) => [{ id: `${Date.now()}`, url, timestamp }, ...prev.slice(0, 5)]);
      }
      return;
    }

    if (imgRef.current) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = imgRef.current.naturalWidth || 640;
        canvas.height = imgRef.current.naturalHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
          const url = canvas.toDataURL("image/jpeg", 0.9);
          setSnapshots((prev) => [{ id: `${Date.now()}`, url, timestamp }, ...prev.slice(0, 5)]);
        }
      } catch {
        const snapshotUrl = `${tunnelUrl}/snapshot?t=${Date.now()}`;
        setSnapshots((prev) => [{ id: `${Date.now()}`, url: snapshotUrl, timestamp }, ...prev.slice(0, 5)]);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      viewportRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Demo animation
  useEffect(() => {
    if (!demoFeedActive || connectionStatus !== "connected") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number;
    let tick = 0;

    const render = () => {
      tick++;
      ctx.fillStyle = "#120917";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const breathing = Math.sin(tick * 0.04) * 3;
      ctx.fillStyle = "rgba(236, 72, 153, 0.25)";
      ctx.beginPath();
      ctx.ellipse(canvas.width * 0.5, canvas.height * 0.6 + breathing, 110, 60, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(244, 114, 182, 0.4)";
      ctx.beginPath();
      ctx.arc(canvas.width * 0.35, canvas.height * 0.55 + breathing * 0.5, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`PI-CAM [LIVE SIMULATION]`, 20, 30);
      ctx.fillStyle = "#f472b6";
      ctx.fillText(`RESTLESSNESS: 12%`, 20, 50);

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [demoFeedActive, connectionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#120917] text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-pink-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">Loading camera...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120917] text-white">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Live Camera Feed
            </h1>
            <p className="text-xs text-white/60 mt-0.5">
              Secure on-demand connection. Tunnel stays closed when idle.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-pink-500/20"
            >
              Tunnel Settings
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30"
            >
              Setup Guide
            </button>
          </div>
        </div>

        {/* Tunnel Configuration Card */}
        {showConfig && (
          <div className="glass-card p-4 rounded-xl space-y-3 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Cloudflare Tunnel URL
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-xs text-white/50 hover:text-white">
                Close
              </button>
            </div>
            <p className="text-xs text-white/70">
              Enter your Raspberry Pi Cloudflare Tunnel URL:
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                defaultValue={tunnelUrl}
                placeholder="https://your-pi-tunnel.trycloudflare.com"
                id="tunnel-url-input"
                className="flex-1 glass-input px-3 py-2 rounded-xl text-xs font-mono text-white placeholder-white/30"
              />
              <button
                onClick={() => {
                  const input = document.getElementById("tunnel-url-input") as HTMLInputElement;
                  if (input) handleSaveTunnelUrl(input.value);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold glow-btn-pink text-white"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Setup Guide */}
        {showGuide && (
          <div className="glass-card p-4 rounded-xl space-y-3 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Raspberry Pi Setup
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-xs text-white/50 hover:text-white">
                Hide
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/80">
              <div className="p-3 rounded-lg bg-black/40 border border-pink-500/20 space-y-1.5">
                <span className="font-bold text-pink-300 block">1. Install cloudflared on Pi</span>
                <pre className="p-2 rounded bg-black/60 font-mono text-[11px] overflow-x-auto text-pink-200">
{`curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb`}
                </pre>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-pink-500/20 space-y-1.5">
                <span className="font-bold text-pink-300 block">2. Start Tunnel</span>
                <pre className="p-2 rounded bg-black/60 font-mono text-[11px] overflow-x-auto text-pink-200">
{`cloudflared tunnel --url http://localhost:8000`}
                </pre>
                <p className="text-[10px] text-white/60">
                  Copy the generated trycloudflare.com URL into Tunnel Settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Camera Monitor Card */}
        <div className="glass-card rounded-2xl overflow-hidden border border-pink-500/30">
          
          {/* Top Bar */}
          <div className="px-4 py-3 bg-black/40 border-b border-pink-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-pink-500 animate-pulse"
                    : connectionStatus === "connecting"
                    ? "bg-white/60 animate-pulse"
                    : connectionStatus === "error"
                    ? "bg-red-500"
                    : "bg-white/30"
                }`}
              />
              <span className="text-xs font-bold text-white capitalize">
                {connectionStatus === "connected"
                  ? demoFeedActive
                    ? "Live (Demo)"
                    : "Live Stream"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : connectionStatus === "error"
                  ? "Offline"
                  : "Standby (Closed)"}
              </span>

              {connectionStatus === "connected" && (
                <span className="text-xs font-mono text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-500/20">
                  {formatTime(durationSeconds)}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {connectionStatus === "connected" && (
                <>
                  <button
                    onClick={() => setNightVision(!nightVision)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      nightVision
                        ? "bg-pink-600 text-white"
                        : "bg-white/10 text-white/80 hover:text-white"
                    }`}
                  >
                    Night Filter
                  </button>

                  <button
                    onClick={takeSnapshot}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-pink-500/30"
                  >
                    Snapshot
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
                    title="Fullscreen"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </>
              )}

              {/* Connect / Disconnect */}
              {connectionStatus === "connected" || connectionStatus === "connecting" ? (
                <button
                  onClick={disconnectStream}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-950 hover:bg-pink-900 text-pink-200 border border-pink-500/40"
                >
                  Close Connection
                </button>
              ) : (
                <button
                  onClick={connectStream}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold glow-btn-pink text-white"
                >
                  Open Connection
                </button>
              )}
            </div>
          </div>

          {/* Viewport */}
          <div
            ref={viewportRef}
            className={`relative w-full aspect-video sm:aspect-[16/9] bg-black flex items-center justify-center overflow-hidden ${
              isFullscreen ? "fixed inset-0 z-50 p-4" : ""
            }`}
          >
            {snapshotFlash && (
              <div className="absolute inset-0 bg-white/70 z-30 pointer-events-none" />
            )}

            {/* Standby */}
            {connectionStatus === "disconnected" && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                <div className="w-16 h-16 rounded-2xl bg-pink-950/40 border border-pink-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white">Camera Connection Closed</h3>
                  <p className="text-xs text-white/60 max-w-sm">
                    Tunnel is inactive. Click below to view the live feed.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={connectStream}
                    className="px-4 py-2 rounded-xl text-xs font-bold glow-btn-pink text-white"
                  >
                    Open Connection
                  </button>
                  <button
                    onClick={connectDemoFeed}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-pink-500/20"
                  >
                    Test with Demo
                  </button>
                </div>
              </div>
            )}

            {/* Connecting */}
            {connectionStatus === "connecting" && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 z-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-400"></div>
                <p className="text-xs text-white/70">Connecting to stream...</p>
                <button onClick={disconnectStream} className="text-xs text-pink-300 hover:text-white underline">
                  Cancel
                </button>
              </div>
            )}

            {/* Error */}
            {connectionStatus === "error" && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 z-10">
                <p className="text-xs text-pink-300 max-w-sm">{errorMessage}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={connectStream} className="px-3 py-1.5 rounded-lg text-xs font-bold glow-btn-pink text-white">
                    Retry
                  </button>
                  <button onClick={connectDemoFeed} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white">
                    Try Demo
                  </button>
                </div>
              </div>
            )}

            {/* Stream Image */}
            {activeStreamSrc && !demoFeedActive && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                ref={imgRef}
                src={activeStreamSrc}
                alt="Camera Stream"
                onLoad={handleImageLoaded}
                onError={handleImageError}
                className={`w-full h-full object-contain ${
                  connectionStatus === "connected" ? "opacity-100" : "opacity-0 absolute"
                } ${nightVision ? "filter contrast-125 brightness-125 saturate-50" : ""}`}
              />
            )}

            {/* Demo Canvas */}
            {demoFeedActive && (
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className={`w-full h-full object-contain ${
                  connectionStatus === "connected" ? "opacity-100" : "opacity-0"
                } ${nightVision ? "filter contrast-125 brightness-125 saturate-50" : ""}`}
              />
            )}
          </div>

          <div className="px-4 py-2.5 bg-black/40 border-t border-pink-500/20 flex items-center justify-between text-xs text-white/60">
            <span>Protocol: HTTPS via Cloudflare</span>
            <span className="font-mono text-pink-300">
              {connectionStatus === "connected" ? "Active" : "Closed"}
            </span>
          </div>
        </div>

        {/* Snapshots */}
        {snapshots.length > 0 && (
          <div className="glass-card p-4 rounded-xl border border-pink-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Session Snapshots
              </h3>
              <button onClick={() => setSnapshots([])} className="text-xs text-white/50 hover:text-white">
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {snapshots.map((snap) => (
                <div key={snap.id} className="relative rounded-lg overflow-hidden border border-pink-500/20 bg-black aspect-video group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snap.url} alt={`Snapshot ${snap.timestamp}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-2">
                    <span className="text-[10px] text-white font-mono">{snap.timestamp}</span>
                    <a
                      href={snap.url}
                      download={`snapshot-${snap.id}.jpg`}
                      className="p-1 rounded bg-pink-600 text-white text-[10px]"
                    >
                      Save
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
