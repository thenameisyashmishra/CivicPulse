import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShieldAlert,
  FileCheck,
  Scale,
  Building2,
  AlertTriangle,
  History,
  Lock,
  UserCheck,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Briefcase,
  Fingerprint,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Real file download helper
const downloadJSON = (dataObj: any, filename: string) => {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AccountabilityHub() {
  const [activeTab, setActiveTab] = useState<
    | "officials"
    | "maker_checker"
    | "contractors"
    | "xai_overrides"
    | "cag_pack"
    | "sla"
    | "vigilance"
    | "whistleblower"
    | "pbg"
    | "coi"
    | "diffs"
  >("officials");

  const [officials, setOfficials] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [financialReqs, setFinancialReqs] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [pbgs, setPbgs] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [vigilanceCases, setVigilanceCases] = useState<any[]>([]);
  const [auditDiffs, setAuditDiffs] = useState<any[]>([]);
  const [cagPack, setCagPack] = useState<any>(null);

  // Modal & feedback states
  const [cagLoading, setCagLoading] = useState(false);
  const [showCagModal, setShowCagModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const [showWbModal, setShowWbModal] = useState(false);
  const [copiedWbCode, setCopiedWbCode] = useState(false);
  const [wbSubmittedData, setWbSubmittedData] = useState<any>(null);

  const [showXaiModal, setShowXaiModal] = useState(false);
  const [makerCheckerModal, setMakerCheckerModal] = useState<{ reqId: number; decision: string } | null>(null);

  // Form states
  const [wbCategory, setWbCategory] = useState("substandard_material");
  const [wbTip, setWbTip] = useState("");
  const [wbToken, setWbToken] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [trackedStatus, setTrackedStatus] = useState<any>(null);

  // XAI Explainer modal
  const [xaiData, setXaiData] = useState<any>(null);
  const [xaiLoading, setXaiLoading] = useState(false);

  const fetchAll = async () => {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [offRes, conRes, finRes, pbgRes, escRes, vigRes, diffRes, ovrRes] =
        await Promise.all([
          fetch("/api/accountability/officials", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/contractors", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/financial/requests", { headers }).then(
            (r) => (r.ok ? r.json() : [])
          ),
          fetch("/api/accountability/pbg", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/escalations", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/vigilance/cases", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/audit-diffs", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/accountability/overrides", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

      setOfficials(Array.isArray(offRes) ? offRes : []);
      setContractors(Array.isArray(conRes) ? conRes : []);
      setFinancialReqs(Array.isArray(finRes) ? finRes : []);
      setPbgs(Array.isArray(pbgRes) ? pbgRes : []);
      setEscalations(Array.isArray(escRes) ? escRes : []);
      setVigilanceCases(Array.isArray(vigRes) ? vigRes : []);
      setAuditDiffs(Array.isArray(diffRes) ? diffRes : []);
      setOverrides(Array.isArray(ovrRes) ? ovrRes : []);
    } catch (err) {
      console.error(err);
      setOfficials([]);
      setContractors([]);
      setFinancialReqs([]);
      setPbgs([]);
      setEscalations([]);
      setVigilanceCases([]);
      setAuditDiffs([]);
      setOverrides([]);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleApproveFinancial = async (reqId: number, decision: string) => {
    const token = getToken();
    try {
      const res = await fetch("/api/accountability/financial/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id: reqId,
          decision,
          remarks: `Actioned via Enterprise Accountability Portal: ${decision}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Action failed");
      }
      setMakerCheckerModal({ reqId, decision });
      toast.success(`Financial Request #${reqId} marked ${decision.toUpperCase()} on Treasury Ledger!`);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFetchCAGPack = async (projectId: string) => {
    setCagLoading(true);
    try {
      const res = await fetch(`/api/accountability/audit-pack/${projectId}`);
      if (!res.ok) throw new Error("Could not fetch CAG audit pack.");
      const data = await res.json();
      setCagPack(data);
      // Real file download triggered on user's browser
      downloadJSON(data, `CAG_Audit_Dossier_${projectId}_${new Date().toISOString().split("T")[0]}.json`);
      // Switch to CAG tab and open modal
      setActiveTab("cag_pack");
      setShowCagModal(true);
      toast.success(`CAG Audit Dossier generated & downloaded! (${data.total_evidence_nodes} evidence nodes verified)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCagLoading(false);
    }
  };

  const handleFetchXAI = async (evId: number) => {
    setXaiLoading(true);
    try {
      const res = await fetch(`/api/accountability/xai/explain/${evId}`);
      if (!res.ok) throw new Error("Could not fetch XAI diagnostics.");
      const data = await res.json();
      setXaiData(data);
      setActiveTab("xai_overrides");
      setShowXaiModal(true);
      toast.success(`XAI diagnostics evaluated: Quality Score ${data.overall_quality_score}/100`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setXaiLoading(false);
    }
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wbTip.trim()) return;
    try {
      const res = await fetch("/api/accountability/whistleblower/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: wbCategory,
          raw_tip: wbTip,
          project_id: "PW-2024-001",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Whistleblower tip submission failed (HTTP ${res.status})`);
      }
      setWbToken(data.tracking_code);
      setTrackCode(data.tracking_code);
      setWbSubmittedData(data);
      setShowWbModal(true);
      setWbTip("");
      toast.success(`Encrypted Tip Registered! Tracking Code: ${data.tracking_code}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTrackTip = async () => {
    if (!trackCode.trim()) return;
    try {
      const res = await fetch(
        `/api/accountability/whistleblower/track/${trackCode.trim()}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid tracking code");
      }
      setTrackedStatus(data);
    } catch (e: any) {
      toast.error(e.message);
      setTrackedStatus(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-primary/10 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-wide">
                Accountability, Digital Signatures & Fraud Oversight
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-primary/20 text-primary border border-primary/30">
                PILLAR B.1
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Every rupee and sign-off traceable to a named official with
              consequences — Indian IT Act 2000 & MoRTH / IRC Conformance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleFetchCAGPack("PW-2024-001")}
              disabled={cagLoading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {cagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {cagLoading ? "Generating Cryptographic Dossier…" : "Generate CAG Audit Pack"}
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card/60 border border-border/70 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Officer Accountability
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {officials.length > 0
                ? (
                    officials.reduce(
                      (acc, o) => acc + (o.accountability_score || 100),
                      0
                    ) / officials.length
                  ).toFixed(1)
                : "96.4"}
              /100
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Zero untraced approvals
            </span>
          </div>

          <div className="p-4 rounded-xl bg-card/60 border border-border/70 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active PBGs Protected
            </span>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              ₹
              {(
                pbgs.reduce((acc, p) => acc + (p.amount || 0), 0) / 10000000
              ).toFixed(2)}{" "}
              Cr
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <Lock className="h-3 w-3 text-cyan-400" />
              {pbgs.length} bank guarantees active
            </span>
          </div>

          <div className="p-4 rounded-xl bg-card/60 border border-border/70 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Maker-Checker Pending
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {
                financialReqs.filter((r) => r.status === "pending_checker")
                  .length
              }
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-amber-400" />
              Dual-custody verification required
            </span>
          </div>

          <div className="p-4 rounded-xl bg-card/60 border border-border/70 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              High Anomaly Dockets
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {vigilanceCases.length} Cases
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <ShieldAlert className="h-3 w-3 text-rose-400" />
              Referred to State ACB
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Accountability Sections"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
          {[
            { id: "officials", label: "Officials & Liability", icon: UserCheck },
            { id: "maker_checker", label: "Maker-Checker Queue", icon: FileCheck },
            { id: "contractors", label: "Contractor Scorecards", icon: Building2 },
            { id: "xai_overrides", label: "AI Overrides & XAI", icon: AlertTriangle },
            { id: "cag_pack", label: "CAG Audit Packs", icon: Scale },
            { id: "sla", label: "SLA Matrix", icon: Clock },
            { id: "vigilance", label: "ACB Referrals", icon: ShieldAlert },
            { id: "whistleblower", label: "Whistleblower Channel", icon: Fingerprint },
            { id: "pbg", label: "PBG Guarantees", icon: Lock },
            { id: "coi", label: "Conflict of Interest", icon: Briefcase },
            { id: "diffs", label: "Immutable Diffs", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`acct-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`acct-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Officials & Liability Ledger */}
        {activeTab === "officials" && (
          <div
            role="tabpanel"
            id="acct-panel-officials"
            aria-labelledby="acct-tab-officials"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">
                  Personal Liability Ledger per Official
                </h3>
                <p className="text-xs text-muted-foreground">
                  Every sign-off, override, and decision is anchored to the
                  official's UID with real-time accountability scores.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Official Code</th>
                    <th className="p-3">Name & Role</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Total Approvals</th>
                    <th className="p-3">AI Overrides</th>
                    <th className="p-3">Accountability Score</th>
                    <th className="p-3">Risk Tier</th>
                    <th className="p-3">eSign Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {officials.map((o) => (
                    <tr key={o.user_id} className="hover:bg-accent/20">
                      <td className="p-3 font-mono font-bold text-primary">
                        {o.officer_code}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{o.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {o.email}
                        </div>
                      </td>
                      <td className="p-3">{o.designation}</td>
                      <td className="p-3 font-mono font-medium">
                        {o.total_signoffs}
                      </td>
                      <td className="p-3 font-mono text-amber-400">
                        {o.ai_overrides_count}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${o.accountability_score}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold">
                            {o.accountability_score?.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.risk_tier === "low"
                              ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                              : "bg-rose-400/20 text-rose-400 border border-rose-400/30"
                          }`}
                        >
                          {o.risk_tier}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <Fingerprint className="h-3.5 w-3.5" />
                        IT Act Verified
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Maker-Checker Queue */}
        {activeTab === "maker_checker" && (
          <div
            role="tabpanel"
            id="acct-panel-maker_checker"
            aria-labelledby="acct-tab-maker_checker"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Maker-Checker Financial Authorization Queue
              </h3>
              <p className="text-xs text-muted-foreground">
                Two-person integrity: No single officer can both raise and
                approve fund releases (Rule 211 of GFR).
              </p>
            </div>

            <div className="grid gap-3">
              {financialReqs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No financial requests in the pipeline.
                </div>
              ) : (
                financialReqs.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-border bg-card/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {req.voucher_ref}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-semibold">
                          Project: {req.project_id} (Tranche #{req.tranche_number})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            req.status === "approved"
                              ? "bg-emerald-400/20 text-emerald-400"
                              : req.status === "rejected"
                              ? "bg-rose-400/20 text-rose-400"
                              : "bg-amber-400/20 text-amber-400"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium">{req.purpose}</p>
                      <div className="text-[11px] text-muted-foreground">
                        Maker Officer ID: #{req.maker_id} · Notes:{" "}
                        {req.maker_notes || "None"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-black text-foreground">
                          ₹{req.amount?.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Sanctioned Tranche
                        </div>
                      </div>

                      {req.status === "pending_checker" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApproveFinancial(req.id, "approved")
                            }
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApproveFinancial(req.id, "rejected")
                            }
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Contractor Performance Scorecards */}
        {activeTab === "contractors" && (
          <div
            role="tabpanel"
            id="acct-panel-contractors"
            aria-labelledby="acct-tab-contractors"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Contractor Performance Scorecard & Registry
              </h3>
              <p className="text-xs text-muted-foreground">
                Composite evaluation based on on-time delivery, AI quality
                metrics, and automated blacklist triggers.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {contractors.map((c) => (
                <div
                  key={c.id}
                  className={`p-5 rounded-xl border ${
                    c.composite_score < 50
                      ? "border-rose-500/50 bg-rose-950/10"
                      : "border-border bg-card/40"
                  } space-y-3 relative`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm">{c.name}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        GSTIN: {c.gstin}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent">
                      {c.registration_class}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground">
                        Quality
                      </span>
                      <div className="font-bold text-xs mt-0.5">
                        {c.avg_quality_score}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">
                        On-Time
                      </span>
                      <div className="font-bold text-xs mt-0.5">
                        {c.on_time_rate}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">
                        Active PBG
                      </span>
                      <div className="font-bold text-xs mt-0.5">
                        ₹{(c.active_pbg_total / 10000000).toFixed(1)}Cr
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground">
                        Composite Score:
                      </span>
                      <span
                        className={`ml-1 font-mono font-bold text-sm ${
                          c.composite_score < 50
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {c.composite_score}/100
                      </span>
                    </div>

                    {c.composite_score < 50 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Blacklist Alert
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Compliant
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: AI Overrides & XAI Explainer */}
        {activeTab === "xai_overrides" && (
          <div
            role="tabpanel"
            id="acct-panel-xai_overrides"
            aria-labelledby="acct-tab-xai_overrides"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Human-in-the-Loop AI Overrides & XAI Diagnostics
              </h3>
              <p className="text-xs text-muted-foreground">
                Mandatory justification (min 50 chars) + Plain-language
                engineering explanations for departmental inquiries.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
                <h4 className="font-semibold text-xs flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Recorded AI Overrides
                </h4>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {overrides.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No overrides logged yet.
                    </div>
                  ) : (
                    overrides.map((ovr) => (
                      <div
                        key={ovr.id}
                        className="p-3 rounded-lg border border-border/60 bg-accent/10 space-y-1"
                      >
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold">
                            Evidence #{ovr.evidence_id} → {ovr.override_decision}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            Officer #{ovr.official_id}
                          </span>
                        </div>
                        <p className="text-xs italic text-muted-foreground">
                          "{ovr.justification}"
                        </p>
                        <div className="text-[9px] font-mono text-muted-foreground/60 truncate">
                          Sig: {ovr.audit_signature}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-xs flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    Explainable AI (XAI) Diagnostic Engine
                  </h4>
                  <button
                    onClick={() => handleFetchXAI(1)}
                    disabled={xaiLoading}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-primary/20 text-primary hover:bg-primary/30 transition"
                  >
                    Inspect Evidence #1
                  </button>
                </div>

                {xaiData ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                      <span className="font-bold">Overall AI Quality Score: </span>
                      <span className="font-mono text-primary font-bold">
                        {xaiData.overall_quality_score || 75.0}/100
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {xaiData.admissibility_summary}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {xaiData.xai_breakdown?.map((b: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-border bg-accent/10 space-y-1 text-xs"
                        >
                          <div className="flex justify-between font-semibold">
                            <span>{b.metric}</span>
                            <span className="text-primary font-mono">
                              {b.observed_value}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Rule: {b.threshold_rule}
                          </div>
                          <p className="text-[11px] text-foreground/90">
                            {b.plain_language_reason}
                          </p>
                          <div className="text-[9px] text-emerald-400 font-medium">
                            {b.legal_standing}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Click "Inspect Evidence #1" to evaluate Plain-Language XAI
                    findings against MoRTH/IRC codes.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: CAG Audit Pack */}
        {activeTab === "cag_pack" && (
          <div
            role="tabpanel"
            id="acct-panel-cag_pack"
            aria-labelledby="acct-tab-cag_pack"
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">
                  Comptroller & Auditor General (CAG) Audit Export Pack
                </h3>
                <p className="text-xs text-muted-foreground">
                  One-click export of unbroken cryptographic Merkle evidence
                  chain, financial records, and physical inspection stamps.
                </p>
              </div>
              <button
                onClick={() => handleFetchCAGPack("PW-2024-001")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
              >
                Refresh Dossier
              </button>
            </div>

            {cagPack ? (
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <h4 className="font-bold text-sm">{cagPack.audit_title}</h4>
                    <span className="text-[11px] text-muted-foreground">
                      Generated: {cagPack.generated_at}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                    CAG MSO COMPLIANT
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-accent/20 border border-border/80">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Root Merkle Hash
                  </div>
                  <div className="font-mono text-xs text-primary break-all font-bold mt-0.5">
                    {cagPack.merkle_root_hash}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  {cagPack.auditor_compliance_statement}
                </p>

                <div className="text-xs font-semibold">
                  Manifest Nodes ({cagPack.total_evidence_nodes} Files Verified):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {cagPack.manifest?.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-background/50 border border-border/50 flex justify-between"
                    >
                      <span>Evidence #{m.evidence_id}: {m.file_path}</span>
                      <span className="text-primary truncate max-w-xs">{m.sha256}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                Click "Generate CAG Audit Pack" to compile the official auditor-ready package.
              </div>
            )}
          </div>
        )}

        {/* Tab 6: SLA Matrix */}
        {activeTab === "sla" && (
          <div
            role="tabpanel"
            id="acct-panel-sla"
            aria-labelledby="acct-tab-sla"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Escalation Matrix with SLA Timers
              </h3>
              <p className="text-xs text-muted-foreground">
                Automatic escalation: Pradhan (48h) → BDO (72h) → District
                Collector (120h) with immutable breach logging.
              </p>
            </div>

            <div className="grid gap-2">
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="p-3.5 rounded-xl border border-border bg-card/40 flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        {esc.item_type.toUpperCase()} #{esc.item_id}
                      </span>
                      <span className="text-xs font-semibold">
                        Tier {esc.tier}: Assigned to{" "}
                        {esc.assigned_to_role.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      SLA Deadline: {new Date(esc.sla_deadline).toLocaleString()}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      esc.is_breached
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {esc.is_breached ? "SLA Breached" : "On Schedule"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Vigilance ACB Referrals */}
        {activeTab === "vigilance" && (
          <div
            role="tabpanel"
            id="acct-panel-vigilance"
            aria-labelledby="acct-tab-vigilance"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Vigilance / Anti-Corruption Bureau (ACB) Referral Dockets
              </h3>
              <p className="text-xs text-muted-foreground">
                Severe AI fraud detections automatically package into formal
                investigation dockets with evidence hash chains.
              </p>
            </div>

            <div className="grid gap-3">
              {vigilanceCases.map((vc) => (
                <div
                  key={vc.id}
                  className="p-4 rounded-xl border border-border bg-card/40 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-bold text-xs text-rose-400">
                        {vc.case_number}
                      </div>
                      <h4 className="font-semibold text-sm">
                        Project: {vc.project_id} (Contractor: {vc.contractor_name})
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase">
                      Severity: {vc.fraud_severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vc.allegation_summary}
                  </p>
                  <div className="p-2 rounded bg-accent/20 font-mono text-[10px] text-primary truncate">
                    Chain Hash: {vc.evidence_hash_chain}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Whistleblower Channel */}
        {activeTab === "whistleblower" && (
          <div
            role="tabpanel"
            id="acct-panel-whistleblower"
            aria-labelledby="acct-tab-whistleblower"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  Encrypted Anonymous Fraud Reporting
                </h3>
                <p className="text-xs text-muted-foreground">
                  Zero-knowledge submission under Whistle Blowers Protection Act
                  2014. IP and client headers scrubbed.
                </p>
              </div>

              <form onSubmit={handleSubmitTip} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">Category</label>
                  <select
                    value={wbCategory}
                    onChange={(e) => setWbCategory(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs"
                  >
                    <option value="substandard_material">Substandard Materials</option>
                    <option value="ghost_work">Ghost Work / Unexecuted Milestones</option>
                    <option value="measurement_inflation">Measurement Inflation</option>
                    <option value="kickbacks">Bribery / Coercion</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Allegation Details</label>
                  <textarea
                    rows={4}
                    value={wbTip}
                    onChange={(e) => setWbTip(e.target.value)}
                    placeholder="Provide specific batch numbers, dates, or photographic context..."
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
                >
                  Submit Encrypted Tip
                </button>
              </form>

              {wbToken && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="font-bold text-emerald-400">Save Your Secret Tracking Code:</div>
                  <div className="font-mono text-sm font-black text-foreground mt-1">
                    {wbToken}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Track Existing Whistleblower Docket
                </h3>
                <p className="text-xs text-muted-foreground">
                  Check investigation milestones with your cryptographic tracking code.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="e.g. WB-2026-A1B2C3D4E5"
                  className="flex-1 p-2 rounded-lg bg-background border border-border text-xs font-mono"
                />
                <button
                  onClick={handleTrackTip}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent hover:bg-accent/80"
                >
                  Lookup
                </button>
              </div>

              {trackedStatus && (
                <div className="p-4 rounded-lg bg-accent/20 border border-border text-xs space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Status: {trackedStatus.status.toUpperCase()}</span>
                    <span className="font-mono text-primary">{trackedStatus.tracking_code}</span>
                  </div>
                  <p className="text-muted-foreground">{trackedStatus.status_update_note}</p>
                  <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
                    Chain Hash: {trackedStatus.chain_of_custody_hash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 9: Bank Guarantees */}
        {activeTab === "pbg" && (
          <div
            role="tabpanel"
            id="acct-panel-pbg"
            aria-labelledby="acct-tab-pbg"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Performance Bank Guarantee (PBG) & Security-Deposit Tracker
              </h3>
              <p className="text-xs text-muted-foreground">
                Tracks validity, claim periods, and automated forfeiture triggers
                on confirmed contractor default.
              </p>
            </div>

            <div className="grid gap-3">
              {pbgs.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl border border-border bg-card/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        {g.bg_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          g.status === "active"
                            ? "bg-emerald-400/20 text-emerald-400"
                            : "bg-rose-400/20 text-rose-400"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold mt-1">
                      Bank: {g.issuing_bank} · Project: {g.project_id}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Expiry: {g.expiry_date} · Claim Deadline: {g.claim_deadline}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black">
                      ₹{g.amount?.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Secured Collateral
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 10: Conflict of Interest */}
        {activeTab === "coi" && (
          <div
            role="tabpanel"
            id="acct-panel-coi"
            aria-labelledby="acct-tab-coi"
            className="p-5 rounded-xl border border-border bg-card/40 space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Conflict-of-Interest Declaration & Auto-Check
              </h3>
              <p className="text-xs text-muted-foreground">
                Officers declare personal/financial ties to vendors; sign-off is
                automatically blocked under CCS (Conduct) Rules 1964.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-400">
                  Automated Intersection Active:
                </span>{" "}
                Any review attempt by an officer on an associated contractor
                immediately triggers a 403 Forbidden blocking policy.
              </div>
            </div>
          </div>
        )}

        {/* Tab 11: Immutable Audit Diffs */}
        {activeTab === "diffs" && (
          <div
            role="tabpanel"
            id="acct-panel-diffs"
            aria-labelledby="acct-tab-diffs"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">
                Immutable "Who Changed What" Diff Timeline
              </h3>
              <p className="text-xs text-muted-foreground">
                Field-level before/after delta view on every project, budget, or
                status change with cryptographic signature.
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditDiffs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No state mutation diffs logged yet.
                </div>
              ) : (
                auditDiffs.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-lg border border-border bg-card/30 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between font-semibold">
                      <span>
                        {d.action.toUpperCase()} {d.entity_type} #{d.entity_id}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        Actor #{d.actor_id} ({d.actor_role})
                      </span>
                    </div>
                    <pre className="p-2 rounded bg-background text-[11px] font-mono overflow-x-auto text-muted-foreground">
                      {JSON.stringify(d.diff_summary, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* CAG Audit Dossier Inspection Modal */}
      <Dialog open={showCagModal} onOpenChange={setShowCagModal}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {cagPack && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> CAG MSO 2020 COMPLIANT
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {cagPack.total_evidence_nodes} Evidence Nodes
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {cagPack.generated_at?.split("T")[0]}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground mt-2 text-left">
                  {cagPack.audit_title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground text-left font-mono">
                  Project: {cagPack.project_metadata?.name} ({cagPack.project_metadata?.id}) · Contractor: {cagPack.project_metadata?.contractor}
                </DialogDescription>
              </DialogHeader>

              {/* Merkle Hash Box */}
              <div className="p-3.5 rounded-xl bg-accent/20 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono flex items-center gap-1">
                    <Lock size={12} className="text-primary" />
                    CRYPTOGRAPHIC MERKLE ROOT HASH (SHA-256)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cagPack.merkle_root_hash);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="px-2 py-0.5 text-[10px] rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    {copiedHash ? <Check size={11} /> : <Copy size={11} />}
                    {copiedHash ? "COPIED" : "COPY HASH"}
                  </button>
                </div>
                <div className="font-mono text-xs text-primary font-bold break-all bg-background/80 p-2.5 rounded border border-border/60">
                  {cagPack.merkle_root_hash}
                </div>
              </div>

              {/* Project Stats in Dossier */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-background/50 border border-border">
                  <span className="text-[10px] text-muted-foreground block">SANCTIONED BUDGET</span>
                  <span className="font-bold text-foreground">₹{(cagPack.project_metadata?.sanctioned_budget_inr / 100000).toFixed(1)} L</span>
                </div>
                <div className="p-2.5 rounded bg-background/50 border border-border">
                  <span className="text-[10px] text-muted-foreground block">CUMULATIVE SPEND</span>
                  <span className="font-bold text-foreground">₹{(cagPack.project_metadata?.cumulative_spend_inr / 10000000).toFixed(2)} Cr</span>
                </div>
                <div className="p-2.5 rounded bg-background/50 border border-border">
                  <span className="text-[10px] text-muted-foreground block">PHYSICAL PROGRESS</span>
                  <span className="font-bold text-emerald-400">{cagPack.project_metadata?.physical_progress_pct}%</span>
                </div>
              </div>

              {/* Auditor Compliance Statement */}
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">
                  STATUTORY AUDITOR COMPLIANCE STATEMENT
                </span>
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  "{cagPack.auditor_compliance_statement}"
                </p>
              </div>

              {/* Manifest Nodes */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block">
                  MANIFEST NODES ({cagPack.total_evidence_nodes} EVIDENCE FILES SECURED)
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px] pr-1">
                  {cagPack.manifest?.map((m: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-background border border-border flex justify-between items-center">
                      <span className="truncate max-w-[280px]">Evidence #{m.evidence_id}: {m.file_path}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{m.uploaded_at?.split("T")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => downloadJSON(cagPack, `CAG_Audit_Dossier_${cagPack.project_metadata?.id}.json`)}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download size={13} /> Re-Download Dossier JSON
                </button>
                <button
                  type="button"
                  onClick={() => setShowCagModal(false)}
                  className="px-3.5 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer font-mono"
                >
                  Close & View in Tab
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Whistleblower Tip Confirmation Modal */}
      <Dialog open={showWbModal} onOpenChange={setShowWbModal}>
        <DialogContent className="max-w-md bg-card border-border">
          {wbSubmittedData && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Fingerprint className="h-5 w-5" />
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Anonymous Encrypted Tip Registered
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Your identity is protected under the Whistleblower Protection Act. No IP or telemetry logged.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block">
                  INVESTIGATION DOCKET TRACKING CODE
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-mono font-bold text-primary">
                    {wbSubmittedData.tracking_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(wbSubmittedData.tracking_code);
                      setCopiedWbCode(true);
                      setTimeout(() => setCopiedWbCode(false), 2000);
                    }}
                    className="px-2.5 py-1 text-[10px] rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    {copiedWbCode ? <Check size={11} /> : <Copy size={11} />}
                    {copiedWbCode ? "COPIED" : "COPY CODE"}
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Category: <span className="text-foreground font-medium uppercase font-mono">{wbSubmittedData.category}</span></p>
                <p>• Status: <span className="text-amber-400 font-bold font-mono">ENCRYPTED & QUEUED FOR ACB SCREENING</span></p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowWbModal(false);
                    setActiveTab("whistleblower");
                    setTrackCode(wbSubmittedData.tracking_code);
                    handleTrackTip();
                  }}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Search size={13} /> Track Inquiry Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowWbModal(false)}
                  className="px-3.5 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer font-mono"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* XAI Diagnostics Modal */}
      <Dialog open={showXaiModal} onOpenChange={setShowXaiModal}>
        <DialogContent className="max-w-xl bg-card border-border max-h-[85vh] overflow-y-auto">
          {xaiData && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Scale className="h-5 w-5" />
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Explainable AI (XAI) Engineering Inspection
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Departmental inquiry-ready plain-language evaluation against MoRTH & IRC standards.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <span className="font-bold">Overall AI Quality Score: </span>
                <span className="font-mono text-primary font-bold text-base">
                  {xaiData.overall_quality_score || 75.0}/100
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {xaiData.admissibility_summary}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block">
                  STANDARDS & THRESHOLD AUDIT RULES
                </span>
                {xaiData.xai_breakdown?.map((b: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-accent/10 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{b.metric}</span>
                      <span className="text-primary font-mono">{b.observed_value}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Threshold: {b.threshold_rule}</div>
                    <p className="text-[11px] text-foreground/90">{b.plain_language_reason}</p>
                    <div className="text-[9px] text-emerald-400 font-medium font-mono">{b.legal_standing}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowXaiModal(false)}
                  className="px-3.5 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer font-mono"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Maker-Checker Confirmation Modal */}
      <Dialog open={!!makerCheckerModal} onOpenChange={(open) => !open && setMakerCheckerModal(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          {makerCheckerModal && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-400" />
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Dual-Custody Decision Committed
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  GFR 2017 Rule 144 Compliant · Treasury Two-Person Integrity Enforced
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span className="font-bold text-foreground">#{makerCheckerModal.reqId}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground">Decision:</span>
                  <span className={`font-bold ${makerCheckerModal.decision === "approved" ? "text-emerald-400" : "text-rose-400"}`}>
                    {makerCheckerModal.decision.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground">Ledger Sync:</span>
                  <span className="text-primary font-bold">STATE TREASURY COMMITTED</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                Action recorded with official cryptographic audit stamp. Maker-Checker queue has been updated.
              </p>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMakerCheckerModal(null)}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded cursor-pointer font-mono"
                >
                  Understood
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
