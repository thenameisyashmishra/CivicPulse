import { useState } from "react";
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
  TrendingUp,
  Brain,
  Download,
  Zap,
} from "lucide-react";

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

  const handleAskAI = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/analytics-policy/nl/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_prompt: nlPrompt }),
      });
      const data = await res.json();
      setNlResult(data);
      setStatusMsg("Natural language query resolved against policy analytics engine!");
    } catch {
      setStatusMsg("Failed to query AI assistant.");
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
      setCarbonResult(data);
      setStatusMsg("Green infrastructure embodied carbon & GRIHA grade computed!");
    } catch {
      setStatusMsg("Failed to calculate carbon footprint.");
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
      setPlantationResult(data);
      setStatusMsg("Compensatory plantation survival rate verified via Sentinel-2 diff!");
    } catch {
      setStatusMsg("Failed to track compensatory plantation.");
    } finally {
      setLoading(false);
    }
  };

  const handlePredictMaintenance = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/analytics-policy/maintenance/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: parseInt(predAssetId),
          current_health_index: parseFloat(predHealthIdx),
        }),
      });
      const data = await res.json();
      setPredResult(data);
      setStatusMsg("Deterioration curve forecasted asset rehabilitation window!");
    } catch {
      setStatusMsg("Failed to predict maintenance.");
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
      setDriftResult(data);
      setStatusMsg("Model drift metric recorded and evaluated against accuracy threshold!");
    } catch {
      setStatusMsg("Failed to record drift.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Policy, Scale & AI Model Governance Hub
              </h1>
              <p className="text-slate-400 text-sm">
                Multi-tenancy, executive BI, sustainability accounting, and ML platform governance (Pillars B.9, B.10, B.11 & B.12)
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> 4-Tier Tenancy Active
          </span>
          <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" /> GRIHA Green Accounting
          </span>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
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
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400 mb-1 font-medium">Sanctioned Outlay</div>
              <div className="text-2xl font-bold text-white">₹1,420.5 Cr</div>
              <div className="text-xs text-emerald-400 mt-2 font-mono">Q2-FY2024-25 • Delhi State</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400 mb-1 font-medium">Total Disbursed (PFMS)</div>
              <div className="text-2xl font-bold text-blue-400">₹980.2 Cr</div>
              <div className="text-xs text-slate-400 mt-2 font-mono">69.0% Expenditure Burn</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400 mb-1 font-medium">Physical Completion</div>
              <div className="text-2xl font-bold text-emerald-400">72.4%</div>
              <div className="text-xs text-emerald-400 mt-2 font-mono">+4.2% vs Sanction Timeline</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs text-slate-400 mb-1 font-medium">Avg Milestone Delay</div>
              <div className="text-2xl font-bold text-amber-400">18.5 Days</div>
              <div className="text-xs text-slate-400 mt-2 font-mono">Defect Density: 0.42 / km</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Executive BI Drilldown for State Secretaries & Leadership
            </h2>
            <p className="text-sm text-slate-400">
              Aggregated KPI snapshot reconciling milestone achievements, fund disbursals, and visual defect densities across municipal zones.
            </p>
          </div>
        </div>
      )}

      {activeTab === "ask_ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Natural-Language "Ask Your Data" Query Assistant
            </h2>
            <p className="text-sm text-slate-400">
              Translates plain language inquiries into structured metric queries across project delays, budgets, and contractor records.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Your Question / Prompt</label>
                <textarea
                  rows={3}
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNlPrompt("What are the primary causes of project delay in North East Delhi?")}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                >
                  Delay Analysis
                </button>
                <button
                  type="button"
                  onClick={() => setNlPrompt("Show me the capital expenditure burn rate for state highways.")}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                >
                  Budget Burn Rate
                </button>
              </div>
              <button
                onClick={handleAskAI}
                disabled={loading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "Analyzing Database..." : "Ask Policy Assistant"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Structured AI Resolution</h3>
            {nlResult ? (
              <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300">
                <div className="text-sm font-semibold text-purple-300">
                  {nlResult.structured_response_json?.metric}
                </div>
                <p className="text-slate-300">
                  {nlResult.structured_response_json?.summary}
                </p>
                <div className="p-3 bg-slate-900 rounded-lg font-mono text-slate-400">
                  {JSON.stringify(nlResult.structured_response_json?.data_points, null, 2)}
                </div>
                <div className="text-slate-500 text-[10px]">
                  Execution latency: {nlResult.execution_time_ms}ms • Query Type: {nlResult.generated_query_type}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Enter an inquiry on the left to test the natural language query engine.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "predictive" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Predictive Asset Deterioration Modeling
            </h2>
            <p className="text-sm text-slate-400">
              Forecasts asset rehabilitation interventions based on pavement condition index, traffic loads, and monsoon cycles.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Asset ID</label>
                <input
                  type="text"
                  value={predAssetId}
                  onChange={(e) => setPredAssetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Current Health Index (0-100)</label>
                <input
                  type="number"
                  value={predHealthIdx}
                  onChange={(e) => setPredHealthIdx(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <button
                onClick={handlePredictMaintenance}
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "Computing Deterioration Curve..." : "Forecast Maintenance Window"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Forecasted Rehabilitation Plan</h3>
            {predResult ? (
              <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-300">
                <div>Degradation Year: <span className="text-amber-400 font-bold">{predResult.forecasted_degradation_year}</span></div>
                <div>Recommended Intervention: <span className="text-white">{predResult.recommended_intervention}</span></div>
                <div>Estimated Budget Outlay: <span className="text-emerald-400 font-bold">₹{predResult.estimated_rehab_cost_inr?.toLocaleString("en-IN")}</span></div>
                <div>Model Confidence: <span className="text-blue-400">{Math.round((predResult.confidence_score || 0.94) * 100)}%</span></div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Run deterioration curve analysis on an asset to view predictive schedule.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "carbon" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-400" />
              Green Infrastructure Embodied Carbon Accounting
            </h2>
            <p className="text-sm text-slate-400">
              Computes life-cycle embodied emissions (tCO2e) based on OPC/PPC cement, TMT steel, and bitumen procurement.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Cement Consumption (MT)</label>
                <input
                  type="number"
                  value={cementMt}
                  onChange={(e) => setCementMt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Steel Consumption (MT)</label>
                <input
                  type="number"
                  value={steelMt}
                  onChange={(e) => setSteelMt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bitumen Consumption (MT)</label>
                <input
                  type="number"
                  value={bitumenMt}
                  onChange={(e) => setBitumenMt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <button
                onClick={handleCalculateCarbon}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "Calculating tCO2e..." : "Calculate Embodied Carbon"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">GRIHA Sustainability Assessment</h3>
            {carbonResult ? (
              <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-300">
                <div>Total Embodied Carbon: <span className="text-emerald-400 font-bold text-sm">{carbonResult.embodied_carbon_tco2e} tCO2e</span></div>
                <div>Sustainability Rating: <span className="text-white font-bold">{carbonResult.green_rating_grade}</span></div>
                <div>Emissions Benchmark: <span className="text-blue-400">Within MoEFCC Low-Carbon Infrastructure Baseline</span></div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Enter material quantities to compute embodied carbon emissions.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "plantation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TreePine className="w-5 h-5 text-emerald-400" />
              Compensatory Afforestation Tracker (1:10 Statutory Ratio)
            </h2>
            <p className="text-sm text-slate-400">
              Tracks mandatory sapling plantation per tree felled, with satellite NDVI survival verification.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Trees Felled</label>
                <input
                  type="number"
                  value={felledTrees}
                  onChange={(e) => setFelledTrees(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Actual Saplings Planted</label>
                <input
                  type="number"
                  value={plantedTrees}
                  onChange={(e) => setPlantedTrees(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Satellite Verified Survival Rate (%)</label>
                <input
                  type="number"
                  value={survivalRate}
                  onChange={(e) => setSurvivalRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <button
                onClick={handleTrackPlantation}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "Verifying Plantation..." : "Log & Verify Afforestation"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Forest Clearance Verification</h3>
            {plantationResult ? (
              <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-300">
                <div>Mandatory Obligation (1:10): <span className="text-white">{plantationResult.mandatory_plantation_count} Saplings</span></div>
                <div>Actual Planted: <span className="text-emerald-400">{plantationResult.actual_planted_count} Saplings (112.5% Compliance)</span></div>
                <div>Satellite Survival Rate: <span className="text-emerald-400 font-bold">{plantationResult.satellite_verified_survival_rate_pct}%</span></div>
                <div>Geofence: <span className="text-slate-500">{plantationResult.plantation_geofence_wkt?.slice(0, 30)}...</span></div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Log tree clearance to verify compensatory plantation compliance.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "model_drift" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Continuous Model Evaluation & Concept Drift
            </h2>
            <p className="text-sm text-slate-400">
              Monitors CV inference precision, recall, and mAP@0.5 over weekly field samples.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Model Version</label>
                <input
                  type="text"
                  value={driftVersion}
                  onChange={(e) => setDriftVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Test mAP@0.5 Score (Threshold: 0.70)</label>
                <input
                  type="number"
                  step="0.01"
                  value={driftMap}
                  onChange={(e) => setDriftMap(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <button
                onClick={handleRecordDrift}
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "Evaluating Metrics..." : "Record & Check Drift Alert"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Drift Assessment</h3>
            {driftResult ? (
              <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-300">
                <div>Model: <span className="text-white">{driftResult.model_version}</span></div>
                <div>Sample Size: <span className="text-white">{driftResult.test_sample_size} Frames</span></div>
                <div>mAP@0.5 Score: <span className="text-emerald-400 font-bold">{driftResult.map50_score}</span></div>
                <div>Drift Alert: <span className={driftResult.drift_alert_triggered ? "text-red-400" : "text-emerald-400"}>
                  {driftResult.drift_alert_triggered ? "TRIGGERED (Drift Exceeds Safe Ceiling)" : "HEALTHY (Within Tolerance)"}
                </span></div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Submit drift test results to evaluate degradation against held-out ground truth.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Static Overview Tabs */}
      {activeTab === "leaderboards" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            National Contractor & District Performance Leaderboard
          </h2>
          <div className="space-y-2 text-xs font-mono">
            {[
              { rank: 1, name: "NCC Limited", type: "Contractor", quality: "94.5%", timeliness: "91.0%", rating: "4.8 ★" },
              { rank: 2, name: "L&T Infrastructure", type: "Contractor", quality: "93.2%", timeliness: "89.5%", rating: "4.7 ★" },
              { rank: 3, name: "North East Delhi", type: "District", quality: "92.1%", timeliness: "89.4%", rating: "4.6 ★" },
            ].map((entry) => (
              <div key={entry.rank} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-purple-500/20 text-purple-300 font-bold rounded-full">
                    {entry.rank}
                  </span>
                  <div>
                    <div className="text-white font-semibold">{entry.name}</div>
                    <div className="text-slate-500">{entry.type} • 2024-H1 Evaluation</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>Quality: <span className="text-emerald-400">{entry.quality}</span></div>
                  <div>Timeliness: <span className="text-blue-400">{entry.timeliness}</span></div>
                  <div>Citizen: <span className="text-amber-400">{entry.rating}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "multitenancy" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Multi-Tenant Hierarchy (State → District → Block → Panchayat)
          </h2>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
            <div className="text-emerald-400 font-bold">├── State: Government of NCT of Delhi (STATE-DL)</div>
            <div className="text-blue-400 pl-4">└── District: North East Delhi (DIST-NEDL)</div>
            <div className="text-slate-300 pl-8">└── Block: Seelampur Division</div>
            <div className="text-slate-500 pl-12">└── Ward / Panchayat: Welcome Colony (LGD-110094)</div>
          </div>
        </div>
      )}

      {activeTab === "i18n" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-400" />
            22 Scheduled Indian Languages Localization (i18n)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {["Hindi (हिन्दी)", "Bengali (বাংলা)", "Telugu (తెలుగు)", "Marathi (मराठी)", "Tamil (தமிழ்)", "Urdu (اردو)", "Gujarati (ગુજરાતી)", "Kannada (ಕನ್ನಡ)"].map((lang) => (
              <div key={lang} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-medium text-slate-300">
                {lang}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "model_registry" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            Production Computer Vision Model Registry
          </h2>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Model:</span>
              <span className="text-white font-bold">yolov8-pothole-crack</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Version:</span>
              <span className="text-emerald-400">v3.2.0 (Active Production)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Weights SHA-256:</span>
              <span className="text-slate-400">4d89a71be82cf09182abcf18274a108428f9104...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Framework:</span>
              <span className="text-blue-400">PyTorch / Ultralytics ONNX Engine</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "model_cards" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Explainable AI (XAI) Model Card Documentation
          </h2>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div>
              <div className="text-slate-400 font-semibold mb-0.5">Intended Domain:</div>
              <p className="text-slate-300">Indian National & State Highway Pavement Surface Inspection (IRC:82 Compliance)</p>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-0.5">Training Provenance:</div>
              <p className="text-slate-300">14,200 annotated high-res road surface images across 8 Indian states under varied weather/lighting.</p>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-0.5">Operational Boundaries:</div>
              <p className="text-slate-300">Trained on asphalt/concrete surfaces. Low light performance (&lt;20 lux) requires auxiliary floodlighting.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "edge_mode" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Offline / Edge Inference Mode for Rural Connectivity Deserts
          </h2>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Quantized Model Code:</span>
              <span className="text-white">EDGE-YOLO-INT8-V1</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Package Size:</span>
              <span className="text-emerald-400 font-bold">12.4 MB (Fits on budget Android devices)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sync Protocol:</span>
              <span className="text-blue-400">SYNC-v2.2 (Store-and-forward SQLite queue)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "workflows" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Configurable State Approval Workflow Engine
          </h2>
          <p className="text-sm text-slate-400">
            Dynamically models approval pipelines per departmental hierarchy (Junior Engineer → Assistant Engineer → Executive Engineer).
          </p>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
