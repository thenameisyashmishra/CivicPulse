/*
 * Projects — CivicPulse
 * Full project listing with filtering, expandable details, and project creation.
 * Data loaded live from GET /api/projects with real-time mutation support.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchProjects,
  createProject,
  getSavedUser,
  formatCurrency,
  statusColors,
  type Project,
} from "@/lib/data";
import {
  ChevronRight,
  MapPin,
  Building2,
  Calendar,
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  FolderPlus,
  Compass,
  Layers,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

const PROJECT_CATEGORIES = [
  "Road",
  "Sanitation",
  "Water Supply",
  "School",
  "Bridge",
  "Solar",
] as const;

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: loading, error: errObj } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });
  const error = errObj instanceof Error ? errObj.message : errObj ? String(errObj) : null;

  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Role check: Only admin, engineer, pradhan can create projects
  const user = getSavedUser();
  const canCreate = Boolean(
    user && ["admin", "engineer", "pradhan"].includes(user.role?.toLowerCase() || "")
  );

  // Default dates
  const today = new Date().toISOString().split("T")[0];
  const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const initialFormState = {
    id: "",
    name: "",
    type: "Road",
    location: "",
    contractor: "",
    budget: "",
    lat: "26.8467",
    lng: "80.9462",
    startDate: today,
    endDate: sixMonthsLater,
  };

  const [formData, setFormData] = useState(initialFormState);

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const handleOpenCreateModal = () => {
    // Suggest next project ID based on current list length
    const nextNum = projects.length + 1;
    const suggestedId = `PW-2024-${String(nextNum).padStart(3, "0")}`;
    setFormData({
      ...initialFormState,
      id: suggestedId,
    });
    setShowCreateModal(true);
  };

  // Mutation for creating a new project
  const createMutation = useMutation({
    mutationFn: (newProject: Partial<Project>) => createProject(newProject),
    onSuccess: (created) => {
      toast.success(`Project ${created.id} ("${created.name}") created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const id = formData.id.trim();
    const name = formData.name.trim();
    const type = formData.type.trim();
    const location = formData.location.trim();
    const contractor = formData.contractor.trim();
    const budgetNum = parseFloat(formData.budget);
    const latNum = parseFloat(formData.lat);
    const lngNum = parseFloat(formData.lng);

    if (!id) {
      toast.error("Please provide a Project ID (e.g. PW-2024-008)");
      return;
    }
    if (!name) {
      toast.error("Please provide a Project Name");
      return;
    }
    if (!type) {
      toast.error("Please select a project category");
      return;
    }
    if (!location) {
      toast.error("Please enter project location / Gram Panchayat");
      return;
    }
    if (!contractor) {
      toast.error("Please enter contractor name");
      return;
    }
    if (isNaN(budgetNum) || budgetNum <= 0) {
      toast.error("Please enter a valid positive budget amount in ₹");
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Please enter valid latitude and longitude coordinates");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please set project start and end dates");
      return;
    }

    createMutation.mutate({
      id,
      name,
      type,
      location,
      contractor,
      budget: budgetNum,
      spent: 0,
      progress: 0,
      status: "active",
      startDate: formData.startDate,
      endDate: formData.endDate,
      lat: latNum,
      lng: lngNum,
    });
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          }));
          toast.success("GPS coordinates updated from browser location");
        },
        () => {
          toast.error("Unable to retrieve location. Using default coordinates.");
        }
      );
    } else {
      toast.error("Geolocation not supported by this browser.");
    }
  };

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              PROJECT REGISTRY
            </h1>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {loading
                ? "Loading from API…"
                : error
                ? `⚠ ${error}`
                : `${projects.length} projects registered · ${projects.filter((p) => p.status === "active").length} active`}
            </p>
          </div>

          {/* Create Project Button (restricted to admin, engineer, pradhan) */}
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/40 text-primary text-xs hover:bg-primary/20 hover:border-primary/60 transition-all font-semibold cursor-pointer shadow-sm"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <Plus size={14} />
              CREATE PROJECT
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "completed", "delayed", "flagged"].map((f) => (
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
                {f === "all" ? projects.length : projects.filter((p) => p.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading / Error / Project Cards */}
        {loading ? (
          <div className="text-xs text-muted-foreground py-8" style={{ fontFamily: "var(--font-mono)" }}>
            Fetching projects from CivicPulse API…
          </div>
        ) : error ? (
          <div
            className="p-4 text-xs border"
            style={{
              background: "rgba(255,71,87,0.08)",
              borderColor: "rgba(255,71,87,0.3)",
              color: "#FF4757",
              fontFamily: "var(--font-mono)",
            }}
          >
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                expanded={expandedId === project.id}
                onToggle={() => setExpandedId(expandedId === project.id ? null : project.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground py-4" style={{ fontFamily: "var(--font-mono)" }}>
                No projects match this filter.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create Project Modal Dialog ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-150">
          <div
            className="cyber-card w-full max-w-2xl bg-card border border-border shadow-2xl relative my-8 overflow-hidden"
            style={{ borderLeftWidth: 3, borderLeftColor: "#00D4FF" }}
          >
            {/* Top Accent Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/50 to-transparent" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xs bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <FolderPlus size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    CREATE NEW PROJECT
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Register a civic infrastructure initiative in the CivicPulse ledger.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-xs hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <Layers size={11} className="text-primary" />
                    Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PW-2024-008"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Unique identifier format: PW-YYYY-XXX
                  </span>
                </div>

                {/* Category / Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <Layers size={11} className="text-primary" />
                    Category / Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Name (Full width on md) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rampur Primary Health Centre Solar Installation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <MapPin size={11} className="text-primary" />
                    Location / Panchayat
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gram Panchayat Rampur, Sector 4"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                </div>

                {/* Contractor */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <Building2 size={11} className="text-primary" />
                    Contractor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Urja Tech Infrastructure Ltd"
                    value={formData.contractor}
                    onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                </div>

                {/* Budget */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                      <Banknote size={11} className="text-primary" />
                      Sanctioned Budget (INR ₹)
                    </label>
                    {formData.budget && !isNaN(parseFloat(formData.budget)) && (
                      <span className="text-[10px] text-primary font-mono font-medium">
                        Preview: {formatCurrency(parseFloat(formData.budget))}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 2500000 (₹25 Lakhs)"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>

                {/* Coordinates (Latitude & Longitude) */}
                <div className="space-y-1.5 md:col-span-2 p-3 bg-background/50 border border-border/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                      <Compass size={11} className="text-primary" />
                      Geofence GPS Coordinates
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <MapPin size={10} /> Auto-Detect Coordinates
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-muted-foreground block mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                        LATITUDE
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="26.8467"
                        value={formData.lat}
                        onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                        LONGITUDE
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="80.9462"
                        value={formData.lng}
                        onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <Calendar size={11} className="text-primary" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <Calendar size={11} className="text-primary" />
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-muted/40 border border-border text-muted-foreground text-xs hover:text-foreground hover:bg-muted/70 transition-colors font-medium cursor-pointer"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-primary/20 border border-primary/50 text-primary text-xs hover:bg-primary/30 hover:border-primary/70 transition-all font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      REGISTERING PROJECT...
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      CREATE PROJECT
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ProjectCard({ project, expanded, onToggle }: { project: Project; expanded: boolean; onToggle: () => void }) {
  const color = statusColors[project.status];
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const isOverBudget = project.spent > project.budget;

  return (
    <div className="cyber-card cyber-card-hover relative overflow-hidden shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-accent/30 transition-colors" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{project.id}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Building2 size={10} />{project.contractor}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin size={10} />{project.location}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ImageIcon size={10} />{project.verifiedCount}/{project.imageCount} verified
            </span>
          </div>
        </div>

        {/* Progress + Budget */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block" style={{ fontFamily: "var(--font-mono)" }}>PROGRESS</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-1.5 bg-muted">
                <div className="h-full" style={{ width: `${project.progress}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{project.progress}%</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block" style={{ fontFamily: "var(--font-mono)" }}>BUDGET</span>
            <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)", color: isOverBudget ? "#FF4757" : undefined }}>
              {formatCurrency(project.spent)}{" "}
              <span className="text-muted-foreground">/ {formatCurrency(project.budget)}</span>
            </span>
            {isOverBudget && (
              <span className="text-[10px] text-destructive block" style={{ fontFamily: "var(--font-mono)" }}>
                +{budgetPct - 100}% OVER
              </span>
            )}
          </div>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-background/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>Timeline</span>
              <span className="text-xs text-foreground flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                <Calendar size={10} />{project.startDate} — {project.endDate}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>Last Update</span>
              <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{project.lastUpdate}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>Category</span>
              <span className="text-xs text-foreground">{project.type}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block mb-1" style={{ fontFamily: "var(--font-mono)" }}>Verification Rate</span>
              <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {project.imageCount > 0 ? Math.round((project.verifiedCount / project.imageCount) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
