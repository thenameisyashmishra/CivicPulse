import { useState, useEffect, useRef } from "react";
import {
  Video,
  Play,
  Pause,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

interface LiveInspectionStreamPlayerProps {
  onCaptureFrame?: (data: {
    dataUrl: string;
    timestamp: string;
    telemetry: {
      lat: number;
      lng: number;
      speedKmh: number;
      altitudeM: number;
      headingDeg: number;
      detectionsCount: number;
    };
  }) => void;
}

export default function LiveInspectionStreamPlayer({
  onCaptureFrame,
}: LiveInspectionStreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamSource, setStreamSource] = useState<"cctv" | "drone">("cctv");
  const [speed, setSpeed] = useState(48);
  const [altitude, setAltitude] = useState(24.5);
  const [heading, setHeading] = useState(138);
  const [coords, setCoords] = useState({ lat: 28.6139, lng: 77.209 });
  const [frameCount, setFrameCount] = useState(1420);
  const [fps, setFps] = useState(30);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live telemetry ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSpeed((prev) => Math.max(30, Math.min(65, prev + (Math.random() * 4 - 2))));
      setAltitude((prev) => Math.max(10, Math.min(50, prev + (Math.random() * 0.4 - 0.2))));
      setHeading((prev) => (prev + 0.2) % 360);
      setFps(29 + Math.round(Math.random() * 2));
      setCoords((prev) => ({
        lat: prev.lat + 0.00002,
        lng: prev.lng + 0.00003,
      }));
      setFrameCount((prev) => prev + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Canvas drawing loop with animated AI bounding boxes & HUD
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let tick = 0;
    const render = () => {
      tick++;

      // Canvas dimensions
      const w = canvas.width;
      const h = canvas.height;

      // Draw highway roadway background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1e293b"); // Sky / horizon
      grad.addColorStop(0.35, "#334155");
      grad.addColorStop(0.5, "#475569");
      grad.addColorStop(1, "#0f172a"); // Dark asphalt
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw road perspective lines
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Left lane line
      ctx.moveTo(w * 0.45, h * 0.4);
      ctx.lineTo(w * 0.05, h);
      // Right lane line
      ctx.moveTo(w * 0.55, h * 0.4);
      ctx.lineTo(w * 0.95, h);
      ctx.stroke();

      // Dashed center divider line (animated moving towards viewer)
      ctx.strokeStyle = "#facc15"; // Yellow divider
      ctx.lineWidth = 3;
      const dashOffset = (tick * 4) % 40;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -dashOffset;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.4);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Simulated Asphalt Pothole Detection Box 1
      const p1Y = h * 0.65 + Math.sin(tick * 0.05) * 5;
      const p1X = w * 0.35;
      const p1W = 110;
      const p1H = 65;

      // Draw bounding box
      ctx.strokeStyle = "#ef4444"; // Red for high severity pothole
      ctx.lineWidth = 2;
      ctx.strokeRect(p1X, p1Y, p1W, p1H);

      // Label background
      ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
      ctx.fillRect(p1X, p1Y - 18, 140, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText("POTHOLE #1: 94.2% (H)", p1X + 4, p1Y - 5);

      // Simulated Crack Detection Box 2
      const p2Y = h * 0.55 + Math.cos(tick * 0.04) * 4;
      const p2X = w * 0.58;
      const p2W = 90;
      const p2H = 45;

      ctx.strokeStyle = "#f59e0b"; // Amber for medium crack
      ctx.lineWidth = 2;
      ctx.strokeRect(p2X, p2Y, p2W, p2H);

      ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
      ctx.fillRect(p2X, p2Y - 18, 130, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText("CRACK #2: 88.5% (M)", p2X + 4, p2Y - 5);

      // Center crosshair
      ctx.strokeStyle = "rgba(6, 182, 212, 0.6)"; // Cyan
      ctx.lineWidth = 1;
      const cx = w * 0.5;
      const cy = h * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy);
      ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy + 20);
      ctx.stroke();
      ctx.strokeRect(cx - 30, cy - 30, 60, 60);

      // Top HUD Bar Overlay
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(0, 0, w, 28);
      ctx.fillStyle = "#22d3ee"; // Cyan text
      ctx.font = "bold 10px monospace";
      ctx.fillText(`● REC [${streamSource.toUpperCase()}]`, 12, 18);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`GPS: ${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E`, 140, 18);
      ctx.fillText(`SPD: ${speed.toFixed(1)} km/h`, 360, 18);
      ctx.fillText(`ALT: ${altitude.toFixed(1)}m`, 470, 18);
      ctx.fillText(`HDG: ${heading.toFixed(0)}°`, 560, 18);

      ctx.fillStyle = "#4ade80"; // Green
      ctx.fillText("AI: YOLOv8-IRC:82 LIVE (18ms)", w - 190, 18);

      // Corner target brackets
      const bLen = 15;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(10, 45);
      ctx.lineTo(10, 45 - bLen);
      ctx.lineTo(10 + bLen, 45 - bLen);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(w - 10, 45);
      ctx.lineTo(w - 10, 45 - bLen);
      ctx.lineTo(w - 10 - bLen, 45 - bLen);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(10, h - 15);
      ctx.lineTo(10, h - 15 + bLen);
      ctx.lineTo(10 + bLen, h - 15 + bLen);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(w - 10, h - 15);
      ctx.lineTo(w - 10, h - 15 + bLen);
      ctx.lineTo(w - 10 - bLen, h - 15 + bLen);
      ctx.stroke();

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, streamSource, speed, altitude, heading, coords]);

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const timestamp = new Date().toISOString();

    if (onCaptureFrame) {
      onCaptureFrame({
        dataUrl,
        timestamp,
        telemetry: {
          lat: coords.lat,
          lng: coords.lng,
          speedKmh: speed,
          altitudeM: altitude,
          headingDeg: heading,
          detectionsCount: 2,
        },
      });
    }

    toast.success("Frame snapshot captured & sealed with GPS telemetry!");
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Live Highway Surveillance & Drone Stream AI HUD
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                ● STREAM ACTIVE
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Real-time video feed inference for road defects, asset chainage, and WebRTC spot-audits.
            </p>
          </div>
        </div>

        {/* Source selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStreamSource("cctv")}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              streamSource === "cctv"
                ? "bg-cyan-500 text-white font-bold"
                : "bg-muted hover:bg-accent text-muted-foreground"
            }`}
          >
            NH-44 CCTV
          </button>
          <button
            type="button"
            onClick={() => setStreamSource("drone")}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              streamSource === "drone"
                ? "bg-cyan-500 text-white font-bold"
                : "bg-muted hover:bg-accent text-muted-foreground"
            }`}
          >
            Drone Feed
          </button>
        </div>
      </div>

      {/* Video Viewport / Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border/80 bg-slate-950 aspect-video max-h-[320px] flex items-center justify-center shadow-inner">
        <canvas
          ref={canvasRef}
          width={720}
          height={405}
          className="w-full h-full object-cover"
        />

        {/* Play/Pause Watermark Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <span className="px-4 py-2 rounded-xl bg-card/90 border border-border text-foreground font-mono text-xs font-bold flex items-center gap-2">
              <Pause className="w-4 h-4 text-amber-400" /> FEED PAUSED
            </span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause Feed
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-500" /> Resume Feed
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCapture}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Capture Frame & Audit
          </button>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span>FPS: <strong className="text-emerald-500">{fps}</strong></span>
          <span>Frames: <strong className="text-foreground">{frameCount}</strong></span>
          <span>Detections: <strong className="text-rose-500 font-bold">2 Active</strong></span>
        </div>
      </div>
    </div>
  );
}
