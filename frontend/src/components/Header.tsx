/*
 * Header — CivicPulse
 * Top bar with system status, alerts, and dynamic user dropdown (Log Out).
 */
import { Bell, Search, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { getSavedUser, clearToken } from "@/lib/data";

export default function Header() {
  const [showAlerts, setShowAlerts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [, navigate] = useLocation();

  const user = getSavedUser();

  // Helper to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <header className="h-14 bg-card/75 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0 relative z-40">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/30 border border-border/80 rounded-md px-3 py-1.5 w-72 focus-within:border-primary/50 transition-all duration-300">
          <Search size={14} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects, verifications..."
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none w-full font-medium"
            style={{ fontFamily: "var(--font-heading)" }}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Alerts */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={16} />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-destructive text-[8px] text-white flex items-center justify-center font-bold rounded-full border-2 border-card">
              3
            </span>
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-10 w-80 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-xl z-50 overflow-hidden premium-glow">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                  ACTIVE ALERTS
                </span>
              </div>
              <div className="py-1">
                <AlertItem
                  severity="critical"
                  text="PW-2024-002: Budget overrun detected (+16%)"
                  time="2h ago"
                />
                <AlertItem
                  severity="warning"
                  text="PW-2024-004: Site inactive for 14+ days"
                  time="5h ago"
                />
                <AlertItem
                  severity="info"
                  text="VR-005: Verification pending — awaiting upload"
                  time="8h ago"
                />
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border border-border/80 rounded-md hover:bg-muted/40 transition-colors shadow-sm"
          >
            <div
              className="w-6 h-6 bg-primary/20 border border-primary/40 rounded flex items-center justify-center text-[10px] font-bold text-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {user ? getInitials(user.name) : "U"}
            </div>
            <div className="text-left hidden md:block">
              <span className="text-xs text-foreground font-semibold tracking-wide block flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                {user ? user.name : "Guest User"}
                {user?.aadhaar_verified && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block status-pulse-emerald" title="Aadhaar Verified via DigiLocker" />}
              </span>
              <span className="text-[8px] text-muted-foreground font-bold block uppercase leading-none mt-0.5 tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                {user ? user.role : "Guest"}
              </span>
            </div>
            <ChevronDown size={11} className="text-muted-foreground ml-1" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-11 w-48 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden premium-glow animate-fade-in">
              <div className="px-4 py-3 border-b border-border text-xs bg-muted/20">
                <p className="text-muted-foreground font-bold tracking-widest text-[9px]" style={{ fontFamily: "var(--font-mono)" }}>SIGNED IN AS</p>
                <p className="text-foreground truncate mt-0.5 font-medium">{user?.email || "guest@civicpulse.gov.in"}</p>
                <div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center gap-1.5">
                  {user?.aadhaar_verified ? (
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                      ✓ AADHAAR VERIFIED
                    </span>
                  ) : (
                    <span className="text-[9px] text-rose-400 font-bold tracking-widest flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                      ⚠ AADHAAR UNVERIFIED
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors font-semibold tracking-wider"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <LogOut size={13} />
                SIGN OUT
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AlertItem({ severity, text, time }: { severity: string; text: string; time: string }) {
  const colors: Record<string, string> = {
    critical: "bg-destructive",
    warning: "bg-amber-500",
    info: "bg-primary",
  };
  return (
    <div className="px-4 py-2.5 hover:bg-accent flex items-start gap-3 border-b border-border/50 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors[severity]}`} />
      <div className="flex-1">
        <p className="text-xs text-foreground leading-snug">{text}</p>
        <span className="text-[10px] text-muted-foreground mt-0.5 block" style={{ fontFamily: "var(--font-mono)" }}>
          {time}
        </span>
      </div>
    </div>
  );
}
