"""
API Router for Pillar B.4: Quality Assurance & Engineering Verification (18 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.engineering_verification_service import EngineeringVerificationService

router = APIRouter(prefix="/api/engineering", tags=["Quality Assurance & Engineering Verification"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class YOLODetectRequest(BaseModel):
    evidence_id: int

class SatelliteDiffRequest(BaseModel):
    project_id: str
    baseline_date: str
    latest_date: str

class GISAlignmentRequest(BaseModel):
    project_id: str
    billed_chainage_km: float
    surveyed_centerline_km: float
    max_lateral_drift_meters: float

class CadastralCheckRequest(BaseModel):
    project_id: str
    parcel_id: str
    geofence_wkt: str
    overlap_pct: float

class DroneSurveyRequest(BaseModel):
    project_id: str
    dgca_uin: str
    flight_date: str
    orthomosaic_uri: str
    dem_uri: str
    covered_area_sqm: float
    average_gsd_cm: float
    pilot_license: str

class PhotogrammetryVolumeRequest(BaseModel):
    project_id: str
    inspection_id: str
    calculated_volume_m3: float
    billed_volume_m3: float

class RoadRoughnessRequest(BaseModel):
    project_id: str
    video_uri: str
    iri_m_per_km: float

class SurfaceDefectRequest(BaseModel):
    evidence_id: int
    defect_category: str
    confidence_pct: float

class BuildingDefectRequest(BaseModel):
    evidence_id: int
    defect_type: str
    severity: str

class LabReportRequest(BaseModel):
    project_id: str
    lab_name: str
    nabl_no: str
    sample_type: str
    reported_value: float
    required_value: float
    ocr_text: str

class IoTTelemetryRequest(BaseModel):
    project_id: str
    asset_id: int
    sensor_id: str
    sensor_type: str
    metric_value: float
    unit: str

class RandomInspectionRequest(BaseModel):
    project_id: str
    risk_score: float

class AuthenticityVerifyRequest(BaseModel):
    evidence_id: int

class MultiAngleProtocolRequest(BaseModel):
    evidence_id: int

class BOQReconcileRequest(BaseModel):
    project_id: str
    measurement_book_ref: str
    item_code: str
    billed_quantity: float
    ai_verified_quantity: float

class ChecklistSubmitRequest(BaseModel):
    project_id: str
    work_type: str
    checklist_code: str
    responses: Dict[str, Any]
    total_score_pct: float

class RemoteVideoRequest(BaseModel):
    project_id: str
    field_officer_id: int
    duration_seconds: int
    audit_notes: str

class SampleCustodyRequest(BaseModel):
    project_id: str
    sample_code: str
    barcode: str
    target_lab: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.post("/yolo/detect")
def run_yolo_detection(req: YOLODetectRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.run_yolo_detection(db, req.evidence_id)

@router.post("/satellite/diff")
def perform_satellite_diff(req: SatelliteDiffRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.perform_satellite_diff(
        db, req.project_id, req.baseline_date, req.latest_date
    )

@router.post("/gis/alignment")
def cross_check_gis_alignment(req: GISAlignmentRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.cross_check_gis_alignment(
        db, req.project_id, req.billed_chainage_km, req.surveyed_centerline_km, req.max_lateral_drift_meters
    )

@router.post("/cadastral/check")
def check_cadastral_parcel(req: CadastralCheckRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.check_cadastral_parcel(
        db, req.project_id, req.parcel_id, req.geofence_wkt, req.overlap_pct
    )

@router.post("/drone/survey")
def ingest_drone_survey(
    req: DroneSurveyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return EngineeringVerificationService.ingest_drone_survey(
        db, req.project_id, req.dgca_uin, req.flight_date, req.orthomosaic_uri, req.dem_uri,
        req.covered_area_sqm, req.average_gsd_cm, req.pilot_license
    )

@router.post("/photogrammetry/volume")
def calculate_photogrammetry_volume(req: PhotogrammetryVolumeRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.calculate_photogrammetry_volume(
        db, req.project_id, req.inspection_id, req.calculated_volume_m3, req.billed_volume_m3
    )

@router.post("/roughness/iri")
def compute_road_roughness(req: RoadRoughnessRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.compute_road_roughness(
        db, req.project_id, req.video_uri, req.iri_m_per_km
    )

@router.post("/surface-defect")
def classify_surface_defect(req: SurfaceDefectRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.classify_surface_defects(
        db, req.evidence_id, req.defect_category, req.confidence_pct
    )

@router.post("/building-defect")
def classify_building_defect(req: BuildingDefectRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.classify_building_structural_defect(
        db, req.evidence_id, req.defect_type, req.severity
    )

@router.post("/lab-report")
def validate_material_lab_report(
    req: LabReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return EngineeringVerificationService.validate_material_lab_report(
        db, req.project_id, req.lab_name, req.nabl_no, req.sample_type,
        req.reported_value, req.required_value, req.ocr_text
    )

@router.post("/iot/telemetry")
def record_iot_telemetry(req: IoTTelemetryRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.record_iot_telemetry(
        db, req.project_id, req.asset_id, req.sensor_id, req.sensor_type, req.metric_value, req.unit
    )

@router.post("/inspection/random-schedule")
def schedule_random_inspection(
    req: RandomInspectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin])),
):
    return EngineeringVerificationService.schedule_random_inspection(
        db, req.project_id, req.risk_score, current_user.id
    )

@router.post("/authenticity/verify")
def verify_photo_authenticity(req: AuthenticityVerifyRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.verify_photo_authenticity(db, req.evidence_id)

@router.post("/multi-angle/enforce")
def enforce_multi_angle_protocol(req: MultiAngleProtocolRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.enforce_multi_angle_protocol(db, req.evidence_id)

@router.post("/boq/reconcile")
def reconcile_boq_measurement_book(req: BOQReconcileRequest, db: Session = Depends(get_db)):
    return EngineeringVerificationService.reconcile_boq_measurement_book(
        db, req.project_id, req.measurement_book_ref, req.item_code, req.billed_quantity, req.ai_verified_quantity
    )

@router.post("/checklist/submit")
def submit_inspection_checklist(
    req: ChecklistSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return EngineeringVerificationService.submit_inspection_checklist(
        db, req.project_id, req.work_type, req.checklist_code, req.responses, req.total_score_pct, current_user.id
    )

@router.post("/video-inspection/record")
def record_remote_video_inspection(
    req: RemoteVideoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return EngineeringVerificationService.record_remote_video_inspection(
        db, req.project_id, current_user.id, req.field_officer_id, req.duration_seconds, req.audit_notes
    )

@router.post("/sample-custody/register")
def register_lab_sample_custody(
    req: SampleCustodyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return EngineeringVerificationService.register_lab_sample_custody(
        db, req.project_id, req.sample_code, req.barcode, current_user.id, req.target_lab
    )
