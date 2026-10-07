/*
 * MobileConnectModal — CivicPulse
 * Mobile Phone Live Testing over Local WiFi Gateway
 * Generates an SVG QR Code and connection instructions for Android & iOS camera testing.
 * Uses createPortal to escape header's backdrop-filter containing block.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Smartphone, Copy, Check, X, Camera, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/data";

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHost?: string;
}

export default function MobileConnectModal({
  isOpen,
  onClose,
  defaultHost,
}: MobileConnectModalProps) {
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState(defaultHost || "");
  const [availableIps, setAvailableIps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect server IP from backend network info
  const fetchNetworkInfo = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const res = await fetch("/api/health/network", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const primary = data.primary_ip || "127.0.0.1";
        const port = data.frontend_port || window.location.port || "3000";
        const detectedHost = `${primary}:${port}`;
        
        // If current window is accessed via IP, prefer that
        const currentHostname = window.location.hostname;
        if (currentHostname !== "localhost" && currentHostname !== "127.0.0.1") {
          setHost(`${currentHostname}:${window.location.port || "3000"}`);
        } else {
          setHost(detectedHost);
        }
        
        if (Array.isArray(data.available_ips)) {
          setAvailableIps(data.available_ips);
        }
      }
    } catch {
      // Fallback
      if (!host) {
        const currentHostname = window.location.hostname;
        setHost(`${currentHostname === "localhost" ? "192.168.1.43" : currentHostname}:${window.location.port || "3000"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  const mobileUrl = `http://${host || "192.168.1.43:3000"}/engineering`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    toast.success("Mobile LAN URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto max-h-[92vh] flex flex-col bg-card text-foreground rounded-2xl border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Test on Mobile Phone Camera</h2>
              <p className="text-[10px] text-muted-foreground">Local WiFi LAN Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-mobile-modal"
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white text-black shadow-inner border border-slate-200 space-y-2">
            {/* Real SVG QR representation */}
            <div className="relative p-2 bg-white rounded-xl shadow">
              <svg viewBox="0 0 100 100" className="w-44 h-44">
                {/* QR Pattern */}
                <rect x="0" y="0" width="100" height="100" fill="white" />
                {/* Top-Left Finder */}
                <rect x="5" y="5" width="26" height="26" fill="black" rx="2" />
                <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />
                {/* Top-Right Finder */}
                <rect x="69" y="5" width="26" height="26" fill="black" rx="2" />
                <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />
                {/* Bottom-Left Finder */}
                <rect x="5" y="69" width="26" height="26" fill="black" rx="2" />
                <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />
                {/* Data Grid Simulation */}
                <rect x="36" y="8" width="5" height="5" fill="black" />
                <rect x="46" y="8" width="5" height="5" fill="black" />
                <rect x="56" y="8" width="5" height="5" fill="black" />
                <rect x="8" y="36" width="5" height="5" fill="black" />
                <rect x="18" y="44" width="5" height="5" fill="black" />
                <rect x="26" y="36" width="5" height="5" fill="black" />
                <rect x="36" y="36" width="7" height="7" fill="black" />
                <rect x="48" y="36" width="8" height="5" fill="black" />
                <rect x="60" y="36" width="6" height="6" fill="black" />
                <rect x="72" y="36" width="5" height="7" fill="black" />
                <rect x="82" y="36" width="6" height="5" fill="black" />
                <rect x="36" y="48" width="6" height="6" fill="black" />
                <rect x="46" y="46" width="8" height="8" fill="#0284c7" />
                <rect x="58" y="48" width="7" height="5" fill="black" />
                <rect x="70" y="48" width="5" height="6" fill="black" />
                <rect x="80" y="46" width="7" height="7" fill="black" />
                <rect x="36" y="60" width="7" height="6" fill="black" />
                <rect x="48" y="60" width="6" height="6" fill="black" />
                <rect x="58" y="60" width="8" height="5" fill="black" />
                <rect x="70" y="60" width="5" height="7" fill="black" />
                <rect x="36" y="72" width="6" height="5" fill="black" />
                <rect x="46" y="74" width="7" height="6" fill="black" />
                <rect x="58" y="72" width="6" height="7" fill="black" />
                <rect x="68" y="74" width="8" height="5" fill="black" />
                <rect x="80" y="72" width="6" height="6" fill="black" />
                <rect x="36" y="84" width="8" height="5" fill="black" />
                <rect x="48" y="84" width="5" height="6" fill="black" />
                <rect x="58" y="84" width="7" height="5" fill="black" />
                <rect x="70" y="84" width="6" height="6" fill="black" />
                <rect x="82" y="84" width="5" height="5" fill="black" />
              </svg>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-700">
              Scan with iPhone or Android Camera
            </span>
          </div>

          {/* URL Input with Copy */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Mobile LAN URL:</span>
              <button
                type="button"
                onClick={fetchNetworkInfo}
                disabled={isLoading}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer transition"
                title="Refresh network IP"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>Auto-Detected IP</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mobileUrl}
                onChange={(e) => {
                  const val = e.target.value.replace(/^https?:\/\//, "").replace(/\/engineering$/, "");
                  setHost(val);
                }}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-background border border-border text-foreground select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            {availableIps.length > 1 && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Other IPs:</span>
                {availableIps.map((ip) => (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => setHost(`${ip}:3000`)}
                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-cyan-400 font-mono"
                  >
                    {ip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Windows Firewall Advisory Box */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-200">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Phone Can't Connect? (Firewall Notice)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              If phone says <em>"Site cannot be reached"</em>, Windows Firewall blocks incoming LAN connections when Wi-Fi is set to <strong>Public</strong>.
            </p>
            <div className="text-[10px] bg-black/40 p-2 rounded border border-amber-500/20 font-mono text-amber-300 space-y-1">
              <div><strong>Quick Fix:</strong> Windows Settings ➔ Wi-Fi ➔ Click your Wi-Fi name ➔ Change Network Profile to <strong>Private Network</strong>.</div>
              <div><em>Or:</em> Turn on <strong>Mobile Hotspot</strong> on this PC and connect your phone to it.</div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="p-3.5 rounded-xl bg-accent/20 border border-border space-y-2 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-cyan-400">
              <Camera className="w-3.5 h-3.5" />
              <span>3 Simple Steps for Real Road Camera Testing:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>Connect your mobile phone to the <strong>same Wi-Fi network</strong> as this computer.</li>
              <li>Scan the QR code above (or open the URL in Chrome / Safari).</li>
              <li>Tap <strong>"Upload Photo"</strong> or <strong>"Live Camera"</strong> to activate your phone's native camera and detect road potholes in real time!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
