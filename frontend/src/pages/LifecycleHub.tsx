import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FolderTree,
  Calendar,
  AlertOctagon,
  CloudRain,
  Map,
  Leaf,
  CreditCard,
  ShieldAlert,
  Building,
  FileCheck2,
  Boxes,
  Users,
  GitBranch,
  Flame,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/data";

export default function LifecycleHub() {
  const [activeTab, setActiveTab] = useState<
    | "schemes"
    | "gantt"
    | "delays"
    | "weather"
    | "land"
    | "clearances"
    | "payment_triggers"
    | "dlp"
    | "asset_twin"
    | "uc"
    | "materials"
    | "labour"
    | "change_orders"
    | "emergency_mcc"
  >("schemes");

  const [schemes, setSchemes] = useState<any[]>([]);
  const [ganttData, setGanttData] = useState<any>(null);
  const [delayAnalytics, setDelayAnalytics] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("PW-2024-001");

  // Form states
  const [weatherForm, setWeatherForm] = useState({
    claimed_event: "Heavy Cloudburst & Waterlogging",
    claimed_rainfall_mm: 75.0,
  });
  const [weatherResult, setWeatherResult] = useState<any>(null);

  const [changeOrderForm, setChangeOrderForm] = useState({
    orig_val: 45000000.0,
    revised_val: 48500000.0,
    justification: "Additional 2.5km RCC roadside drain to prevent flooding.",
  });

  const [ucData, setUcData] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [schRes, ganttRes, delayRes] = await Promise.all([
        fetch("/api/lifecycle/schemes").then((r) => r.json()),
        fetch(`/api/lifecycle/gantt/${selectedProjectId}`).then((r) => r.json()),
        fetch("/api/lifecycle/delay-analytics").then((r) => r.json()),
      ]);

      setSchemes(schRes || []);
      setGanttData(ganttRes);
      setDelayAnalytics(delayRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const handleVerifyWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/lifecycle/weather-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          claim_date: "2024-08-14",
          claimed_event: weatherForm.claimed_event,
          claimed_rainfall_mm: weatherForm.claimed_rainfall_mm,
        }),
      });
      const data = await res.json();
      setWeatherResult(data);
      toast.success("IMD Meteorological cross-check complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTriggerPayment = async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/milestone-payment-trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          milestone_id: 2,
          tranche_amount: 1250000.0,
        }),
      });
      const data = await res.json();
      if (data.triggered) {
        toast.success(`Milestone payment voucher generated: ${data.voucher_ref}`);
      } else {
        toast.error(`Payment trigger blocked: ${data.reason}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGenerateUC = async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/utilization-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          financial_year: "2024-25",
          sanctioned_amount: 45000000.0,
          actual_spent_amount: 31200000.0,
        }),
      });
      const data = await res.json();
      setUcData(data);
      toast.success(`Statutory Form GFR 12-C created: ${data.uc_number}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmitChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/change-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          original_contract_value: changeOrderForm.orig_val,
          revised_contract_value: changeOrderForm.revised_val,
          justification: changeOrderForm.justification,
        }),
      });
      const data = await res.json();
      toast.success(`Change Order ${data.change_order_number} filed (${data.cost_variation_pct}% variation)!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-indigo-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderTree className="h-6 w-6 text-indigo-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Project Tracking & Full Lifecycle Hub
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                PILLAR B.3
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sanction to multi-year O&M · Gantt baselines, IMD weather verification, LARR R&R, GFR 12-C, NMMS muster rolls, MCC freeze
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono font-bold text-indigo-400"
            >
              <option value="PW-2024-001">PW-2024-001 (NH-44 Corridor)</option>
              <option value="PW-2024-002">PW-2024-002 (School Complex)</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
          {[
            { id: "schemes", label: "Scheme Hierarchy", icon: FolderTree },
            { id: "gantt", label: "Gantt Timeline", icon: Calendar },
            { id: "delays", label: "Delay Analytics", icon: AlertOctagon },
            { id: "weather", label: "IMD Weather Check", icon: CloudRain },
            { id: "land", label: "Land R&R (LARR)", icon: Map },
            { id: "clearances", label: "Clearances & MoEFCC", icon: Leaf },
            { id: "payment_triggers", label: "Payment Triggers", icon: CreditCard },
            { id: "dlp", label: "DLP Warranty", icon: ShieldAlert },
            { id: "asset_twin", label: "Digital Twin & O&M", icon: Building },
            { id: "uc", label: "GFR 12-C UCs", icon: FileCheck2 },
            { id: "materials", label: "Material Provenance", icon: Boxes },
            { id: "labour", label: "NMMS Labour Muster", icon: Users },
            { id: "change_orders", label: "Change Orders", icon: GitBranch },
            { id: "emergency_mcc", label: "Emergency & MCC", icon: Vote },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  active
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Schemes Hierarchy */}
        {activeTab === "schemes" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">National & State Scheme Hierarchy (Rollup)</h3>
              <p className="text-xs text-muted-foreground">
                Nested hierarchy mapping central schemes (PMGSY, Jal Jeevan Mission, PMAY) to sanctioned work orders.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {schemes.map((s) => (
                <div key={s.code} className="p-5 rounded-xl border border-border bg-card/40 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-400">{s.code}</span>
                      <h4 className="font-bold text-sm">{s.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent text-[10px] font-bold">
                      {s.active_projects_count} Works
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.nodal_ministry}</p>
                  <div className="pt-2 border-t border-border/50 flex justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Sanctioned</span>
                      <div className="font-bold">₹{(s.total_budget_inr / 10000000).toFixed(1)}Cr</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">Disbursed</span>
                      <div className="font-bold text-indigo-400">₹{(s.disbursed_budget_inr / 10000000).toFixed(1)}Cr</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Gantt Milestone Schedule */}
        {activeTab === "gantt" && ganttData && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Gantt Milestone Schedule & Baseline Slippage</h3>
                <p className="text-xs text-muted-foreground">
                  Tracks baseline start/finish vs actual milestone completion to auto-flag contractual schedule overrun.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono ${
                  ganttData.is_on_schedule
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {ganttData.is_on_schedule ? "On Schedule" : `${ganttData.total_slippage_days} Days Slippage`}
              </span>
            </div>

            <div className="space-y-3">
              {ganttData.milestones?.map((m: any) => (
                <div key={m.id} className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-foreground">Seq #{m.sequence}: {m.title}</span>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Baseline: {m.baseline_start} → {m.baseline_finish}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {m.status} ({m.weightage_pct}% Weight)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-muted-foreground text-[11px]">
                      Actual: {m.actual_start || "Pending"} → {m.actual_finish || "Ongoing"}
                    </span>
                    {m.slippage_days > 0 && (
                      <span className="text-rose-400 font-bold text-[11px]">
                        +{m.slippage_days}d slippage
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Delay Root Cause Analytics */}
        {activeTab === "delays" && delayAnalytics && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">State-Wide Delay Taxonomy & Root Cause Analytics</h3>
              <p className="text-xs text-muted-foreground">
                Categorized reasons why projects stall (land dispute, fund release, weather, contractor default).
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Accumulated Delay</span>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                  {delayAnalytics.total_accumulated_delay_days} Days
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Logged Incidents</span>
                <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
                  {delayAnalytics.total_delay_incidents} Events
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
              <h4 className="text-xs font-bold">Delay Breakdown by Root Cause</h4>
              <div className="space-y-2 text-xs font-mono">
                {Object.entries(delayAnalytics.delay_breakdown_by_root_cause || {}).map(([cat, days]) => (
                  <div key={cat} className="flex justify-between p-2 rounded bg-background/50 border border-border/50">
                    <span className="uppercase text-muted-foreground">{cat.replace("_", " ")}</span>
                    <span className="font-bold text-rose-400">{days as number} Days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: IMD Weather Delay Verification */}
        {activeTab === "weather" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CloudRain className="h-4 w-4 text-indigo-400" />
                  Evaluate Contractor Weather Delay Claim
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cross-checks claimed rainfall/temperature with India Meteorological Department (IMD) station observations.
                </p>
              </div>

              <form onSubmit={handleVerifyWeather} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Claimed Weather Event</label>
                  <input
                    type="text"
                    required
                    value={weatherForm.claimed_event}
                    onChange={(e) => setWeatherForm({ ...weatherForm, claimed_event: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold">Claimed Precipitation (mm)</label>
                  <input
                    type="number"
                    required
                    value={weatherForm.claimed_rainfall_mm}
                    onChange={(e) => setWeatherForm({ ...weatherForm, claimed_rainfall_mm: parseFloat(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-indigo-500 text-white"
                >
                  Query IMD Station Records
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">IMD Station Result</h3>
              {weatherResult ? (
                <div className="space-y-2 font-mono">
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex justify-between font-bold">
                      <span>Station: {weatherResult.imd_station_code}</span>
                      <span className={weatherResult.is_verified_disaster ? "text-emerald-400" : "text-amber-400"}>
                        {weatherResult.is_verified_disaster ? "DISASTER CONFIRMED" : "NORMAL RAINFALL"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Observed: {weatherResult.imd_rainfall_mm}mm (Claimed: {weatherResult.claimed_rainfall_mm}mm)
                    </div>
                    <div className="text-xs text-indigo-400 mt-1">
                      Deviation: {weatherResult.deviation_score}mm
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Submit a claim to verify against IMD station data.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Land R&R */}
        {activeTab === "land" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Land Acquisition & R&R (LARR Act 2013)</h3>
              <p className="text-xs text-muted-foreground">
                Section 11 notification, Section 19 declaration, compensation escrow, and displaced family rehabilitation.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="grid md:grid-cols-4 gap-4 text-center font-mono">
                <div className="p-3 rounded bg-accent/20">
                  <span className="text-[10px] text-muted-foreground">Total Required</span>
                  <div className="text-lg font-bold">24.5 Ha</div>
                </div>
                <div className="p-3 rounded bg-accent/20">
                  <span className="text-[10px] text-muted-foreground">Handed Over</span>
                  <div className="text-lg font-bold text-emerald-400">22.0 Ha (89.8%)</div>
                </div>
                <div className="p-3 rounded bg-accent/20">
                  <span className="text-[10px] text-muted-foreground">Escrow Balance</span>
                  <div className="text-lg font-bold text-indigo-400">₹8.5 Cr</div>
                </div>
                <div className="p-3 rounded bg-accent/20">
                  <span className="text-[10px] text-muted-foreground">Rehabilitated</span>
                  <div className="text-lg font-bold text-cyan-400">38 / 42 Families</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Environmental Clearances */}
        {activeTab === "clearances" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Environmental & Forest Statutory Clearances</h3>
              <p className="text-xs text-muted-foreground">
                MoEFCC Stage-I/II, State Pollution Control Board CTE/CTO, and compensatory afforestation covenants.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm">MoEFCC Stage-II Forest Clearance</h4>
                  <span className="font-mono text-muted-foreground text-[11px]">Ref: FC-DL-2023-9901</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  Active
                </span>
              </div>
              <p className="text-muted-foreground">
                Covenant: Compensatory afforestation of 2,500 saplings in Asola Bhatti Wildlife Sanctuary with geo-tagged survival audit.
              </p>
              <div className="text-[11px] font-mono text-indigo-400">
                Validity: 2023-06-01 to 2028-05-31 (1,365 Days Remaining)
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Milestone Payment Triggers */}
        {activeTab === "payment_triggers" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Dual-Gated Automated Payment Triggers</h3>
              <p className="text-xs text-muted-foreground">
                Once AI quality score clears 70% and engineer approves, a financial release voucher auto-drafts into the finance queue.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">Milestone #2: Granular Sub-Base & Macadam</h4>
                  <span className="text-muted-foreground text-[11px]">Tranche Value: ₹12,50,000</span>
                </div>
                <button
                  onClick={handleTriggerPayment}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition"
                >
                  Evaluate & Draft Voucher
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: DLP Warranty */}
        {activeTab === "dlp" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Defect Liability Period (DLP) Contractual Warranty</h3>
              <p className="text-xs text-muted-foreground">
                Automated re-inspections during 1-5 year warranty; defaults trigger forfeiture claims against PBGs.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between font-bold">
                <span>3-Year DLP Warranty for PW-2024-001</span>
                <span className="text-indigo-400 font-mono">2024-12-01 to 2027-11-30</span>
              </div>
              <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>6-Month Post-Monsoon Inspection:</span>
                  <span className="text-emerald-400">Scheduled (2025-06-15)</span>
                </div>
                <div className="flex justify-between">
                  <span>12-Month Annual Core Audit:</span>
                  <span className="text-emerald-400">Scheduled (2025-12-15)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Digital Twin & O&M */}
        {activeTab === "asset_twin" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Municipal Asset Digital Twin & 5-Year O&M Contract</h3>
              <p className="text-xs text-muted-foreground">
                Converts completed public works into permanent spatial asset ledgers with multi-year maintenance SLA tracking.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-indigo-400 font-bold">ASSET-NH44-CORR-01</span>
                  <h4 className="font-bold text-sm">4-Lane Bituminous Pavement</h4>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
                  CONDITION SCORE: 94.2/100
                </span>
              </div>
              <div className="p-3 rounded bg-accent/20 font-mono text-[11px] space-y-1">
                <div>Routine Maintenance 2025: Shoulder De-silting (₹80,000)</div>
                <div>Periodic Renewal 2027: Micro-surfacing 15mm (₹6,50,000)</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 10: Utilization Certificate (GFR 12-C) */}
        {activeTab === "uc" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Statutory Form GFR 12-C Utilization Certificate</h3>
                <p className="text-xs text-muted-foreground">
                  Auto-drafts statutory UCs against released central/state funds with expenditure reconciliation.
                </p>
              </div>
              <button
                onClick={handleGenerateUC}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-semibold text-xs"
              >
                Generate Form GFR 12-C
              </button>
            </div>

            {ucData && (
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
                <div className="flex justify-between font-bold border-b border-border pb-2">
                  <span>{ucData.gfr_form_type} — {ucData.uc_number}</span>
                  <span className="text-emerald-400 uppercase">{ucData.status}</span>
                </div>
                <div className="grid md:grid-cols-3 gap-2 pt-1">
                  <div>Sanctioned: ₹{ucData.sanctioned_amount?.toLocaleString("en-IN")}</div>
                  <div>Spent: ₹{ucData.actual_spent_amount?.toLocaleString("en-IN")}</div>
                  <div className="text-indigo-400 font-bold">Unspent: ₹{ucData.unspent_balance?.toLocaleString("en-IN")}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 11: Material Provenance */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Material Provenance & GST e-Invoice IRN Reconciliation</h3>
              <p className="text-xs text-muted-foreground">
                Matches cement/steel batch numbers and heat IDs with GST e-Invoices to confirm billed quantity was procured.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between font-bold">
                <span>TMT Steel Fe500D (BATCH-SAIL-2024-88A)</span>
                <span className="text-emerald-400 font-mono">GST IRN VERIFIED</span>
              </div>
              <p className="text-muted-foreground font-mono text-[11px]">
                Manufacturer: Steel Authority of India Ltd (SAIL) · Heat No: HEAT-88741 · Billed: 150 MT · Received: 150 MT
              </p>
            </div>
          </div>
        )}

        {/* Tab 12: NMMS Labour Muster */}
        {activeTab === "labour" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Labour Deployment & Attendance (NMMS Aadhaar Biometric)</h3>
              <p className="text-xs text-muted-foreground">
                Confirms physical on-site workforce presence against contractor billed labor days.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between font-bold">
                <span>Muster Roll #NMMS-DL-MR-901</span>
                <span className="text-emerald-400 font-mono">98.4% BIOMETRIC AUTH</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                Date: 2024-08-16 · 64 Aadhaar-Verified Workers · 64 Billed Days · Zero Discrepancy Flag
              </div>
            </div>
          </div>
        )}

        {/* Tab 13: Change Orders */}
        {activeTab === "change_orders" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-400" />
                  File Clause 12 Scope Variation Order
                </h3>
                <p className="text-xs text-muted-foreground">
                  Formal CPWD/IRC variation tracking (+/-10% statutory ceiling).
                </p>
              </div>

              <form onSubmit={handleSubmitChangeOrder} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Original Sanction Value (₹)</label>
                  <input
                    type="number"
                    value={changeOrderForm.orig_val}
                    onChange={(e) => setChangeOrderForm({ ...changeOrderForm, orig_val: parseFloat(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold">Revised Value (₹)</label>
                  <input
                    type="number"
                    value={changeOrderForm.revised_val}
                    onChange={(e) => setChangeOrderForm({ ...changeOrderForm, revised_val: parseFloat(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold">Engineering Justification</label>
                  <textarea
                    rows={3}
                    value={changeOrderForm.justification}
                    onChange={(e) => setChangeOrderForm({ ...changeOrderForm, justification: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-indigo-500 text-white"
                >
                  Submit Scope Variation
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Clause 12 Statutory Rule</h3>
              <p className="text-muted-foreground">
                Any variation exceeding 10% requires Superintending Engineer / Chief Engineer technical ratification per CPWD Works Manual Section 28.
              </p>
            </div>
          </div>
        )}

        {/* Tab 14: Emergency DMA & MCC Freeze */}
        {activeTab === "emergency_mcc" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                Disaster Management Act (DMA 2005) Fast-Track
              </h3>
              <p className="text-muted-foreground">
                Expedited single-day approval chain for embankment breaches, flood washouts, and emergency repairs with 30-day post-facto audit ratification.
              </p>
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 font-mono text-[11px] text-rose-400 font-bold">
                DMA-2005-FAST-PW-2024-002: RATIFICATION RECORD ACTIVE
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Vote className="h-4 w-4 text-amber-400" />
                ECI Model Code of Conduct (MCC) Freeze
              </h3>
              <p className="text-muted-foreground">
                Restricts new tender announcements and discretionary fund releases during declared election periods.
              </p>
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 font-mono text-[11px] text-amber-400 font-bold">
                MCC FREEZE CONTROLS STANDBY: ZERO UNVERIFIED DISBURSEMENTS
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
