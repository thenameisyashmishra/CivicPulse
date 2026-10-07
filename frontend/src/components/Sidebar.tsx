/*
 * Sidebar — CivicPulse
 * Left navigation with expandable/collapsible width, icon + label, status indicators, and tooltips
 */
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  FileBarChart,
  MapPinned,
  Settings,
  Scale,
  Globe,
  Calendar,
  ShieldAlert,
  MessageSquare,
  Lock,
  Brain,
  Camera,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  X,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useState, useEffect } from "react";
import { getSavedUser } from "@/lib/data";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  roles?: string[]; // If omitted, visible to all roles
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/engineering", label: "Pothole Camera AI", icon: Camera, badge: "LIVE", roles: ["admin", "engineer"] },
  { href: "/accountability", label: "Accountability", icon: Scale, roles: ["admin", "engineer", "pradhan"] },
  { href: "/transparency", label: "Transparency", icon: Globe },
  { href: "/lifecycle", label: "Lifecycle", icon: Calendar, roles: ["admin", "engineer", "pradhan"] },
  { href: "/fraud-intel", label: "Fraud Intel", icon: ShieldAlert, roles: ["admin", "engineer"] },
  { href: "/engagement", label: "Engagement", icon: MessageSquare },
  { href: "/gov-security", label: "Gov & Security", icon: Lock, roles: ["admin"] },
  { href: "/policy-governance", label: "Policy & AI Scale", icon: Brain, roles: ["admin"] },
  { href: "/map", label: "Site Map", icon: MapPinned },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [user, setUser] = useState(getSavedUser());
  const {
    isCollapsed,
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    isMobileOpen,
    closeMobileSidebar,
  } = useSidebar();

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(getSavedUser());
    };
    window.addEventListener("cp_user_updated", handleUserUpdate);
    return () => window.removeEventListener("cp_user_updated", handleUserUpdate);
  }, []);

  const currentRole = user?.role || "citizen";
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });

  const renderNavLinks = (isMobile = false) => {
    return visibleNavItems.map((item) => {
      const isActive =
        item.href === "/" ? location === "/" : location.startsWith(item.href);

      if (isCollapsed && !isMobile) {
        return (
          <Tooltip key={item.href} delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={`relative flex items-center justify-center p-2.5 text-xs font-semibold tracking-wider transition-all duration-200 rounded-md cursor-pointer ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-xs font-bold dark:text-cyan-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                aria-label={item.label}
              >
                <item.icon
                  size={17}
                  className={`transition-transform duration-200 ${
                    isActive ? "scale-110 text-primary dark:text-cyan-400" : ""
                  }`}
                />
                {item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-xs tracking-wider z-50">
              <div className="flex items-center gap-2">
                <span>{item.label.toUpperCase()}</span>
                {item.badge && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                    {item.badge}
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={isMobile ? closeMobileSidebar : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold tracking-wider transition-all duration-200 rounded-md cursor-pointer ${
            isActive
              ? "bg-primary/10 text-primary border border-primary/25 shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          }`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <item.icon
            size={16}
            className={`shrink-0 transition-transform duration-200 ${
              isActive ? "scale-110 text-primary dark:text-cyan-400" : ""
            }`}
          />
          <span className="flex-1 truncate">{item.label.toUpperCase()}</span>
          {item.badge && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 animate-pulse">
              {item.badge}
            </span>
          )}
        </Link>
      );
    });
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in-0 duration-200"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (visible when isMobileOpen is true) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-sidebar/95 backdrop-blur-md border-r border-border flex flex-col z-50 md:hidden transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <svg
              viewBox="0 0 28 28"
              className="w-7 h-7 shrink-0 text-primary drop-shadow-xs"
              aria-label="CivicPulse"
            >
              <rect
                x="1"
                y="1"
                width="26"
                height="26"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="currentColor"
                strokeWidth="1.5"
                rx="4"
              />
              <path
                d="M5 14 L10 14 L12 8 L16 20 L18 14 L23 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="14" cy="14" r="2.5" fill="currentColor" />
            </svg>
            <span
              className="text-sm font-bold tracking-wider text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              CIVIC<span className="text-primary font-extrabold">PULSE</span>
            </span>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            title="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {renderNavLinks(true)}
        </nav>

        <div className="px-4 py-3 border-t border-border bg-card/10">
          <div
            className="flex items-center gap-2 text-[10px] text-muted-foreground/80 tracking-widest font-semibold"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse-emerald inline-block" />
            SYSTEM LIVE
          </div>
          <div
            className="text-[9px] text-muted-foreground/45 mt-0.5 font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            v2.5.0 · synced
          </div>
        </div>
      </aside>

      {/* Desktop Responsive Sidebar (Collapsible Rail <-> Expanded) */}
      <aside
        className={`bg-sidebar/85 backdrop-blur-md border-r border-border flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out z-30 max-md:hidden ${
          isCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Header / Logo */}
        {isCollapsed ? (
          <div className="h-14 flex flex-col items-center justify-center border-b border-border px-2">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={expandSidebar}
                  title="Expand Sidebar (Ctrl+B)"
                  aria-label="Expand Sidebar"
                  className="p-2 rounded-lg text-primary hover:bg-accent/60 transition-all cursor-pointer flex items-center justify-center group"
                >
                  <svg
                    viewBox="0 0 28 28"
                    className="w-7 h-7 shrink-0 text-primary group-hover:scale-110 transition-transform drop-shadow-xs"
                    aria-label="CivicPulse"
                  >
                    <rect
                      x="1"
                      y="1"
                      width="26"
                      height="26"
                      fill="currentColor"
                      fillOpacity="0.1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <path
                      d="M5 14 L10 14 L12 8 L16 20 L18 14 L23 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="14" cy="14" r="2.5" fill="currentColor" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="text-xs font-semibold">Expand Sidebar (Ctrl+B)</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <svg
                viewBox="0 0 28 28"
                className="w-7 h-7 shrink-0 text-primary drop-shadow-xs"
                aria-label="CivicPulse"
              >
                <rect
                  x="1"
                  y="1"
                  width="26"
                  height="26"
                  fill="currentColor"
                  fillOpacity="0.1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  rx="4"
                />
                <path
                  d="M5 14 L10 14 L12 8 L16 20 L18 14 L23 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="14" cy="14" r="2.5" fill="currentColor" />
              </svg>
              <span
                className="text-sm font-bold tracking-wider text-foreground truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                CIVIC<span className="text-primary font-extrabold">PULSE</span>
              </span>
            </Link>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={collapseSidebar}
                  title="Collapse Sidebar (Ctrl+B)"
                  aria-label="Collapse Sidebar"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                >
                  <PanelLeftClose size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="text-xs font-semibold">Collapse Sidebar (Ctrl+B)</span>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Nav Links */}
        <nav
          className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none ${
            isCollapsed ? "px-2" : "px-3"
          }`}
        >
          {renderNavLinks(false)}
        </nav>

        {/* Bottom System Status & Quick Toggle */}
        {isCollapsed ? (
          <div className="py-3 px-2 border-t border-border bg-card/10 flex flex-col items-center gap-2">
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="cursor-default flex items-center justify-center p-1.5 rounded-full hover:bg-accent/30 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 status-pulse-emerald inline-block" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="text-xs font-mono font-medium">SYSTEM LIVE · v2.5.0</div>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  title="Expand Sidebar (Ctrl+B)"
                  aria-label="Expand Sidebar"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/60 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="text-xs font-semibold">Expand Sidebar (Ctrl+B)</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-border bg-card/10 flex items-center justify-between">
            <div>
              <div
                className="flex items-center gap-2 text-[10px] text-muted-foreground/80 tracking-widest font-semibold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse-emerald inline-block" />
                SYSTEM LIVE
              </div>
              <div
                className="text-[9px] text-muted-foreground/45 mt-0.5 font-medium"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                v2.5.0 · synced
              </div>
            </div>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={collapseSidebar}
                  title="Collapse Sidebar (Ctrl+B)"
                  aria-label="Collapse Sidebar"
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/60 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="text-xs font-semibold">Collapse Sidebar (Ctrl+B)</span>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </>
  );
}
