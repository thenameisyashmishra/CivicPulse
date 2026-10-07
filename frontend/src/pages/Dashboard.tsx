/*
 * Dashboard — CivicPulse
 * Overview with KPIs, project status grid, budget chart, recent verifications.
 * Data is now loaded from the live API via fetchProjects / fetchVerifications / fetchBudgetTimeline.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchProjects,
  fetchVerifications,
  fetchBudgetTimeline,
  submitReview,
  castVote,
  getSavedUser,
  quickSwitchRole,
  formatCurrency,
  statusColors,
  verificationColors,
  type Project,
  type Verification,
  type BudgetData,
} from "@/lib/data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<string>("");
  const [voteComment, setVoteComment] = useState<string>("");
  const [currentUser, setCurrentUser] = useState(getSavedUser());

  const { data: projects = [], isLoading: loadingProjects, error: errProjects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });

  const { data: verifications = [], isLoading: loadingVerifications, error: errVerifications } = useQuery<Verification[]>({
    queryKey: ["verifications"],
    queryFn: () => fetchVerifications(),
  });

  const { data: budgetTimeline = [], isLoading: loadingBudget, error: errBudget } = useQuery<BudgetData[]>({
    queryKey: ["budgetTimeline"],
    queryFn: () => fetchBudgetTimeline(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ evidenceId, decision, remarks }: { evidenceId: number; decision: "approved" | "rejected"; remarks: string }) =>
      submitReview(evidenceId, decision, remarks),
    onSuccess: () => {
      toast.success("Review decision successfully registered on cryptographic audit trail!");
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setReviewRemarks("");
      setSelectedVerification(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Review submission failed");
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ evidenceId, choice, comment }: { evidenceId: number; choice: "completed" | "incomplete"; comment: string }) =>
      castVote(evidenceId, choice, comment),
    onSuccess: () => {
      toast.success("Citizen quality vote recorded!");
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setVoteComment("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Voting failed");
    },
  });

  const handleRoleSwitch = async (role: "admin" | "engineer" | "pradhan" | "citizen") => {
    try {
      const res = await quickSwitchRole(role);
      setCurrentUser(res.user);
      toast.success(`Switched active persona to ${role.toUpperCase()} (${res.user.name})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch persona");
    }
  };

  const loading = loadingProjects || loadingVerifications || loadingBudget;
  const errorObj = errProjects || errVerifications || errBudget;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? String(errorObj) : null;

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const failedCount = verifications.filter((v) => v.status === "failed").length;
  const reviewCount = verifications.filter((v) => v.status === "review").length;

  const filteredVerifications =
    verificationFilter === "all"
      ? verifications
      : verifications.filter((v) => v.status === verificationFilter);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
            {loading
              ? "Loading live data from API…"
              : error
              ? `⚠ ${error}`
              : `Live data · ${projects.length} projects · ${verifications.length} verifications`}
          </p>
        </div>

        {loading && (
          <div
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)", padding: "2rem 0" }}
          >
            Fetching from CivicPulse API…
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Active Projects" value={activeProjects.toString()} subtext={`${completedProjects} completed`} trend="up" color="#00D4FF" />
              <KPICard label="Budget Utilization" value={`${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%`} subtext={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)}`} trend="up" color="#00E676" />
              <KPICard label="AI Verifications" value={`${verifiedCount}/${verifications.length}`} subtext={`${failedCount} failed`} trend={failedCount > 0 ? "down" : "neutral"} color="#FFB347" />
              <KPICard label="Avg Progress" value={`${avgProgress}%`} subtext="Across all projects" trend="up" color="#FF4757" />
            </div>

            {/* Direct Pothole Camera AI Quick Launcher Banner */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-card/80 to-background flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">
                      AI Road Pothole & Surface Inspection Camera
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                      IRC:82-2015 LIVE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click photo using direct webcam/mobile camera or upload road imagery for instant IRC:82 severity scoring, volume & repair estimation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <Link
                  href="/engineering"
                  className="w-full md:w-auto px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs shadow-md hover:shadow-cyan-500/25 flex items-center justify-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  Open Camera Scanner &rarr;
                </Link>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Budget Chart */}
              <div className="lg:col-span-2 cyber-card shadow-sm">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    BUDGET ALLOCATION vs SPEND (per project · Crores ₹)
                  </span>
                  <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono)" }}>
                    LIVE
                  </span>
                </div>
                <div className="p-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetTimeline} barGap={4}>
                      <XAxis dataKey="month" tick={{ fill: "#8B949E", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8B949E", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} unit="Cr" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--foreground)" }}
                        labelStyle={{ color: "var(--muted-foreground)" }}
                        itemStyle={{ color: "var(--foreground)" }}
                      />
                      <Bar dataKey="allocated" fill="#00D4FF" opacity={0.3} name="Allocated" />
                      <Bar dataKey="spent" fill="#00D4FF" name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Verification Status */}
              <div className="cyber-card shadow-sm">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    VERIFICATION STATUS
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { key: "all", label: "ALL", count: verifications.length },
                      { key: "verified", label: "VERIFIED", count: verifiedCount },
                      { key: "failed", label: "FAILED", count: failedCount },
                      { key: "review", label: "REVIEW", count: reviewCount },
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setVerificationFilter(f.key)}
                        className={`px-1.5 py-0.5 text-[9px] font-semibold transition-colors border rounded-xs cursor-pointer ${
                          verificationFilter === f.key
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-background/40 border-border text-muted-foreground hover:text-foreground"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => navigate("/verifications")}
                      className="text-[10px] text-primary hover:underline ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                      style={{ fontFamily: "var(--font-mono)" }}
                      title="Open full verifications hub"
                    >
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {filteredVerifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center" style={{ fontFamily: "var(--font-mono)" }}>
                      No {verificationFilter !== "all" ? verificationFilter : ""} verification records found.
                    </p>
                  ) : (
                    filteredVerifications.slice(0, 6).map((v) => (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVerification(v)}
                        className="flex items-center gap-3 py-2 px-2.5 border border-border/40 hover:border-primary/40 hover:bg-accent/30 rounded transition-all cursor-pointer group"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                          style={{ backgroundColor: verificationColors[v.status] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-medium truncate group-hover:text-primary transition-colors">
                            {v.projectName}
                          </p>
                          <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {v.id} · {v.date}
                          </span>
                        </div>
                        {/* Interactive Status Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVerification(v);
                          }}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs ${
                            v.status === "review" ? "animate-pulse" : ""
                          }`}
                          style={{
                            color: verificationColors[v.status],
                            borderColor: `${verificationColors[v.status]}50`,
                            backgroundColor: `${verificationColors[v.status]}15`,
                            fontFamily: "var(--font-mono)",
                          }}
                          title={`Click to inspect or review ${v.status.toUpperCase()} evidence`}
                        >
                          {v.status === "verified" && <CheckCircle2 size={11} className="shrink-0" />}
                          {v.status === "failed" && <XCircle size={11} className="shrink-0" />}
                          {v.status === "review" && <Clock size={11} className="shrink-0" />}
                          {v.status.toUpperCase()}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Project Status Grid */}
            <div className="cyber-card shadow-sm">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  PROJECT STATUS GRID
                </span>
                <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono)" }}>
                  {projects.length} TOTAL
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["ID", "PROJECT", "TYPE", "LOCATION", "BUDGET", "SPENT", "PROGRESS", "STATUS"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-medium text-muted-foreground px-5 py-2.5 uppercase tracking-wider"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{p.id}</td>
                        <td className="px-5 py-3 text-xs text-foreground">{p.name}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{p.location}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.budget)}</td>
                        <td className="px-5 py-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(p.spent)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted">
                              <div className="h-full" style={{ width: `${p.progress}%`, backgroundColor: statusColors[p.status] }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[p.status] }} />
                            <span className="text-[10px] font-medium uppercase" style={{ color: statusColors[p.status], fontFamily: "var(--font-mono)" }}>
                              {p.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Verification Details & Review Action Modal */}
      <Dialog
        open={!!selectedVerification}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVerification(null);
            setReviewRemarks("");
          }
        }}
      >
        <DialogContent className="max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {selectedVerification && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded border"
                      style={{
                        color: verificationColors[selectedVerification.status],
                        borderColor: `${verificationColors[selectedVerification.status]}60`,
                        backgroundColor: `${verificationColors[selectedVerification.status]}15`,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {selectedVerification.status === "verified" && <CheckCircle2 size={13} />}
                      {selectedVerification.status === "failed" && <XCircle size={13} />}
                      {selectedVerification.status === "review" && <Clock size={13} />}
                      {selectedVerification.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      {selectedVerification.id}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {selectedVerification.date}
                  </span>
                </div>
                <DialogTitle className="text-sm font-bold mt-2 text-foreground text-left">
                  {selectedVerification.projectName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground text-left" style={{ fontFamily: "var(--font-mono)" }}>
                  Project Code: {selectedVerification.projectId} · Evidence Audit Dossier
                </DialogDescription>
              </DialogHeader>

              {/* Evidence Photo Preview */}
              {selectedVerification.imageUrl && (
                <div className="relative border border-border overflow-hidden bg-background max-h-[220px] rounded">
                  <img
                    src={selectedVerification.imageUrl}
                    alt="Inspection Evidence Proof"
                    className="w-full h-[220px] object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* AI Analysis Box */}
              <div className="bg-background/80 border border-border p-3.5 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary" style={{ fontFamily: "var(--font-mono)" }}>
                    <Brain size={14} />
                    <span>AI COMPUTER VISION (IRC:82)</span>
                  </div>
                  {selectedVerification.confidence > 0 && (
                    <span
                      className="text-xs font-bold"
                      style={{ color: verificationColors[selectedVerification.status], fontFamily: "var(--font-mono)" }}
                    >
                      Confidence: {selectedVerification.confidence}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {selectedVerification.aiAnalysis}
                </p>
                {selectedVerification.findings.length > 0 && (
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                      TELEMETRY & DEFECT SCAN
                    </span>
                    {selectedVerification.findings.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Tier Approval Chain Audit */}
              {selectedVerification.approvalSteps && selectedVerification.approvalSteps.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                    STATUTORY APPROVAL LEDGER
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedVerification.approvalSteps.map((step: any) => {
                      const isApproved = step.decision === "approved";
                      const isRejected = step.decision === "rejected";
                      return (
                        <div key={step.id} className="border border-border p-2.5 bg-background/50 rounded flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                              {step.level.toUpperCase()}
                            </span>
                            <span
                              className="text-[11px] font-bold mt-1 block"
                              style={{
                                color: isApproved ? "#00E676" : isRejected ? "#FF4757" : "#FFB347",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {isApproved ? "✔ Approved" : isRejected ? "✖ Rejected" : "⏳ Pending"}
                            </span>
                          </div>
                          {step.remarks && (
                            <p className="text-[10px] text-muted-foreground italic mt-1.5 line-clamp-2 border-t border-border/40 pt-1">
                              "{step.remarks}"
                            </p>
                          )}
                          {step.block_hash && (
                            <span className="text-[8px] text-muted-foreground/60 font-mono mt-1 truncate block">
                              SHA256: {step.block_hash.slice(0, 10)}…
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Citizen Votes */}
              {selectedVerification.voteSummary && (
                <div className="border border-border p-3 bg-background/40 rounded flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">CITIZEN AUDIT VOTES:</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ThumbsUp size={12} /> {selectedVerification.voteSummary.completed || 0} Yes
                    </span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <ThumbsDown size={12} /> {selectedVerification.voteSummary.incomplete || 0} No
                    </span>
                  </div>
                </div>
              )}

              {/* Status Specific Highlights */}
              {selectedVerification.status === "verified" && (
                <div className="border border-emerald-500/30 bg-emerald-500/5 p-3.5 rounded flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400" style={{ fontFamily: "var(--font-mono)" }}>IT ACT 65B CERTIFIED</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Fully approved across all governance tiers. Tamper-evident cryptographic signature verified on SHA-256 Merkle ledger.
                    </p>
                  </div>
                </div>
              )}

              {selectedVerification.status === "failed" && (
                <div className="border border-rose-500/30 bg-rose-500/5 p-3.5 rounded flex items-center gap-3">
                  <XCircle size={24} className="text-rose-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-rose-400" style={{ fontFamily: "var(--font-mono)" }}>EVIDENCE FLAGGED / FAILED</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Distress classification or official rejection recorded. Contractor must rectify quality issues before milestone disbursement.
                    </p>
                  </div>
                </div>
              )}

              {selectedVerification.status === "review" && (
                <div className="border border-amber-500/30 bg-amber-500/5 p-4 rounded space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-amber-500 uppercase font-bold block" style={{ fontFamily: "var(--font-mono)" }}>
                        STATUTORY REVIEW ACTION
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Active Account: <span className="text-foreground font-bold font-mono">{(currentUser?.role || "GUEST").toUpperCase()}</span>
                      </p>
                    </div>
                    {/* Persona quick switch */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground font-mono mr-1">Act as:</span>
                      {(["pradhan", "engineer", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleSwitch(r)}
                          className={`px-1.5 py-0.5 text-[9px] rounded font-mono transition-colors cursor-pointer ${
                            currentUser?.role === r
                              ? "bg-amber-500 text-black font-bold"
                              : "bg-background border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    placeholder="Enter inspection remarks / compliance notes for audit ledger..."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-xs text-foreground outline-none resize-none focus:border-amber-500/60"
                  />

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={voteMutation.isPending}
                        onClick={() =>
                          voteMutation.mutate({
                            evidenceId: selectedVerification.rawId,
                            choice: "completed",
                            comment: voteComment,
                          })
                        }
                        className="px-2.5 py-1 text-[11px] bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 rounded font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ThumbsUp size={11} /> Vote Complete
                      </button>
                      <button
                        type="button"
                        disabled={voteMutation.isPending}
                        onClick={() =>
                          voteMutation.mutate({
                            evidenceId: selectedVerification.rawId,
                            choice: "incomplete",
                            comment: voteComment,
                          })
                        }
                        className="px-2.5 py-1 text-[11px] bg-rose-500/10 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 rounded font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ThumbsDown size={11} /> Vote Incomplete
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            evidenceId: selectedVerification.rawId,
                            decision: "rejected",
                            remarks: reviewRemarks,
                          })
                        }
                        className="px-3 py-1.5 text-xs bg-rose-500/15 border border-rose-500/50 text-rose-400 hover:bg-rose-500/30 rounded font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <XCircle size={13} /> Reject (Mark FAILED)
                      </button>
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            evidenceId: selectedVerification.rawId,
                            decision: "approved",
                            remarks: reviewRemarks,
                          })
                        }
                        className="px-3 py-1.5 text-xs bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 rounded font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Approve Step
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedVerification.id;
                    const status = selectedVerification.status;
                    setSelectedVerification(null);
                    navigate(`/verifications?id=${id}&filter=${status}`);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <ExternalLink size={12} />
                  Open in Full Verifications Workstation
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVerification(null)}
                  className="px-3 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function KPICard({ label, value, subtext, trend, color }: { label: string; value: string; subtext: string; trend: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    up: <TrendingUp size={14} />,
    down: <TrendingDown size={14} />,
    neutral: <Clock size={14} />,
  };

  return (
    <div className="cyber-card cyber-card-hover relative overflow-hidden shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
      <div className="p-5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold" style={{ fontFamily: "var(--font-mono)" }}>
          {label}
        </span>
        <div className="flex items-end justify-between mt-2">
          <span className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {value}
          </span>
          <span className="text-muted-foreground" style={{ color }}>
            {icons[trend]}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
          {subtext}
        </p>
      </div>
    </div>
  );
}
