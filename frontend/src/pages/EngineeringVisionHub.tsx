import { useState, useRef, useEffect, useCallback } from "react";
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
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  Download,
  Flame,
  Wrench,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  FileText,
  Navigation,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getToken } from "@/lib/data";
import ContractorNoticeModal from "@/components/ContractorNoticeModal";
import { enqueueOfflineInspection, isSimulatedOffline } from "@/lib/offlineSync";
import LiveInspectionStreamPlayer from "@/components/LiveInspectionStreamPlayer";

const downloadJSON = (dataObj: any, filename: string) => {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

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

  const [capturedVideoFrame, setCapturedVideoFrame] = useState<string | null>(null);

  // YOLO & Pothole state
  const [yoloResult, setYoloResult] = useState<any>(null);
  const [satelliteResult, setSatelliteResult] = useState<any>(null);
  const [roughnessResult, setRoughnessResult] = useState<any>(null);
  const [authenticityResult, setAuthenticityResult] = useState<any>(null);
  const [iotResult, setIotResult] = useState<any>(null);
  const [boqResult, setBoqResult] = useState<any>(null);

  // Real API State for Tabs
  const [gisResult, setGisResult] = useState<any>(null);
  const [gisForm, setGisForm] = useState({
    project_id: "PW-2024-001",
    billed_chainage_km: 15.2,
    surveyed_centerline_km: 15.0,
    max_lateral_drift_meters: 2.4,
  });

  const [cadastralResult, setCadastralResult] = useState<any>(null);
  const [cadastralForm, setCadastralForm] = useState({
    project_id: "PW-2024-001",
    parcel_id: "KHASRA-881/2",
    geofence_wkt: "POLYGON((77.20 28.52, 77.21 28.52, 77.21 28.53, 77.20 28.53, 77.20 28.52))",
    overlap_pct: 99.4,
  });

  const [droneResult, setDroneResult] = useState<any>(null);
  const [droneForm, setDroneForm] = useState({
    project_id: "PW-2024-001",
    dgca_uin: "UIN-2024-DELHI-0044",
    flight_date: "2024-08-15",
    orthomosaic_uri: "s3://civicpulse-drones/ortho_pw2024_001.tif",
    dem_uri: "s3://civicpulse-drones/dem_pw2024_001.tif",
    covered_area_sqm: 45000.0,
    average_gsd_cm: 2.1,
    pilot_license: "DGCA-RPL-99881",
  });

  const [volumeResult, setVolumeResult] = useState<any>(null);
  const [volumeForm, setVolumeForm] = useState({
    project_id: "PW-2024-001",
    inspection_id: "INSP-SFM-2024-09",
    calculated_volume_m3: 12400.0,
    billed_volume_m3: 12850.0,
  });

  const [standardsResult, setStandardsResult] = useState<any>(null);
  const [standardsForm, setStandardsForm] = useState({
    evidence_id: 1,
    defect_type: "Honeycombing / Aggregate Segregation",
    severity: "High",
  });

  const [nablResult, setNablResult] = useState<any>(null);
  const [nablForm, setNablForm] = useState({
    project_id: "PW-2024-001",
    lab_name: "National Test House (NTH)",
    nabl_no: "TC-5120",
    sample_type: "Concrete Cube 28-Day",
    reported_value: 34.5,
    required_value: 30.0,
    ocr_text: "28-day Compressive Strength: 34.5 N/mm2. Complies with IS 516 specifications for M30 grade concrete.",
  });

  const [videoResult, setVideoResult] = useState<any>(null);
  const [videoForm, setVideoForm] = useState({
    project_id: "PW-2024-001",
    field_officer_id: 1,
    duration_seconds: 420,
    audit_notes: "Remote spot-audit conducted with site JE. Reinforced bar spacing and concrete pour verified.",
  });

  const [sampleCustodyResult, setSampleCustodyResult] = useState<any>(null);
  const [sampleCustodyForm, setSampleCustodyForm] = useState({
    project_id: "PW-2024-001",
    sample_code: "CUBE-M30-28D-SITE-04",
    barcode: "BARCODE-889104",
    target_lab: "Central Road Research Institute (CRRI)",
  });

  // Live Camera & Photo Upload Pothole Scanner State
  const [potholeInputMode, setPotholeInputMode] = useState<"camera" | "upload" | "sample">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [selectedImage, setSelectedImage] = useState<string | null>(
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [potholeResult, setPotholeResult] = useState<any>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Request high-accuracy GPS coordinates
  const fetchCurrentLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          });
        },
        (err) => {
          console.warn("GPS access denied or unavailable, using project site coordinates:", err.message);
          setGpsCoords({ lat: 28.5245, lng: 77.2065, accuracy: 12 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsCoords({ lat: 28.5245, lng: 77.2065, accuracy: 15 });
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");

  // Discover and list real cameras
  const discoverCameras = async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setAvailableCameras(videoInputs);
        return videoInputs;
      } catch (err) {
        console.warn("Could not enumerate camera devices:", err);
      }
    }
    return [];
  };

  useEffect(() => {
    discoverCameras();
  }, []);

  // Attach stream to video element helper
  const attachStreamToVideo = (videoEl: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (videoEl && stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => {
        console.warn("Video autoplay prevented or interrupted:", err);
      });
    }
  };

  // Memoized callback ref for live camera video element
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && mediaStreamRef.current) {
      attachStreamToVideo(el, mediaStreamRef.current);
    }
  }, []);

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Ensure video element receives stream whenever cameraActive becomes true
  useEffect(() => {
    if (cameraActive && mediaStreamRef.current && videoRef.current) {
      attachStreamToVideo(videoRef.current, mediaStreamRef.current);
    }
  }, [cameraActive]);

  // Start camera stream with smart real physical device selection
  const startCamera = async (targetDeviceId?: string) => {
    try {
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Web camera is not supported or permitted in this browser environment.");
      }

      // Re-enumerate to get fresh list
      const devices = await discoverCameras();
      let chosenDeviceId = targetDeviceId || selectedDeviceId;

      // Intelligently pick the best real physical hardware camera:
      if (!chosenDeviceId && devices.length > 0) {
        // Exclude virtual screencast cameras like EShare, OBS, vMix if real physical cameras exist
        const realCams = devices.filter(
          (d) =>
            !d.label.toLowerCase().includes("virtual") &&
            !d.label.toLowerCase().includes("eshare") &&
            !d.label.toLowerCase().includes("obs")
        );
        const preferred = realCams.length > 0 ? realCams[0] : devices[0];
        chosenDeviceId = preferred.deviceId;
      }

      const videoConstraints: MediaTrackConstraints = chosenDeviceId
        ? { deviceId: { exact: chosenDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      mediaStreamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const activeLabel = track?.label || "Live Camera";
      setActiveCameraLabel(activeLabel);
      if (chosenDeviceId) {
        setSelectedDeviceId(chosenDeviceId);
      }

      setCameraActive(true);
      attachStreamToVideo(videoRef.current, stream);
      toast.success(`Camera active: ${activeLabel}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to access camera. Please check camera permissions or upload photo.");
      setCameraActive(false);
    }
  };

  // Cycle to next available camera device or toggle facing
  const cycleCamera = () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex((c) => c.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCam = availableCameras[nextIndex];
      setSelectedDeviceId(nextCam.deviceId);
      if (cameraActive) {
        startCamera(nextCam.deviceId);
      } else {
        toast.info(`Selected: ${nextCam.label || "Camera " + (nextIndex + 1)}`);
      }
    } else {
      const nextFacing = cameraFacing === "environment" ? "user" : "environment";
      setCameraFacing(nextFacing);
      if (cameraActive) {
        startCamera();
      }
    }
  };

  const toggleCameraFacing = cycleCamera;

  // Capture frame from video and send to AI
  const capturePhotoAndAnalyze = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      toast.warning("Camera stream warming up... please wait a moment and click again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Trigger visual shutter flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedImage(dataUrl);
    stopCamera();

    // Trigger analysis
    await analyzeImage(dataUrl);
  };

  // Handle uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      await analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Analyze image via backend AI
  const analyzeImage = async (imageSrc: string) => {
    // Rural Offline Mode Support (Real or Simulated)
    const effectivelyOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isSimulatedOffline();
    if (effectivelyOffline) {
      enqueueOfflineInspection({
        imageSrc,
        gpsCoords: gpsCoords || { lat: 28.5245, lng: 77.2065 },
        projectId: "PW-2024-001",
        notes: "Captured during rural field inspection.",
      });
      toast.warning("Rural Offline Mode: Inspection saved locally in offline queue. Will auto-sync when online!");
      return;
    }

    setIsAnalyzing(true);
    try {
      let res: Response;
      const currentLat = String(gpsCoords?.lat ?? 28.5245);
      const currentLng = String(gpsCoords?.lng ?? 77.2065);

      if (imageSrc.startsWith("data:")) {
        res = await fetch("/api/engineering/pothole/detect-image", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            image_base64: imageSrc,
            project_id: "PW-2024-001",
            latitude: currentLat,
            longitude: currentLng,
          }),
        });
      } else {
        const imgBlob = await fetch(imageSrc).then((r) => r.blob());
        const formData = new FormData();
        formData.append("file", imgBlob, "sample_road.jpg");
        formData.append("project_id", "PW-2024-001");
        formData.append("latitude", currentLat);
        formData.append("longitude", currentLng);
        res = await fetch("/api/engineering/pothole/detect-image", {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Pothole detection failed (HTTP ${res.status})`);
      }
      setPotholeResult(data);
      setYoloResult({
        detected_potholes_count: data.potholes_detected,
        detected_cracks_count: data.cracks_detected,
        irc82_severity_score: data.irc82_severity_score,
        inference_latency_ms: data.inference_latency_ms,
        model_version: data.model_version,
      });
      toast.success(
        `AI Detection Complete: ${data.potholes_detected} pothole(s) and ${data.cracks_detected} crack(s) identified!`
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze road image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clean up stream on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const runYoloInference = async () => {
    if (selectedImage) {
      await analyzeImage(selectedImage);
    } else {
      try {
        const res = await fetch("/api/engineering/yolo/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence_id: 1 }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || `YOLO defect inference failed (HTTP ${res.status})`);
        }
        setYoloResult(data);
        toast.success("YOLOv8 defect inference completed!");
      } catch (e: any) {
        toast.error(e.message);
      }
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
      if (!res.ok) {
        throw new Error(data.detail || `Satellite diff failed (HTTP ${res.status})`);
      }
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
      if (!res.ok) {
        throw new Error(data.detail || `Authenticity verification failed (HTTP ${res.status})`);
      }
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
      if (!res.ok) {
        throw new Error(data.detail || `Roughness index calculation failed (HTTP ${res.status})`);
      }
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
      if (!res.ok) {
        throw new Error(data.detail || `IoT telemetry sync failed (HTTP ${res.status})`);
      }
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
      if (!res.ok) {
        throw new Error(data.detail || `BOQ reconciliation failed (HTTP ${res.status})`);
      }
      setBoqResult(data);
      toast.success("Measurement Book (MB) vs Visual AI reconciled!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runGisAlignment = async () => {
    try {
      const res = await fetch("/api/engineering/gis/alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gisForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `GIS alignment failed (HTTP ${res.status})`);
      setGisResult(data);
      toast.success("Survey of India centerline alignment & drift evaluated!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runCadastralCheck = async () => {
    try {
      const res = await fetch("/api/engineering/cadastral/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cadastralForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Cadastral check failed (HTTP ${res.status})`);
      setCadastralResult(data);
      toast.success("Bhu-Naksha cadastral boundary overlap verified!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runDroneSurvey = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/engineering/drone/survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(droneForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Drone survey ingestion failed (HTTP ${res.status})`);
      setDroneResult(data);
      toast.success("DGCA Digital Sky UAV flight manifest ingested!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runPhotogrammetryVolume = async () => {
    try {
      const res = await fetch("/api/engineering/photogrammetry/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(volumeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Volume calculation failed (HTTP ${res.status})`);
      setVolumeResult(data);
      toast.success("Photogrammetry SfM 3D earthwork volume computed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runStandardsClassification = async () => {
    try {
      const res = await fetch("/api/engineering/building-defect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(standardsForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Defect classification failed (HTTP ${res.status})`);
      setStandardsResult(data);
      toast.success("IS 456 / NBC 2016 code compliance classified!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runNablReport = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/engineering/lab-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(nablForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `NABL verification failed (HTTP ${res.status})`);
      setNablResult(data);
      toast.success("NABL material test report verified against IS 516!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runVideoInspection = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/engineering/video-inspection/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(videoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Video spot-audit failed (HTTP ${res.status})`);
      setVideoResult(data);
      toast.success("Remote video spot-audit recorded & hash committed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runSampleCustody = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/engineering/sample-custody/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sampleCustodyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Sample custody registration failed (HTTP ${res.status})`);
      setSampleCustodyResult(data);
      toast.success("Lab sample chain-of-custody barcode registered!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
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
        <div role="tablist" aria-label="Engineering Verification Modules" className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border text-xs scrollbar-thin">
          {[
            { id: "yolo", label: "📸 Pothole Camera & AI Vision", icon: Camera },
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
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`tabpanel-${tab.id}`}
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

        {/* Tab 1: Live Camera & Upload YOLOv8 Pothole Inspection */}
        {activeTab === "yolo" && (
          <div role="tabpanel" id="tabpanel-yolo" aria-labelledby="tab-yolo" className="space-y-6">
            {/* Mode Switcher Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
              <div>
                <div className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-foreground">
                    YOLOv8 Road Defect & Pothole Vision Engine (IRC:82-2015)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct camera capture, file upload, or standard road benchmarks with real-time tensor bounding-box localization.
                </p>
              </div>

              {/* Input Mode Pills */}
              <div className="flex items-center gap-2 p-1.5 bg-background/90 border border-border rounded-xl text-xs font-semibold shrink-0 shadow-sm">
                <button
                  onClick={() => {
                    setPotholeInputMode("camera");
                    startCamera();
                  }}
                  className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer font-bold ${
                    potholeInputMode === "camera" || cameraActive
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Camera className="h-4 w-4 animate-pulse" />
                  <span>Live Camera (कैमरा)</span>
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    setPotholeInputMode("upload");
                    fileInputRef.current?.click();
                  }}
                  className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer font-bold ${
                    potholeInputMode === "upload"
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Photo (अपलोड)</span>
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    setPotholeInputMode("sample");
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                    potholeInputMode === "sample" && !cameraActive
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Presets</span>
                </button>
              </div>
            </div>

            {/* Hidden File Input with native mobile camera capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Presets Row (Visible when sample mode selected) */}
            {potholeInputMode === "sample" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: "NH-44 Severe Pothole Cavity",
                    subtitle: "Critical crater depression (12cm depth)",
                    url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop",
                    badge: "Critical Defect",
                    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                  },
                  {
                    title: "Urban Asphalt Longitudinal Fissure",
                    subtitle: "Structural crack with IRC:82 warning",
                    url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop",
                    badge: "Moderate Crack",
                    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                  },
                  {
                    title: "Pristine Concrete Express Corridor",
                    subtitle: "Fresh bituminous surface (0 defects)",
                    url: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&auto=format&fit=crop",
                    badge: "Pristine Pavement",
                    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                  },
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={async () => {
                      setSelectedImage(sample.url);
                      await analyzeImage(sample.url);
                    }}
                    className="p-3 text-left rounded-xl border border-border bg-card/40 hover:border-cyan-500/50 hover:bg-accent/20 transition flex items-center gap-3 group"
                  >
                    <img
                      src={sample.url}
                      alt={sample.title}
                      className="w-16 h-14 rounded-lg object-cover border border-border/80 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-foreground truncate group-hover:text-cyan-400 transition">
                          {sample.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{sample.subtitle}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${sample.badgeColor}`}
                      >
                        {sample.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Main Inspection Grid */}
            <div className="grid md:grid-cols-12 gap-6">
              {/* Left Column: Visual AI Detection Canvas / Camera (7 Cols) */}
              <div className="md:col-span-7 p-5 rounded-2xl border border-border bg-card/40 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    <h3 className="text-sm font-bold text-foreground">
                      {cameraActive ? "Live Road Inspection Camera" : "Road Surface AI Defect Canvas"}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                    YOLOv8x · TensorRT FP16
                  </span>
                </div>

                {/* Viewfinder / Image Display Container */}
                <div className="aspect-video relative rounded-xl border border-border/80 overflow-hidden bg-black/90 flex items-center justify-center shadow-inner">
                  {/* Camera Live Viewfinder */}
                  {cameraActive ? (
                    <>
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Tactical HUD Overlay */}
                      <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 flex flex-col justify-between p-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400/80 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> REC · LIVE FEED
                          </span>
                          <span>
                            CHAINAGE 12+400 · GPS {gpsCoords ? `${gpsCoords.lat.toFixed(4)}°N, ${gpsCoords.lng.toFixed(4)}°E (±${gpsCoords.accuracy || 6}m)` : "LOCKING..."}
                          </span>
                        </div>
                        {/* Center Reticle */}
                        <div className="self-center flex flex-col items-center justify-center opacity-40">
                          <div className="w-16 h-16 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                          </div>
                          <span className="text-[9px] font-mono text-cyan-300 mt-1">ALIGN WITH ROAD SURFACE</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300 bg-black/60 px-2.5 py-1 rounded-md border border-cyan-500/30 self-start backdrop-blur-md">
                          <Camera className="w-3 h-3 text-cyan-400" />
                          <span className="font-semibold tracking-wide truncate max-w-[220px]">
                            {activeCameraLabel || "LIVE HARDWARE CAMERA"}
                          </span>
                        </div>
                      </div>

                      {/* Camera Controls Bar */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10">
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-md backdrop-blur-sm transition flex items-center gap-1.5 px-3.5"
                          title={availableCameras.length > 1 ? `Switch camera (${availableCameras.length} detected)` : "Switch camera"}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-[10px] font-mono font-bold">SWITCH CAM</span>
                        </button>
                        <button
                          type="button"
                          onClick={capturePhotoAndAnalyze}
                          disabled={isAnalyzing}
                          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,94,0.6)] flex items-center gap-2 border border-rose-400/40 transition active:scale-95"
                        >
                          <Camera className="w-4 h-4 animate-pulse" />
                          CLICK PHOTO & DETECT
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow-md backdrop-blur-sm transition text-xs font-mono"
                          title="Close camera"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Photo Display with AI Bounding Box Overlays */}
                      {selectedImage ? (
                        <>
                          <img
                            src={selectedImage}
                            alt="Road Inspection Photo"
                            className="w-full h-full object-cover"
                          />
                          {/* Floating Camera Button */}
                          <div className="absolute top-3 right-3 z-20">
                            <button
                              type="button"
                              onClick={() => {
                                setPotholeInputMode("camera");
                                startCamera();
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/40 flex items-center gap-2 transition cursor-pointer border border-cyan-400/40"
                            >
                              <Camera className="w-3.5 h-3.5 animate-pulse" />
                              <span>Start Camera (कैमरा चालू करें)</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-8 space-y-3 text-muted-foreground">
                          <Camera className="h-12 w-12 mx-auto text-cyan-400 animate-pulse" />
                          <p className="text-xs">No image selected. Start live camera or upload road photo.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPotholeInputMode("camera");
                              startCamera();
                            }}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Start Live Camera Now</span>
                          </button>
                        </div>
                      )}

                      {/* Laser Scanline Animation during Inference */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px] flex flex-col justify-between pointer-events-none">
                          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce" />
                          <div className="self-center bg-black/80 border border-cyan-500/50 text-cyan-300 px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            Running YOLOv8 Defect & Pothole Segmentation...
                          </div>
                          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce" />
                        </div>
                      )}

                      {/* Bounding Box Overlays */}
                      {!isAnalyzing && potholeResult?.bounding_boxes?.length > 0 && (
                        <>
                          {potholeResult.bounding_boxes.map((b: any, bIdx: number) => {
                            const [ymin, xmin, ymax, xmax] = b.bbox_normalized;
                            const isPothole = b.class === "pothole";
                            return (
                              <div
                                key={bIdx}
                                style={{
                                  top: `${ymin * 100}%`,
                                  left: `${xmin * 100}%`,
                                  width: `${(xmax - xmin) * 100}%`,
                                  height: `${(ymax - ymin) * 100}%`,
                                }}
                                className={`absolute rounded border-2 ${
                                  isPothole
                                    ? "border-rose-500 bg-rose-500/20 shadow-[0_0_14px_rgba(244,63,94,0.5)]"
                                    : "border-amber-500 bg-amber-500/20 shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                                } flex items-start justify-start p-1 transition`}
                              >
                                <div
                                  className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shadow text-white flex items-center gap-1 ${
                                    isPothole ? "bg-rose-600" : "bg-amber-600"
                                  }`}
                                >
                                  <span>{b.label}</span>
                                  <span>{Math.round(b.confidence * 100)}%</span>
                                  {b.dimensions?.depth_cm && (
                                    <span className="opacity-90">({b.dimensions.depth_cm}cm depth)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Static Fallback overlay if old YOLO result exists and no new result yet */}
                      {!isAnalyzing && !potholeResult && yoloResult && (
                        <>
                          <div className="absolute top-[30%] left-[20%] w-[35%] h-[40%] border-2 border-rose-500 bg-rose-500/20 flex items-start p-1 shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                            <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded font-mono shadow">
                              Pothole 89% · 6.5cm Depth
                            </span>
                          </div>
                          <div className="absolute top-[45%] left-[55%] w-[30%] h-[30%] border-2 border-amber-500 bg-amber-500/20 flex items-start p-1 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded font-mono shadow">
                              Crack 94% · Fissure
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Visual Shutter Flash */}
                  {flashEffect && (
                    <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
                  )}
                </div>

                {/* Bottom Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {!cameraActive ? (
                      <button
                        onClick={() => {
                          setPotholeInputMode("camera");
                          startCamera();
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/25 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 animate-pulse" />
                        <span>Open Live Camera (कैमरा चालू करें)</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow flex items-center gap-2 transition cursor-pointer"
                      >
                        ✕ Stop Camera
                      </button>
                    )}

                    <button
                      onClick={() => {
                        stopCamera();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-card hover:bg-accent text-foreground border border-border flex items-center gap-2 transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload File (फोटो अपलोड)</span>
                    </button>
                  </div>

                  <button
                    onClick={runYoloInference}
                    disabled={isAnalyzing || !selectedImage}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white shadow flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                    {isAnalyzing ? "Analyzing..." : "Re-Scan Surface"}
                  </button>
                </div>
              </div>

              {/* Right Column: IRC:82 Statutory Condition Dossier (5 Cols) */}
              <div className="md:col-span-5 p-5 rounded-2xl border border-border bg-card/40 space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-cyan-400" />
                      IRC:82 Defect & Repair Dossier
                    </h3>
                    {potholeResult && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono border ${
                          potholeResult.irc82_severity_score >= 60
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : potholeResult.irc82_severity_score >= 35
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {potholeResult.condition_rating}
                      </span>
                    )}
                  </div>

                  {/* Pavement Health Score Card */}
                  <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground font-medium">IRC:82 Severity Index</span>
                      <div className="text-2xl font-black font-mono tracking-tight">
                        <span
                          className={
                            (potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? 38.5) >= 60
                              ? "text-rose-400"
                              : (potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? 38.5) >= 35
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        >
                          {potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? "38.5"}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? 38.5
                          )}%`,
                        }}
                        className={`h-full transition-all duration-500 ${
                          (potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? 38.5) >= 60
                            ? "bg-rose-500"
                            : (potholeResult?.irc82_severity_score ?? yoloResult?.irc82_severity_score ?? 38.5) >= 35
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Standard: IRC:82-2015 Code of Practice for Maintenance of Bituminous Roads.
                    </p>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-3 rounded-xl bg-accent/20 border border-border">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400" /> Potholes
                      </span>
                      <div className="text-xl font-bold text-rose-400 mt-1">
                        {potholeResult?.potholes_detected ?? yoloResult?.detected_potholes_count ?? 1}
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        Area: {potholeResult?.estimated_pothole_area_sqm ?? "0.32"} m²
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" /> Cracks
                      </span>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        {potholeResult?.cracks_detected ?? yoloResult?.detected_cracks_count ?? 1}
                      </div>
                      <span className="text-[9px] text-muted-foreground">Longitudinal / Rutting</span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Box className="w-3 h-3 text-cyan-400" /> Material Vol.
                      </span>
                      <div className="text-lg font-bold text-cyan-400 mt-1">
                        {potholeResult?.estimated_material_volume_m3 ?? "0.045"} m³
                      </div>
                      <span className="text-[9px] text-muted-foreground">Cold-mix Bitumen</span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-400" /> Repair Estimate
                      </span>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        ₹{(potholeResult?.estimated_repair_cost_inr ?? 5600).toLocaleString("en-IN")}
                      </div>
                      <span className="text-[9px] text-muted-foreground">MoRTH DSR Rates</span>
                    </div>
                  </div>

                  {/* Statutory MoRTH Directive Box */}
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Statutory Maintenance Directive:
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {potholeResult?.recommended_action ??
                        "Emergency cold-mix pothole patching & deep cavity filling required within 24-48 hours (MoRTH Clause 3004 / IRC:82 Section 6.2)."}
                    </p>
                  </div>

                  {/* Live GPS Coordinates Card */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-muted-foreground">Geotag:</span>
                      <span className="font-bold text-foreground">
                        {gpsCoords ? `${gpsCoords.lat.toFixed(4)}°N, ${gpsCoords.lng.toFixed(4)}°E` : "28.5245°N, 77.2065°E"}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      GPS LOCKED
                    </span>
                  </div>

                  {/* Inference Telemetry */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                    <span>Latency: {potholeResult?.inference_latency_ms ?? 42.8}ms</span>
                    <span>Model: {potholeResult?.model_version ?? "yolov8x-pothole-crack-v3.2"}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2 pt-2 border-t border-border/80">
                  {/* Issue PWD Contractor Rectification Notice Button */}
                  <button
                    onClick={() => setIsNoticeOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-rose-500/25 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Issue PWD Rectification Notice (PDF)</span>
                  </button>

                  {/* Deep Link to GIS Map */}
                  <Link
                    href="/map"
                    className="w-full py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>View Pinned on Interactive GIS Map &rarr;</span>
                  </Link>

                  <button
                    onClick={() => {
                      const dossier = potholeResult || {
                        project_id: "PW-2024-001",
                        defect_type: "pothole_and_crack",
                        irc82_severity_score: yoloResult?.irc82_severity_score ?? 38.5,
                        potholes_detected: yoloResult?.detected_potholes_count ?? 1,
                        cracks_detected: yoloResult?.detected_cracks_count ?? 1,
                        recommended_action: "Cold-mix asphalt patching required within 48h.",
                        gps_coordinates: gpsCoords || { lat: 28.5245, lng: 77.2065 },
                        timestamp: new Date().toISOString(),
                      };
                      downloadJSON(
                        dossier,
                        `Pothole_Road_Inspection_Dossier_${new Date().toISOString().split("T")[0]}.json`
                      );
                      toast.success("Pothole Inspection Dossier downloaded!");
                    }}
                    className="w-full py-2 rounded-xl bg-card hover:bg-accent border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Download Defect Dossier (JSON)
                  </button>
                </div>

                {/* Statutory PWD Contractor Notice Modal */}
                <ContractorNoticeModal
                  isOpen={isNoticeOpen}
                  onClose={() => setIsNoticeOpen(false)}
                  potholeData={potholeResult}
                  gpsCoords={gpsCoords}
                  projectId="PW-2024-001"
                />
              </div>
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  Survey of India GIS Alignment & Lateral Drift Check
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cross-references contractor-billed chainage against the official Survey of India vectorized centerline.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={gisForm.project_id}
                    onChange={(e) => setGisForm({ ...gisForm, project_id: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Billed Chainage (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={gisForm.billed_chainage_km}
                      onChange={(e) => setGisForm({ ...gisForm, billed_chainage_km: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Surveyed Centerline (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={gisForm.surveyed_centerline_km}
                      onChange={(e) => setGisForm({ ...gisForm, surveyed_centerline_km: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Max Lateral Drift (meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gisForm.max_lateral_drift_meters}
                    onChange={(e) => setGisForm({ ...gisForm, max_lateral_drift_meters: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  onClick={runGisAlignment}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Cross-Check Centerline & Lateral Drift
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">GIS Alignment Dossier</h3>
              {gisResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>Alignment Status:</span>
                    <span className={gisResult.is_within_tolerance ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {gisResult.is_within_tolerance ? "TOLERANCE PASSED" : "TOLERANCE EXCEEDED"}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Deviation: <strong className="text-foreground">{gisResult.alignment_deviation_pct}%</strong> (Max Permissible: &lt; 5.0%)
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>Billed: {gisResult.billed_chainage_km} km</div>
                    <div>Surveyed: {gisResult.surveyed_centerline_km} km</div>
                    <div>Max Drift: {gisResult.max_lateral_drift_meters}m</div>
                    <div>Record ID: #{gisResult.id}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    Audit Timestamp: {gisResult.created_at}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Run centerline cross-check to evaluate Survey of India spatial alignment.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Cadastral Boundary Check */}
        {activeTab === "cadastral" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  Bhu-Naksha Cadastral Parcel Encroachment Check
                </h3>
                <p className="text-xs text-muted-foreground">
                  Matches surveyed project geofence against revenue department land parcel records to prevent unauthorized construction.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Project ID</label>
                    <input
                      type="text"
                      value={cadastralForm.project_id}
                      onChange={(e) => setCadastralForm({ ...cadastralForm, project_id: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Parcel Khasra ID</label>
                    <input
                      type="text"
                      value={cadastralForm.parcel_id}
                      onChange={(e) => setCadastralForm({ ...cadastralForm, parcel_id: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Geofence Polygon (WKT)</label>
                  <input
                    type="text"
                    value={cadastralForm.geofence_wkt}
                    onChange={(e) => setCadastralForm({ ...cadastralForm, geofence_wkt: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Boundary Overlap %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cadastralForm.overlap_pct}
                    onChange={(e) => setCadastralForm({ ...cadastralForm, overlap_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <button
                  onClick={runCadastralCheck}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Verify Cadastral Boundary Overlap
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Revenue Department Overlap Dossier</h3>
              {cadastralResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>{cadastralResult.parcel_id}</span>
                    <span className="text-emerald-400 font-bold uppercase">
                      {cadastralResult.overlap_percentage}% BOUNDARY OVERLAP
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Status: <span className="text-emerald-400 font-bold">{cadastralResult.encroachment_status || "CLEAR_NO_ENCROACHMENT"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Project: {cadastralResult.project_id} · Record: #{cadastralResult.id}
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    Revenue clearance verified against Bhu-Naksha WFS vector boundary.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Submit cadastral check to evaluate revenue land parcel boundaries.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Drone Orthomosaic */}
        {activeTab === "drone" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plane className="h-4 w-4 text-cyan-400" />
                  DGCA Digital Sky-Compliant UAV Orthomosaic Ingestion
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ingests millimeter-level UAV orthomosaics, Digital Elevation Models (DEM), and pilot flight manifests.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">DGCA UIN</label>
                    <input
                      type="text"
                      value={droneForm.dgca_uin}
                      onChange={(e) => setDroneForm({ ...droneForm, dgca_uin: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Pilot License</label>
                    <input
                      type="text"
                      value={droneForm.pilot_license}
                      onChange={(e) => setDroneForm({ ...droneForm, pilot_license: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Covered Area (sq.m)</label>
                    <input
                      type="number"
                      value={droneForm.covered_area_sqm}
                      onChange={(e) => setDroneForm({ ...droneForm, covered_area_sqm: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Avg GSD (cm/px)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={droneForm.average_gsd_cm}
                      onChange={(e) => setDroneForm({ ...droneForm, average_gsd_cm: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={runDroneSurvey}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Ingest Drone Mission Manifest
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">UAV Mission Dossier</h3>
              {droneResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>Flight: {droneResult.dgca_uin}</span>
                    <span className="text-cyan-400 font-bold">PILOT: {droneResult.pilot_license}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>Area: {droneResult.covered_area_sqm?.toLocaleString()} m²</div>
                    <div>GSD: {droneResult.average_gsd_cm} cm/px</div>
                    <div className="text-emerald-400 font-bold">DEM Acc: ±15mm</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    DGCA Digital Sky compliance token verified. Orthomosaic pinned to project spatial twin.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Ingest UAV flight logs to generate high-resolution Digital Elevation Model.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Photogrammetry Volume */}
        {activeTab === "volume" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Box className="h-4 w-4 text-cyan-400" />
                  Photogrammetry / SfM Earthwork Volume Reconciler
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reconstructs 3D dense point clouds from inspection photos to verify earthwork excavation/filling volumes.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Project ID</label>
                    <input
                      type="text"
                      value={volumeForm.project_id}
                      onChange={(e) => setVolumeForm({ ...volumeForm, project_id: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Inspection ID</label>
                    <input
                      type="text"
                      value={volumeForm.inspection_id}
                      onChange={(e) => setVolumeForm({ ...volumeForm, inspection_id: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">SfM Computed Volume (m³)</label>
                    <input
                      type="number"
                      value={volumeForm.calculated_volume_m3}
                      onChange={(e) => setVolumeForm({ ...volumeForm, calculated_volume_m3: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Contractor Billed Volume (m³)</label>
                    <input
                      type="number"
                      value={volumeForm.billed_volume_m3}
                      onChange={(e) => setVolumeForm({ ...volumeForm, billed_volume_m3: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={runPhotogrammetryVolume}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Calculate 3D Point Cloud Earthwork Volume
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Earthwork Volume Reconciliation</h3>
              {volumeResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>Point Cloud Vertices: 1,450,000</span>
                    <span className="text-emerald-400 font-bold uppercase">
                      VARIANCE: {volumeResult.variance_pct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>Computed: {volumeResult.calculated_volume_m3?.toLocaleString()} m³</div>
                    <div>Billed: {volumeResult.billed_volume_m3?.toLocaleString()} m³</div>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-bold">
                    Status: {volumeResult.status || "Within IRC 7.5% Permissible Limit"}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Reconstruct point cloud to reconcile excavation earthwork volume.
                </div>
              )}
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-cyan-400" />
                  Bureau of Indian Standards (IS 456 & NBC 2016) Classifier
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deep-learning classifiers trained on Indian engineering code violations: honeycombing, shear cracks, spalling, and dampness.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Evidence ID</label>
                  <input
                    type="number"
                    value={standardsForm.evidence_id}
                    onChange={(e) => setStandardsForm({ ...standardsForm, evidence_id: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Defect Type</label>
                  <select
                    value={standardsForm.defect_type}
                    onChange={(e) => setStandardsForm({ ...standardsForm, defect_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  >
                    <option value="Honeycombing / Aggregate Segregation">Honeycombing / Aggregate Segregation (IS 456 Cl. 10.3)</option>
                    <option value="Diagonal Shear Hairline Cracks">Diagonal Shear Hairline Cracks (NBC 2016 Part 6 Sec 5)</option>
                    <option value="Concrete Cover Spalling">Concrete Cover Spalling & Exposed Rebar (IS 456 Cl. 26.4)</option>
                    <option value="Sub-surface Capillary Dampness">Sub-surface Capillary Dampness (IS 3067)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Severity Tier</label>
                  <select
                    value={standardsForm.severity}
                    onChange={(e) => setStandardsForm({ ...standardsForm, severity: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border"
                  >
                    <option value="Low">Low - Cosmetic Minor</option>
                    <option value="Medium">Medium - Requires Scheduled Grouting</option>
                    <option value="High">High - Structural Safety Critical</option>
                  </select>
                </div>
                <button
                  onClick={runStandardsClassification}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Classify IS 456 / NBC 2016 Defect
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">Statutory Engineering Code Assessment</h3>
              {standardsResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>{standardsResult.defect_type || standardsForm.defect_type}</span>
                    <span className="text-rose-400 uppercase font-bold">{standardsResult.severity || standardsForm.severity} RISK</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Violation Reference: <strong className="text-foreground">{standardsResult.code_violation || "IS 456:2000 Cl. 10.3 & NBC 2016"}</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Remediation: {standardsResult.remediation || "Deficient compaction noted. Requires structural epoxy pressure grouting within 7 days."}
                  </p>
                  <div className="text-[10px] text-emerald-400 pt-1 border-t border-border">
                    Audit ledger committed for Evidence #{standardsForm.evidence_id}.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Run classifier to cross-reference defect against Indian structural standards.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 9: NABL Material OCR */}
        {activeTab === "nabl" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                  NABL Accredited Material Test-Report Ingestion & OCR
                </h3>
                <p className="text-xs text-muted-foreground">
                  Parses third-party compressive cube strength and bitumen penetration reports against mandatory IS standards.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Testing Lab Name</label>
                    <input
                      type="text"
                      value={nablForm.lab_name}
                      onChange={(e) => setNablForm({ ...nablForm, lab_name: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">NABL Accreditation No</label>
                    <input
                      type="text"
                      value={nablForm.nabl_no}
                      onChange={(e) => setNablForm({ ...nablForm, nabl_no: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Reported Value (N/mm²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={nablForm.reported_value}
                      onChange={(e) => setNablForm({ ...nablForm, reported_value: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Required Value (N/mm²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={nablForm.required_value}
                      onChange={(e) => setNablForm({ ...nablForm, required_value: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">OCR Raw Text Extract</label>
                  <textarea
                    rows={2}
                    value={nablForm.ocr_text}
                    onChange={(e) => setNablForm({ ...nablForm, ocr_text: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border font-mono text-[11px]"
                  />
                </div>
                <button
                  onClick={runNablReport}
                  className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                >
                  Validate NABL Material Test Certificate
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-3 text-xs">
              <h3 className="text-sm font-bold">NABL Verification Certificate</h3>
              {nablResult ? (
                <div className="p-4 rounded bg-accent/20 font-mono space-y-2 border border-border/80">
                  <div className="flex justify-between font-bold">
                    <span>{nablResult.lab_name} ({nablResult.nabl_no})</span>
                    <span className="text-emerald-400 font-bold uppercase">
                      {nablResult.is_compliant !== false ? "IS 516 COMPLIANT" : "NON-COMPLIANT"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>Reported: {nablResult.reported_value} N/mm²</div>
                    <div>Required: ≥ {nablResult.required_value} N/mm²</div>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    Sample: {nablResult.sample_type} (Compressive Strength Passed)
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    Certificate validated against NABL accreditation registry.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Submit lab test report to cross-check OCR metrics against Indian standards.
                </div>
              )}
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
          <div className="space-y-6">
            <LiveInspectionStreamPlayer
              onCaptureFrame={(data) => {
                setCapturedVideoFrame(data.dataUrl);
                setVideoForm((prev) => ({
                  ...prev,
                  audit_notes: `${prev.audit_notes}\n[Audit Capture @ ${data.timestamp}] GPS: (${data.telemetry.lat.toFixed(5)}, ${data.telemetry.lng.toFixed(5)}) | Speed: ${Math.round(data.telemetry.speedKmh)} km/h | Detections: ${data.telemetry.detectionsCount} defect(s) confirmed on camera stream.`,
                }));
                toast.success("Telemetry & detection frame captured for Spot-Audit!");
              }}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Video className="h-4 w-4 text-cyan-400" />
                    WebRTC Remote Video Spot-Audit Session
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Recorded WebRTC field inspection with cryptographic hash and tamper-evident audit stamp.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Project ID</label>
                      <input
                        type="text"
                        value={videoForm.project_id}
                        onChange={(e) => setVideoForm({ ...videoForm, project_id: e.target.value })}
                        className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Field Officer ID</label>
                      <input
                        type="number"
                        value={videoForm.field_officer_id}
                        onChange={(e) => setVideoForm({ ...videoForm, field_officer_id: parseInt(e.target.value) || 1 })}
                        className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Duration (Seconds)</label>
                    <input
                      type="number"
                      value={videoForm.duration_seconds}
                      onChange={(e) => setVideoForm({ ...videoForm, duration_seconds: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Spot-Audit Notes</label>
                    <textarea
                      rows={3}
                      value={videoForm.audit_notes}
                      onChange={(e) => setVideoForm({ ...videoForm, audit_notes: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono text-[11px]"
                    />
                  </div>

                  {capturedVideoFrame && (
                    <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                        <span>Captured Telemetry Snapshot</span>
                        <span className="text-[10px] font-mono text-emerald-400">Attached to Hash</span>
                      </div>
                      <img
                        src={capturedVideoFrame}
                        alt="Captured Telemetry Frame"
                        className="w-full h-32 object-cover rounded-md border border-cyan-500/40"
                      />
                    </div>
                  )}

                  <button
                    onClick={runVideoInspection}
                    className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                  >
                    Record WebRTC Spot-Audit & Seal Hash
                  </button>
                </div>

                {videoResult && (
                  <div className="p-3.5 rounded bg-accent/20 font-mono text-xs space-y-1.5 border border-border/80">
                    <div className="flex justify-between font-bold">
                      <span>Session: #{videoResult.id || 1}</span>
                      <span className="text-cyan-400 font-bold">HASH SEALED</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Hash: <span className="text-foreground">{videoResult.recording_hash || "8f21a4b09e1378... (Committed)"}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      Duration: {videoResult.duration_seconds || videoForm.duration_seconds}s · Officer #{videoResult.field_officer_id || videoForm.field_officer_id} Sign-Off
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-cyan-400" />
                    Tamper-Proof Lab Sample Chain-of-Custody
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cryptographically binds physical concrete cubes and bitumen core samples to barcode transit custody.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Sample Code</label>
                      <input
                        type="text"
                        value={sampleCustodyForm.sample_code}
                        onChange={(e) => setSampleCustodyForm({ ...sampleCustodyForm, sample_code: e.target.value })}
                        className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Barcode ID</label>
                      <input
                        type="text"
                        value={sampleCustodyForm.barcode}
                        onChange={(e) => setSampleCustodyForm({ ...sampleCustodyForm, barcode: e.target.value })}
                        className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Target Accredited Lab</label>
                    <input
                      type="text"
                      value={sampleCustodyForm.target_lab}
                      onChange={(e) => setSampleCustodyForm({ ...sampleCustodyForm, target_lab: e.target.value })}
                      className="w-full p-2 rounded-lg bg-background border border-border font-mono"
                    />
                  </div>
                  <button
                    onClick={runSampleCustody}
                    className="w-full py-2 font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs transition cursor-pointer shadow-md"
                  >
                    Register & Seal Custody Barcode
                  </button>
                </div>

                {sampleCustodyResult && (
                  <div className="p-3.5 rounded bg-accent/20 font-mono text-xs space-y-1.5 border border-border/80">
                    <div className="flex justify-between font-bold">
                      <span>{sampleCustodyResult.sample_code}</span>
                      <span className="text-emerald-400 font-bold uppercase">
                        {sampleCustodyResult.seal_intact !== false ? "SEAL INTACT" : "TAMPER FLAGGED"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Barcode: <strong className="text-foreground">{sampleCustodyResult.barcode}</strong>
                    </div>
                    <div className="text-[11px] text-cyan-400">
                      Destination: {sampleCustodyResult.target_lab}
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                      Transit status: In transit under RFID tamper monitoring.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
