/*
 * Header — CivicPulse
 * Top bar with system status, real-time WebSocket alert center, command palette, and user dropdown.
 */
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Trash2,
  CheckCheck,
  Radio,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Camera,
  Smartphone,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { getSavedUser, clearToken, saveUser, DEMO_PERSONAS } from "@/lib/data";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { toast } from "sonner";
import CommandMenu from "./CommandMenu";
import MobileConnectModal from "./MobileConnectModal";
import {
  useWebSocketNotifications,
  formatRelativeTime,
  NotificationItem,
} from "@/hooks/useWebSocketNotifications";
import { useOfflineQueue } from "@/lib/offlineSync";

export default function Header() {
  const [showAlerts, setShowAlerts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const alertsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState(getSavedUser());
  const { isSimulatedOffline, toggleSimulatedOffline } = useOfflineQueue();

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(getSavedUser());
    };
    window.addEventListener("cp_user_updated", handleUserUpdate);
    return () => window.removeEventListener("cp_user_updated", handleUserUpdate);
  }, []);
  const {
    notifications,
    unreadCount,
    isConnected,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  } = useWebSocketNotifications();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.projectId) {
      navigate("/projects");
      setShowAlerts(false);
    } else if (item.evidenceId) {
      navigate("/verifications");
      setShowAlerts(false);
    }
  };

  return (
    <header className="h-14 bg-card/75 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0 relative z-40">
      {/* Search Trigger & Sidebar Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden md:flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={18} className="text-primary" />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={toggleMobileSidebar}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
          className="flex md:hidden items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex items-center justify-between gap-3 bg-muted/20 hover:bg-muted/40 border border-border/80 hover:border-primary/50 rounded-md px-3 py-1.5 w-64 sm:w-80 transition-all duration-200 group text-left cursor-pointer shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary/40"
          aria-label="Open global search and command palette"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span
              className="text-xs text-muted-foreground/75 group-hover:text-foreground transition-colors font-medium truncate"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Search projects, verifications...
            </span>
          </div>
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground/80 bg-card/80 border border-border/80 rounded tracking-wider shrink-0 shadow-xs group-hover:border-primary/30 group-hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Global Command Palette */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Quick Road Camera Button */}
        <button
          type="button"
          onClick={() => navigate("/engineering")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-cyan-400 border border-primary/30 dark:border-cyan-500/30 text-xs font-bold transition shadow-xs cursor-pointer group"
          title="Open Road Pothole Live Camera AI Scanner"
        >
          <Camera size={14} className="group-hover:scale-110 transition-transform text-primary dark:text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Road Camera AI</span>
        </button>

        {/* Mobile LAN Phone Connect Button */}
        <button
          type="button"
          onClick={() => setMobileModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-accent text-foreground border border-border text-xs font-semibold transition cursor-pointer shadow-xs"
          title="Connect mobile phone over local Wi-Fi for live field testing"
        >
          <Smartphone size={14} className="text-primary dark:text-cyan-400" />
          <span className="hidden lg:inline">Connect Mobile</span>
        </button>

        {/* Mobile QR Modal */}
        <MobileConnectModal
          isOpen={mobileModalOpen}
          onClose={() => setMobileModalOpen(false)}
        />

        {/* Theme Toggle Button (Light/Dark Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-lg border border-border/60 hover:border-primary/40 cursor-pointer shadow-xs flex items-center justify-center"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun size={16} className="text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon size={16} className="text-cyan-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Offline Simulation Active Indicator Badge */}
        {isSimulatedOffline && (
          <button
            type="button"
            onClick={toggleSimulatedOffline}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold animate-pulse cursor-pointer shadow-xs"
            title="Click to deactivate Offline Field Simulation"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>OFFLINE SIM</span>
          </button>
        )}

        {/* Live Notification Center */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/30 cursor-pointer"
            aria-label="Toggle notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-destructive text-[9px] text-white flex items-center justify-center font-bold rounded-full border-2 border-card shadow-sm animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-11 w-80 sm:w-96 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50 overflow-hidden premium-glow animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-bold tracking-widest text-foreground uppercase"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    MUNICIPAL ALERTS
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider border bg-background/60 shadow-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected
                          ? "bg-emerald-400 status-pulse-emerald"
                          : connectionStatus === "connecting"
                          ? "bg-amber-400 animate-ping"
                          : "bg-rose-400"
                      }`}
                    />
                    <span
                      className={
                        isConnected
                          ? "text-emerald-400"
                          : connectionStatus === "connecting"
                          ? "text-amber-400"
                          : "text-rose-400"
                      }
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {isConnected ? "LIVE" : connectionStatus === "connecting" ? "CONNECTING" : "OFFLINE"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded flex items-center gap-1 font-medium hover:bg-muted/50 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} />
                      <span>Read all</span>
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] text-muted-foreground hover:text-rose-400 transition-colors px-2 py-1 rounded flex items-center gap-1 font-medium hover:bg-rose-500/10 cursor-pointer"
                      title="Clear all alerts"
                    >
                      <Trash2 size={12} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Alerts List */}
              <div className="max-h-84 overflow-y-auto divide-y divide-border/40">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/80 flex items-center justify-center mx-auto text-muted-foreground mb-3">
                      <Bell size={18} className="opacity-40" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No Active Alerts</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      You are up to date with real-time municipal project feeds.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <AlertCard
                      key={item.id}
                      item={item}
                      onClick={() => handleNotificationClick(item)}
                      onDismiss={(e) => {
                        e.stopPropagation();
                        removeNotification(item.id);
                      }}
                    />
                  ))
                )}
              </div>

              {/* Footer status */}
              <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  <Radio size={11} className={isConnected ? "text-emerald-400 animate-pulse" : "text-muted-foreground"} />
                  {isConnected ? "WebSocket stream active" : "Reconnecting to stream..."}
                </span>
                <span>{notifications.length} alerts</span>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border border-border/80 rounded-md hover:bg-muted/40 transition-colors shadow-sm cursor-pointer"
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
            <div className="absolute right-0 top-11 w-64 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden premium-glow animate-fade-in">
              <div className="px-4 py-3 border-b border-border text-xs bg-muted/20">
                <p className="text-muted-foreground font-bold tracking-widest text-[9px]" style={{ fontFamily: "var(--font-mono)" }}>SIGNED IN AS</p>
                <p className="text-foreground truncate mt-0.5 font-medium">{user?.email || "guest@civicpulse.gov.in"}</p>
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-primary font-mono">{user?.role || "CITIZEN"}</span>
                  {user?.aadhaar_verified ? (
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                      ✓ AADHAAR VERIFIED
                    </span>
                  ) : (
                    <span className="text-[9px] text-rose-400 font-bold tracking-widest flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                      ⚠ UNVERIFIED
                    </span>
                  )}
                </div>
              </div>

              {/* Persona Switcher for Evaluation */}
              <div className="px-3 py-2 border-b border-border bg-muted/10">
                <p className="text-muted-foreground font-bold tracking-widest text-[9px] px-1 mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  SWITCH ROLE PERSONA (DEMO)
                </p>
                <div className="space-y-0.5">
                  {DEMO_PERSONAS.map((p) => {
                    const isCurrent = user?.role === p.role;
                    return (
                      <button
                        key={p.role}
                        type="button"
                        onClick={() => {
                          saveUser(p);
                          toast.success(`Active persona: ${p.label}`);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-primary/15 text-primary font-bold border border-primary/30"
                            : "hover:bg-accent/60 text-foreground"
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted uppercase text-muted-foreground font-bold shrink-0 ml-1.5">
                          {p.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field Mode Offline Simulation Toggle */}
              <div className="px-3 py-2 border-b border-border bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground font-bold tracking-widest text-[9px]" style={{ fontFamily: "var(--font-mono)" }}>
                      OFFLINE FIELD SIMULATOR
                    </p>
                    <p className="text-[10px] text-muted-foreground">Test rural queue & auto-sync</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleSimulatedOffline();
                      setShowDropdown(false);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                      isSimulatedOffline
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {isSimulatedOffline ? "ACTIVE (OFFLINE)" : "SIMULATE"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors font-semibold tracking-wider cursor-pointer"
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

function AlertCard({
  item,
  onClick,
  onDismiss,
}: {
  item: NotificationItem;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return {
          icon: <AlertCircle size={14} className="text-rose-400 shrink-0" />,
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          dotClass: "bg-rose-500",
          label: "CRITICAL",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={14} className="text-amber-400 shrink-0" />,
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dotClass: "bg-amber-400",
          label: "WARNING",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />,
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dotClass: "bg-emerald-400",
          label: "SUCCESS",
        };
      case "info":
      default:
        return {
          icon: <Info size={14} className="text-primary shrink-0" />,
          badgeClass: "bg-primary/10 text-primary border-primary/30",
          dotClass: "bg-primary",
          label: "INFO",
        };
    }
  };

  const config = getSeverityConfig(item.severity);

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 hover:bg-accent/40 transition-colors group cursor-pointer relative flex items-start gap-3 ${
        !item.read ? "bg-primary/5" : ""
      }`}
    >
      <div className="mt-0.5">{config.icon}</div>

      <div className="flex-1 min-w-0">
        {/* Top line with Project Tag, Status Badge and Time */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.projectId && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-muted text-muted-foreground border border-border tracking-wider uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {item.projectId}
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded border tracking-wider uppercase ${config.badgeClass}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {config.label}
            </span>
          </div>

          <span
            className="text-[10px] text-muted-foreground/75 shrink-0"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>

        {/* Title */}
        <p
          className={`text-xs leading-snug font-semibold transition-colors ${
            !item.read ? "text-foreground font-bold" : "text-foreground/90"
          }`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {item.title}
        </p>

        {/* Message */}
        {item.message && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {item.message}
          </p>
        )}
      </div>

      {/* Dismiss button & Unread Indicator */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
        <button
          onClick={onDismiss}
          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all cursor-pointer"
          title="Dismiss notification"
        >
          <X size={12} />
        </button>
        {!item.read && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary status-pulse-primary" title="Unread" />
        )}
      </div>
    </div>
  );
}
