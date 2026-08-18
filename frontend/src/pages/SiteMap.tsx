/*
 * Site Map — CivicPulse
 * Geo-plot of all registered project sites.
 * Data loaded live from GET /api/projects.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { fetchProjects, statusColors, formatCurrency, type Project } from "@/lib/data";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Compass, Building2, Calendar } from "lucide-react";

const VIEW_W = 800;
const VIEW_H = 520;
const PAD = 48;

export default function SiteMap() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((ps) => {
        setProjects(ps);
        if (ps.length > 0) setSelectedId(ps[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const selected = projects.find((p) => p.id === selectedId);

  // Compute lat/lng bounding box across all loaded projects
  const bounds = useMemo(() => {
    if (projects.length === 0) return { minLat: 28.4, maxLat: 28.8, minLng: 76.9, maxLng: 77.4 };
    const lats = projects.map((p) => p.lat);
    const lngs = projects.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latPad = (maxLat - minLat || 0.05) * 0.25;
    const lngPad = (maxLng - minLng || 0.05) * 0.25;
    return { minLat: minLat - latPad, maxLat: maxLat + latPad, minLng: minLng - lngPad, maxLng: maxLng + lngPad };
  }, [projects]);

  const project = (lat: number, lng: number) => {
    const x = PAD + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (VIEW_W - PAD * 2);
    const y = PAD + (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (VIEW_H - PAD * 2);
    return { x, y };
  };

  const gridLines = 10;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              SITE MAP
            </h1>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {loading
                ? "Loading from API…"
                : error
                ? `⚠ ${error}`
                : `Geotagged project locations · ${projects.length} active sites across Delhi NCR`}
            </p>
          </div>
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
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground py-8" style={{ fontFamily: "var(--font-mono)" }}>
            Fetching from CivicPulse API…
          </div>
        ) : error ? (
          <div className="p-4 text-xs border" style={{ background: "rgba(255,71,87,0.08)", borderColor: "rgba(255,71,87,0.3)", color: "#FF4757", fontFamily: "var(--font-mono)" }}>
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map panel */}
            <div className="lg:col-span-2 bg-card border border-border">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  <Compass size={12} />
                  GEOSPATIAL OVERVIEW
                </span>
                <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono)" }}>GPS/EXIF VERIFIED</span>
              </div>
              <div className="p-4">
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto select-none" role="img" aria-label="Map of project sites">
                  <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="var(--color-background)" />

                  {/* Grid backdrop */}
                  {Array.from({ length: gridLines + 1 }).map((_, i) => {
                    const x = PAD + (i * (VIEW_W - PAD * 2)) / gridLines;
                    return <line key={`v${i}`} x1={x} y1={PAD} x2={x} y2={VIEW_H - PAD} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />;
                  })}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const y = PAD + (i * (VIEW_H - PAD * 2)) / 6;
                    return <line key={`h${i}`} x1={PAD} y1={y} x2={VIEW_W - PAD} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />;
                  })}

                  {/* Frame */}
                  <rect x={PAD} y={PAD} width={VIEW_W - PAD * 2} height={VIEW_H - PAD * 2} fill="none" stroke="var(--color-border)" strokeWidth={1.5} />

                  {/* Compass */}
                  <g transform={`translate(${VIEW_W - PAD - 22}, ${PAD + 24})`} opacity={0.7}>
                    <line x1={0} y1={10} x2={0} y2={-12} stroke="oklch(0.82 0.18 200)" strokeWidth={1.5} />
                    <path d="M -4 -6 L 0 -14 L 4 -6 Z" fill="oklch(0.82 0.18 200)" />
                    <text x={0} y={22} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)" fontFamily="JetBrains Mono">N</text>
                  </g>

                  <text x={PAD} y={VIEW_H - PAD + 20} fontSize={9} fill="var(--color-muted-foreground)" fontFamily="JetBrains Mono">
                    DELHI NCR · LIVE DATA · {projects.length} SITES
                  </text>

                  {/* Project pins */}
                  {filtered.map((p) => {
                    const { x, y } = project(p.lat, p.lng);
                    const isSelected = p.id === selectedId;
                    const color = statusColors[p.status];
                    return (
                      <g key={p.id} transform={`translate(${x}, ${y})`} className="cursor-pointer" onClick={() => setSelectedId(p.id)}>
                        {isSelected && <circle r={14} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />}
                        <circle r={isSelected ? 7 : 5.5} fill={color} opacity={0.25} />
                        <circle r={isSelected ? 4.5 : 3.5} fill={color} />
                        <text
                          x={0} y={isSelected ? -20 : -14}
                          textAnchor="middle"
                          fontSize={isSelected ? 10 : 9}
                          fill={isSelected ? "var(--color-foreground)" : "var(--color-muted-foreground)"}
                          fontFamily="JetBrains Mono"
                        >
                          {p.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="px-5 py-3 border-t border-border flex items-center gap-5">
                {(Object.keys(statusColors) as Array<Project["status"]>).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[s] }} />
                    <span className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="bg-card border border-border">
              <div className="px-5 py-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>SITE DETAILS</span>
              </div>
              {selected ? (
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[selected.status] }} />
                      <span className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)", color: statusColors[selected.status] }}>
                        {selected.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mt-1.5">{selected.name}</h3>
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{selected.id}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={12} className="shrink-0" /><span>{selected.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 size={12} className="shrink-0" /><span>{selected.contractor}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={12} className="shrink-0" />
                      <span style={{ fontFamily: "var(--font-mono)" }}>{selected.startDate} — {selected.endDate}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <Row label="GPS COORDINATES" value={`${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`} />
                    <Row label="BUDGET" value={`${formatCurrency(selected.spent)} / ${formatCurrency(selected.budget)}`} />
                    <Row label="PROGRESS" value={`${selected.progress}%`} />
                    <Row label="EVIDENCE" value={`${selected.verifiedCount}/${selected.imageCount} verified`} />
                  </div>

                  <div>
                    <div className="w-full h-1.5 bg-muted">
                      <div className="h-full" style={{ width: `${selected.progress}%`, backgroundColor: statusColors[selected.status] }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-xs text-muted-foreground">Select a pin to view site details.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground uppercase" style={{ fontFamily: "var(--font-mono)" }}>{label}</span>
      <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}
