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
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/data";

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
          fetch("/api/transparency/public/projects").then((r) => r.json()),
          fetch("/api/transparency/budget-variance").then((r) => r.json()),
          fetch("/api/transparency/cpgrams/list").then((r) => r.json()),
          fetch("/api/transparency/rti/requests").then((r) => r.json()),
          fetch("/api/transparency/social-audit").then((r) => r.json()),
          fetch("/api/transparency/laq/list").then((r) => r.json()),
          fetch("/api/transparency/heatmap/districts").then((r) => r.json()),
          fetch("/api/transparency/pre-construction").then((r) => r.json()),
        ]);

      setProjects(projRes.projects || []);
      setVarianceData(varRes);
      setCpgramsList(cpgRes || []);
      setRtiList(rtiRes || []);
      setSocialAudits(saRes || []);
      setLaqList(laqRes || []);
      setHeatmapData(hmRes || []);
      setPreConstruction(pcRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadOCDS = async () => {
    try {
      const res = await fetch("/api/transparency/ocds/releases");
      const data = await res.json();
      setOcdsData(data);
    } catch (e: any) {
      toast.error("Failed to load OCDS data");
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
      if (!res.ok) throw new Error("Failed to submit rating");
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
      setGeneratedApiKey(data.api_key);
      toast.success("API key generated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Open Contracting Data Standard (OCDS 1.1) API</h3>
                <p className="text-xs text-muted-foreground">
                  Conforms with Open Contracting Partnership standards for global civic-tech interoperability.
                </p>
              </div>
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
            </div>

            <pre className="p-4 rounded-xl border border-border bg-background text-xs font-mono max-h-[500px] overflow-y-auto text-muted-foreground">
              {JSON.stringify(ocdsData, null, 2) || "Loading OCDS schema..."}
            </pre>
          </div>
        )}

        {/* Tab 3: Budget-vs-Spend Variance */}
        {activeTab === "budget_variance" && varianceData && (
          <div className="space-y-4">
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
          <div className="grid md:grid-cols-2 gap-6">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          <div className="grid md:grid-cols-2 gap-6">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          <div className="grid md:grid-cols-2 gap-6">
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
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="font-bold text-emerald-400">Save Your Secret API Key:</div>
                  <div className="font-mono text-xs font-black text-foreground mt-1 break-all">
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
          <div className="space-y-4">
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
      </div>
    </DashboardLayout>
  );
}
