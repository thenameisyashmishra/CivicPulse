/*
 * Site Map — CivicPulse
 * Interactive Geospatial Intelligence Map with OpenStreetMap / Satellite Slippy Tiles,
 * 500m Geofence Radius Visualization, Status-Coded Pins, Tactical HUD & Marker Inspector.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchProjects,
  uploadEvidence,
  statusColors,
  formatCurrency,
  type Project,
  type ProjectStatus,
} from "@/lib/data";
import {
  TILE_PROVIDERS,
  type MapTileLayer,
  latLngToScreen,
  screenToLatLng,
  getGeofenceRadiusPixels,
  calculateScaleBar,
  getVisibleTiles,
  fitBoundsToPoints,
} from "@/lib/mapUtils";
import {
  MapPin,
  Compass,
  Building2,
  Calendar,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  Crosshair,
  ShieldCheck,
  Upload,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
  Copy,
  Check,
  Search,
  X,
  Radio,
  Grid3X3,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// Default coordinates centered on Delhi NCR
const DEFAULT_CENTER_LAT = 28.6139;
const DEFAULT_CENTER_LNG = 77.209;
const DEFAULT_ZOOM = 12;

export default function SiteMap() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Load live projects from CivicPulse API
  const {
    data: projects = [],
    isLoading: loading,
    error: errObj,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });
  const error = errObj instanceof Error ? errObj.message : errObj ? String(errObj) : null;

  // UI state
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Map settings
  const [tileLayer, setTileLayer] = useState<MapTileLayer>("dark");
  const [showGeofences, setShowGeofences] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Viewport & Pan/Zoom state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 900, height: 580 });
  const [centerLat, setCenterLat] = useState(DEFAULT_CENTER_LAT);
  const [centerLng, setCenterLng] = useState(DEFAULT_CENTER_LNG);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Mouse HUD position readout
  const [cursorLatLng, setCursorLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; centerLat: number; centerLng: number }>({
    x: 0,
    y: 0,
    centerLat: DEFAULT_CENTER_LAT,
    centerLng: DEFAULT_CENTER_LNG,
  });

  // Touch pinch-to-zoom state
  const touchDistanceRef = useRef<number | null>(null);

  // Upload Evidence Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Measure map container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setViewSize({
          width: Math.max(300, Math.floor(rect.width)),
          height: Math.max(400, Math.floor(rect.height)),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isFullscreen]);

  // Set initial selected project once data loads
  useEffect(() => {
    if (projects.length > 0 && !selectedId) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  // Filter projects by status & search
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchFilter = filter === "all" || p.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [projects, filter, searchQuery]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedId) || null;
  }, [projects, selectedId]);

  // Auto-fit all project markers on initial data load
  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    if (projects.length > 0 && !hasAutoFittedRef.current && viewSize.width > 300) {
      hasAutoFittedRef.current = true;
      const fit = fitBoundsToPoints(projects, viewSize.width, viewSize.height, 100);
      setCenterLat(fit.centerLat);
      setCenterLng(fit.centerLng);
      setZoom(fit.zoom);
    }
  }, [projects, viewSize]);

  // Action: Fit bounds to currently filtered markers
  const handleFitBounds = useCallback(() => {
    const targets = filteredProjects.length > 0 ? filteredProjects : projects;
    if (targets.length === 0) return;
    const fit = fitBoundsToPoints(targets, viewSize.width, viewSize.height, 90);
    setCenterLat(fit.centerLat);
    setCenterLng(fit.centerLng);
    setZoom(fit.zoom);
    toast.info(`Framed ${targets.length} project sites on map`);
  }, [filteredProjects, projects, viewSize]);

  // Action: Center on specific project
  const handleFocusProject = useCallback(
    (project: Project) => {
      setSelectedId(project.id);
      setIsInspectorOpen(true);
      setCenterLat(project.lat);
      setCenterLng(project.lng);
      setZoom((prev) => Math.max(prev, 14.5));
    },
    []
  );

  // Action: Reset view to Delhi NCR
  const handleRecenterNCR = useCallback(() => {
    setCenterLat(DEFAULT_CENTER_LAT);
    setCenterLng(DEFAULT_CENTER_LNG);
    setZoom(DEFAULT_ZOOM);
    toast.info("Map recentered to Delhi NCR");
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(18.5, Math.round((z + 0.8) * 10) / 10));
  const handleZoomOut = () => setZoom((z) => Math.max(6, Math.round((z - 0.8) * 10) / 10));

  // Pointer drag panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag with left mouse or single touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Don't drag if clicking buttons or marker elements
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".interactive-marker") || target.closest(".interactive-panel")) {
      return;
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat,
      centerLng,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Update cursor Lat/Lng readout
    const pos = screenToLatLng(screenX, screenY, centerLat, centerLng, zoom, viewSize.width, viewSize.height);
    setCursorLatLng(pos);

    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Convert pixel delta to lat/lng shift
    const startCenterScreen = { x: viewSize.width / 2, y: viewSize.height / 2 };
    const shiftedScreen = { x: startCenterScreen.x - dx, y: startCenterScreen.y - dy };
    const newCenter = screenToLatLng(
      shiftedScreen.x,
      shiftedScreen.y,
      dragStartRef.current.centerLat,
      dragStartRef.current.centerLng,
      zoom,
      viewSize.width,
      viewSize.height
    );

    setCenterLat(newCenter.lat);
    setCenterLng(newCenter.lng);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture release safety
      }
    }
  };

  // Mouse wheel zoom centered on cursor location
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Lat/Lng under mouse cursor before zoom
    const cursorGeo = screenToLatLng(
      cursorX,
      cursorY,
      centerLat,
      centerLng,
      zoom,
      viewSize.width,
      viewSize.height
    );

    const zoomDelta = -e.deltaY * 0.0015;
    const newZoom = Math.max(5.5, Math.min(18.5, zoom + zoomDelta));

    // Recompute center so cursor remains over same geographic point
    const newCenter = screenToLatLng(
      viewSize.width / 2 + (viewSize.width / 2 - cursorX),
      viewSize.height / 2 + (viewSize.height / 2 - cursorY),
      cursorGeo.lat,
      cursorGeo.lng,
      newZoom,
      viewSize.width,
      viewSize.height
    );

    setZoom(newZoom);
    setCenterLat(newCenter.lat);
    setCenterLng(newCenter.lng);
  };

  // Double click to zoom in
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".interactive-marker")) return;

    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickGeo = screenToLatLng(
      clickX,
      clickY,
      centerLat,
      centerLng,
      zoom,
      viewSize.width,
      viewSize.height
    );

    setCenterLat(clickGeo.lat);
    setCenterLng(clickGeo.lng);
    setZoom((z) => Math.min(18.5, z + 1.2));
  };

  // Touch gesture support (pinch-to-zoom)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (touchDistanceRef.current !== null) {
        const delta = (distance - touchDistanceRef.current) * 0.01;
        setZoom((z) => Math.max(5.5, Math.min(18.5, z + delta)));
      }
      touchDistanceRef.current = distance;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Compute visible slippy tiles
  const visibleTiles = useMemo(() => {
    return getVisibleTiles(centerLat, centerLng, zoom, viewSize.width, viewSize.height);
  }, [centerLat, centerLng, zoom, viewSize]);

  // Current tile provider
  const activeTileConfig = TILE_PROVIDERS[tileLayer];

  // Dynamic scale bar
  const scaleBar = useMemo(() => {
    return calculateScaleBar(centerLat, zoom);
  }, [centerLat, zoom]);

  // Copy coordinates to clipboard
  const handleCopyCoordinates = (lat: number, lng: number) => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    toast.success(`Copied GPS coordinates: ${text}`);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Open upload modal for a project
  const handleOpenUpload = (projectId: string) => {
    setUploadProjectId(projectId);
    setUploadFile(null);
    setUploadCaption("");
    setPreviewUrl(null);
    setShowUploadModal(true);
  };

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: ({ projectId, file, caption }: { projectId: string; file: File; caption: string }) =>
      uploadEvidence(projectId, file, caption),
    onSuccess: (newEvidence) => {
      toast.success(`Evidence verified! Status: ${newEvidence.status.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      setShowUploadModal(false);
      setUploadFile(null);
      setPreviewUrl(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Evidence upload failed");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProjectId) {
      toast.error("Please select a target project");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select an on-site image to upload");
      return;
    }
    uploadMutation.mutate({
      projectId: uploadProjectId,
      file: uploadFile,
      caption: uploadCaption,
    });
  };

  return (
    <DashboardLayout>
      <div className={`p-4 md:p-6 space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 overflow-hidden" : ""}`}>
        {/* Top Header & Tactical Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
                GEOSPATIAL SITE MAP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-primary/10 border border-primary/30 text-primary uppercase">
                500M GEOFENCE LOCK
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2" style={{ fontFamily: "var(--font-mono)" }}>
              {loading ? (
                <span>Loading active telemetry from CivicPulse API…</span>
              ) : error ? (
                <span className="text-destructive">⚠ {error}</span>
              ) : (
                <>
                  <span>DELHI NCR SECTOR · {projects.length} MONITORED SITES</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-400">{projects.filter((p) => p.status === "active").length} ACTIVE PERIMETERS</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Filter Status Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "completed", "delayed", "flagged"] as const).map((statusKey) => {
              const count = statusKey === "all" ? projects.length : projects.filter((p) => p.status === statusKey).length;
              const isSelected = filter === statusKey;
              const color = statusKey === "all" ? "oklch(0.84 0.15 195)" : statusColors[statusKey as ProjectStatus];

              return (
                <button
                  key={statusKey}
                  onClick={() => setFilter(statusKey)}
                  className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary/20 border-2 font-semibold shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                  style={{
                    borderColor: isSelected ? color : undefined,
                    color: isSelected ? color : undefined,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: color }}
                  />
                  <span>{statusKey.toUpperCase()}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}

            <button
              onClick={() => refetch()}
              className="p-1.5 bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Refresh project telemetry"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
            </button>
          </div>
        </div>

        {/* Search Bar & Fast Nav Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 p-2.5 rounded-lg border border-border/80">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search site, contractor, or project ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background/80 border border-border pl-8 pr-7 py-1.5 text-xs rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              <Compass size={13} className="text-primary" />
              <span>Visible Sites: <strong className="text-foreground">{filteredProjects.length}</strong></span>
            </div>

            {/* Quick jump dropdown */}
            <select
              value={selectedId || ""}
              onChange={(e) => {
                const proj = projects.find((p) => p.id === e.target.value);
                if (proj) handleFocusProject(proj);
              }}
              className="bg-background border border-border text-xs px-2.5 py-1.5 rounded text-foreground focus:outline-none focus:border-primary font-mono max-w-[200px] truncate"
            >
              <option value="" disabled>Jump to Site Marker…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name.slice(0, 22)}…
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Map & Inspector Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative min-h-[580px]">
          {/* Map Viewport Area */}
          <div
            className={`${
              isInspectorOpen ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"
            } bg-card border border-border rounded-lg relative overflow-hidden flex flex-col transition-all duration-300 shadow-lg`}
            style={{ height: isFullscreen ? "calc(100vh - 170px)" : "600px" }}
          >
            {/* Interactive Map Viewport */}
            <div
              ref={mapContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden bg-slate-950"
              style={{ touchAction: "none" }}
            >
              {/* Tile Layer Canvas */}
              <div className="absolute inset-0 pointer-events-none">
                {visibleTiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={activeTileConfig.getUrl(tile.z, tile.x, tile.y)}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="absolute select-none pointer-events-none"
                    style={{
                      left: `${tile.screenLeft}px`,
                      top: `${tile.screenTop}px`,
                      width: `${tile.size}px`,
                      height: `${tile.size}px`,
                      filter: tileLayer === "osm" ? "brightness(0.85) contrast(1.1) invert(0.05)" : undefined,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                ))}
              </div>

              {/* Cyber Tactical Grid Overlay (Togglable) */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="cyber-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="oklch(0.84 0.15 195)" strokeWidth="0.5" opacity="0.4" />
                        <circle cx="0" cy="0" r="1.5" fill="oklch(0.84 0.15 195)" opacity="0.7" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cyber-grid)" />

                    {/* Central Tactical Reticle */}
                    <g transform={`translate(${viewSize.width / 2}, ${viewSize.height / 2})`} opacity="0.6">
                      <circle r="36" fill="none" stroke="oklch(0.84 0.15 195)" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="-50" y1="0" x2="50" y2="0" stroke="oklch(0.84 0.15 195)" strokeWidth="1" strokeDasharray="6 6" />
                      <line x1="0" y1="-50" x2="0" y2="50" stroke="oklch(0.84 0.15 195)" strokeWidth="1" strokeDasharray="6 6" />
                    </g>
                  </svg>
                </div>
              )}

              {/* SVG Layer: 500m Geofence Circles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  {/* Glowing filter for geofences */}
                  <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {showGeofences &&
                  filteredProjects.map((p) => {
                    const screenPos = latLngToScreen(
                      p.lat,
                      p.lng,
                      centerLat,
                      centerLng,
                      zoom,
                      viewSize.width,
                      viewSize.height
                    );
                    const radiusPx = getGeofenceRadiusPixels(p.lat, zoom, 500);
                    const isSelected = p.id === selectedId;
                    const isHovered = p.id === hoveredId;
                    const color = statusColors[p.status];

                    // Cull if completely off-screen
                    if (
                      screenPos.x + radiusPx < -50 ||
                      screenPos.x - radiusPx > viewSize.width + 50 ||
                      screenPos.y + radiusPx < -50 ||
                      screenPos.y - radiusPx > viewSize.height + 50
                    ) {
                      return null;
                    }

                    return (
                      <g key={`geofence-${p.id}`} className="transition-opacity duration-300">
                        {/* 500m Geofence Filled Radius */}
                        <circle
                          cx={screenPos.x}
                          cy={screenPos.y}
                          r={radiusPx}
                          fill={color}
                          fillOpacity={isSelected ? 0.22 : isHovered ? 0.16 : 0.08}
                          stroke={color}
                          strokeWidth={isSelected ? 2 : 1.2}
                          strokeDasharray={isSelected ? "none" : "5 4"}
                          filter={isSelected ? "url(#neon-glow)" : undefined}
                        />

                        {/* Animated radar scan pulse on active / selected projects */}
                        {(isSelected || p.status === "active" || p.status === "flagged") && (
                          <circle
                            cx={screenPos.x}
                            cy={screenPos.y}
                            r={radiusPx}
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            className="animate-ping"
                            style={{
                              transformOrigin: `${screenPos.x}px ${screenPos.y}px`,
                              animationDuration: isSelected ? "3s" : "4.5s",
                              opacity: 0.35,
                            }}
                          />
                        )}

                        {/* 500m Perimeter Label on Selected or High Zoom */}
                        {(isSelected || zoom >= 14) && radiusPx > 35 && (
                          <text
                            x={screenPos.x}
                            y={screenPos.y + radiusPx + 14}
                            textAnchor="middle"
                            fill={color}
                            fontSize={10}
                            fontFamily="JetBrains Mono"
                            fontWeight="600"
                            className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                          >
                            500m GEOFENCE PERIMETER
                          </text>
                        )}
                      </g>
                    );
                  })}
              </svg>

              {/* HTML Marker Layer: Interactive Pins */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {filteredProjects.map((p) => {
                  const screenPos = latLngToScreen(
                    p.lat,
                    p.lng,
                    centerLat,
                    centerLng,
                    zoom,
                    viewSize.width,
                    viewSize.height
                  );
                  const isSelected = p.id === selectedId;
                  const isHovered = p.id === hoveredId;
                  const color = statusColors[p.status];

                  // Cull offscreen pins
                  if (
                    screenPos.x < -60 ||
                    screenPos.x > viewSize.width + 60 ||
                    screenPos.y < -60 ||
                    screenPos.y > viewSize.height + 60
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={`marker-${p.id}`}
                      className="interactive-marker absolute pointer-events-auto cursor-pointer transition-transform duration-200"
                      style={{
                        left: `${screenPos.x}px`,
                        top: `${screenPos.y}px`,
                        transform: `translate(-50%, -100%) scale(${isSelected ? 1.15 : isHovered ? 1.1 : 1})`,
                        zIndex: isSelected ? 40 : isHovered ? 30 : 20,
                      }}
                      onClick={() => {
                        setSelectedId(p.id);
                        setIsInspectorOpen(true);
                      }}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Floating Project Tag Pill */}
                      <div
                        className={`px-2 py-0.5 mb-1 rounded text-[10px] font-mono whitespace-nowrap flex items-center gap-1.5 shadow-lg border transition-all ${
                          isSelected
                            ? "bg-slate-900/95 border-primary text-primary font-bold shadow-[0_0_12px_rgba(0,212,255,0.4)]"
                            : "bg-slate-900/85 border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{p.id}</span>
                        <span className="text-[9px] text-muted-foreground">({p.progress}%)</span>
                      </div>

                      {/* Tactical Marker Pin */}
                      <div className="relative flex items-center justify-center">
                        {/* Selected Radar Ring */}
                        {isSelected && (
                          <div
                            className="absolute -inset-3 rounded-full border border-dashed animate-spin"
                            style={{
                              borderColor: color,
                              animationDuration: "8s",
                              boxShadow: `0 0 16px ${color}66`,
                            }}
                          />
                        )}

                        {/* Pin Body */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors relative"
                          style={{
                            backgroundColor: "oklch(0.12 0.015 255)",
                            borderColor: color,
                            boxShadow: `0 0 14px ${color}88`,
                          }}
                        >
                          {p.status === "completed" ? (
                            <CheckCircle2 size={16} style={{ color }} />
                          ) : p.status === "flagged" ? (
                            <AlertTriangle size={16} style={{ color }} />
                          ) : p.status === "delayed" ? (
                            <Clock size={16} style={{ color }} />
                          ) : (
                            <Radio size={16} style={{ color }} className="animate-pulse" />
                          )}
                        </div>

                        {/* Pin Pointer Arrow Needle */}
                        <div
                          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mx-auto absolute -bottom-1.5"
                          style={{ borderTopColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Floating Top-Right Map Controls Toolbar */}
              <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 pointer-events-auto interactive-panel">
                {/* Layer Selector Switcher */}
                <div className="relative">
                  <button
                    onClick={() => setShowLayerMenu(!showLayerMenu)}
                    className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-border hover:border-primary text-foreground rounded shadow-md flex items-center gap-1.5 text-xs font-mono transition-all backdrop-blur-md"
                    title="Change Base Map Style"
                  >
                    <Layers size={15} className="text-primary" />
                    <span className="hidden sm:inline">{activeTileConfig.name}</span>
                  </button>

                  {/* Dropdown Menu for Layers */}
                  {showLayerMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900/95 border border-border rounded-lg shadow-xl p-2 z-50 backdrop-blur-md space-y-1">
                      <div className="text-[10px] text-muted-foreground font-mono px-2 py-1 uppercase tracking-wider">
                        Tile Basemap Provider
                      </div>
                      {(Object.keys(TILE_PROVIDERS) as MapTileLayer[]).map((key) => {
                        const prov = TILE_PROVIDERS[key];
                        const isActive = tileLayer === key;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setTileLayer(key);
                              setShowLayerMenu(false);
                              toast.info(`Switched to ${prov.name} tiles`);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center justify-between transition-colors ${
                              isActive
                                ? "bg-primary/20 text-primary font-medium border border-primary/40"
                                : "text-foreground hover:bg-accent/50"
                            }`}
                          >
                            <div>
                              <div className="font-mono">{prov.name}</div>
                              <div className="text-[10px] text-muted-foreground">{prov.subname}</div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 font-mono text-muted-foreground">
                              {prov.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tactical Grid Toggle Button */}
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded border shadow-md flex items-center justify-center transition-all backdrop-blur-md ${
                    showGrid
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-slate-900/90 border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title={showGrid ? "Disable Satellite HUD Grid" : "Enable Satellite HUD Grid"}
                >
                  <Grid3X3 size={16} />
                </button>

                {/* Geofence Circles Toggle Button */}
                <button
                  onClick={() => setShowGeofences(!showGeofences)}
                  className={`p-2 rounded border shadow-md flex items-center justify-center transition-all backdrop-blur-md ${
                    showGeofences
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-slate-900/90 border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title={showGeofences ? "Hide 500m Geofence Rings" : "Show 500m Geofence Rings"}
                >
                  <ShieldCheck size={16} />
                </button>

                {/* Zoom In & Out */}
                <div className="flex flex-col bg-slate-900/90 border border-border rounded shadow-md overflow-hidden backdrop-blur-md">
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-slate-800 text-foreground transition-colors border-b border-border/60"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-slate-800 text-foreground transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={16} />
                  </button>
                </div>

                {/* Fit to Bounds Button */}
                <button
                  onClick={handleFitBounds}
                  className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-border hover:border-primary text-foreground rounded shadow-md transition-all backdrop-blur-md"
                  title="Fit All Monitored Sites in View"
                >
                  <Crosshair size={16} className="text-primary" />
                </button>

                {/* Delhi NCR Recenter Button */}
                <button
                  onClick={handleRecenterNCR}
                  className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-border hover:border-primary text-foreground rounded shadow-md transition-all backdrop-blur-md"
                  title="Recenter Map to Delhi NCR"
                >
                  <Navigation size={16} />
                </button>

                {/* Fullscreen Mode Toggle */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-border hover:border-primary text-foreground rounded shadow-md transition-all backdrop-blur-md"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>

              {/* Top-Left Tactical Compass & Telemetry HUD */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <div className="bg-slate-900/90 border border-border/80 rounded px-3 py-2 text-[11px] font-mono shadow-md backdrop-blur-md space-y-1">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Compass size={14} />
                    <span>GPS HUD · SECTOR MONITOR</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    CENTER: {centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E
                  </div>
                  {cursorLatLng && (
                    <div className="text-[10px] text-foreground/80">
                      CURSOR: {cursorLatLng.lat.toFixed(4)}° N, {cursorLatLng.lng.toFixed(4)}° E
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom HUD Bar: Scale Bar & Attribution */}
              <div className="absolute bottom-3 left-3 z-30 pointer-events-none flex items-end gap-3">
                {/* Distance Scale Bar */}
                <div className="bg-slate-900/90 border border-border/80 rounded px-2.5 py-1 text-[10px] font-mono shadow-md backdrop-blur-md">
                  <div className="text-muted-foreground mb-0.5">{scaleBar.label}</div>
                  <div
                    className="h-1 bg-primary rounded-full"
                    style={{ width: `${scaleBar.widthPx}px` }}
                  />
                </div>

                {/* Zoom Level Readout */}
                <div className="bg-slate-900/90 border border-border/80 rounded px-2.5 py-1 text-[10px] font-mono shadow-md backdrop-blur-md text-muted-foreground">
                  ZOOM: <strong className="text-foreground">{zoom.toFixed(1)}x</strong>
                </div>
              </div>

              {/* Bottom-Right Tile Attribution */}
              <div className="absolute bottom-1 right-2 z-20 pointer-events-none text-[9px] text-muted-foreground/60 font-mono">
                {activeTileConfig.attribution}
              </div>
            </div>

            {/* Bottom Status Legend Bar */}
            <div className="px-4 py-2.5 bg-card border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-muted-foreground text-[11px]">PIN STATUS:</span>
                {(Object.keys(statusColors) as ProjectStatus[]).map((st) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[st] }} />
                    <span className="text-[11px] text-muted-foreground uppercase">{st}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-primary" />
                  500m Verification Circle
                </span>
                {!isInspectorOpen && (
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Open Details</span>
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Marker Details Inspector Drawer */}
          {isInspectorOpen && (
            <div className="lg:col-span-4 xl:col-span-3 bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/80">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground tracking-wider font-mono">
                    SITE INSPECTOR
                  </span>
                </div>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent/50 transition-colors"
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedProject ? (
                <div className="p-4 space-y-4 flex-1 overflow-y-auto font-sans text-xs">
                  {/* Status Banner */}
                  <div
                    className="p-3 rounded-lg border flex items-center justify-between"
                    style={{
                      backgroundColor: `${statusColors[selectedProject.status]}12`,
                      borderColor: `${statusColors[selectedProject.status]}44`,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: statusColors[selectedProject.status] }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[selectedProject.status] }} />
                        {selectedProject.status} STATUS
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        ID: {selectedProject.id}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-background/80 border border-border">
                      {selectedProject.type}
                    </span>
                  </div>

                  {/* Project Title & Location */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug">
                      {selectedProject.name}
                    </h3>
                    <div className="space-y-1.5 mt-2.5 text-muted-foreground text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="shrink-0 text-primary" />
                        <span className="text-foreground">{selectedProject.contractor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="shrink-0 text-primary" />
                        <span>{selectedProject.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="shrink-0 text-primary" />
                        <span className="font-mono">
                          {selectedProject.startDate} — {selectedProject.endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 500m Geofence Telemetry Card */}
                  <div className="p-3 bg-slate-900/60 border border-border/80 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="flex items-center gap-1.5 text-primary font-medium">
                        <ShieldCheck size={13} />
                        500M GEOFENCE LOCK
                      </span>
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Perimeter verified via GPS/EXIF triangulation. Photos submitted within 500m radius qualify for automated AI audit.
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px] font-mono">
                      <span className="text-muted-foreground">COORDINATES:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-foreground">
                          {selectedProject.lat.toFixed(4)}°, {selectedProject.lng.toFixed(4)}°
                        </span>
                        <button
                          onClick={() => handleCopyCoordinates(selectedProject.lat, selectedProject.lng)}
                          className="text-primary hover:text-primary/80 p-0.5 rounded"
                          title="Copy GPS coordinates"
                        >
                          {copiedCoords ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Spent vs Budget Visual Bar */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground uppercase">BUDGET ALLOCATION</span>
                      <span
                        className="font-bold"
                        style={{
                          color: selectedProject.spent > selectedProject.budget ? "#FF4757" : undefined,
                        }}
                      >
                        {formatCurrency(selectedProject.spent)} / {formatCurrency(selectedProject.budget)}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((selectedProject.spent / selectedProject.budget) * 100))}%`,
                          backgroundColor:
                            selectedProject.spent > selectedProject.budget
                              ? "#FF4757"
                              : statusColors[selectedProject.status],
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>UTILIZATION: {Math.round((selectedProject.spent / selectedProject.budget) * 100)}%</span>
                      <span>REMAINING: {formatCurrency(Math.max(0, selectedProject.budget - selectedProject.spent))}</span>
                    </div>
                  </div>

                  {/* Physical Progress Meter */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground uppercase">PHYSICAL PROGRESS</span>
                      <span className="font-bold text-foreground">{selectedProject.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedProject.progress}%`,
                          backgroundColor: statusColors[selectedProject.status],
                        }}
                      />
                    </div>
                  </div>

                  {/* Evidence Stats */}
                  <div className="flex items-center justify-between p-2.5 bg-accent/30 rounded border border-border/60 text-xs font-mono">
                    <span className="text-muted-foreground">AUDIT EVIDENCE:</span>
                    <span className="text-foreground font-semibold">
                      {selectedProject.verifiedCount} / {selectedProject.imageCount} Verified
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <button
                      onClick={() => handleOpenUpload(selectedProject.id)}
                      className="w-full py-2 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-semibold rounded flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <Upload size={14} />
                      UPLOAD VERIFICATION EVIDENCE
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleFocusProject(selectedProject)}
                        className="py-1.5 px-2 bg-card border border-border hover:border-primary/50 text-foreground font-mono text-[11px] rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <Crosshair size={12} className="text-primary" />
                        Focus Site
                      </button>

                      <button
                        onClick={() => navigate("/projects")}
                        className="py-1.5 px-2 bg-card border border-border hover:border-primary/50 text-foreground font-mono text-[11px] rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <ExternalLink size={12} />
                        View in Registry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground font-mono text-xs space-y-2">
                  <MapPin size={24} className="mx-auto text-muted-foreground/40" />
                  <p>Select any project pin on the map to inspect telemetry details.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Verification Evidence Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden font-sans">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-primary" />
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    UPLOAD SITE VERIFICATION EVIDENCE
                  </h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitUpload} className="p-5 space-y-4">
                {/* Target Project Dropdown */}
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1.5">
                    Target Project Site *
                  </label>
                  <select
                    value={uploadProjectId}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    required
                    className="w-full bg-background border border-border px-3 py-2 rounded text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  >
                    <option value="" disabled>Select Project Site…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload Zone */}
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1.5">
                    Site Photo / Progress Image *
                  </label>
                  <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-4 text-center cursor-pointer relative bg-background/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {previewUrl ? (
                      <div className="space-y-2">
                        <img
                          src={previewUrl}
                          alt="Evidence preview"
                          className="max-h-36 mx-auto rounded object-cover border border-border"
                        />
                        <div className="text-[11px] font-mono text-primary flex items-center justify-center gap-1">
                          <CheckCircle2 size={12} />
                          {uploadFile?.name} ({(uploadFile?.size ? uploadFile.size / 1024 : 0).toFixed(1)} KB)
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-3">
                        <Upload size={24} className="mx-auto text-muted-foreground" />
                        <div className="text-xs text-foreground font-medium">
                          Click or drag image file here
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          PNG, JPG, WEBP up to 10MB · EXIF metadata extracted
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Geofence Notice Banner */}
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-start gap-2.5 text-[11px] font-mono text-muted-foreground">
                  <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-foreground font-semibold block">500M GEOFENCE VERIFICATION</span>
                    CivicPulse AI extracts GPS EXIF tags and verifies whether the photo was taken within the 500m geofence perimeter of this site.
                  </div>
                </div>

                {/* Caption / Notes */}
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1.5">
                    Observation Caption / Verification Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Completed pillar concrete pouring at pier 4…"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-border hover:bg-accent/40 rounded text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending || !uploadFile}
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-semibold rounded flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Analyzing with AI…
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
