/*
 * Sidebar — CivicPulse
 * Left navigation with icon + label, status indicators
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
  Scan,
  ShieldAlert,
  MessageSquare,
  Lock,
  Brain,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/accountability", label: "Accountability", icon: Scale },
  { href: "/transparency", label: "Transparency", icon: Globe },
  { href: "/lifecycle", label: "Lifecycle", icon: Calendar },
  { href: "/engineering", label: "QA & Vision", icon: Scan },
  { href: "/fraud-intel", label: "Fraud Intel", icon: ShieldAlert },
  { href: "/engagement", label: "Engagement", icon: MessageSquare },
  { href: "/gov-security", label: "Gov & Security", icon: Lock },
  { href: "/policy-governance", label: "Policy & AI Scale", icon: Brain },
  { href: "/map", label: "Site Map", icon: MapPinned },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-56 bg-sidebar/85 backdrop-blur-md border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
        <svg
          viewBox="0 0 28 28"
          className="w-7 h-7 shrink-0 filter drop-shadow-[0_0_4px_oklch(0.84_0.15_195)]"
          aria-label="CivicPulse"
        >
          <rect x="1" y="1" width="26" height="26" fill="rgba(0,0,0,0.3)" stroke="oklch(0.84 0.15 195)" strokeWidth="1.5" rx="3" />
          <path
            d="M5 14 L10 14 L12 8 L16 20 L18 14 L23 14"
            fill="none"
            stroke="oklch(0.84 0.15 195)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="14" r="2.5" fill="oklch(0.84 0.15 195)" />
        </svg>
        <span
          className="text-sm font-bold tracking-wider"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          CIVIC<span className="text-primary">PULSE</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold tracking-wider transition-all duration-300 rounded-md ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_oklch(0.84_0.15_195/0.2)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <item.icon size={15} className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
              {item.label.toUpperCase()}
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      <div className="px-5 py-4 border-t border-border bg-card/10">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 tracking-widest font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse-emerald inline-block" />
          SYSTEM LIVE
        </div>
        <div className="text-[9px] text-muted-foreground/45 mt-1 font-medium" style={{ fontFamily: "var(--font-mono)" }}>
          v2.5.0 · synced
        </div>
      </div>
    </aside>
  );
}
