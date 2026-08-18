/*
 * Projects — CivicPulse
 * Full project listing with filtering and expandable details.
 * Data loaded live from GET /api/projects.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchProjects, formatCurrency, statusColors, type Project } from "@/lib/data";
import { ChevronRight, MapPin, Building2, Calendar, Image } from "lucide-react";

export default function Projects() {
  const { data: projects = [], isLoading: loading, error: errObj } = useQuery<Project[]>( {
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });
  const error = errObj instanceof Error ? errObj.message : errObj ? String(errObj) : null;
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <Image size={10} />{project.verifiedCount}/{project.imageCount} verified
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
