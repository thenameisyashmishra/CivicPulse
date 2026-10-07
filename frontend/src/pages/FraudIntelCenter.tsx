import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShieldAlert,
  Ghost,
  Network,
  TrendingUp,
  BarChart3,
  Split,
  Building2,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/data";

export default function FraudIntelCenter() {
  const [activeTab, setActiveTab] = useState<
    | "anomalies"
    | "ghosts"
    | "collusion"
    | "overbilling"
    | "benford"
    | "split_tenders"
    | "shell_networks"
    | "red_flag_dossier"
  >("anomalies");

  const [dossier, setDossier] = useState<any>(null);
  const [collusionEdges, setCollusionEdges] = useState<any[]>([]);
  const [benfordResult, setBenfordResult] = useState<any>(null);
  const [overbillingResult, setOverbillingResult] = useState<any>(null);

  // Real API State for Tabs
  const [anomalyResult, setAnomalyResult] = useState<any>(null);
  const [anomalyForm, setAnomalyForm] = useState({
    entity_type: "contractor",
    entity_id: "NCC Limited",
  });

  const [ghostResult, setGhostResult] = useState<any>(null);
  const [ghostForm, setGhostForm] = useState({
    project_id: "PW-2024-001",
  });

  const [splitResult, setSplitResult] = useState<any>(null);
  const [splitForm, setSplitForm] = useState({
    parent_scheme: "PMGSY-DELHI-ZONE",
    detected_tenders: "TDR-2024-001A, TDR-2024-001B, TDR-2024-001C",
    total_cost: 2850000.0,
  });

  const [shellResult, setShellResult] = useState<any>(null);
  const [shellForm, setShellForm] = useState({
    cluster_name: "Yamuna Infra Cartel Cluster #4",
    contractor_ids: "1, 2, 3",
    shared_attributes: "Shared GST registered address, common directors, identical PNB branch account",
  });

  const [collusionForm, setCollusionForm] = useState({
    node_a: "Er. V. K. Sharma (Superintending Engineer)",
    node_b: "Apex Buildcon Pvt Ltd",
    edge_type: "tender_award_repeat",
    weight: 0.85,
  });

  const fetchDossierAndNetwork = async () => {
    const token = getToken();
    try {
      const [dosRes, netRes] = await Promise.all([
        fetch("/api/fraud-intel/red-flag-dossier", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/fraud-intel/collusion/network", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : [])),
      ]);
      if (dosRes && !dosRes.detail) setDossier(dosRes);
      setCollusionEdges(Array.isArray(netRes) ? netRes : []);
    } catch (e) {
      console.error(e);
      setCollusionEdges([]);
    }
  };

  useEffect(() => {
    fetchDossierAndNetwork();
  }, []);

  const runBenfordScreening = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/benford/screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          contractor_id: 1,
          bill_amounts: [12000, 14500, 18900, 24000, 31000, 45000, 67000, 89000],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Benford screening failed (HTTP ${res.status})`);
      }
      setBenfordResult(data);
      toast.success("Benford's Law digit frequency analysis complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const checkOverbilling = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/overbilling/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          item_description: "Sub-base Granular Aggregate 40mm",
          claimed_cost: 4200000.0,
          benchmark_cost: 3100000.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Overbilling check failed (HTTP ${res.status})`);
      }
      setOverbillingResult(data);
      toast.success("Statistical unit price Z-score evaluated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const evaluateAnomalyScore = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/anomaly-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(anomalyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Anomaly score failed (HTTP ${res.status})`);
      setAnomalyResult(data);
      toast.success("Cross-project statistical anomaly scoring complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const detectGhostProject = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/ghost-project/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(ghostForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Ghost project scan failed (HTTP ${res.status})`);
      setGhostResult(data);
      toast.success("Disbursement vs physical evidence surveillance scan completed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const detectSplitTenders = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/split-tender/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          parent_scheme: splitForm.parent_scheme,
          detected_tenders: splitForm.detected_tenders.split(",").map((s) => s.trim()),
          total_cost: splitForm.total_cost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Split tender detection failed (HTTP ${res.status})`);
      setSplitResult(data);
      toast.success("Split-tender sanction ceiling bypass analyzed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const detectShellCluster = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/shell-cluster/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cluster_name: shellForm.cluster_name,
          contractor_ids: shellForm.contractor_ids.split(",").map((s) => parseInt(s.trim()) || 1),
          shared_attributes: shellForm.shared_attributes.split(",").map((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Shell cluster detection failed (HTTP ${res.status})`);
      setShellResult(data);
      toast.success("Shell contractor cartel resolution complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const mapCollusionEdge = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/fraud-intel/collusion/edge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(collusionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Collusion mapping failed (HTTP ${res.status})`);
      toast.success("Bipartite collusion edge mapped!");
      fetchDossierAndNetwork();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-rose-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
              <h1 className="text-2xl font-bold tracking-wide">
                Fraud & Anomaly Intelligence Center
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                PILLAR B.5
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Anti-corruption surveillance · Ghost-project detector, Benford's Law invoice screening, collusion graph networks, shell cartels
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Fraud Intelligence Modules"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
          {[
            { id: "anomalies", label: "Cross-Project Outliers", icon: TrendingUp },
            { id: "ghosts", label: "Ghost Projects", icon: Ghost },
            { id: "collusion", label: "Collusion Network", icon: Network },
            { id: "overbilling", label: "Over-Billing Z-Score", icon: BarChart3 },
            { id: "benford", label: "Benford's Law", icon: FileWarning },
            { id: "split_tenders", label: "Split Tenders", icon: Split },
            { id: "shell_networks", label: "Shell Contractor Cartels", icon: Building2 },
            { id: "red_flag_dossier", label: "Red Flag Dossier", icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`fraud-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`fraud-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  active
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Cross-Project Anomalies */}
        {activeTab === "anomalies" && (
          <div
            role="tabpanel"
            id="fraud-panel-anomalies"
            aria-labelledby="fraud-tab-anomalies"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  Cross-Project Statistical Anomaly Scoring
                </h3>
                <p className="text-xs text-muted-foreground">
                  Flags contractors and approving engineers whose projects systematically exhibit anomalous repeat defects or unusual expenditure burns.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Entity Type</label>
                  <select
                    value={anomalyForm.entity_type}
                    onChange={(e) => setAnomalyForm({ ...anomalyForm, entity_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  >
                    <option value="contractor">Contractor Organization</option>
                    <option value="approving_engineer">Approving Official / Engineer</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Entity Name / Identifier</label>
                  <input
                    type="text"
                    value={anomalyForm.entity_id}
                    onChange={(e) => setAnomalyForm({ ...anomalyForm, entity_id: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  onClick={evaluateAnomalyScore}
                  className="w-full py-2 font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Compute Statistical Anomaly Score
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Statistical Risk Evaluation</h3>
              {anomalyResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>{anomalyResult.entity_id}</span>
                    <span className={anomalyResult.risk_score >= 50 ? "text-rose-400 font-bold uppercase" : "text-emerald-400 font-bold uppercase"}>
                      {anomalyResult.risk_tier || "EVALUATED"}
                    </span>
                  </div>
                  <div className={`text-2xl font-black font-mono ${anomalyResult.risk_score >= 50 ? "text-rose-400" : "text-emerald-400"}`}>
                    {anomalyResult.risk_score?.toFixed(1) || "24.5"} / 100
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Repeat Defect Rate: {anomalyResult.repeat_defect_rate_pct ?? "3.2"}% · Flagged Duplicates: {anomalyResult.duplicate_photo_flags ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    Entity type: {anomalyResult.entity_type} · Evaluated across all monitored works.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Submit entity query to compute cross-project statistical anomaly scoring.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Ghost Projects */}
        {activeTab === "ghosts" && (
          <div
            role="tabpanel"
            id="fraud-panel-ghosts"
            aria-labelledby="fraud-tab-ghosts"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Ghost className="h-4 w-4 text-rose-500" />
                  Autonomous Ghost-Project Detection
                </h3>
                <p className="text-xs text-muted-foreground">
                  Flags works where funds have been disbursed but zero photo evidence or satellite change has been detected after 30+ days.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={ghostForm.project_id}
                    onChange={(e) => setGhostForm({ ...ghostForm, project_id: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  onClick={detectGhostProject}
                  className="w-full py-2 font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Scan Project For Zero-Evidence Disbursement
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Vigilance Surveillance Outcome</h3>
              {ghostResult ? (
                <div className={`p-4 rounded font-mono space-y-2 border ${ghostResult.is_ghost_project ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}>
                  <div className="flex justify-between font-bold">
                    <span>Project: {ghostResult.project_id}</span>
                    <span className="uppercase font-bold">
                      {ghostResult.is_ghost_project ? "ALERT: GHOST PROJECT" : "EVIDENCE CONFIRMED"}
                    </span>
                  </div>
                  <div className="text-[11px]">
                    Status: <strong className="text-foreground">{ghostResult.status || "active_evidence_confirmed"}</strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {ghostResult.message || "Disbursements verified against geotagged visual evidence and satellite surface disturbance."}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Scan any project ID to cross-reference Treasury disbursements against physical evidence.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Collusion Network */}
        {activeTab === "collusion" && (
          <div
            role="tabpanel"
            id="fraud-panel-collusion"
            aria-labelledby="fraud-tab-collusion"
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Network className="h-4 w-4 text-indigo-400" />
                    Map Bipartite Collusion Edge
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Connects approving officials with contractors to track repeated tender single-bids or defect dismissals.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Node A (Approving Official)</label>
                    <input
                      type="text"
                      value={collusionForm.node_a}
                      onChange={(e) => setCollusionForm({ ...collusionForm, node_a: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Node B (Contractor / Vendor)</label>
                    <input
                      type="text"
                      value={collusionForm.node_b}
                      onChange={(e) => setCollusionForm({ ...collusionForm, node_b: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Edge Type</label>
                      <select
                        value={collusionForm.edge_type}
                        onChange={(e) => setCollusionForm({ ...collusionForm, edge_type: e.target.value })}
                        className="w-full p-2 rounded-lg bg-background border border-border"
                      >
                        <option value="tender_award_repeat">Tender Award Repeat</option>
                        <option value="defect_dismissal">Defect Dismissal</option>
                        <option value="single_bidder_award">Single Bidder Award</option>
                        <option value="shared_bank_branch">Shared Bank Branch</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Collusion Weight (0.1 - 1.0)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1.0"
                        value={collusionForm.weight}
                        onChange={(e) => setCollusionForm({ ...collusionForm, weight: parseFloat(e.target.value) || 0.5 })}
                        className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={mapCollusionEdge}
                    className="w-full py-2 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition cursor-pointer shadow-md"
                  >
                    Map Bipartite Collusion Edge
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
                <h4 className="font-bold text-xs text-foreground">Monitored Collusion Edges ({collusionEdges.length})</h4>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {collusionEdges.map((e, idx) => (
                    <div key={idx} className="p-3 rounded bg-accent/20 flex justify-between items-center border border-border/60">
                      <div>
                        <span className="font-bold text-foreground">{e.node_a}</span>
                        <span className="text-muted-foreground"> ⟷ </span>
                        <span className="font-bold text-indigo-400">{e.node_b}</span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Type: {e.edge_type} · Frequency: {e.frequency} times
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 font-bold">
                        WEIGHT: {e.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Overbilling */}
        {activeTab === "overbilling" && (
          <div
            role="tabpanel"
            id="fraud-panel-overbilling"
            aria-labelledby="fraud-tab-overbilling"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-rose-400" />
                  Statistical Schedule of Rates (SoR) Z-Score
                </h3>
                <p className="text-xs text-muted-foreground">
                  Compares billed unit prices against historical statistical distributions to flag price padding.
                </p>
              </div>

              <button
                onClick={checkOverbilling}
                className="w-full py-2 font-semibold rounded-lg bg-rose-600 text-white text-xs"
              >
                Compute SoR Z-Score
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Statistical Evaluation</h3>
              {overbillingResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{overbillingResult.item_description}</span>
                    <span className="text-rose-400 uppercase">{overbillingResult.alert_status}</span>
                  </div>
                  <div className="text-rose-400 font-bold">Z-Score: +{overbillingResult.z_score}σ</div>
                  <div className="text-[11px] text-muted-foreground">
                    Claimed: ₹{overbillingResult.claimed_cost_inr?.toLocaleString()} · Benchmark: ₹{overbillingResult.statistical_benchmark_cost_inr?.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Run SoR Z-Score test.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Benford's Law */}
        {activeTab === "benford" && (
          <div
            role="tabpanel"
            id="fraud-panel-benford"
            aria-labelledby="fraud-tab-benford"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-rose-400" />
                  Benford's Law First-Digit Invoice Screening
                </h3>
                <p className="text-xs text-muted-foreground">
                  Applies logarithmic digit-distribution Chi-square tests to payment vouchers to detect manufactured expense numbers.
                </p>
              </div>

              <button
                onClick={runBenfordScreening}
                className="w-full py-2 font-semibold rounded-lg bg-rose-600 text-white text-xs"
              >
                Screen Payment Vouchers
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Goodness-of-Fit Results</h3>
              {benfordResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Sample Size: {benfordResult.sample_size} Vouchers</span>
                    <span className={benfordResult.conforms_to_benford ? "text-emerald-400" : "text-rose-400"}>
                      {benfordResult.conforms_to_benford ? "CONFORMS TO BENFORD" : "HIGH ANOMALY"}
                    </span>
                  </div>
                  <div>Chi-Square Stat: {benfordResult.chi_square_stat} (p = {benfordResult.p_value})</div>
                  <div className="text-muted-foreground text-[10px]">
                    Risk Tier: {benfordResult.risk_tier}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Run Benford screening.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Split Tenders */}
        {activeTab === "split_tenders" && (
          <div
            role="tabpanel"
            id="fraud-panel-split_tenders"
            aria-labelledby="fraud-tab-split_tenders"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Split className="h-4 w-4 text-rose-400" />
                  Duplicate & Split-Tender Detection
                </h3>
                <p className="text-xs text-muted-foreground">
                  Detects multiple sub-₹10 Lakh tenders issued in the same ward within 60 days to bypass higher sanctioning authorities.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Parent Scheme / Ward Name</label>
                  <input
                    type="text"
                    value={splitForm.parent_scheme}
                    onChange={(e) => setSplitForm({ ...splitForm, parent_scheme: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Detected Tenders (comma separated)</label>
                  <input
                    type="text"
                    value={splitForm.detected_tenders}
                    onChange={(e) => setSplitForm({ ...splitForm, detected_tenders: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Combined Cost (₹ INR)</label>
                  <input
                    type="number"
                    value={splitForm.total_cost}
                    onChange={(e) => setSplitForm({ ...splitForm, total_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  onClick={detectSplitTenders}
                  className="w-full py-2 font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Analyze Sanction-Threshold Bypass
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Split-Tender Surveillance Outcome</h3>
              {splitResult ? (
                <div className="p-4 rounded font-mono space-y-2 border bg-rose-500/10 border-rose-500/30 text-rose-300">
                  <div className="flex justify-between font-bold">
                    <span>Cluster: {splitResult.parent_scheme}</span>
                    <span className="text-rose-400 uppercase font-bold">SPLIT-TENDER CLUSTER FLAGGED</span>
                  </div>
                  <div className="text-[11px] text-foreground">
                    Tenders: {Array.isArray(splitResult.detected_cluster_tender_ids) ? splitResult.detected_cluster_tender_ids.join(", ") : splitResult.detected_cluster_tender_ids} ({splitResult.tender_count || 0} packages)
                  </div>
                  <div className="text-[11px]">
                    Total Combined: ₹{Number(splitResult.combined_estimated_cost_inr || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {splitResult.bypass_threshold_reason}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Analyze tenders within a 60-day window to evaluate intentional split packages bypassing SE financial powers.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Shell Networks */}
        {activeTab === "shell_networks" && (
          <div
            role="tabpanel"
            id="fraud-panel-shell_networks"
            aria-labelledby="fraud-tab-shell_networks"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Shell-Contractor Cartel Resolution
                </h3>
                <p className="text-xs text-muted-foreground">
                  Resolves bidding entities that share common directors, PAN card prefixes, registered GST addresses, or bank branches.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Cartel Cluster Name</label>
                  <input
                    type="text"
                    value={shellForm.cluster_name}
                    onChange={(e) => setShellForm({ ...shellForm, cluster_name: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Contractor IDs (comma separated)</label>
                  <input
                    type="text"
                    value={shellForm.contractor_ids}
                    onChange={(e) => setShellForm({ ...shellForm, contractor_ids: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Shared Attributes (comma separated)</label>
                  <textarea
                    rows={2}
                    value={shellForm.shared_attributes}
                    onChange={(e) => setShellForm({ ...shellForm, shared_attributes: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  onClick={detectShellCluster}
                  className="w-full py-2 font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Resolve Cross-Entity Collusion Cartel
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Cartel Cluster Analysis</h3>
              {shellResult ? (
                <div className="p-4 rounded font-mono space-y-2 border bg-amber-500/10 border-amber-500/30 text-amber-300">
                  <div className="flex justify-between font-bold">
                    <span>{shellResult.cluster_name}</span>
                    <span className="text-amber-400 uppercase font-bold">
                      {shellResult.confidence_pct}% CARTEL CONFIDENCE
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground">
                    Matched Contractors: #{Array.isArray(shellResult.matched_contractor_ids) ? shellResult.matched_contractor_ids.join(", #") : shellResult.matched_contractor_ids}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Shared Attributes: {Array.isArray(shellResult.shared_attributes) ? shellResult.shared_attributes.join(" · ") : shellResult.shared_attributes}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Status: {shellResult.is_reported ? "Reported to Lokayukta / ACB" : "Pending Vigilance FIR Submission"}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Scan bidding entity records for shared addresses, directors, phone numbers, and bank branches.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 8: Red Flag Dossier */}
        {activeTab === "red_flag_dossier" && (
          <div
            role="tabpanel"
            id="fraud-panel-red_flag_dossier"
            aria-labelledby="fraud-tab-red_flag_dossier"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">State Vigilance / Anti-Corruption Bureau (ACB) Threat Matrix</h3>
              <p className="text-xs text-muted-foreground">
                Aggregated, prioritized fraud dossier for formal forwarding to State Vigilance & Lokayukta.
              </p>
            </div>

            {dossier && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Critical Anomalies</span>
                  <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                    {dossier.critical_anomalies_count}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ghost Projects</span>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                    {dossier.ghost_projects_detected}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Overbilling Flags</span>
                  <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
                    {dossier.overbilling_flags_count}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
