/*
 * CommandMenu — CivicPulse
 * Global Command Palette & Search modal powered by cmdk.
 * Supports keyboard shortcut (Ctrl+K / Cmd+K) and Header search bar trigger.
 * Searches across projects registry, AI verifications/evidence, and quick navigation actions.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  MapPinned,
  FileBarChart,
  Settings,
  Upload,
  Download,
  LogOut,
  Building2,
  Brain,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  fetchProjects,
  fetchVerifications,
  formatCurrency,
  clearToken,
  budgetCsvUrl,
  type Project,
  type Verification,
  type ProjectStatus,
  type VerificationStatus,
} from "@/lib/data";

export interface CommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandMenu({ open: controlledOpen, onOpenChange }: CommandMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [, navigate] = useLocation();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      onOpenChange?.(val);
    } else {
      setUncontrolledOpen(val);
    }
  };

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isControlled, onOpenChange]);

  // Fetch Projects with React Query cache
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // Fetch Verifications with React Query cache
  const { data: verifications = [] } = useQuery<Verification[]>({
    queryKey: ["verifications"],
    queryFn: () => fetchVerifications(),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // Navigation action helper
  const handleSelect = (action: () => void) => {
    setOpen(false);
    action();
  };

  const handleLogout = () => {
    setOpen(false);
    clearToken();
    navigate("/login");
  };

  const handleDownloadCsv = () => {
    setOpen(false);
    window.open(budgetCsvUrl(), "_blank");
  };

  // Status badges helpers
  const renderProjectStatusBadge = (status: ProjectStatus) => {
    const badgeConfig: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
      active: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
      completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
      delayed: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
      flagged: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
    };
    const cfg = badgeConfig[status] || badgeConfig.active;
    return (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border} font-bold uppercase tracking-wider shrink-0`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {status}
      </span>
    );
  };

  const renderVerificationStatusBadge = (status: VerificationStatus) => {
    const badgeConfig: Record<VerificationStatus, { bg: string; text: string; border: string }> = {
      verified: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
      pending: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
      failed: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
      review: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    };
    const cfg = badgeConfig[status] || badgeConfig.pending;
    return (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border} font-bold uppercase tracking-wider shrink-0`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {status}
      </span>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="CivicPulse Command Palette"
      description="Search public works projects, AI verifications, and system actions"
      className="sm:max-w-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-[0_0_50px_-10px_oklch(0.84_0.15_195/0.2)] rounded-xl overflow-hidden"
    >
      {/* Search Input Bar */}
      <div className="relative border-b border-border/70 bg-muted/10">
        <CommandInput
          placeholder="Search projects, verifications, commands, locations..."
          className="h-13 text-sm text-foreground placeholder:text-muted-foreground/60 bg-transparent font-medium"
        />
      </div>

      {/* Results List */}
      <CommandList className="max-h-[380px] p-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <CommandEmpty className="py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/80 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Search size={18} />
          </div>
          <p className="text-sm font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
            No matching civic assets or commands
          </p>
          <p className="text-xs text-muted-foreground/75 mt-1 max-w-xs mx-auto" style={{ fontFamily: "var(--font-mono)" }}>
            Search by project ID (e.g. PW-2024), verification (e.g. VR-001), contractor, location, or quick actions.
          </p>
        </CommandEmpty>

        {/* Quick Actions & Navigation Group */}
        <CommandGroup
          heading="QUICK ACTIONS & NAVIGATION"
          className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-primary/70 [&_[cmdk-group-heading]]:uppercase"
        >
          <CommandItem
            value="Dashboard Overview Metrics KPIs Home telemetry"
            onSelect={() => handleSelect(() => navigate("/"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary shrink-0">
                <LayoutDashboard size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Dashboard Overview
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Main system telemetry, active tenders & expenditure KPIs
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Projects Registry Public Works Tenders infrastructure browse"
            onSelect={() => handleSelect(() => navigate("/projects"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <FolderKanban size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Projects Registry
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Inspect public works, contractor performance & budgets
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="AI Verifications Evidence ground truth computer vision upload audit vote"
            onSelect={() => handleSelect(() => navigate("/verifications"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <ShieldCheck size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  AI Verifications & Ground Evidence
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Review computer vision analysis, satellite matches & citizen votes
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Site Map Radar geographic geospatial GIS geofence interactive"
            onSelect={() => handleSelect(() => navigate("/map"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <MapPinned size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Geographic Site Map Radar
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Geospatial overview with geofenced boundaries & active clusters
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="System Reports Budget Analytics financial allocation expenditure"
            onSelect={() => handleSelect(() => navigate("/reports"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <FileBarChart size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  System & Budget Reports
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Fiscal breakdown, budget utilization & trend analytics
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Account Settings Profile DigiLocker Aadhaar Verification Security Password MFA"
            onSelect={() => handleSelect(() => navigate("/settings"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-muted/40 border border-border text-foreground shrink-0">
                <Settings size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Account & Security Settings
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  DigiLocker Aadhaar e-KYC, password rotation & profile config
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ↵
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Upload Ground Evidence Verification Photo citizen contractor submit new"
            onSelect={() => handleSelect(() => navigate("/verifications"))}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-primary/15 border border-primary/30 text-primary shrink-0">
                <Upload size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Upload Ground Verification
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Submit a geotagged photo for AI vision verification & consensus
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              ACTION
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Download Budget Summary CSV spreadsheet export financial report"
            onSelect={handleDownloadCsv}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Download size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Download Budget Summary (CSV)
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Export all project financial data and allocation logs
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-muted-foreground/70 bg-card px-1.5 py-0.5 rounded border border-border/80">
              EXPORT
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Projects Registry Group */}
        {projects.length > 0 && (
          <>
            <CommandSeparator className="my-2 bg-border/60" />
            <CommandGroup
              heading={`PROJECTS REGISTRY (${projects.length})`}
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-primary/70 [&_[cmdk-group-heading]]:uppercase"
            >
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.id} ${project.name} ${project.location} ${project.contractor} ${project.type} ${project.status} ${project.budget}`}
                  onSelect={() => handleSelect(() => navigate("/projects"))}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted/40 border border-border text-primary shrink-0">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono font-bold text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {project.id}
                        </span>
                        <span className="font-semibold text-foreground truncate" style={{ fontFamily: "var(--font-heading)" }}>
                          {project.name}
                        </span>
                      </div>
                      <div
                        className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <span>{project.location}</span>
                        <span>·</span>
                        <span>{project.contractor}</span>
                        <span>·</span>
                        <span className="text-foreground/90 font-medium">{formatCurrency(project.budget)}</span>
                        <span>·</span>
                        <span className="text-primary font-medium">{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0">
                    {renderProjectStatusBadge(project.status)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* AI Verifications Group */}
        {verifications.length > 0 && (
          <>
            <CommandSeparator className="my-2 bg-border/60" />
            <CommandGroup
              heading={`AI VERIFICATIONS & EVIDENCE (${verifications.length})`}
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-primary/70 [&_[cmdk-group-heading]]:uppercase"
            >
              {verifications.map((verification) => (
                <CommandItem
                  key={verification.id}
                  value={`${verification.id} ${verification.projectName} ${verification.projectId} ${verification.status} ${verification.confidence} ${verification.findings.join(" ")} ${verification.aiAnalysis}`}
                  onSelect={() => handleSelect(() => navigate("/verifications"))}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground data-[selected=true]:border-primary/40 border border-transparent transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                      <Brain size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono font-bold text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {verification.id}
                        </span>
                        <span className="font-semibold text-foreground truncate" style={{ fontFamily: "var(--font-heading)" }}>
                          {verification.projectName}
                        </span>
                      </div>
                      <div
                        className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <span className="text-emerald-400 font-semibold">{verification.confidence}% AI Match</span>
                        <span>·</span>
                        <span className="truncate">
                          {verification.findings[0] || verification.aiAnalysis.slice(0, 50)}
                        </span>
                        <span>·</span>
                        <span>{verification.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0">
                    {renderVerificationStatusBadge(verification.status)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Session Group */}
        <CommandSeparator className="my-2 bg-border/60" />
        <CommandGroup
          heading="SESSION & ACCESS"
          className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-primary/70 [&_[cmdk-group-heading]]:uppercase"
        >
          <CommandItem
            value="Log Out Sign Out exit session disconnect clear token"
            onSelect={handleLogout}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer text-rose-400 hover:text-rose-300 data-[selected=true]:bg-rose-500/15 data-[selected=true]:text-rose-300 data-[selected=true]:border-rose-500/30 border border-transparent transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <LogOut size={15} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                  Sign Out of CivicPulse
                </div>
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  Clear current authentication session and return to login
                </div>
              </div>
            </div>
            <CommandShortcut className="text-[10px] font-mono text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              SIGN OUT
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Cyber HUD Footer */}
      <div className="px-4 py-2.5 bg-card/60 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground select-none">
        <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse-emerald inline-block" />
          <span className="font-bold tracking-widest text-muted-foreground/90 uppercase">CIVICPULSE COMMAND INTERFACE</span>
        </div>
        <div className="hidden sm:flex items-center gap-3" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted/40 border border-border/80 rounded text-[9px] text-foreground">↑↓</kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted/40 border border-border/80 rounded text-[9px] text-foreground">↵</kbd>
            <span>Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted/40 border border-border/80 rounded text-[9px] text-foreground">ESC</kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}

export default CommandMenu;
