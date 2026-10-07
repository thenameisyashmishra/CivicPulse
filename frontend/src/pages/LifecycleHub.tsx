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
  Download,
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

  // Modal feedback states
  const [paymentVoucherData, setPaymentVoucherData] = useState<any>(null);
  const [showUcModal, setShowUcModal] = useState(false);

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

  // Real API State for Tabs
  const [landForm, setLandForm] = useState({
    section_11_date: "2023-01-10",
    section_19_date: "2023-06-15",
    total_hectares: 24.5,
    handed_over_hectares: 22.0,
    compensation_escrow_inr: 85000000.0,
    displaced_families: 42,
    rehabilitated_families: 38,
  });
  const [landResult, setLandResult] = useState<any>(null);

  const [clearanceForm, setClearanceForm] = useState({
    authority: "MoEFCC Regional Office",
    clearance_type: "Forest Stage-II",
    reference_number: "FC-DL-2023-9901",
    issue_date: "2023-06-01",
    valid_until: "2028-05-31",
    conditions_summary: "Compensatory afforestation of 2,500 saplings in Asola Bhatti Wildlife Sanctuary with geo-tagged survival audit.",
  });
  const [clearanceResult, setClearanceResult] = useState<any>(null);

  const [dlpForm, setDlpForm] = useState({
    warranty_years: 3,
    start_date: "2024-12-01",
    end_date: "2027-11-30",
  });
  const [dlpResult, setDlpResult] = useState<any>(null);

  const [assetTwinForm, setAssetTwinForm] = useState({
    asset_type: "4-Lane Bituminous Pavement",
    condition_score: 94.2,
  });
  const [assetTwinResult, setAssetTwinResult] = useState<any>(null);

  const [materialForm, setMaterialForm] = useState({
    material_type: "TMT Steel Fe500D",
    batch_number: "BATCH-SAIL-2024-88A",
    heat_number: "HEAT-88741",
    manufacturer: "Steel Authority of India Ltd (SAIL)",
    gst_irn: "3b9a1e05a8f4c2d3e1b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9",
    billed_quantity: 150.0,
    received_quantity: 150.0,
  });
  const [materialResult, setMaterialResult] = useState<any>(null);

  const [laborForm, setLaborForm] = useState({
    attendance_date: "2024-08-16",
    nmms_muster_roll_id: "NMMS-DL-MR-901",
    aadhaar_verified_workers: 64,
    biometric_auth_pct: 98.4,
    billed_labor_days: 64,
  });
  const [laborResult, setLaborResult] = useState<any>(null);

  const [emergencyForm, setEmergencyForm] = useState({
    disaster_type: "Flash Flood & Culvert Washout",
    invoking_authority: "District Disaster Management Authority (DDMA)",
  });
  const [emergencyResult, setEmergencyResult] = useState<any>(null);

  const [mccForm, setMccForm] = useState({
    jurisdiction: "NCT of Delhi - All Wards",
    election_name: "General Legislative Assembly Election 2025",
    freeze_start_date: "2025-01-01",
    freeze_end_date: "2025-02-15",
    is_active: true,
  });
  const [mccResult, setMccResult] = useState<any>(null);

  const handleTrackLand = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/land-acquisition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...landForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Land R&R tracking failed (HTTP ${res.status})`);
      setLandResult(data);
      toast.success("LARR Act 2013 Land acquisition milestone recorded!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRegisterClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/environmental-clearance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...clearanceForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Environmental clearance failed (HTTP ${res.status})`);
      setClearanceResult(data);
      toast.success("Environmental & Forest Clearance registered!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRegisterDlp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/dlp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...dlpForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `DLP registration failed (HTTP ${res.status})`);
      setDlpResult(data);
      toast.success("DLP contractual warranty registered with inspection schedule!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRegisterAssetTwin = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/asset-twin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          asset_type: assetTwinForm.asset_type,
          condition_score: assetTwinForm.condition_score,
          geojson_geometry: { type: "LineString", coordinates: [[76.999, 28.421], [77.012, 28.435]] },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Asset Twin registration failed (HTTP ${res.status})`);
      setAssetTwinResult(data);
      toast.success("Municipal Digital Twin & O&M ledger established!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRecordMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/material-provenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...materialForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Material provenance failed (HTTP ${res.status})`);
      setMaterialResult(data);
      toast.success("Material supply-chain provenance & GST IRN reconciled!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRecordLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/labor-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...laborForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Labor muster failed (HTTP ${res.status})`);
      setLaborResult(data);
      toast.success("NMMS biometric attendance muster verified!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleInvokeEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/emergency-pathway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...emergencyForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Emergency pathway failed (HTTP ${res.status})`);
      setEmergencyResult(data);
      toast.success("DMA 2005 Emergency Fast-Track invoked & anchored!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSetMccFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/lifecycle/mcc-freeze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(mccForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `MCC freeze update failed (HTTP ${res.status})`);
      setMccResult(data);
      toast.success("ECI Model Code of Conduct status updated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchData = async () => {
    try {
      const token = getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [schRes, ganttRes, delayRes] = await Promise.all([
        fetch("/api/lifecycle/schemes", { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/lifecycle/gantt/${selectedProjectId}`, { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/lifecycle/delay-analytics", { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);

      setSchemes(Array.isArray(schRes) ? schRes : []);
      if (ganttRes && !ganttRes.detail) setGanttData(ganttRes);
      if (delayRes && !delayRes.detail) setDelayAnalytics(delayRes);
    } catch (e) {
      console.error(e);
      setSchemes([]);
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
      if (!res.ok) {
        throw new Error(data.detail || `Weather check failed (HTTP ${res.status})`);
      }
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
      if (!res.ok) {
        toast.error(data.detail || "Payment trigger failed. Ensure you are signed in as an Engineer or Admin.");
        return;
      }
      if (data.triggered) {
        downloadJSON(data, `Milestone_Payment_Voucher_${data.voucher_ref}.json`);
        setPaymentVoucherData(data);
        toast.success(`Milestone payment voucher generated & downloaded: ${data.voucher_ref}`);
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
      if (!res.ok) {
        toast.error(data.detail || "Utilization Certificate generation failed.");
        return;
      }
      setUcData(data);
      downloadJSON(data, `Statutory_Form_GFR_12C_${data.uc_number}.json`);
      setShowUcModal(true);
      toast.success(`Statutory Form GFR 12-C created & downloaded: ${data.uc_number}`);
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
      if (!res.ok) {
        throw new Error(data.detail || `Change Order submission failed (HTTP ${res.status})`);
      }
      toast.success(`Change Order ${data.change_order_number} filed (${data.cost_variation_pct}% variation)!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
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
        <div
          role="tablist"
          aria-label="Project Lifecycle Modules"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
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
                role="tab"
                id={`lc-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`lc-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
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
          <div
            role="tabpanel"
            id="lc-panel-schemes"
            aria-labelledby="lc-tab-schemes"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">National & State Scheme Hierarchy (Rollup)</h3>
              <p className="text-xs text-muted-foreground">
                Nested hierarchy mapping central schemes (PMGSY, Jal Jeevan Mission, PMAY) to sanctioned work orders.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {(Array.isArray(schemes) ? schemes : []).map((s) => (
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
          <div
            role="tabpanel"
            id="lc-panel-gantt"
            aria-labelledby="lc-tab-gantt"
            className="space-y-4"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-delays"
            aria-labelledby="lc-tab-delays"
            className="space-y-4"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-weather"
            aria-labelledby="lc-tab-weather"
            className="grid md:grid-cols-2 gap-6"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-land"
            aria-labelledby="lc-tab-land"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Map className="h-4 w-4 text-emerald-400" />
                  Land Acquisition & R&R (LARR Act 2013)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Section 11 notification, Section 19 declaration, compensation escrow, and displaced family rehabilitation.
                </p>
              </div>

              <form onSubmit={handleTrackLand} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Section 11 Notification Date</label>
                    <input
                      type="date"
                      value={landForm.section_11_date}
                      onChange={(e) => setLandForm({ ...landForm, section_11_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Section 19 Declaration Date</label>
                    <input
                      type="date"
                      value={landForm.section_19_date}
                      onChange={(e) => setLandForm({ ...landForm, section_19_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Total Required (Ha)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={landForm.total_hectares}
                      onChange={(e) => setLandForm({ ...landForm, total_hectares: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Handed Over (Ha)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={landForm.handed_over_hectares}
                      onChange={(e) => setLandForm({ ...landForm, handed_over_hectares: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Compensation Escrow (₹ INR)</label>
                  <input
                    type="number"
                    value={landForm.compensation_escrow_inr}
                    onChange={(e) => setLandForm({ ...landForm, compensation_escrow_inr: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Displaced Families</label>
                    <input
                      type="number"
                      value={landForm.displaced_families}
                      onChange={(e) => setLandForm({ ...landForm, displaced_families: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Rehabilitated Families</label>
                    <input
                      type="number"
                      value={landForm.rehabilitated_families}
                      onChange={(e) => setLandForm({ ...landForm, rehabilitated_families: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Record / Update Land Acquisition Milestone
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 text-xs font-mono">
              <h4 className="text-sm font-bold text-foreground">LARR Statutory Compliance Status</h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded bg-accent/20 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase">Required vs Handed Over</span>
                  <div className="text-base font-bold text-foreground mt-1">
                    {landResult ? landResult.land_handed_over_hectares : landForm.handed_over_hectares} / {landResult ? landResult.total_land_required_hectares : landForm.total_hectares} Ha
                  </div>
                  <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                    {(((landResult ? landResult.land_handed_over_hectares : landForm.handed_over_hectares) / (landResult ? landResult.total_land_required_hectares : landForm.total_hectares)) * 100).toFixed(1)}% Handed Over
                  </div>
                </div>

                <div className="p-3 rounded bg-accent/20 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase">Compensation Escrow</span>
                  <div className="text-base font-bold text-indigo-400 mt-1">
                    ₹{((landResult ? landResult.compensation_escrow_inr : landForm.compensation_escrow_inr) / 10000000).toFixed(2)} Cr
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Anchored in Treasury</div>
                </div>

                <div className="p-3 rounded bg-accent/20 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase">R&R Settlement</span>
                  <div className="text-base font-bold text-cyan-400 mt-1">
                    {landResult ? landResult.rehabilitated_families_count : landForm.rehabilitated_families} / {landResult ? landResult.displaced_families_count : landForm.displaced_families}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Families Settled</div>
                </div>

                <div className="p-3 rounded bg-accent/20 border border-border/50">
                  <span className="text-[10px] text-muted-foreground uppercase">Statutory Gazettes</span>
                  <div className="text-[11px] font-bold text-foreground mt-1">
                    Sec 11: {landResult ? landResult.section_11_notification_date : landForm.section_11_date}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Sec 19: {landResult ? landResult.section_19_declaration_date : landForm.section_19_date}
                  </div>
                </div>
              </div>

              {landResult && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                  Database Record ID #{landResult.id} updated for Project {landResult.project_id}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Environmental Clearances */}
        {activeTab === "clearances" && (
          <div
            role="tabpanel"
            id="lc-panel-clearances"
            aria-labelledby="lc-tab-clearances"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-emerald-400" />
                  Environmental & Forest Statutory Clearances
                </h3>
                <p className="text-xs text-muted-foreground">
                  MoEFCC Stage-I/II, State Pollution Control Board CTE/CTO, and compensatory afforestation covenants.
                </p>
              </div>

              <form onSubmit={handleRegisterClearance} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Clearance Authority</label>
                    <input
                      type="text"
                      value={clearanceForm.authority}
                      onChange={(e) => setClearanceForm({ ...clearanceForm, authority: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Clearance Type</label>
                    <input
                      type="text"
                      value={clearanceForm.clearance_type}
                      onChange={(e) => setClearanceForm({ ...clearanceForm, clearance_type: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={clearanceForm.reference_number}
                      onChange={(e) => setClearanceForm({ ...clearanceForm, reference_number: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Valid Until</label>
                    <input
                      type="date"
                      value={clearanceForm.valid_until}
                      onChange={(e) => setClearanceForm({ ...clearanceForm, valid_until: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Covenant / Conditions Summary</label>
                  <textarea
                    rows={2}
                    value={clearanceForm.conditions_summary}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, conditions_summary: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Register Environmental Clearance
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h4 className="text-sm font-bold">Clearance Registry & Covenant Audit</h4>
              <div className="p-4 rounded-xl border border-border/80 bg-accent/10 space-y-2 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      {clearanceResult ? clearanceResult.authority : clearanceForm.authority} — {clearanceResult ? clearanceResult.clearance_type : clearanceForm.clearance_type}
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Ref: {clearanceResult ? clearanceResult.reference_number : clearanceForm.reference_number}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                    {clearanceResult ? clearanceResult.status : "ACTIVE"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Covenant: {clearanceResult ? clearanceResult.conditions_summary : clearanceForm.conditions_summary}
                </p>
                <div className="text-[11px] text-indigo-400">
                  Valid Until: {clearanceResult ? clearanceResult.valid_until : clearanceForm.valid_until}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Milestone Payment Triggers */}
        {activeTab === "payment_triggers" && (
          <div
            role="tabpanel"
            id="lc-panel-payment_triggers"
            aria-labelledby="lc-tab-payment_triggers"
            className="space-y-4"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-dlp"
            aria-labelledby="lc-tab-dlp"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-indigo-400" />
                  Defect Liability Period (DLP) Contractual Warranty
                </h3>
                <p className="text-xs text-muted-foreground">
                  Automated re-inspections during 1-5 year warranty; defaults trigger forfeiture claims against PBGs.
                </p>
              </div>

              <form onSubmit={handleRegisterDlp} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Warranty Period (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dlpForm.warranty_years}
                    onChange={(e) => setDlpForm({ ...dlpForm, warranty_years: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Warranty Start Date</label>
                    <input
                      type="date"
                      value={dlpForm.start_date}
                      onChange={(e) => setDlpForm({ ...dlpForm, start_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Warranty End Date</label>
                    <input
                      type="date"
                      value={dlpForm.end_date}
                      onChange={(e) => setDlpForm({ ...dlpForm, end_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Register Contractual DLP & Schedule Surveys
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h4 className="text-sm font-bold">DLP Statutory Lifecycle & PBG Backing</h4>
              <div className="p-4 rounded-xl border border-border/80 bg-accent/10 space-y-3 font-mono">
                <div className="flex justify-between items-center font-bold">
                  <span>{dlpResult ? `${dlpResult.warranty_period_years}-Year DLP Warranty` : `${dlpForm.warranty_years}-Year DLP Warranty for ${selectedProjectId}`}</span>
                  <span className="text-indigo-400 font-mono">
                    {dlpResult ? `${dlpResult.dlp_start_date} to ${dlpResult.dlp_end_date}` : `${dlpForm.start_date} to ${dlpForm.end_date}`}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Inspection Milestone Schedule</div>
                  {dlpResult && Array.isArray(dlpResult.inspection_schedule_json) ? (
                    dlpResult.inspection_schedule_json.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded bg-background border border-border/60 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-bold text-foreground">{item.survey_name}</div>
                          <div className="text-muted-foreground text-[10px]">Due: {item.due_date}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 uppercase font-bold">
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-2.5 rounded bg-background border border-border/60 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-bold text-foreground">6-Month Post-Monsoon Inspection</div>
                          <div className="text-muted-foreground text-[10px]">Due: 2025-06-15</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 uppercase font-bold">
                          Scheduled
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-background border border-border/60 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-bold text-foreground">12-Month Annual Core Audit</div>
                          <div className="text-muted-foreground text-[10px]">Due: 2025-12-15</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 uppercase font-bold">
                          Scheduled
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Digital Twin & O&M */}
        {activeTab === "asset_twin" && (
          <div
            role="tabpanel"
            id="lc-panel-asset_twin"
            aria-labelledby="lc-tab-asset_twin"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Building className="h-4 w-4 text-emerald-400" />
                  Municipal Asset Digital Twin & 5-Year O&M Contract
                </h3>
                <p className="text-xs text-muted-foreground">
                  Converts completed public works into permanent spatial asset ledgers with multi-year maintenance SLA tracking.
                </p>
              </div>

              <form onSubmit={handleRegisterAssetTwin} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Asset Nomenclature / Type</label>
                  <input
                    type="text"
                    value={assetTwinForm.asset_type}
                    onChange={(e) => setAssetTwinForm({ ...assetTwinForm, asset_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Initial Condition Score (0.0 - 100.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={assetTwinForm.condition_score}
                    onChange={(e) => setAssetTwinForm({ ...assetTwinForm, condition_score: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Establish Municipal Asset Digital Twin
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h4 className="text-sm font-bold">Spatial Twin Ledger & Maintenance Plan</h4>
              <div className="p-4 rounded-xl border border-border/80 bg-accent/10 space-y-3 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-indigo-400 font-bold text-xs">
                      {assetTwinResult ? assetTwinResult.asset_code : `ASSET-${selectedProjectId.replace("PW-", "")}-01`}
                    </span>
                    <h5 className="font-bold text-sm text-foreground">
                      {assetTwinResult ? assetTwinResult.asset_type : assetTwinForm.asset_type}
                    </h5>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs">
                    CONDITION SCORE: {assetTwinResult ? assetTwinResult.condition_score : assetTwinForm.condition_score}/100
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Scheduled SLA Maintenance Plan</div>
                  {assetTwinResult && Array.isArray(assetTwinResult.maintenance_calendar_json) ? (
                    assetTwinResult.maintenance_calendar_json.map((m: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded bg-background border border-border/60 text-[11px] flex justify-between items-center">
                        <div>
                          <div className="font-bold text-foreground">{m.year}: {m.routine_maintenance || m.periodic_renewal || m.structural_rehab}</div>
                        </div>
                        <span className="text-indigo-400 font-bold">₹{Number(m.cost_inr || 0).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-2.5 rounded bg-background border border-border/60 text-[11px] flex justify-between items-center">
                        <div><strong className="text-foreground">2025:</strong> Shoulder Dressing & De-silting</div>
                        <span className="text-indigo-400 font-bold">₹50,000</span>
                      </div>
                      <div className="p-2.5 rounded bg-background border border-border/60 text-[11px] flex justify-between items-center">
                        <div><strong className="text-foreground">2027:</strong> Bituminous Surface Dressing 20mm</div>
                        <span className="text-indigo-400 font-bold">₹4,50,000</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 10: Utilization Certificate (GFR 12-C) */}
        {activeTab === "uc" && (
          <div
            role="tabpanel"
            id="lc-panel-uc"
            aria-labelledby="lc-tab-uc"
            className="space-y-4"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-materials"
            aria-labelledby="lc-tab-materials"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-indigo-400" />
                  Material Provenance & GST e-Invoice IRN Reconciliation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Matches cement/steel batch numbers and heat IDs with GST e-Invoices to confirm billed quantity was procured.
                </p>
              </div>

              <form onSubmit={handleRecordMaterial} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Material Type / Grade</label>
                    <input
                      type="text"
                      value={materialForm.material_type}
                      onChange={(e) => setMaterialForm({ ...materialForm, material_type: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Manufacturer / Mill</label>
                    <input
                      type="text"
                      value={materialForm.manufacturer}
                      onChange={(e) => setMaterialForm({ ...materialForm, manufacturer: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={materialForm.batch_number}
                      onChange={(e) => setMaterialForm({ ...materialForm, batch_number: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Heat Number</label>
                    <input
                      type="text"
                      value={materialForm.heat_number}
                      onChange={(e) => setMaterialForm({ ...materialForm, heat_number: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">GST e-Invoice IRN (64-char Hash)</label>
                  <input
                    type="text"
                    value={materialForm.gst_irn}
                    onChange={(e) => setMaterialForm({ ...materialForm, gst_irn: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Billed Quantity (MT)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={materialForm.billed_quantity}
                      onChange={(e) => setMaterialForm({ ...materialForm, billed_quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Received Quantity (MT)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={materialForm.received_quantity}
                      onChange={(e) => setMaterialForm({ ...materialForm, received_quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Verify Material Provenance & GST IRN Match
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h4 className="text-sm font-bold">Supply Chain Ledger Outcome</h4>
              <div className="p-4 rounded-xl border border-border/80 bg-accent/10 space-y-3 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      {materialResult ? materialResult.material_type : materialForm.material_type} ({materialResult ? materialResult.batch_number : materialForm.batch_number})
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Manufacturer: {materialResult ? materialResult.manufacturer : materialForm.manufacturer} · Heat #{materialResult ? materialResult.heat_number : materialForm.heat_number}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    (materialResult ? materialResult.is_reconciled : materialForm.billed_quantity <= materialForm.received_quantity)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}>
                    {(materialResult ? materialResult.is_reconciled : materialForm.billed_quantity <= materialForm.received_quantity) ? "RECONCILED" : "MISMATCH FLAGGED"}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Billed: {materialResult ? materialResult.billed_qty : materialForm.billed_quantity} MT · Received: {materialResult ? materialResult.received_qty : materialForm.received_quantity} MT
                </div>

                {materialResult && (
                  <div className="text-[10px] text-indigo-400 break-all border-t border-border/40 pt-2">
                    Test Cert Hash: {materialResult.test_certificate_hash}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 12: NMMS Labour Muster */}
        {activeTab === "labour" && (
          <div
            role="tabpanel"
            id="lc-panel-labour"
            aria-labelledby="lc-tab-labour"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Labour Deployment & Attendance (NMMS Aadhaar Biometric)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Confirms physical on-site workforce presence against contractor billed labor days.
                </p>
              </div>

              <form onSubmit={handleRecordLabor} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Attendance Date</label>
                    <input
                      type="date"
                      value={laborForm.attendance_date}
                      onChange={(e) => setLaborForm({ ...laborForm, attendance_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">NMMS Muster Roll ID</label>
                    <input
                      type="text"
                      value={laborForm.nmms_muster_roll_id}
                      onChange={(e) => setLaborForm({ ...laborForm, nmms_muster_roll_id: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Aadhaar Workers</label>
                    <input
                      type="number"
                      value={laborForm.aadhaar_verified_workers}
                      onChange={(e) => setLaborForm({ ...laborForm, aadhaar_verified_workers: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Biometric Auth %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={laborForm.biometric_auth_pct}
                      onChange={(e) => setLaborForm({ ...laborForm, biometric_auth_pct: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Billed Labor Days</label>
                    <input
                      type="number"
                      value={laborForm.billed_labor_days}
                      onChange={(e) => setLaborForm({ ...laborForm, billed_labor_days: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Verify Biometric Muster Roll & Reconcile Billed Days
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h4 className="text-sm font-bold">Biometric Attendance Verification Outcome</h4>
              <div className="p-4 rounded-xl border border-border/80 bg-accent/10 space-y-3 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      Muster Roll #{laborResult ? laborResult.nmms_muster_roll_id : laborForm.nmms_muster_roll_id}
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Date: {laborResult ? laborResult.attendance_date : laborForm.attendance_date}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    (laborResult ? !laborResult.discrepancy_flag : true)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}>
                    {(laborResult ? !laborResult.discrepancy_flag : true) ? "MUSTER VERIFIED" : "DISCREPANCY FLAGGED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Biometric Auth Rate</span>
                    <div className="font-bold text-emerald-400 text-sm mt-0.5">
                      {laborResult ? laborResult.biometric_auth_pct : laborForm.biometric_auth_pct}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Workers vs Billed Days</span>
                    <div className="font-bold text-foreground text-sm mt-0.5">
                      {laborResult ? laborResult.aadhaar_verified_workers_count : laborForm.aadhaar_verified_workers} / {laborResult ? laborResult.billed_labor_days : laborForm.billed_labor_days}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 13: Change Orders */}
        {activeTab === "change_orders" && (
          <div
            role="tabpanel"
            id="lc-panel-change_orders"
            aria-labelledby="lc-tab-change_orders"
            className="grid md:grid-cols-2 gap-6"
          >
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
          <div
            role="tabpanel"
            id="lc-panel-emergency_mcc"
            aria-labelledby="lc-tab-emergency_mcc"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-400" />
                  Disaster Management Act (DMA 2005) Fast-Track
                </h3>
                <p className="text-xs text-muted-foreground">
                  Expedited single-day approval chain for embankment breaches, flood washouts, and emergency repairs with 30-day post-facto audit ratification.
                </p>
              </div>

              <form onSubmit={handleInvokeEmergency} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Disaster / Calamity Type</label>
                  <input
                    type="text"
                    value={emergencyForm.disaster_type}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, disaster_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Invoking Authority</label>
                  <input
                    type="text"
                    value={emergencyForm.invoking_authority}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, invoking_authority: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Invoke DMA 2005 Emergency Fast-Track
                </button>
              </form>

              {emergencyResult && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px] space-y-1">
                  <div className="font-bold flex justify-between">
                    <span>{emergencyResult.emergency_code}</span>
                    <span className="uppercase text-rose-400 font-bold">RATIFICATION ACTIVE</span>
                  </div>
                  <div>Ratification Deadline: {emergencyResult.post_facto_ratification_deadline}</div>
                  <div className="text-[10px] text-muted-foreground break-all">
                    Audit Hash: {emergencyResult.audit_log_hash}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Vote className="h-4 w-4 text-amber-400" />
                  ECI Model Code of Conduct (MCC) Freeze
                </h3>
                <p className="text-xs text-muted-foreground">
                  Restricts new tender announcements and discretionary fund releases during declared election periods.
                </p>
              </div>

              <form onSubmit={handleSetMccFreeze} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Jurisdiction / Constituency</label>
                  <input
                    type="text"
                    value={mccForm.jurisdiction}
                    onChange={(e) => setMccForm({ ...mccForm, jurisdiction: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Election Designation</label>
                  <input
                    type="text"
                    value={mccForm.election_name}
                    onChange={(e) => setMccForm({ ...mccForm, election_name: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Freeze Start Date</label>
                    <input
                      type="date"
                      value={mccForm.freeze_start_date}
                      onChange={(e) => setMccForm({ ...mccForm, freeze_start_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Freeze End Date</label>
                    <input
                      type="date"
                      value={mccForm.freeze_end_date}
                      onChange={(e) => setMccForm({ ...mccForm, freeze_end_date: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mcc_active"
                    checked={mccForm.is_active}
                    onChange={(e) => setMccForm({ ...mccForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="mcc_active" className="font-semibold cursor-pointer">
                    Enforce Statutory Disbursement Freeze
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Update ECI MCC Freeze Directive
                </button>
              </form>

              {mccResult && (
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] space-y-1">
                  <div className="font-bold flex justify-between">
                    <span>{mccResult.jurisdiction}</span>
                    <span className="uppercase text-amber-400 font-bold">
                      {mccResult.is_active ? "FREEZE ACTIVE" : "NORMAL OPERATIONS"}
                    </span>
                  </div>
                  <div>
                    Window: {mccResult.freeze_start_date} to {mccResult.freeze_end_date}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Voucher Modal */}
      <Dialog open={!!paymentVoucherData} onOpenChange={(open) => !open && setPaymentVoucherData(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          {paymentVoucherData && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Milestone Payment Voucher Released
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  PFMS Tranche Integration · GFR 2017 Milestone-Linked Payment
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VOUCHER REF:</span>
                  <span className="font-bold text-primary">{paymentVoucherData.voucher_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TRANCHE AMOUNT:</span>
                  <span className="font-bold text-emerald-400">₹12,50,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PROJECT CODE:</span>
                  <span className="font-bold text-foreground">{selectedProjectId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PFMS SCROLL STATUS:</span>
                  <span className="font-bold text-emerald-400">DISBURSED VIA TREASURY</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                Digital voucher payload downloaded to your device and anchored into PFMS ledger.
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => downloadJSON(paymentVoucherData, `Milestone_Payment_Voucher_${paymentVoucherData.voucher_ref}.json`)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Download size={13} /> Re-Download Voucher JSON
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentVoucherData(null)}
                  className="px-3 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer font-mono"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Statutory Form GFR 12-C Modal */}
      <Dialog open={showUcModal} onOpenChange={setShowUcModal}>
        <DialogContent className="max-w-lg bg-card border-border">
          {ucData && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Statutory Form GFR 12-C (Rule 239) Created
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  Official Form of Utilization Certificate for Public Works
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UC NUMBER:</span>
                  <span className="font-bold text-primary">{ucData.uc_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FINANCIAL YEAR:</span>
                  <span className="font-bold text-foreground">2024-25</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CERTIFIED SANCTIONED:</span>
                  <span className="font-bold text-foreground">₹4,50,00,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CERTIFIED EXPENDITURE:</span>
                  <span className="font-bold text-emerald-400">₹3,12,00,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">STATUTORY STATUS:</span>
                  <span className="font-bold text-emerald-400">CAG / MOF COMPLIANT</span>
                </div>
              </div>

              <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground italic">
                "Certified that out of grants-in-aid sanctioned during 2024-25, a sum of ₹3,12,00,000 has been utilized for the purpose of highway expansion works for which it was sanctioned."
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => downloadJSON(ucData, `Statutory_Form_GFR_12C_${ucData.uc_number}.json`)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Download size={13} /> Re-Download GFR 12-C JSON
                </button>
                <button
                  type="button"
                  onClick={() => setShowUcModal(false)}
                  className="px-3 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground rounded cursor-pointer font-mono"
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
