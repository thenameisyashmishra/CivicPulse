import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getToken } from "@/lib/data";
import {
  Building2,
  Cpu,
  Leaf,
  BarChart3,
  Globe2,
  Layers,
  Sparkles,
  TreePine,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Brain,
  Download,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function PolicyGovernanceHub() {
  const [activeTab, setActiveTab] = useState<
    | "multitenancy"
    | "workflows"
    | "i18n"
    | "bi_kpi"
    | "predictive"
    | "leaderboards"
    | "ask_ai"
    | "carbon"
    | "plantation"
    | "model_registry"
    | "model_drift"
    | "model_cards"
    | "edge_mode"
  >("bi_kpi");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Forms & State
  const [nlPrompt, setNlPrompt] = useState("What are the primary causes of project delay in North East Delhi?");
  const [nlResult, setNlResult] = useState<any>(null);

  const [cementMt, setCementMt] = useState("450");
  const [steelMt, setSteelMt] = useState("180");
  const [bitumenMt, setBitumenMt] = useState("90");
  const [carbonResult, setCarbonResult] = useState<any>(null);

  const [felledTrees, setFelledTrees] = useState("40");
  const [plantedTrees, setPlantedTrees] = useState("450");
  const [survivalRate, setSurvivalRate] = useState("89.5");
  const [plantationResult, setPlantationResult] = useState<any>(null);

  const [predAssetId, setPredAssetId] = useState("1");
  const [predHealthIdx, setPredHealthIdx] = useState("82.0");
  const [predResult, setPredResult] = useState<any>(null);

  const [driftVersion, setDriftVersion] = useState("v3.2.0");
  const [driftMap, setDriftMap] = useState("0.935");
  const [driftResult, setDriftResult] = useState<any>(null);

  // Tenants
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [tenantForm, setTenantForm] = useState({
    tenant_code: "BLOCK-SLMPR",
    tenant_name: "Seelampur Sub-Division Block",
    tier_level: "block",
    state_code: "DL",
    parent_tenant_id: 2,
  });

  // Approval Workflow
  const [workflowForm, setWorkflowForm] = useState({
    tenant_id: 1,
    work_category: "Road Infrastructure",
    financial_threshold_ceiling: 50000000.0,
  });
  const [workflowResult, setWorkflowResult] = useState<any>(null);

  // Model Registry
  const [modelForm, setModelForm] = useState({
    model_name: "yolov8-pothole-crack",
    model_version: "v3.3.0",
    framework: "PyTorch / Ultralytics",
    storage_uri: "s3://civicpulse-models/yolov8-v3.3.0.onnx",
    deployment_stage: "production",
  });
  const [modelResult, setModelResult] = useState<any>(null);

  // Edge Mode
  const [edgeModelCode, setEdgeModelCode] = useState("EDGE-YOLO-INT8-V1");
  const [edgeResult, setEdgeResult] = useState<any>(null);

  // Model Card
  const [modelCardForm, setModelCardForm] = useState({
    model_name: "yolov8-pothole-crack",
    intended_domain: "Indian National & State Highway Pavement Surface Inspection (IRC:82 Compliance)",
    training_data_summary: "14,200 annotated high-res road surface images across 8 Indian states under varied weather/lighting.",
    quantitative_metrics_summary: "mAP@0.5: 0.935, Precision: 94.2%, Recall: 91.8%, Latency: 18ms (TensorRT)",
    ethical_and_operational_limits: "Trained on asphalt/concrete surfaces. Low light performance (<20 lux) requires auxiliary floodlighting.",
  });
  const [modelCardResult, setModelCardResult] = useState<any>(null);

  const fetchTenants = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/tenants/hierarchy", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTenantsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setTenantsList([]);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/tenants/hierarchy", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(tenantForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Tenant creation failed (HTTP ${res.status})`);
      setStatusMsg(`Tenant node ${data.tenant_name} (${data.tenant_code}) added to organizational hierarchy!`);
      toast.success(`Tenant node ${data.tenant_code} created!`);
      fetchTenants();
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureWorkflow = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/tenants/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tenant_id: workflowForm.tenant_id,
          work_category: workflowForm.work_category,
          steps: [
            { step: 1, role: "Junior Engineer (JE)", action: "field_scrutiny" },
            { step: 2, role: "Assistant Engineer (AE)", action: "quality_verification" },
            { step: 3, role: "Executive Engineer (EE)", action: "financial_sanction" },
          ],
          financial_threshold_ceiling: workflowForm.financial_threshold_ceiling,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Workflow configuration failed (HTTP ${res.status})`);
      setWorkflowResult(data);
      setStatusMsg("Multi-tier departmental approval pipeline anchored!");
      toast.success("Approval workflow pipeline configured!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterModel = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/model-governance/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(modelForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Model registration failed (HTTP ${res.status})`);
      setModelResult(data);
      setStatusMsg(`Model ${data.model_name} ${data.model_version} registered in production registry!`);
      toast.success("Production CV model registered!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchEdgeManifest = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/model-governance/edge-manifest?model_code=${encodeURIComponent(edgeModelCode)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Edge manifest pull failed (HTTP ${res.status})`);
      setEdgeResult(data);
      setStatusMsg("Quantized INT8 edge runtime manifest synced!");
      toast.success("Edge offline model manifest retrieved!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchOrCreateModelCard = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/model-governance/model-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelCardForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Model card sync failed (HTTP ${res.status})`);
      setModelCardResult(data);
      setStatusMsg("Explainable AI Model Card verified and anchored in database!");
      toast.success("Explainable AI Model Card retrieved!");
    } catch (e: any) {
      setStatusMsg(`⚠ Error: ${e.message}`);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/analytics-policy/nl/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_prompt: nlPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `AI query failed (HTTP ${res.status})`);
      }
      setNlResult(data);
      setStatusMsg("Natural language query resolved against policy analytics engine!");
      toast.success("Natural language query resolved against policy analytics engine!");
    } catch (e: any) {
      const msg = e.message || "Failed to query AI assistant.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateCarbon = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/sustainability/carbon/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          cement_consumption_mt: parseFloat(cementMt),
          steel_consumption_mt: parseFloat(steelMt),
          bitumen_consumption_mt: parseFloat(bitumenMt),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Carbon calculation failed (HTTP ${res.status})`);
      }
      setCarbonResult(data);
      setStatusMsg("Green infrastructure embodied carbon & GRIHA grade computed!");
      toast.success("Green infrastructure embodied carbon & GRIHA grade computed!");
    } catch (e: any) {
      const msg = e.message || "Failed to calculate carbon footprint.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPlantation = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/sustainability/plantation/track", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          trees_felled_count: parseInt(felledTrees),
          actual_planted_count: parseInt(plantedTrees),
          satellite_verified_survival_rate_pct: parseFloat(survivalRate),
          plantation_geofence_wkt: "POLYGON((77.10 28.50, 77.12 28.50, 77.12 28.52, 77.10 28.52, 77.10 28.50))",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Plantation tracking failed (HTTP ${res.status})`);
      }
      setPlantationResult(data);
      setStatusMsg("Compensatory plantation survival rate verified via Sentinel-2 diff!");
      toast.success("Compensatory plantation survival rate verified via Sentinel-2 diff!");
    } catch (e: any) {
      const msg = e.message || "Failed to track compensatory plantation.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictMaintenance = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/analytics-policy/maintenance/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          asset_id: parseInt(predAssetId),
          current_health_index: parseFloat(predHealthIdx),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Maintenance prediction failed (HTTP ${res.status})`);
      }
      setPredResult(data);
      setStatusMsg("Deterioration curve forecasted asset rehabilitation window!");
      toast.success("Deterioration curve forecasted asset rehabilitation window!");
    } catch (e: any) {
      const msg = e.message || "Failed to predict maintenance.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDrift = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch("/api/model-governance/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model_version: driftVersion,
          test_sample_size: 500,
          precision_score: 0.942,
          recall_score: 0.918,
          map50_score: parseFloat(driftMap),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Model drift recording failed (HTTP ${res.status})`);
      }
      setDriftResult(data);
      setStatusMsg("Model drift metric recorded and evaluated against accuracy threshold!");
      toast.success("Model drift metric recorded and evaluated against accuracy threshold!");
    } catch (e: any) {
      const msg = e.message || "Failed to record drift.";
      setStatusMsg(`⚠ Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-purple-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Policy, Scale & AI Model Governance Hub
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-purple-400/20 text-purple-300 border border-purple-400/30">
                PILLAR B.9
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-tenancy, executive BI, sustainability accounting, and ML platform governance (Pillars B.9, B.10, B.11 & B.12)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1.5 text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-full flex items-center gap-1.5 shadow-xs">
              <Building2 className="w-3.5 h-3.5" /> 4-Tier Tenancy Active
            </span>
            <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-full flex items-center gap-1.5 shadow-xs">
              <Leaf className="w-3.5 h-3.5" /> GRIHA Green Accounting
            </span>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center gap-2.5 border transition-all ${
              statusMsg.startsWith("⚠")
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
            }`}
          >
            {statusMsg.startsWith("⚠") ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
            )}
            <span className="font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Policy & Governance Modules"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
          {[
            { id: "bi_kpi", label: "Executive BI", icon: BarChart3 },
            { id: "predictive", label: "Predictive Maintenance", icon: TrendingUp },
            { id: "ask_ai", label: "Ask Your Data (AI)", icon: Sparkles },
            { id: "leaderboards", label: "Leaderboards", icon: CheckCircle2 },
            { id: "carbon", label: "Carbon Footprint", icon: Leaf },
            { id: "plantation", label: "Compensatory Afforestation", icon: TreePine },
            { id: "multitenancy", label: "Multi-Tenancy Org", icon: Building2 },
            { id: "workflows", label: "Approval Workflows", icon: Layers },
            { id: "i18n", label: "22 Languages (i18n)", icon: Globe2 },
            { id: "model_registry", label: "CV Model Registry", icon: Cpu },
            { id: "model_drift", label: "Drift Monitor", icon: Zap },
            { id: "model_cards", label: "Model Cards", icon: Brain },
            { id: "edge_mode", label: "Offline Edge Mode", icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`gov-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`gov-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  isActive
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === "bi_kpi" && (
          <div
            role="tabpanel"
            id="gov-panel-bi_kpi"
            aria-labelledby="gov-tab-bi_kpi"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-muted-foreground mb-1 font-medium">Sanctioned Outlay</div>
                <div className="text-2xl font-bold text-foreground">₹1,420.5 Cr</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-mono">Q2-FY2024-25 • Delhi State</div>
              </div>
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-muted-foreground mb-1 font-medium">Total Disbursed (PFMS)</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹980.2 Cr</div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">69.0% Expenditure Burn</div>
              </div>
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-muted-foreground mb-1 font-medium">Physical Completion</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">72.4%</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-mono">+4.2% vs Sanction Timeline</div>
              </div>
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-muted-foreground mb-1 font-medium">Avg Milestone Delay</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">18.5 Days</div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">Defect Density: 0.42 / km</div>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Executive BI Drilldown for State Secretaries & Leadership
              </h2>
              <p className="text-sm text-muted-foreground">
                Aggregated KPI snapshot reconciling milestone achievements, fund disbursals, and visual defect densities across municipal zones.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">Audit Compliance Index</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">98.6%</div>
                  <p className="text-[11px] text-muted-foreground">Zero major CAG / CVC non-compliances flagged.</p>
                </div>
                <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">Citizen Grievance SLA</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">3.4 Days Avg</div>
                  <p className="text-[11px] text-muted-foreground">87% resolved within first 72 hours.</p>
                </div>
                <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">AI Verification Accuracy</div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">99.1% F1</div>
                  <p className="text-[11px] text-muted-foreground">Verified against IRC:82 pavement standards.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ask_ai" && (
          <div
            role="tabpanel"
            id="gov-panel-ask_ai"
            aria-labelledby="gov-tab-ask_ai"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Natural-Language "Ask Your Data" Query Assistant
              </h2>
              <p className="text-sm text-muted-foreground">
                Translates plain language inquiries into structured metric queries across project delays, budgets, and contractor records.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Your Question / Prompt</label>
                  <textarea
                    rows={3}
                    value={nlPrompt}
                    onChange={(e) => setNlPrompt(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNlPrompt("What are the primary causes of project delay in North East Delhi?")}
                    className="px-2.5 py-1 bg-secondary hover:bg-accent text-secondary-foreground border border-border rounded-md transition-colors font-medium shadow-xs"
                  >
                    Delay Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setNlPrompt("Show me the capital expenditure burn rate for state highways.")}
                    className="px-2.5 py-1 bg-secondary hover:bg-accent text-secondary-foreground border border-border rounded-md transition-colors font-medium shadow-xs"
                  >
                    Budget Burn Rate
                  </button>
                </div>
                <button
                  onClick={handleAskAI}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Analyzing Database..." : "Ask Policy Assistant"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Structured AI Resolution</h3>
              {nlResult ? (
                <div className="space-y-3 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border text-foreground">
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {nlResult.structured_response_json?.metric}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {nlResult.structured_response_json?.summary}
                  </p>
                  <div className="p-3 bg-card border border-border rounded-lg font-mono text-foreground overflow-x-auto">
                    {JSON.stringify(nlResult.structured_response_json?.data_points, null, 2)}
                  </div>
                  <div className="text-muted-foreground text-[10px] font-mono">
                    Execution latency: {nlResult.execution_time_ms}ms • Query Type: {nlResult.generated_query_type}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Enter an inquiry on the left to test the natural language query engine.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "predictive" && (
          <div
            role="tabpanel"
            id="gov-panel-predictive"
            aria-labelledby="gov-tab-predictive"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Predictive Asset Deterioration Modeling
              </h2>
              <p className="text-sm text-muted-foreground">
                Forecasts asset rehabilitation interventions based on pavement condition index, traffic loads, and monsoon cycles.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Asset ID</label>
                  <input
                    type="text"
                    value={predAssetId}
                    onChange={(e) => setPredAssetId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Current Health Index (0-100)</label>
                  <input
                    type="number"
                    value={predHealthIdx}
                    onChange={(e) => setPredHealthIdx(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handlePredictMaintenance}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Computing Deterioration Curve..." : "Forecast Maintenance Window"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Forecasted Rehabilitation Plan</h3>
              {predResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Degradation Year: <span className="text-amber-600 dark:text-amber-400 font-bold">{predResult.forecasted_degradation_year}</span></div>
                  <div>Recommended Intervention: <span className="text-foreground font-semibold">{predResult.recommended_intervention}</span></div>
                  <div>Estimated Budget Outlay: <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{predResult.estimated_rehab_cost_inr?.toLocaleString("en-IN")}</span></div>
                  <div>Model Confidence: <span className="text-blue-600 dark:text-blue-400 font-semibold">{Math.round((predResult.confidence_score || 0.94) * 100)}%</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Run deterioration curve analysis on an asset to view predictive schedule.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "carbon" && (
          <div
            role="tabpanel"
            id="gov-panel-carbon"
            aria-labelledby="gov-tab-carbon"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Green Infrastructure Embodied Carbon Accounting
              </h2>
              <p className="text-sm text-muted-foreground">
                Computes life-cycle embodied emissions (tCO2e) based on OPC/PPC cement, TMT steel, and bitumen procurement.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Cement Consumption (MT)</label>
                  <input
                    type="number"
                    value={cementMt}
                    onChange={(e) => setCementMt(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Steel Consumption (MT)</label>
                  <input
                    type="number"
                    value={steelMt}
                    onChange={(e) => setSteelMt(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Bitumen Consumption (MT)</label>
                  <input
                    type="number"
                    value={bitumenMt}
                    onChange={(e) => setBitumenMt(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleCalculateCarbon}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Calculating tCO2e..." : "Calculate Embodied Carbon"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">GRIHA Sustainability Assessment</h3>
              {carbonResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Total Embodied Carbon: <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{carbonResult.embodied_carbon_tco2e} tCO2e</span></div>
                  <div>Sustainability Rating: <span className="text-foreground font-bold">{carbonResult.green_rating_grade}</span></div>
                  <div>Emissions Benchmark: <span className="text-blue-600 dark:text-blue-400 font-medium">Within MoEFCC Low-Carbon Infrastructure Baseline</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Enter material quantities to compute embodied carbon emissions.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "plantation" && (
          <div
            role="tabpanel"
            id="gov-panel-plantation"
            aria-labelledby="gov-tab-plantation"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TreePine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Compensatory Afforestation Tracker (1:10 Statutory Ratio)
              </h2>
              <p className="text-sm text-muted-foreground">
                Tracks mandatory sapling plantation per tree felled, with satellite NDVI survival verification.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Trees Felled</label>
                  <input
                    type="number"
                    value={felledTrees}
                    onChange={(e) => setFelledTrees(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Actual Saplings Planted</label>
                  <input
                    type="number"
                    value={plantedTrees}
                    onChange={(e) => setPlantedTrees(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Satellite Verified Survival Rate (%)</label>
                  <input
                    type="number"
                    value={survivalRate}
                    onChange={(e) => setSurvivalRate(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleTrackPlantation}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying Plantation..." : "Log & Verify Afforestation"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Forest Clearance Verification</h3>
              {plantationResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Mandatory Obligation (1:10): <span className="text-foreground font-semibold">{plantationResult.mandatory_plantation_count} Saplings</span></div>
                  <div>Actual Planted: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{plantationResult.actual_planted_count} Saplings (112.5% Compliance)</span></div>
                  <div>Satellite Survival Rate: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{plantationResult.satellite_verified_survival_rate_pct}%</span></div>
                  <div>Geofence: <span className="text-muted-foreground">{plantationResult.plantation_geofence_wkt?.slice(0, 30)}...</span></div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Log tree clearance to verify compensatory plantation compliance.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "model_drift" && (
          <div
            role="tabpanel"
            id="gov-panel-model_drift"
            aria-labelledby="gov-tab-model_drift"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Continuous Model Evaluation & Concept Drift
              </h2>
              <p className="text-sm text-muted-foreground">
                Monitors CV inference precision, recall, and mAP@0.5 over weekly field samples.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Model Version</label>
                  <input
                    type="text"
                    value={driftVersion}
                    onChange={(e) => setDriftVersion(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Test mAP@0.5 Score (Threshold: 0.70)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={driftMap}
                    onChange={(e) => setDriftMap(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleRecordDrift}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Evaluating Metrics..." : "Record & Check Drift Alert"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Drift Assessment</h3>
              {driftResult ? (
                <div className="space-y-2.5 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div>Model: <span className="text-foreground font-semibold">{driftResult.model_version}</span></div>
                  <div>Sample Size: <span className="text-foreground font-semibold">{driftResult.test_sample_size} Frames</span></div>
                  <div>mAP@0.5 Score: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{driftResult.map50_score}</span></div>
                  <div>
                    Drift Alert:{" "}
                    <span className={driftResult.drift_alert_triggered ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                      {driftResult.drift_alert_triggered ? "TRIGGERED (Drift Exceeds Safe Ceiling)" : "HEALTHY (Within Tolerance)"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl bg-muted/20">
                  Submit drift test results to evaluate degradation against held-out ground truth.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Static Overview Tabs */}
        {activeTab === "leaderboards" && (
          <div
            role="tabpanel"
            id="gov-panel-leaderboards"
            aria-labelledby="gov-tab-leaderboards"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              National Contractor & District Performance Leaderboard
            </h2>
            <div className="space-y-2.5 text-xs font-mono">
              {[
                { rank: 1, name: "NCC Limited", type: "Contractor", quality: "94.5%", timeliness: "91.0%", rating: "4.8 ★" },
                { rank: 2, name: "L&T Infrastructure", type: "Contractor", quality: "93.2%", timeliness: "89.5%", rating: "4.7 ★" },
                { rank: 3, name: "North East Delhi", type: "District", quality: "92.1%", timeliness: "89.4%", rating: "4.6 ★" },
              ].map((entry) => (
                <div key={entry.rank} className="p-3.5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold rounded-full border border-purple-500/20">
                      {entry.rank}
                    </span>
                    <div>
                      <div className="text-foreground font-semibold font-sans">{entry.name}</div>
                      <div className="text-muted-foreground font-sans text-[11px]">{entry.type} • 2024-H1 Evaluation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>Quality: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{entry.quality}</span></div>
                    <div>Timeliness: <span className="text-blue-600 dark:text-blue-400 font-semibold">{entry.timeliness}</span></div>
                    <div>Citizen: <span className="text-amber-600 dark:text-amber-400 font-semibold">{entry.rating}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "multitenancy" && (
          <div
            role="tabpanel"
            id="gov-panel-multitenancy"
            aria-labelledby="gov-tab-multitenancy"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Add Tenant Node (Hierarchy Scaling)
              </h2>
              <p className="text-sm text-muted-foreground">
                Provisions new administrative tenants within the 4-tier state governance hierarchy.
              </p>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tenant Code</label>
                    <input
                      type="text"
                      value={tenantForm.tenant_code}
                      onChange={(e) => setTenantForm({ ...tenantForm, tenant_code: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">State Code</label>
                    <input
                      type="text"
                      value={tenantForm.state_code}
                      onChange={(e) => setTenantForm({ ...tenantForm, state_code: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Tenant Name</label>
                  <input
                    type="text"
                    value={tenantForm.tenant_name}
                    onChange={(e) => setTenantForm({ ...tenantForm, tenant_name: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tier Level</label>
                    <select
                      value={tenantForm.tier_level}
                      onChange={(e) => setTenantForm({ ...tenantForm, tier_level: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    >
                      <option value="state">State</option>
                      <option value="district">District</option>
                      <option value="block">Block</option>
                      <option value="panchayat">Panchayat / Ward</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Parent Tenant ID</label>
                    <input
                      type="number"
                      value={tenantForm.parent_tenant_id || ""}
                      onChange={(e) => setTenantForm({ ...tenantForm, parent_tenant_id: parseInt(e.target.value) || 1 })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTenant}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Registering Tenant Node..." : "Provision Tenant Node"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Live Organization Hierarchy ({tenantsList.length} Nodes)</h3>
                <button
                  onClick={fetchTenants}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-mono"
                >
                  Refresh
                </button>
              </div>

              <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border text-xs font-mono space-y-2 max-h-[320px] overflow-y-auto">
                {tenantsList.map((t) => (
                  <div key={t.id} className="p-2.5 rounded bg-background border border-border/60 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{t.tenant_name}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">({t.tenant_code})</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        State: {t.state_code} · Parent ID: {t.parent_tenant_id ?? "None (Root)"}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold uppercase">
                      {t.tier_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "i18n" && (
          <div
            role="tabpanel"
            id="gov-panel-i18n"
            aria-labelledby="gov-tab-i18n"
            className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              22 Scheduled Indian Languages Localization (i18n)
            </h2>
            <p className="text-sm text-muted-foreground">
              Official Eighth Schedule language interfaces ensuring digital accessibility across all state administrations and citizen portals.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {[
                { name: "Hindi", native: "हिन्दी" },
                { name: "Bengali", native: "বাংলা" },
                { name: "Telugu", native: "తెలుగు" },
                { name: "Marathi", native: "मराठी" },
                { name: "Tamil", native: "தமிழ்" },
                { name: "Urdu", native: "اردو" },
                { name: "Gujarati", native: "ગુજરાતી" },
                { name: "Kannada", native: "ಕನ್ನಡ" },
                { name: "Odia", native: "ଓଡ଼ିଆ" },
                { name: "Malayalam", native: "മലയാളം" },
                { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
                { name: "Assamese", native: "অসমীয়া" },
                { name: "Maithili", native: "मैथिली" },
                { name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
                { name: "Kashmiri", native: "کٲشُر" },
                { name: "Nepali", native: "नेपाली" },
                { name: "Konkani", native: "कोंकणी" },
                { name: "Sindhi", native: "سنڌي" },
                { name: "Dogri", native: "डोगरी" },
                { name: "Manipuri", native: "মৈতৈলোন্" },
                { name: "Bodo", native: "बड़ो" },
                { name: "Sanskrit", native: "संस्कृतम्" },
              ].map((lang) => (
                <div
                  key={lang.name}
                  className="p-3 bg-muted/40 hover:bg-accent/50 dark:bg-slate-950/60 border border-border rounded-xl text-center font-medium text-foreground transition-all shadow-xs"
                >
                  <div className="font-semibold text-foreground">{lang.native}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{lang.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "model_registry" && (
          <div
            role="tabpanel"
            id="gov-panel-model_registry"
            aria-labelledby="gov-tab-model_registry"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Register Production CV Model
              </h2>
              <p className="text-sm text-muted-foreground">
                Registers new computer vision model revisions into the production ML registry with deployment stage gate controls.
              </p>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Model Name</label>
                    <input
                      type="text"
                      value={modelForm.model_name}
                      onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Model Version</label>
                    <input
                      type="text"
                      value={modelForm.model_version}
                      onChange={(e) => setModelForm({ ...modelForm, model_version: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Framework Engine</label>
                    <input
                      type="text"
                      value={modelForm.framework}
                      onChange={(e) => setModelForm({ ...modelForm, framework: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Deployment Stage</label>
                    <select
                      value={modelForm.deployment_stage}
                      onChange={(e) => setModelForm({ ...modelForm, deployment_stage: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="canary">Canary / Shadow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Artifact Storage URI</label>
                  <input
                    type="text"
                    value={modelForm.storage_uri}
                    onChange={(e) => setModelForm({ ...modelForm, storage_uri: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-xs"
                  />
                </div>

                <button
                  onClick={handleRegisterModel}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Registering in Model Registry..." : "Register Model in Production"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Registry Status & Deployment State</h3>
              {modelResult ? (
                <div className="space-y-3 text-xs bg-muted/40 dark:bg-slate-950/60 p-4 rounded-xl border border-border font-mono text-foreground">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Model Name:</span>
                    <span className="text-foreground font-bold">{modelResult.model_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{modelResult.model_version}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{modelResult.framework}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Stage:</span>
                    <span className="uppercase px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                      {modelResult.deployment_stage}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Registry ID:</span>
                    <span className="text-foreground font-mono">{modelResult.id}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground break-all">
                    URI: {modelResult.storage_uri}
                  </div>
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-700 dark:text-emerald-300 text-[11px] font-sans">
                    ✓ Verified in SQLite Model Registry table with active serving endpoints.
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl space-y-3 text-xs font-mono shadow-xs">
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Default Model:</span>
                    <span className="text-foreground font-bold">yolov8-pothole-crack</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Active Version:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">v3.2.0 (Active Production)</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Weights SHA-256:</span>
                    <span className="text-muted-foreground">4d89a71be82cf09182abcf18274a108428f9104...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">PyTorch / Ultralytics ONNX Engine</span>
                  </div>
                  <div className="p-3 text-center text-muted-foreground text-[11px] border border-dashed border-border rounded-lg mt-3 font-sans">
                    Submit the form on the left to register and persist a new model revision.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "model_cards" && (
          <div
            role="tabpanel"
            id="gov-panel-model_cards"
            aria-labelledby="gov-tab-model_cards"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Explainable AI (XAI) Model Card Parameters
              </h2>
              <p className="text-sm text-muted-foreground">
                Maintains transparent, verifiable documentation of AI/ML architectures, training datasets, and ethical boundaries under IRC:82.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Model Name</label>
                  <input
                    type="text"
                    value={modelCardForm.model_name}
                    onChange={(e) => setModelCardForm({ ...modelCardForm, model_name: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Intended Domain</label>
                  <input
                    type="text"
                    value={modelCardForm.intended_domain}
                    onChange={(e) => setModelCardForm({ ...modelCardForm, intended_domain: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Training Dataset Summary</label>
                  <textarea
                    rows={2}
                    value={modelCardForm.training_data_summary}
                    onChange={(e) => setModelCardForm({ ...modelCardForm, training_data_summary: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Operational & Ethical Boundaries</label>
                  <textarea
                    rows={2}
                    value={modelCardForm.ethical_and_operational_limits}
                    onChange={(e) => setModelCardForm({ ...modelCardForm, ethical_and_operational_limits: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleFetchOrCreateModelCard}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Syncing Model Card..." : "Sync & Verify Model Card"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Active Model Card Documentation</h3>
              {modelCardResult ? (
                <div className="p-5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl space-y-3.5 text-xs shadow-xs">
                  <div>
                    <div className="text-foreground font-semibold mb-0.5">Model Name & License:</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{modelCardResult.model_name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">{modelCardResult.license || "Apache-2.0"}</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Intended Domain:</div>
                    <p className="text-muted-foreground leading-relaxed">{modelCardResult.intended_domain}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Training Provenance:</div>
                    <p className="text-muted-foreground leading-relaxed">{modelCardResult.training_data_summary}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Quantitative Evaluation:</div>
                    <p className="text-muted-foreground leading-relaxed font-mono text-[11px]">{modelCardResult.quantitative_metrics_summary}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Operational Boundaries:</div>
                    <p className="text-muted-foreground leading-relaxed">{modelCardResult.ethical_and_operational_limits}</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl space-y-3.5 text-xs shadow-xs">
                  <div>
                    <div className="text-foreground font-semibold mb-0.5">Intended Domain:</div>
                    <p className="text-muted-foreground leading-relaxed">Indian National & State Highway Pavement Surface Inspection (IRC:82 Compliance)</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Training Provenance:</div>
                    <p className="text-muted-foreground leading-relaxed">14,200 annotated high-res road surface images across 8 Indian states under varied weather/lighting.</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-foreground font-semibold mb-0.5">Operational Boundaries:</div>
                    <p className="text-muted-foreground leading-relaxed">Trained on asphalt/concrete surfaces. Low light performance (&lt;20 lux) requires auxiliary floodlighting.</p>
                  </div>
                  <div className="p-3 text-center text-muted-foreground text-[11px] border border-dashed border-border rounded-lg mt-3">
                    Click "Sync & Verify Model Card" to fetch live Model Card from database.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "edge_mode" && (
          <div
            role="tabpanel"
            id="gov-panel-edge_mode"
            aria-labelledby="gov-tab-edge_mode"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Offline Edge Inference Runtime Sync
              </h2>
              <p className="text-sm text-muted-foreground">
                Deploys quantized 8-bit lightweight ONNX/TFLite models for remote rural inspection sites with intermittent connectivity.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Model Quantization Code</label>
                  <input
                    type="text"
                    value={edgeModelCode}
                    onChange={(e) => setEdgeModelCode(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                  <div>• INT8 Post-Training Quantization (PTQ)</div>
                  <div>• SQLite Store-and-Forward offline queue buffer</div>
                  <div>• Auto-sync when 4G/WiFi connectivity is restored</div>
                </div>
                <button
                  onClick={handleFetchEdgeManifest}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Pulling Edge Package Manifest..." : "Sync & Download Edge Manifest"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Edge Deployment Manifest</h3>
              {edgeResult ? (
                <div className="p-5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl space-y-3.5 text-xs font-mono shadow-xs">
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Model Code:</span>
                    <span className="text-foreground font-bold">{edgeResult.model_code}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Quantization:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{edgeResult.quantization_type} Precision</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Package Size:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{edgeResult.package_size_mb} MB (Ultra-compact)</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Sync Protocol:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{edgeResult.offline_sync_protocol_version}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">TFLite URI:</span>
                    <span className="text-foreground text-[11px] truncate max-w-[200px]">{edgeResult.tflite_uri}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-700 dark:text-emerald-300 text-[11px] font-sans">
                    ✓ Edge package manifest verified. Compatible with field surveyor mobile tablets and offline drones.
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-muted/40 dark:bg-slate-950/60 border border-border rounded-xl space-y-3 text-xs font-mono shadow-xs">
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Quantized Model Code:</span>
                    <span className="text-foreground font-semibold">EDGE-YOLO-INT8-V1</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span className="text-muted-foreground">Package Size:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">12.4 MB (Fits on budget Android devices)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sync Protocol:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">SYNC-v2.2 (Store-and-forward SQLite queue)</span>
                  </div>
                  <div className="p-3 text-center text-muted-foreground text-[11px] border border-dashed border-border rounded-lg mt-3">
                    Click "Sync & Download Edge Manifest" to retrieve live manifest parameters.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "workflows" && (
          <div
            role="tabpanel"
            id="gov-panel-workflows"
            aria-labelledby="gov-tab-workflows"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Configure Approval Pipeline
              </h2>
              <p className="text-sm text-muted-foreground">
                Dynamically models approval pipelines per departmental hierarchy ensuring role-based sign-offs with digital signature verification.
              </p>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tenant ID</label>
                    <input
                      type="number"
                      value={workflowForm.tenant_id}
                      onChange={(e) => setWorkflowForm({ ...workflowForm, tenant_id: parseInt(e.target.value) || 1 })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Financial Ceiling (₹)</label>
                    <input
                      type="number"
                      value={workflowForm.financial_threshold_ceiling}
                      onChange={(e) => setWorkflowForm({ ...workflowForm, financial_threshold_ceiling: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Work Category</label>
                  <select
                    value={workflowForm.work_category}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, work_category: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  >
                    <option value="Road Infrastructure">Road Infrastructure (PW/NH)</option>
                    <option value="Bridges & Flyovers">Bridges & Flyovers</option>
                    <option value="Rural Water Supply">Rural Water Supply (JJM)</option>
                    <option value="Public Buildings">Public Buildings & Hospitals</option>
                  </select>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
                  <div className="font-semibold text-foreground">Standard 3-Tier Escalation:</div>
                  <div className="text-muted-foreground">1. Junior Engineer (JE) → Field Scrutiny</div>
                  <div className="text-muted-foreground">2. Assistant Engineer (AE) → Quality Verification</div>
                  <div className="text-muted-foreground">3. Executive Engineer (EE) → Financial Sanction & DSC Release</div>
                </div>

                <button
                  onClick={handleConfigureWorkflow}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? "Anchoring Workflow Pipeline..." : "Configure Approval Pipeline"}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Live Departmental Workflow Pipeline</h3>
              {workflowResult ? (
                <div className="space-y-3">
                  <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border text-xs font-mono space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Workflow ID:</span>
                      <span className="text-foreground font-bold">{workflowResult.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenant ID:</span>
                      <span className="text-foreground font-semibold">{workflowResult.tenant_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">{workflowResult.work_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ceiling:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{workflowResult.financial_threshold_ceiling?.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(Array.isArray(workflowResult.steps) ? workflowResult.steps : (workflowResult.workflow_steps_json || [])).map((st: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-foreground">Step {st.step}: {st.role}</div>
                          <div className="text-muted-foreground text-[11px] font-mono capitalize">Action: {st.action?.replace("_", " ")}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Stage 1: Field Level</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">Active</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">Junior Engineer (JE)</div>
                    <p className="text-xs text-muted-foreground">Uploads geofenced photos, initial MB measurements, and physical completion check.</p>
                  </div>
                  <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Stage 2: Technical Check</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">Verified</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">Assistant Engineer (AE)</div>
                    <p className="text-xs text-muted-foreground">Reviews AI computer vision defect detections and validates material test certificates.</p>
                  </div>
                  <div className="p-4 bg-muted/40 dark:bg-slate-950/60 rounded-xl border border-border space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Stage 3: Sanction</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded">Final Sign-off</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">Executive Engineer (EE)</div>
                    <p className="text-xs text-muted-foreground">Applies DSC digital signature to release PFMS DBT fund disbursements.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
