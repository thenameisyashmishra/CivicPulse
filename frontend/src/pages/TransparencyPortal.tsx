import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Globe,
  FileCode,
  TrendingUp,
  MessageSquareWarning,
  Clock,
  Users,
  Building,
  Star,
  Newspaper,
  ShieldCheck,
  MapPin,
  Key,
  FileText,
  Search,
  CheckCircle2,
  Copy,
  Download,
  Check,
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

export default function TransparencyPortal() {
  const [activeTab, setActiveTab] = useState<
    | "public_projects"
    | "ocds"
    | "budget_variance"
    | "cpgrams"
    | "rti"
    | "social_audit"
    | "laq"
    | "star_ratings"
    | "press_releases"
    | "third_party"
    | "heatmap"
    | "developer"
    | "pre_construction"
  >("public_projects");

  const [projects, setProjects] = useState<any[]>([]);
  const [ocdsData, setOcdsData] = useState<any>(null);
  const [varianceData, setVarianceData] = useState<any>(null);
  const [cpgramsList, setCpgramsList] = useState<any[]>([]);
  const [rtiList, setRtiList] = useState<any[]>([]);
  const [socialAudits, setSocialAudits] = useState<any[]>([]);
  const [laqList, setLaqList] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [preConstruction, setPreConstruction] = useState<any[]>([]);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [pressRelease, setPressRelease] = useState<any>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("PW-2024-001");

  // Form states
  const [cpgramsForm, setCpgramsForm] = useState({
    name: "",
    contact: "",
    category: "Drainage Block & Quality",
    description: "",
  });
  const [rtiForm, setRtiForm] = useState({
    name: "",
    queries: "",
  });
  const [cpgramsReceipt, setCpgramsReceipt] = useState<any>(null);
  const [rtiReceipt, setRtiReceipt] = useState<any>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    durability: 5,
    utility: 5,
    speed: 4,
    title: "",
    comment: "",
  });
  const [devKeyForm, setDevKeyForm] = useState({
    client_name: "",
    organization: "",
    tier: "research",
  });
  const [generatedApiKey, setGeneratedApiKey] = useState("");

  const fetchData = async () => {
    try {
      const [projRes, varRes, cpgRes, rtiRes, saRes, laqRes, hmRes, pcRes] =
        await Promise.all([
          fetch("/api/transparency/public/projects").then((r) => (r.ok ? r.json() : { projects: [] })),
          fetch("/api/transparency/budget-variance").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/transparency/cpgrams/list").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/transparency/rti/requests").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/transparency/social-audit").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/transparency/laq/list").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/transparency/heatmap/districts").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/transparency/pre-construction").then((r) => (r.ok ? r.json() : [])),
        ]);

      setProjects(Array.isArray(projRes?.projects) ? projRes.projects : []);
      if (varRes && !varRes.detail) setVarianceData(varRes);
      setCpgramsList(Array.isArray(cpgRes) ? cpgRes : []);
      setRtiList(Array.isArray(rtiRes) ? rtiRes : []);
      setSocialAudits(Array.isArray(saRes) ? saRes : []);
      setLaqList(Array.isArray(laqRes) ? laqRes : []);
      setHeatmapData(Array.isArray(hmRes) ? hmRes : []);
      setPreConstruction(Array.isArray(pcRes) ? pcRes : []);
    } catch (e) {
      console.error(e);
      setProjects([]);
      setCpgramsList([]);
      setRtiList([]);
      setSocialAudits([]);
      setLaqList([]);
      setHeatmapData([]);
      setPreConstruction([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadOCDS = async () => {
    try {
      const res = await fetch("/api/transparency/ocds/releases");
      if (!res.ok) throw new Error("Failed to load OCDS data");
      const data = await res.json();
      setOcdsData(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load OCDS data");
    }
  };

  const loadPressRelease = async (pId: string) => {
    try {
      const res = await fetch(`/api/transparency/press-releases/${pId}`);
      if (!res.ok) throw new Error("Press release not found");
      const data = await res.json();
      setPressRelease(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadReviews = async (pId: string) => {
    try {
      const res = await fetch(`/api/transparency/reviews/${pId}`);
      if (!res.ok) throw new Error("Reviews not found");
      const data = await res.json();
      setReviewsData(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFileCPGRAMS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/transparency/cpgrams/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: cpgramsForm.name,
          contact: cpgramsForm.contact,
          category: cpgramsForm.category,
          description: cpgramsForm.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Failed to file grievance (HTTP ${res.status})`);
      }
      setCpgramsReceipt(data);
      downloadJSON(data, `CPGRAMS_Grievance_Docket_${(data.registration_number || "REG").replace(/[\/\\:]/g, "_")}.json`);
      toast.success(`Grievance filed! Docket: ${data.registration_number}`);
      setCpgramsForm({ name: "", contact: "", category: "Drainage Block & Quality", description: "" });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFileRTI = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/transparency/rti/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          applicant_name: rtiForm.name,
          queries: rtiForm.queries.split("\n").filter((q) => q.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Failed to submit RTI (HTTP ${res.status})`);
      }
      setRtiReceipt(data);
      downloadJSON(data, `RTI_Application_Receipt_${(data.rti_number || "RTI").replace(/[\/\\:]/g, "_")}.json`);
      toast.success(`RTI Filed! Tracking No: ${data.rti_number}`);
      setRtiForm({ name: "", queries: "" });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      toast.error("Please login to submit verified citizen rating");
      return;
    }
    try {
      const res = await fetch("/api/transparency/reviews/rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          ...ratingForm,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit rating");
      }
      toast.success("Citizen rating recorded on public ledger!");
      loadReviews(selectedProjectId);
      setRatingForm({ durability: 5, utility: 5, speed: 4, title: "", comment: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/transparency/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(devKeyForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Failed to generate API key (HTTP ${res.status})`);
      }
      setGeneratedApiKey(data.api_key);
      toast.success("API key generated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-cyan-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Public Transparency & Open Governance Portal
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                PILLAR B.2
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Public project data that is open, understandable, and hard to hide · OCDS 1.1, CPGRAMS, RTI Act 2005, MGNREGA Audits
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              RTI Section 4(1)(b) Compliant
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Transparency Portal Modules"
          className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin"
        >
          {[
            { id: "public_projects", label: "Public Discovery", icon: Search },
            { id: "ocds", label: "OCDS 1.1 Schema", icon: FileCode },
            { id: "budget_variance", label: "Budget-vs-Spend", icon: TrendingUp },
            { id: "cpgrams", label: "CPGRAMS Grievances", icon: MessageSquareWarning },
            { id: "rti", label: "RTI 30-Day Tracker", icon: Clock },
            { id: "social_audit", label: "Social Audits", icon: Users },
            { id: "laq", label: "Assembly Questions (LAQ)", icon: Building },
            { id: "star_ratings", label: "Citizen Ratings", icon: Star },
            { id: "press_releases", label: "Press Releases", icon: Newspaper },
            { id: "third_party", label: "Third-Party Audits", icon: ShieldCheck },
            { id: "heatmap", label: "District Heatmap", icon: MapPin },
            { id: "developer", label: "Open Data API", icon: Key },
            { id: "pre_construction", label: "Pre-Construction", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`trans-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`trans-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "ocds" && !ocdsData) loadOCDS();
                  if (tab.id === "press_releases" && !pressRelease) loadPressRelease("PW-2024-001");
                  if (tab.id === "star_ratings" && !reviewsData) loadReviews("PW-2024-001");
                }}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 shrink-0 transition ${
                  active
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Public Discovery */}
        {activeTab === "public_projects" && (
          <div
            role="tabpanel"
            id="trans-panel-public_projects"
            aria-labelledby="trans-tab-public_projects"
            className="space-y-4"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base font-semibold">Public Project Explorer (Zero Login Required)</h3>
                <p className="text-xs text-muted-foreground">
                  Proactive public disclosure of public infrastructure works across Gram Panchayats and Municipal Zones.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search project, scheme, contractor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {projects
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.contractor.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-xl border border-border bg-card/40 space-y-3 hover:border-cyan-500/50 transition cursor-pointer"
                    onClick={() => {
                      setSelectedProjectId(p.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-cyan-400">{p.id}</span>
                        <h4 className="font-bold text-sm line-clamp-1">{p.name}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === "completed"
                            ? "bg-emerald-400/20 text-emerald-400"
                            : p.status === "flagged"
                            ? "bg-rose-400/20 text-rose-400"
                            : "bg-cyan-400/20 text-cyan-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.location}
                    </p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Physical Progress</span>
                        <span className="font-bold">{p.progress_percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${p.progress_percent}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Sanctioned</span>
                        <div className="font-bold font-mono">₹{(p.budget_inr / 10000000).toFixed(1)}Cr</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground">Disbursed</span>
                        <div className="font-bold font-mono text-cyan-400">₹{(p.spent_inr / 10000000).toFixed(1)}Cr</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 2: OCDS 1.1 Schema */}
        {activeTab === "ocds" && (
          <div
            role="tabpanel"
            id="trans-panel-ocds"
            aria-labelledby="trans-tab-ocds"
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Open Contracting Data Standard (OCDS 1.1) API</h3>
                <p className="text-xs text-muted-foreground">
                  Conforms with Open Contracting Partnership standards for global civic-tech interoperability.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(ocdsData, null, 2));
                    toast.success("OCDS JSON copied to clipboard!");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent hover:bg-accent/80 flex items-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy OCDS Release
                </button>
                <button
                  onClick={() => {
                    if (ocdsData) {
                      downloadJSON(
                        ocdsData,
                        `OCDS_1.1_Release_Package_${new Date().toISOString().slice(0, 10)}.json`
                      );
                      toast.success("OCDS Release Package downloaded to browser!");
                    } else {
                      toast.error("Please wait for OCDS data to load");
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download OCDS JSON
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl border border-border bg-background text-xs font-mono max-h-[500px] overflow-y-auto text-muted-foreground">
              {JSON.stringify(ocdsData, null, 2) || "Loading OCDS schema..."}
            </pre>
          </div>
        )}

        {/* Tab 3: Budget-vs-Spend Variance */}
        {activeTab === "budget_variance" && varianceData && (
          <div
            role="tabpanel"
            id="trans-panel-budget_variance"
            aria-labelledby="trans-tab-budget_variance"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">Real-Time Macro Budget vs. Spend Variance</h3>
              <p className="text-xs text-muted-foreground">
                Flags potential over-billing when cumulative financial draw exceeds AI-verified physical milestones.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Sanctioned</span>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  ₹{(varianceData.total_sanctioned_budget_inr / 10000000).toFixed(2)} Cr
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Disbursed</span>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                  ₹{(varianceData.total_released_spend_inr / 10000000).toFixed(2)} Cr
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Avg Physical Progress</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {varianceData.average_physical_progress_pct}%
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Over-Billing Flags</span>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                  {varianceData.over_billing_flag_count} Projects
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Project ID</th>
                    <th className="p-3">Project Name</th>
                    <th className="p-3">Financial Draw %</th>
                    <th className="p-3">Physical Progress %</th>
                    <th className="p-3">Variance Gap</th>
                    <th className="p-3">Risk Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {varianceData.projects_variance_breakdown?.map((pv: any) => (
                    <tr key={pv.id} className="hover:bg-accent/20">
                      <td className="p-3 font-mono font-bold text-cyan-400">{pv.id}</td>
                      <td className="p-3 font-semibold">{pv.name}</td>
                      <td className="p-3 font-mono">{pv.financial_progress_pct}%</td>
                      <td className="p-3 font-mono">{pv.physical_progress_pct}%</td>
                      <td className="p-3 font-mono font-bold">
                        {pv.variance_gap_pct > 0 ? `+${pv.variance_gap_pct}%` : `${pv.variance_gap_pct}%`}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            pv.risk_assessment.includes("High")
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {pv.risk_assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: CPGRAMS */}
        {activeTab === "cpgrams" && (
          <div
            role="tabpanel"
            id="trans-panel-cpgrams"
            aria-labelledby="trans-tab-cpgrams"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-cyan-400" />
                  File CPGRAMS Central Public Grievance
                </h3>
                <p className="text-xs text-muted-foreground">
                  Citizen complaints sync bidirectionally with Government of India DARPG Portal v7.0.
                </p>
              </div>

              <form onSubmit={handleFileCPGRAMS} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">Complainant Full Name</label>
                  <input
                    type="text"
                    required
                    value={cpgramsForm.name}
                    onChange={(e) => setCpgramsForm({ ...cpgramsForm, name: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Contact Email / Phone</label>
                  <input
                    type="text"
                    required
                    value={cpgramsForm.contact}
                    onChange={(e) => setCpgramsForm({ ...cpgramsForm, contact: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Complaint Details</label>
                  <textarea
                    rows={3}
                    required
                    value={cpgramsForm.description}
                    onChange={(e) => setCpgramsForm({ ...cpgramsForm, description: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-white"
                >
                  Submit CPGRAMS Grievance
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3">
              <h3 className="text-sm font-bold">Active CPGRAMS Dockets</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {cpgramsList.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg border border-border/60 bg-accent/10 space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono text-cyan-400">{g.registration_number}</span>
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-accent">
                        {g.status}
                      </span>
                    </div>
                    <div className="font-semibold">{g.complainant_name} ({g.category})</div>
                    <p className="text-muted-foreground text-[11px]">{g.description}</p>
                    <div className="text-[10px] text-emerald-400 font-medium">{g.cpgrams_action_note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: RTI 30-Day Tracker */}
        {activeTab === "rti" && (
          <div
            role="tabpanel"
            id="trans-panel-rti"
            aria-labelledby="trans-tab-rti"
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Right to Information (RTI Act 2005) Statutory Tracker</h3>
                <p className="text-xs text-muted-foreground">
                  Statutory 30-day countdown timer enforced per Section 7(1). First Appeal automatically unlocks upon breach.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
                <h4 className="font-semibold text-xs flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  File Statutory RTI Request
                </h4>
                <form onSubmit={handleFileRTI} className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-[11px]">Applicant Full Name</label>
                    <input
                      type="text"
                      required
                      value={rtiForm.name}
                      onChange={(e) => setRtiForm({ ...rtiForm, name: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[11px]">Queries (one per line)</label>
                    <textarea
                      rows={3}
                      required
                      value={rtiForm.queries}
                      onChange={(e) => setRtiForm({ ...rtiForm, queries: e.target.value })}
                      placeholder="e.g. Certified copy of core-cut test&#10;Tranche 2 measurement book"
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 font-semibold rounded-lg bg-cyan-500 text-white"
                  >
                    Submit RTI Application
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="grid gap-3">
              {rtiList.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-border bg-card/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-cyan-400">{r.rti_number}</span>
                      <span className="text-xs font-semibold">Applicant: {r.applicant_name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === "information_provided"
                            ? "bg-emerald-400/20 text-emerald-400"
                            : "bg-amber-400/20 text-amber-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Queries: {r.queries?.join(" · ")}
                    </div>
                    {r.response_text && (
                      <div className="text-[11px] text-emerald-400 font-medium">
                        PIO Response: {r.response_text}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-base font-black font-mono ${
                        r.days_remaining <= 5 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {r.days_remaining} Days Remaining
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Statutory Deadline: {new Date(r.statutory_deadline).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: MGNREGA Social Audits */}
        {activeTab === "social_audit" && (
          <div
            role="tabpanel"
            id="trans-panel-social_audit"
            aria-labelledby="trans-tab-social_audit"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">MGNREGA-Style Social Audit Register</h3>
              <p className="text-xs text-muted-foreground">
                Formal Gram Sabha public review sessions verifying muster rolls, material tests, and on-site completion.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {socialAudits.map((sa) => (
                <div key={sa.id} className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{sa.panchayat}</span>
                    <span className="text-cyan-400 font-mono">Date: {sa.audit_date}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Quorum: <span className="font-bold text-foreground">{sa.quorum_present} Citizens Present</span> · Presided by: {sa.gram_sabha_president}
                  </div>
                  <div className="p-2.5 rounded bg-accent/20 space-y-1">
                    <span className="font-semibold text-[11px]">Findings:</span>
                    <ul className="list-disc pl-4 text-[11px] text-muted-foreground">
                      {sa.social_audit_findings?.map((f: string, idx: number) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">
                    Status: {sa.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: LAQ Dossier */}
        {activeTab === "laq" && (
          <div
            role="tabpanel"
            id="trans-panel-laq"
            aria-labelledby="trans-tab-laq"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">Legislative Assembly Questions (LAQ) Dossier</h3>
              <p className="text-xs text-muted-foreground">
                Questions raised by MLAs/MPs auto-compile real-time verified data into the Hon'ble Minister's official reply.
              </p>
            </div>

            <div className="grid gap-3">
              {laqList.map((q) => (
                <div key={q.id} className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-cyan-400 font-bold">
                        {q.house} · {q.session_name} · Q#{q.question_number} ({q.question_type})
                      </span>
                      <h4 className="font-bold text-sm mt-0.5">{q.subject}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-accent text-[10px] font-bold">
                      {q.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Member: {q.member_name} (Constituency: {q.constituency})
                  </div>
                  {q.minister_reply && (
                    <div className="p-3 rounded bg-accent/20 italic text-[11px]">
                      "{q.minister_reply}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Citizen Star Ratings */}
        {activeTab === "star_ratings" && (
          <div
            role="tabpanel"
            id="trans-panel-star_ratings"
            aria-labelledby="trans-tab-star_ratings"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  Rate Completed Infrastructure Quality
                </h3>
                <p className="text-xs text-muted-foreground">
                  Post-completion multi-criteria evaluation by verified local residents.
                </p>
              </div>

              <form onSubmit={handleSubmitRating} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Review Title</label>
                  <input
                    type="text"
                    required
                    value={ratingForm.title}
                    onChange={(e) => setRatingForm({ ...ratingForm, title: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold">Durability (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={ratingForm.durability}
                      onChange={(e) => setRatingForm({ ...ratingForm, durability: parseInt(e.target.value) })}
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Utility (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={ratingForm.utility}
                      onChange={(e) => setRatingForm({ ...ratingForm, utility: parseInt(e.target.value) })}
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Execution Speed (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={ratingForm.speed}
                      onChange={(e) => setRatingForm({ ...ratingForm, speed: parseInt(e.target.value) })}
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold">Detailed Citizen Feedback</label>
                  <textarea
                    rows={3}
                    required
                    value={ratingForm.comment}
                    onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-amber-500 text-white"
                >
                  Submit Verified Citizen Review
                </button>
              </form>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3">
              <h3 className="text-sm font-bold">Public Rating Summary</h3>
              {reviewsData ? (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-accent/20 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-black text-amber-400 font-mono">
                        ★ {reviewsData.average_stars} / 5.0
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Based on {reviewsData.total_reviews} verified resident reviews
                      </span>
                    </div>
                    <div className="text-right text-[11px] space-y-0.5">
                      <div>Durability: {reviewsData.durability_avg}</div>
                      <div>Utility: {reviewsData.utility_avg}</div>
                      <div>Speed: {reviewsData.speed_avg}</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {reviewsData.reviews?.map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{r.title}</span>
                          <span className="text-amber-400 font-mono">★ {r.stars}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading rating data...</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 9: Press Releases */}
        {activeTab === "press_releases" && pressRelease && (
          <div
            role="tabpanel"
            id="trans-panel-press_releases"
            aria-labelledby="trans-tab-press_releases"
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Automated Bilingual Press Release Generator</h3>
                <p className="text-xs text-muted-foreground">
                  Published instantaneously when an infrastructure project crosses verified milestone thresholds.
                </p>
              </div>
              <span className="font-mono text-xs text-cyan-400 font-bold">{pressRelease.release_id}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase">English Media Release</span>
                <pre className="p-3 rounded bg-background font-mono text-[11px] whitespace-pre-wrap text-foreground/90">
                  {pressRelease.english_dispatch}
                </pre>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase">हिंदी मीडिया विज्ञप्ति</span>
                <pre className="p-3 rounded bg-background font-mono text-[11px] whitespace-pre-wrap text-foreground/90">
                  {pressRelease.hindi_dispatch}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 10: Third-Party Independent Audits */}
        {activeTab === "third_party" && (
          <div
            role="tabpanel"
            id="trans-panel-third_party"
            aria-labelledby="trans-tab-third_party"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">Third-Party Independent Audit Agency Reports</h3>
              <p className="text-xs text-muted-foreground">
                Empanelled scientific bodies (CRRI, IITs, NITs) conduct core-cut compressive and bitumen extraction tests.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm">Central Road Research Institute (CRRI)</h4>
                  <span className="text-[11px] text-muted-foreground font-mono">Empanelment: CRRI-QA-2024</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
                  GRADE A (96.5%)
                </span>
              </div>
              <p className="text-muted-foreground">
                Project PW-2024-001: Pavement core-cutting confirms bitumen content of 5.2% and compaction ratio of 98.4%, complying with MoRTH 5th Revision standards.
              </p>
              <div className="p-2 rounded bg-accent/20 font-mono text-[10px] text-cyan-400 truncate">
                Certificate Hash: 8f4e2a9b1c5d7e3f6a0b9c8d7e6f5a4b3c2d1e0f
              </div>
            </div>
          </div>
        )}

        {/* Tab 11: District Heatmap */}
        {activeTab === "heatmap" && (
          <div
            role="tabpanel"
            id="trans-panel-heatmap"
            aria-labelledby="trans-tab-heatmap"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">Public Quality & Corruption Risk Heatmap by District</h3>
              <p className="text-xs text-muted-foreground">
                Aggregated anomaly rates, fund utilization lag, and defect indices for civil society and researchers.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {heatmapData.map((d, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-sm">{d.district_name}</span>
                    <span className="font-mono text-cyan-400">{d.project_count} Works</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Sanctioned: ₹{(d.total_budget_inr / 10000000).toFixed(1)}Cr</span>
                    <span>Disbursed: ₹{(d.total_spent_inr / 10000000).toFixed(1)}Cr</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>Anomaly Risk Index</span>
                      <span className="font-mono font-bold text-rose-400">{d.anomaly_risk_index}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: `${d.anomaly_risk_index}%` }} />
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400">{d.quality_tier}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 12: Open Data Developer Portal */}
        {activeTab === "developer" && (
          <div
            role="tabpanel"
            id="trans-panel-developer"
            aria-labelledby="trans-tab-developer"
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" />
                  Generate Free Public API Key
                </h3>
                <p className="text-xs text-muted-foreground">
                  Access live REST endpoints and OCDS 1.1 JSON dumps for civic technology projects.
                </p>
              </div>

              <form onSubmit={handleGenerateApiKey} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold">Developer / Researcher Name</label>
                  <input
                    type="text"
                    required
                    value={devKeyForm.client_name}
                    onChange={(e) => setDevKeyForm({ ...devKeyForm, client_name: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="font-semibold">Institution / Organization</label>
                  <input
                    type="text"
                    required
                    value={devKeyForm.organization}
                    onChange={(e) => setDevKeyForm({ ...devKeyForm, organization: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white"
                >
                  Generate API Key
                </button>
              </form>

              {generatedApiKey && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400">Save Your Secret API Key:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedApiKey);
                        setKeyCopied(true);
                        toast.success("API Key copied to clipboard!");
                        setTimeout(() => setKeyCopied(false), 3000);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      {keyCopied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Key
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs font-black text-foreground bg-background/80 p-2 rounded border border-border break-all">
                    {generatedApiKey}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Open Data API Catalog</h3>
              <div className="space-y-2">
                {[
                  { path: "/api/transparency/public/projects", desc: "List of all audited public works" },
                  { path: "/api/transparency/ocds/releases", desc: "OCDS 1.1 JSON format release package" },
                  { path: "/api/transparency/budget-variance", desc: "Macro progress and over-billing indices" },
                  { path: "/api/transparency/heatmap/districts", desc: "District-level defect risk indices" },
                ].map((ep, i) => (
                  <div key={i} className="p-2.5 rounded bg-accent/20 border border-border/50">
                    <div className="font-mono text-cyan-400 font-bold">{ep.path}</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">{ep.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 13: Pre-Construction Disclosure */}
        {activeTab === "pre_construction" && (
          <div
            role="tabpanel"
            id="trans-panel-pre_construction"
            aria-labelledby="trans-tab-pre_construction"
            className="space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold">"Right to Know Before It's Built" Proactive Disclosure</h3>
              <p className="text-xs text-muted-foreground">
                Sanctioned DPR, environmental clearance, and BOQ milestones published prior to ground-breaking to prevent baseline tampering.
              </p>
            </div>

            <div className="grid gap-4">
              {preConstruction.map((pc, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-cyan-400 font-bold">{pc.project_id}</span>
                      <h4 className="font-bold text-sm">{pc.project_name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
                      DPR: {pc.dpr_reference}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                    <div>Authority: {pc.sanctioning_authority}</div>
                    <div>Sanction Order Date: {pc.sanction_order_date}</div>
                    <div>Environment: {pc.environmental_clearance_status}</div>
                    <div>Land Status: {pc.land_acquisition_status}</div>
                  </div>

                  <div className="p-3 rounded bg-accent/20 space-y-1">
                    <span className="font-semibold text-[11px]">Key BOQ Milestones:</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {pc.boq_key_items?.map((item: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-background/50 border border-border/50">
                          <div className="font-bold text-foreground">{item.item}</div>
                          <div className="text-[10px] text-muted-foreground">{item.quantity} · {item.spec}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* CPGRAMS Docket Receipt Modal */}
        <Dialog
          open={Boolean(cpgramsReceipt)}
          onOpenChange={(open) => {
            if (!open) setCpgramsReceipt(null);
          }}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <MessageSquareWarning className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Official CPGRAMS Grievance Receipt
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Government of India DARPG Portal v7.0 Integration
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {cpgramsReceipt && (
              <div className="space-y-4 text-xs pt-2">
                <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      Statutory Registration Docket
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                      {cpgramsReceipt.status || "REGISTERED"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-background/80 p-2.5 rounded-lg border border-border">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {cpgramsReceipt.registration_number}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(cpgramsReceipt.registration_number);
                        toast.success("Docket number copied to clipboard!");
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Copy Docket Number"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-card/40">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Complainant</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {cpgramsReceipt.complainant_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Contact</span>
                    <div className="font-mono text-muted-foreground mt-0.5">
                      {cpgramsReceipt.complainant_contact}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Category</span>
                    <div className="font-semibold text-cyan-400 mt-0.5">
                      {cpgramsReceipt.category}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Project Linked</span>
                    <div className="font-mono font-semibold mt-0.5">
                      {cpgramsReceipt.project_id}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-accent/20 space-y-1">
                  <span className="font-semibold text-[11px] text-muted-foreground">
                    DARPG Action Note:
                  </span>
                  <p className="text-emerald-400 text-xs">
                    {cpgramsReceipt.cpgrams_action_note ||
                      "Complaint successfully ingested and mapped to DARPG CPGRAMS Portal v7.0."}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      downloadJSON(
                        cpgramsReceipt,
                        `CPGRAMS_Grievance_Docket_${(
                          cpgramsReceipt.registration_number || "REG"
                        ).replace(/[\/\\:]/g, "_")}.json`
                      );
                      toast.success("Docket JSON re-downloaded!");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Docket Receipt
                  </button>
                  <button
                    onClick={() => setCpgramsReceipt(null)}
                    className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* RTI Application Receipt Modal */}
        <Dialog
          open={Boolean(rtiReceipt)}
          onOpenChange={(open) => {
            if (!open) setRtiReceipt(null);
          }}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Statutory RTI Filing Receipt
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Right to Information Act 2005 · Section 6(1) Enforced Intake
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {rtiReceipt && (
              <div className="space-y-4 text-xs pt-2">
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      Official RTI Tracking Number
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                      30-DAY STATUTORY CLOCK ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-background/80 p-2.5 rounded-lg border border-border">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {rtiReceipt.rti_number}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(rtiReceipt.rti_number);
                        toast.success("RTI Tracking number copied!");
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Copy RTI Number"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-card/40">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Applicant Name</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {rtiReceipt.applicant_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Project Linked</span>
                    <div className="font-mono font-semibold mt-0.5">
                      {rtiReceipt.project_id}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Statutory Deadline</span>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      {rtiReceipt.statutory_deadline
                        ? new Date(rtiReceipt.statutory_deadline).toLocaleDateString()
                        : "30 Days from Filing"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">
                      First Appeal Breach Trigger
                    </span>
                    <div className="font-mono text-muted-foreground mt-0.5">
                      Section 19(1) Auto-unlock
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-accent/20 space-y-1">
                  <span className="font-semibold text-[11px] text-muted-foreground">
                    Questions / Information Requested:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-foreground/90 text-xs">
                    {rtiReceipt.queries?.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      downloadJSON(
                        rtiReceipt,
                        `RTI_Application_Receipt_${(
                          rtiReceipt.rti_number || "RTI"
                        ).replace(/[\/\\:]/g, "_")}.json`
                      );
                      toast.success("RTI Receipt re-downloaded!");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download RTI Receipt
                  </button>
                  <button
                    onClick={() => setRtiReceipt(null)}
                    className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
