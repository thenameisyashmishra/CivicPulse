/*
 * Verifications — CivicPulse
 * AI verification results, upload flow, and analysis details.
 * Connects directly to backend file upload, citizen voting, and official review APIs.
 */
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchVerifications,
  fetchProjects,
  uploadEvidence,
  castVote,
  submitReview,
  verificationColors,
  getSavedUser,
  quickSwitchRole,
  type Verification,
  type Project,
} from "@/lib/data";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Brain, Search, ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Verifications() {
  const queryClient = useQueryClient();

  const { data: verifications = [], isLoading: loadingVerifications, error: errVerifications } = useQuery<Verification[]>({
    queryKey: ["verifications"],
    queryFn: () => fetchVerifications(),
  });

  const { data: projects = [], isLoading: loadingProjects, error: errProjects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });

  const loading = loadingVerifications || loadingProjects;
  const errorObj = errVerifications || errProjects;
  const error = errorObj instanceof Error ? errorObj.message : errorObj ? String(errorObj) : null;

  const [filter, setFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam && ["all", "verified", "pending", "failed", "review"].includes(filterParam)) {
        return filterParam;
      }
    }
    return "all";
  });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("id");
    }
    return null;
  });

  // Upload dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");

  // Voting & Review states
  const [voteComment, setVoteComment] = useState("");
  const [reviewRemarks, setReviewRemarks] = useState("");

  const [currentUser, setCurrentUser] = useState(getSavedUser());

  const handleRoleSwitch = async (role: "admin" | "engineer" | "pradhan" | "citizen") => {
    try {
      const res = await quickSwitchRole(role);
      setCurrentUser(res.user);
      toast.success(`Switched active persona to ${role.toUpperCase()} (${res.user.name})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch role");
    }
  };

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: ({ projectId, file, caption }: { projectId: string; file: File; caption: string }) =>
      uploadEvidence(projectId, file, caption),
    onSuccess: (newEvidence) => {
      toast.success(`Evidence uploaded! AI analysis complete. Status: ${newEvidence.status.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setSelectedId(newEvidence.id);
      // Reset forms
      setUploadFile(null);
      setUploadCaption("");
      setSelectedProjectId("");
      setShowUploadModal(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ evidenceId, choice, comment }: { evidenceId: number; choice: "completed" | "incomplete"; comment: string }) =>
      castVote(evidenceId, choice, comment),
    onSuccess: () => {
      toast.success("Audit vote registered successfully");
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setVoteComment("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Voting failed");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ evidenceId, decision, remarks }: { evidenceId: number; decision: "approved" | "rejected"; remarks: string }) =>
      submitReview(evidenceId, decision, remarks),
    onSuccess: () => {
      toast.success("Official review decision submitted");
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setReviewRemarks("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Review submission failed");
    },
  });

  const filtered = filter === "all" ? verifications : verifications.filter((v) => v.status === filter);
  const selected = (selectedId ? verifications.find((v) => v.id === selectedId) : null) || filtered[0] || verifications[0];

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select an evidence image file");
      return;
    }
    uploadMutation.mutate({ projectId: selectedProjectId, file: uploadFile, caption: uploadCaption });
  };


  const handleCastVote = async (choice: "completed" | "incomplete") => {
    if (!selected) return;
    voteMutation.mutate({ evidenceId: selected.rawId, choice, comment: voteComment });
  };

  const handleReviewSubmit = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    reviewMutation.mutate({
      evidenceId: selected.rawId,
      decision,
      remarks: reviewRemarks,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              AI VERIFICATIONS
            </h1>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {loading
                ? "Loading records from database…"
                : error
                ? `⚠ ${error}`
                : `${verifications.length} total verification records · ${verifications.filter((v) => v.status === "verified").length} confirmed`}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20 transition-colors"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Upload size={14} />
            UPLOAD EVIDENCE
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "verified", "pending", "failed", "review"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                filter === f
                  ? "bg-primary/15 border border-primary/40 text-primary"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {f === "all" ? "ALL" : f.toUpperCase()}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {f === "all" ? verifications.length : verifications.filter((v) => v.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground py-8" style={{ fontFamily: "var(--font-mono)" }}>
            Fetching from CivicPulse API…
          </div>
        ) : error ? (
          <div
            className="p-4 text-xs border"
            style={{ background: "rgba(255,71,87,0.08)", borderColor: "rgba(255,71,87,0.3)", color: "#FF4757", fontFamily: "var(--font-mono)" }}
          >
            {error}
          </div>
        ) : verifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border bg-card">
            <Brain size={28} className="mx-auto mb-3 opacity-30 animate-pulse" />
            <p className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)" }}>No evidence found.</p>
            <p className="text-[10px] mt-1 opacity-60" style={{ fontFamily: "var(--font-mono)" }}>
              Be the first to upload progress proof using the upload button.
            </p>
          </div>
        ) : (
          /* Main grid */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* List side */}
            <div className="lg:col-span-2 space-y-2">
              {filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left bg-card border border-border p-4 hover:bg-accent/30 transition-colors ${
                    selectedId === v.id ? "border-primary/50 bg-accent/50" : ""
                  }`}
                  style={{ borderLeftWidth: 3, borderLeftColor: verificationColors[v.status] }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{v.id}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-xs text-foreground font-medium truncate">{v.projectName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{v.date}</span>
                    {v.confidence > 0 && (
                      <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                        Confidence: {v.confidence}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-xs text-muted-foreground py-4" style={{ fontFamily: "var(--font-mono)" }}>
                  No records match this filter.
                </div>
              )}
            </div>

            {/* Detail side */}
            <div className="lg:col-span-3 bg-card border border-border min-h-[400px]">
              {selected ? (
                <div className="p-5 space-y-4">
                  {/* Title block */}
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <StatusBadge status={selected.status} />
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{selected.projectName}</h3>
                      <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                        {selected.id} · {selected.date}
                      </span>
                    </div>
                    {selected.confidence > 0 && (
                      <div className="ml-auto text-right">
                        <span className="text-[10px] text-muted-foreground block" style={{ fontFamily: "var(--font-mono)" }}>AI CONFIDENCE</span>
                        <span className="text-lg font-semibold" style={{ color: verificationColors[selected.status], fontFamily: "var(--font-mono)" }}>
                          {selected.confidence}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image */}
                  {selected.imageUrl && (
                    <div className="relative border border-border overflow-hidden bg-background max-h-[220px]">
                      <img
                        src={selected.imageUrl}
                        alt="Evidence visual proof"
                        className="w-full h-[220px] object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {/* AI Analysis Findings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                        AI Intelligent Engine Result
                      </span>
                    </div>
                    <div className="bg-background/60 border border-border p-4 space-y-3">
                      <p className="text-xs text-foreground leading-relaxed font-medium">{selected.aiAnalysis}</p>
                      
                      {selected.findings.length > 0 && (
                        <div className="pt-2 border-t border-border/40 space-y-1">
                          <span className="text-[9px] text-muted-foreground uppercase block" style={{ fontFamily: "var(--font-mono)" }}>PIPELINE FINDINGS</span>
                          {selected.findings.map((f, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                              <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Steps Audit Trail */}
                  {selected.approvalSteps && selected.approvalSteps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block" style={{ fontFamily: "var(--font-mono)" }}>
                        OFFICIAL APPROVAL AUDIT TRAIL
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {selected.approvalSteps.map((step: any) => {
                          const isApproved = step.decision === "approved";
                          const isRejected = step.decision === "rejected";
                          return (
                            <div key={step.id} className="border border-border p-2.5 bg-background/30 flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase block" style={{ fontFamily: "var(--font-mono)" }}>
                                  {step.level.toUpperCase()} LEVEL
                                </span>
                                <span className="text-[11px] font-semibold mt-1 block truncate">
                                  {isApproved ? "🟢 Approved" : isRejected ? "🔴 Rejected" : "🟡 Pending"}
                                </span>
                              </div>
                              {step.remarks && (
                                <p className="text-[10px] text-muted-foreground italic mt-1.5 line-clamp-2 border-t border-border/30 pt-1">
                                  "{step.remarks}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Citizen Votes */}
                  {selected.voteSummary && (
                    <div className="border border-border p-4 bg-background/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block" style={{ fontFamily: "var(--font-mono)" }}>CITIZEN QUALITY AUDIT</span>
                        <span className="text-xs text-foreground mt-1 block">
                          🗳 Total Audits: {(selected.voteSummary.completed || 0) + (selected.voteSummary.incomplete || 0)}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-xs font-semibold text-emerald-400">👍 Completed: {selected.voteSummary.completed || 0}</span>
                        <span className="text-xs font-semibold text-rose-400">👎 Incomplete: {selected.voteSummary.incomplete || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Citizen Interaction Form */}
                  {currentUser?.role === "citizen" && selected.status !== "verified" && selected.status !== "failed" && (
                    <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div>
                        <span className="text-[10px] text-primary uppercase block font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                          AUDIT PROJECT COMPLETION CLAIM
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">As a direct citizen beneficiary, vote on if this claim represents honest visual progress.</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Optional audit comments or notes..."
                          value={voteComment}
                          onChange={(e) => setVoteComment(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none"
                        />
                        <button
                          disabled={voteMutation.isPending}
                          onClick={() => handleCastVote("completed")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs hover:bg-emerald-500/20 font-semibold cursor-pointer"
                        >
                          <ThumbsUp size={12} /> Yes
                        </button>
                        <button
                          disabled={voteMutation.isPending}
                          onClick={() => handleCastVote("incomplete")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs hover:bg-rose-500/20 font-semibold cursor-pointer"
                        >
                          <ThumbsDown size={12} /> No
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official Action Form */}
                  {currentUser?.role !== "citizen" && selected.status !== "verified" && selected.status !== "failed" && (
                    <div className="border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] text-amber-500 uppercase block font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                            SUBMIT OFFICIAL REVIEW DECISION
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Active Role: <span className="text-foreground font-bold font-mono">{(currentUser?.role || "GUEST").toUpperCase()}</span> (Governance Level Order: Pradhan → Engineer → Admin)
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground font-mono mr-1">Switch:</span>
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
                      <div className="flex gap-2 flex-col">
                        <textarea
                          placeholder="Add official verification notes / inspection remarks..."
                          value={reviewRemarks}
                          onChange={(e) => setReviewRemarks(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReviewSubmit("rejected")}
                            className="px-3 py-1.5 bg-rose-500/15 border border-rose-500/50 text-rose-400 text-xs hover:bg-rose-500/30 transition-colors font-semibold cursor-pointer"
                          >
                            ❌ Reject Evidence
                          </button>
                          <button
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReviewSubmit("approved")}
                            className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors font-semibold cursor-pointer"
                          >
                            ✔ Approve Step
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Search size={24} className="mx-auto mb-3 opacity-40" />
                    <p className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>Select a verification record</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border border-t-3 border-t-primary p-6 space-y-4">
            <div>
              <span className="text-[10px] text-primary uppercase block font-semibold" style={{ fontFamily: "var(--font-mono)" }}>NEW GEOTAGGED UPLOAD</span>
              <h2 className="text-sm font-bold text-foreground mt-0.5">Submit Visual Evidence</h2>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Project Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Project Site</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none"
                >
                  <option value="">-- Choose project site --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Image Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Select Photo Evidence</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none file:mr-4 file:py-1 file:px-2.5 file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>Remarks / Description</label>
                <input
                  type="text"
                  placeholder="Details about construction progress..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadMutation.isPending}
                  className="px-3 py-1.5 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/40 text-primary text-xs hover:bg-primary/25 font-semibold"
                >
                  {uploadMutation.isPending ? "Analyzing pipeline..." : "Upload & Analyze"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    verified: { color: "#00E676", label: "VERIFIED", icon: <CheckCircle2 size={10} /> },
    pending:  { color: "#00D4FF", label: "PENDING", icon: <Clock size={10} /> },
    failed:   { color: "#FF4757", label: "FAILED", icon: <AlertTriangle size={10} /> },
    review:   { color: "#FFB347", label: "REVIEW", icon: <AlertTriangle size={10} /> },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className="text-[9px] font-semibold px-2 py-0.5 flex items-center gap-1 shrink-0"
      style={{ color: c.color, border: `1px solid ${c.color}33`, backgroundColor: `${c.color}0a`, fontFamily: "var(--font-mono)" }}
    >
      {c.icon} {c.label}
    </span>
  );
}
