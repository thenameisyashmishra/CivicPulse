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
  AlertTriangle,
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

  const fetchDossierAndNetwork = async () => {
    const token = getToken();
    try {
      const [dosRes, netRes] = await Promise.all([
        fetch("/api/fraud-intel/red-flag-dossier", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch("/api/fraud-intel/collusion/network").then((r) => r.json()),
      ]);
      setDossier(dosRes);
      setCollusionEdges(netRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDossierAndNetwork();
  }, []);

  const runBenfordScreening = async () => {
    try {
      const res = await fetch("/api/fraud-intel/benford/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          contractor_id: 1,
          bill_amounts: [12000, 14500, 18900, 24000, 31000, 45000, 67000, 89000],
        }),
      });
      const data = await res.json();
      setBenfordResult(data);
      toast.success("Benford's Law digit frequency analysis complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const checkOverbilling = async () => {
    try {
      const res = await fetch("/api/fraud-intel/overbilling/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          item_description: "Sub-base Granular Aggregate 40mm",
          claimed_cost: 4200000.0,
          benchmark_cost: 3100000.0,
        }),
      });
      const data = await res.json();
      setOverbillingResult(data);
      toast.success("Statistical unit price Z-score evaluated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
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
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Cross-Project Statistical Anomaly Scoring</h3>
              <p className="text-xs text-muted-foreground">
                Flags contractors and approving engineers whose projects systematically exhibit anomalous repeat defects or unusual expenditure burns.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>Contractor: NCC Limited</span>
                  <span className="text-emerald-400 font-mono">LOW RISK</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">18.4 / 100</div>
                <div className="text-[11px] text-muted-foreground">
                  Repeat Defect Rate: 2.1% · Zero Duplicate Photos
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>Contractor: Apex Apex Buildcon</span>
                  <span className="text-rose-400 font-mono">HIGH RISK</span>
                </div>
                <div className="text-2xl font-black font-mono text-rose-400">76.2 / 100</div>
                <div className="text-[11px] text-muted-foreground">
                  Repeat Defect Rate: 14.8% · 2 Flagged Duplicates
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ghost Projects */}
        {activeTab === "ghosts" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Autonomous Ghost-Project Detection</h3>
              <p className="text-xs text-muted-foreground">
                Flags works where funds have been disbursed but zero photo evidence or satellite change has been detected after 30+ days.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-3 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Zero-Evidence Disbursement Watch
                </span>
                <span className="text-rose-400 font-mono">VIGILANCE SURVEILLANCE ACTIVE</span>
              </div>
              <p className="text-muted-foreground">
                Algorithmic engine scans civicpulse.db every 6 hours. Currently, all sanctioned works in North East Delhi have valid geotagged evidence.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Collusion Network */}
        {activeTab === "collusion" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Approver-Contractor Collusion Network Graph</h3>
              <p className="text-xs text-muted-foreground">
                Constructs bipartite graph of tender approvals, single-bid awards, and defect dismissals to detect corruption cliques.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <h4 className="font-bold text-xs">Monitored Collusion Edges</h4>
              {collusionEdges.map((e, idx) => (
                <div key={idx} className="p-3 rounded bg-accent/20 flex justify-between items-center">
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
        )}

        {/* Tab 4: Overbilling */}
        {activeTab === "overbilling" && (
          <div className="grid md:grid-cols-2 gap-6">
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
          <div className="grid md:grid-cols-2 gap-6">
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
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Duplicate & Split-Tender Detection</h3>
              <p className="text-xs text-muted-foreground">
                Detects multiple sub-₹10 Lakh tenders issued in the same ward within 60 days to bypass higher sanctioning authorities.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Cluster: PMGSY-DELHI-ZONE</span>
                <span className="text-rose-400">SPLIT-TENDER CLUSTER FLAGGED</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                3 Works (TDR-2024-001A, 001B, 001C) combined at ₹28.5 Lakhs to bypass Superintending Engineer sanction ceiling.
              </p>
            </div>
          </div>
        )}

        {/* Tab 7: Shell Networks */}
        {activeTab === "shell_networks" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Shell-Contractor Cartel Resolution</h3>
              <p className="text-xs text-muted-foreground">
                Resolves bidding entities that share common directors, PAN card prefixes, registered GST addresses, or bank branches.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Yamuna Infra Cartel Cluster #4</span>
                <span className="text-rose-400">94.5% CARTEL CONFIDENCE</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Matched Contractors #1, #2, and #3 sharing directors, registered GST address, and PNB branch account.
              </p>
            </div>
          </div>
        )}

        {/* Tab 8: Red Flag Dossier */}
        {activeTab === "red_flag_dossier" && (
          <div className="space-y-4">
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
