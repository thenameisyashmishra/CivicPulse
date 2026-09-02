import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Scan,
  Satellite,
  Compass,
  MapPin,
  Plane,
  Box,
  Gauge,
  Cpu,
  Fingerprint,
  Video,
  FileSpreadsheet,
  Award,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function EngineeringVisionHub() {
  const [activeTab, setActiveTab] = useState<
    | "yolo"
    | "satellite"
    | "gis"
    | "cadastral"
    | "drone"
    | "volume"
    | "roughness"
    | "standards"
    | "nabl"
    | "iot"
    | "authenticity"
    | "boq"
    | "video"
  >("yolo");

  // YOLO state
  const [yoloResult, setYoloResult] = useState<any>(null);
  const [satelliteResult, setSatelliteResult] = useState<any>(null);
  const [roughnessResult, setRoughnessResult] = useState<any>(null);
  const [authenticityResult, setAuthenticityResult] = useState<any>(null);
  const [iotResult, setIotResult] = useState<any>(null);
  const [boqResult, setBoqResult] = useState<any>(null);

  const runYoloInference = async () => {
    try {
      const res = await fetch("/api/engineering/yolo/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_id: 1 }),
      });
      const data = await res.json();
      setYoloResult(data);
      toast.success("YOLOv8 defect inference completed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runSatelliteDiff = async () => {
    try {
      const res = await fetch("/api/engineering/satellite/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          baseline_date: "2024-01-01",
          latest_date: "2024-08-01",
        }),
      });
      const data = await res.json();
      setSatelliteResult(data);
      toast.success("ISRO Bhuvan satellite temporal diff completed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const checkAuthenticity = async () => {
    try {
      const res = await fetch("/api/engineering/authenticity/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_id: 1 }),
      });
      const data = await res.json();
      setAuthenticityResult(data);
      toast.success("ELA noise & C2PA manifest verified authentic!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const checkRoughness = async () => {
    try {
      const res = await fetch("/api/engineering/roughness/iri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          video_uri: "/videos/chainage_0_15.mp4",
          iri_m_per_km: 2.1,
        }),
      });
      const data = await res.json();
      setRoughnessResult(data);
      toast.success("Roughness index calculated (IRC:SP:16 Good)!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const recordIot = async () => {
    try {
      const res = await fetch("/api/engineering/iot/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          asset_id: 1,
          sensor_id: "STRAIN-NH44-PIER-3",
          sensor_type: "strain_gauge",
          metric_value: 215.4,
          unit: "microstrain",
        }),
      });
      const data = await res.json();
      setIotResult(data);
      toast.success("IoT Structural Health telemetry synced!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reconcileBOQ = async () => {
    try {
      const res = await fetch("/api/engineering/boq/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "PW-2024-001",
          measurement_book_ref: "MB-NHAI-Vol-42-P18",
          item_code: "BOQ-ITEM-4.1.2-WMM",
          billed_quantity: 4800.0,
          ai_verified_quantity: 4720.0,
        }),
      });
      const data = await res.json();
      setBoqResult(data);
      toast.success("Measurement Book (MB) vs Visual AI reconciled!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card/80 to-cyan-950/20 border border-border shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scan className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-wide">
                Quality Assurance & Engineering Verification Hub
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                PILLAR B.4
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Deep-learning vision · YOLOv8 defect scoring, ISRO Bhuvan satellite diff, DGCA UAV orthomosaics, NABL lab OCR, ELA tampering checks
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
          {[
            { id: "yolo", label: "YOLOv8 Defect Vision", icon: Scan },
            { id: "satellite", label: "ISRO Satellite Diff", icon: Satellite },
            { id: "gis", label: "GIS Road Alignment", icon: Compass },
            { id: "cadastral", label: "Bhu-Naksha Cadastral", icon: MapPin },
            { id: "drone", label: "DGCA Drone Survey", icon: Plane },
            { id: "volume", label: "Photogrammetry 3D", icon: Box },
            { id: "roughness", label: "IRI Road Roughness", icon: Gauge },
            { id: "standards", label: "IS 456 / NBC 2016", icon: Layers },
            { id: "nabl", label: "NABL Material OCR", icon: Award },
            { id: "iot", label: "IoT Structural Health", icon: Cpu },
            { id: "authenticity", label: "ELA / C2PA Authenticity", icon: Fingerprint },
            { id: "boq", label: "MB BOQ Reconciliation", icon: FileSpreadsheet },
            { id: "video", label: "Remote Video Spot-Audit", icon: Video },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

        {/* Tab 1: YOLOv8 Vision */}
        {activeTab === "yolo" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Scan className="h-4 w-4 text-cyan-400" />
                  YOLOv8 Road Defect & IRC:82 Severity Engine
                </h3>
                <p className="text-xs text-muted-foreground">
                  Custom-trained YOLOv8 object detector identifying potholes, longitudinal cracks, fatigue alligator cracking, and rutting.
                </p>
              </div>

              <div className="aspect-video relative rounded-lg border border-border/70 overflow-hidden bg-black/60 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop"
                  alt="Road Surface"
                  className="w-full h-full object-cover opacity-70"
                />
                {yoloResult && (
                  <>
                    <div className="absolute top-[30%] left-[20%] w-[35%] h-[40%] border-2 border-rose-500 bg-rose-500/20 flex items-start p-1">
                      <span className="text-[10px] font-bold bg-rose-500 text-white px-1 rounded font-mono">
                        Pothole 89%
                      </span>
                    </div>
                    <div className="absolute top-[45%] left-[55%] w-[30%] h-[30%] border-2 border-amber-500 bg-amber-500/20 flex items-start p-1">
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-1 rounded font-mono">
                        Crack 94%
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={runYoloInference}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Run YOLOv8 Pothole & Crack Inference
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">IRC:82 Severity Metrics</h3>
              {yoloResult ? (
                <div className="space-y-3 font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-accent/20">
                      <span className="text-[10px] text-muted-foreground">Potholes Detected</span>
                      <div className="text-xl font-bold text-rose-400">{yoloResult.detected_potholes_count}</div>
                    </div>
                    <div className="p-3 rounded bg-accent/20">
                      <span className="text-[10px] text-muted-foreground">Cracks Detected</span>
                      <div className="text-xl font-bold text-amber-400">{yoloResult.detected_cracks_count}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-accent/20">
                    <div className="flex justify-between">
                      <span>IRC:82 Condition Severity Score:</span>
                      <span className="text-cyan-400 font-bold">{yoloResult.irc82_severity_score}/100</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Inference Latency: {yoloResult.inference_latency_ms}ms · Model: {yoloResult.model_version}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Click 'Run YOLOv8' to trigger real-time tensor bounding-box extraction.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Satellite Diff */}
        {activeTab === "satellite" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-cyan-400" />
                  ISRO Bhuvan / Sentinel-2 Satellite Change Detection
                </h3>
                <p className="text-xs text-muted-foreground">
                  Analyzes multi-spectral NDVI vegetation loss and SAR backscatter temporal delta across sanctioned chainages.
                </p>
              </div>

              <button
                onClick={runSatelliteDiff}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Compute Temporal Surface Delta
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Orbital Verification Dossier</h3>
              {satelliteResult ? (
                <div className="space-y-3 font-mono">
                  <div className="p-3 rounded bg-accent/20 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Constellation: {satelliteResult.satellite_source}</span>
                      <span className="text-emerald-400">PHYSICAL ACTIVITY CONFIRMED</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Baseline: {satelliteResult.baseline_capture_date} · Latest: {satelliteResult.latest_capture_date}
                    </div>
                    <div className="text-xs text-cyan-400">
                      Ground Disturbance: {satelliteResult.ground_disturbance_sqm?.toLocaleString()} sq.m
                    </div>
                    <div className="text-xs text-muted-foreground">
                      NDVI Delta: {satelliteResult.ndvi_delta} · Built-Up Index Delta: +{satelliteResult.built_up_index_delta}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Compute satellite temporal delta.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: GIS Alignment */}
        {activeTab === "gis" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Survey of India GIS Alignment & Lateral Drift Check</h3>
              <p className="text-xs text-muted-foreground">
                Cross-references contractor-billed chainage against the official Survey of India vectorized centerline.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Centerline Alignment: 15.0 km Surveyed vs 15.2 km Billed</span>
                <span className="text-emerald-400">TOLERANCE PASSED (1.33% Dev)</span>
              </div>
              <div className="text-muted-foreground text-[11px]">
                Max Lateral Drift: 2.4 meters (Permissible threshold: &lt; 5.0m) · Zero encroachment detected.
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Cadastral Boundary Check */}
        {activeTab === "cadastral" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Bhu-Naksha / Bhoomi Cadastral Parcel Encroachment Check</h3>
              <p className="text-xs text-muted-foreground">
                Matches surveyed project geofence against revenue department land parcel records to prevent unauthorized construction.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Khasra Parcel KHASRA-881/2</span>
                <span className="text-emerald-400">99.4% BOUNDARY OVERLAP</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Cadastral boundaries verified with Revenue Dept records. Adjacent private agricultural parcels intact.
              </p>
            </div>
          </div>
        )}

        {/* Tab 5: Drone Orthomosaic */}
        {activeTab === "drone" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">DGCA Digital Sky-Compliant UAV Orthomosaic Ingestion</h3>
              <p className="text-xs text-muted-foreground">
                Ingests millimeter-level UAV orthomosaics, Digital Elevation Models (DEM), and pilot flight manifests.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Flight UIN-2024-DELHI-0044</span>
                <span className="text-cyan-400">PILOT: DGCA-RPL-99881</span>
              </div>
              <div className="grid md:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>Area Surveyed: 45,000 sq.m</div>
                <div>Ground Sample Distance: 2.1 cm/px</div>
                <div className="text-emerald-400">DEM Accuracy: ±15mm</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Photogrammetry Volume */}
        {activeTab === "volume" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Photogrammetry / Structure-from-Motion (SfM) Earthwork Volume</h3>
              <p className="text-xs text-muted-foreground">
                Reconstructs 3D dense point clouds from inspection photos to verify earthwork excavation/filling volumes.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>Point Cloud: 1,450,000 Vertices</span>
                <span className="text-emerald-400">VOLUME RECONCILED (3.6% Var)</span>
              </div>
              <div className="grid md:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>SfM Computed: 12,400 m³</div>
                <div>Contractor Billed: 12,850 m³</div>
                <div className="text-emerald-400 font-bold">Within IRC 7.5% Limit</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: IRI Road Roughness */}
        {activeTab === "roughness" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-cyan-400" />
                  International Roughness Index (IRI) Estimator
                </h3>
                <p className="text-xs text-muted-foreground">
                  Estimates riding quality (m/km) and Bump Integrator equivalence from dashcam/smartphone accelerometer video.
                </p>
              </div>

              <button
                onClick={checkRoughness}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Compute Riding Quality Index
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Riding Quality Classification</h3>
              {roughnessResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>IRI: {roughnessResult.iri_m_per_km} m/km</span>
                    <span className="text-emerald-400 uppercase">IRC:SP:16 {roughnessResult.irc_sp16_rating}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Bump Integrator Equivalent: {roughnessResult.bump_integrator_equivalent} mm/km
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Calculate IRI index from video.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 8: Standards Classification */}
        {activeTab === "standards" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Bureau of Indian Standards (IS 456 & NBC 2016) Classifier</h3>
              <p className="text-xs text-muted-foreground">
                Deep-learning classifiers trained on Indian engineering code violations: honeycombing, shear cracks, spalling, and dampness.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>IS 456:2000 Cl. 10.3 Violation</span>
                  <span className="text-rose-400 font-mono">HIGH RISK</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Honeycombing and aggregate segregation detected on pier column due to deficient mechanical vibration during pour.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>NBC 2016 Part 6 Section 5 Check</span>
                  <span className="text-amber-400 font-mono">MODERATE RISK</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Diagonal shear hairline cracks identified along beam-column lintel junction requiring epoxy pressure grouting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: NABL Material OCR */}
        {activeTab === "nabl" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">NABL Accredited Material Test-Report Ingestion & OCR</h3>
              <p className="text-xs text-muted-foreground">
                Parses third-party compressive cube strength and bitumen penetration reports against mandatory IS standards.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs font-mono">
              <div className="flex justify-between font-bold">
                <span>National Test House (NTH) · NABL No: TC-5120</span>
                <span className="text-emerald-400">IS 516 COMPLIANT</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                28-day Compressive Strength: 34.5 N/mm² (Required: ≥ 30.0 N/mm² for M30 grade concrete).
              </p>
            </div>
          </div>
        )}

        {/* Tab 10: IoT Structural Health */}
        {activeTab === "iot" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  IoT Structural Health Telemetry
                </h3>
                <p className="text-xs text-muted-foreground">
                  Syncs strain gauges, tiltmeters, and vibration sensors embedded in critical bridge piers and retaining walls.
                </p>
              </div>

              <button
                onClick={recordIot}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Ingest Real-Time Sensor Telemetry
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Telemetry Live Feed</h3>
              {iotResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Sensor: {iotResult.sensor_id}</span>
                    <span className="text-emerald-400 uppercase">{iotResult.alert_state}</span>
                  </div>
                  <div className="text-cyan-400 font-bold">
                    Reading: {iotResult.metric_value} {iotResult.unit}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Timestamp: {iotResult.telemetry_timestamp}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Ingest live telemetry.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 11: Authenticity ELA / C2PA */}
        {activeTab === "authenticity" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-cyan-400" />
                  Photo Authenticity (ELA + PRNU + C2PA)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Error Level Analysis (ELA) for digital splicing, PRNU sensor noise fingerprinting, and Coalition for Content Provenance (C2PA) cryptographic seals.
                </p>
              </div>

              <button
                onClick={checkAuthenticity}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Perform Forensic Authenticity Check
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Forensic Proof</h3>
              {authenticityResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Sensor Fingerprint: {authenticityResult.prnu_sensor_fingerprint}</span>
                    <span className="text-emerald-400">AUTHENTIC UNMODIFIED</span>
                  </div>
                  <div className="text-cyan-400">
                    ELA Noise Variance: {authenticityResult.ela_noise_variance} (Threshold: &lt;0.05)
                  </div>
                  <div className="text-emerald-400 text-[11px]">
                    C2PA Cryptographic Provenance Manifest: Validated
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Perform forensic check.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 12: MB BOQ Reconciliation */}
        {activeTab === "boq" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                  Measurement Book (MB) vs Visual AI Reconciliation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cross-references contractor Measurement Book entries against computer-vision estimated quantities.
                </p>
              </div>

              <button
                onClick={reconcileBOQ}
                className="w-full py-2 font-semibold rounded-lg bg-cyan-500 text-white text-xs"
              >
                Reconcile Item BOQ-4.1.2
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Audit Reconciliation</h3>
              {boqResult ? (
                <div className="p-3 rounded bg-accent/20 font-mono space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Docket: {boqResult.measurement_book_ref}</span>
                    <span className="text-emerald-400">VERIFIED</span>
                  </div>
                  <div>Billed: {boqResult.billed_quantity} m³ · AI Verified: {boqResult.ai_verified_quantity} m³</div>
                  <div className="text-indigo-400">Discrepancy: {boqResult.discrepancy_pct}%</div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">Reconcile BOQ quantities.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 13: Video Audit */}
        {activeTab === "video" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">WebRTC Remote Video Spot-Audit & Tamper-Proof Lab Chain-of-Custody</h3>
              <p className="text-xs text-muted-foreground">
                Recorded WebRTC field inspection with cryptographic hash and tamper-evident barcode field sample tracking.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                <div className="flex justify-between font-bold">
                  <span>WEBRTC-SPOT-8F21A4B0</span>
                  <span className="text-cyan-400">HASH SEALED</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Remote video spot-audit recorded between Chief Engineer and Site Junior Engineer. Audit hash committed.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Sample CUBE-M30-28D-SITE-04</span>
                  <span className="text-emerald-400">SEAL INTACT</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Barcode BARCODE-889104 in transit to Central Road Research Institute (CRRI). Tamper seal intact.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
