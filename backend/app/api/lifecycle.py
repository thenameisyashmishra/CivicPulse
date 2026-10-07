"""
API Router for Pillar B.3: Project Tracking & Lifecycle (17 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, get_current_user_optional, require_role
from app.db.models import User, UserRole
from app.services.project_lifecycle_service import ProjectLifecycleService

router = APIRouter(prefix="/api/lifecycle", tags=["Project Tracking & Lifecycle"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class SchemeCreateRequest(BaseModel):
    code: str
    name: str
    nodal_ministry: str
    total_budget: float

class DelayCauseRequest(BaseModel):
    project_id: str
    category: str
    description: str
    delay_days: int

class WeatherCheckRequest(BaseModel):
    project_id: str
    claim_date: str
    claimed_event: str
    claimed_rainfall_mm: float
    station_code: Optional[str] = "IMD-DELHI-01"

class LandAcquisitionRequest(BaseModel):
    project_id: str
    section_11_date: str
    section_19_date: str
    total_hectares: float
    handed_over_hectares: float
    compensation_escrow_inr: float
    displaced_families: int
    rehabilitated_families: int

class EnvClearanceRequest(BaseModel):
    project_id: str
    authority: str
    clearance_type: str
    reference_number: str
    issue_date: str
    valid_until: str
    conditions_summary: str

class PaymentTriggerRequest(BaseModel):
    project_id: str
    milestone_id: int
    tranche_amount: float

class DLPRegisterRequest(BaseModel):
    project_id: str
    warranty_years: int
    start_date: str
    end_date: str
    linked_pbg_id: Optional[int] = None

class AssetTwinRequest(BaseModel):
    project_id: str
    asset_type: str
    geojson_geometry: Dict[str, Any] = Field(default_factory=dict)
    condition_score: float = 100.0

class OMContractRequest(BaseModel):
    asset_id: int
    contractor_name: str
    start_date: str
    end_date: str
    annual_maintenance_value_inr: float

class UCGenerateRequest(BaseModel):
    project_id: str
    financial_year: str
    sanctioned_amount: float
    actual_spent_amount: float

class DashboardFeedRequest(BaseModel):
    project_id: str
    target_portal: str

class MaterialProvenanceRequest(BaseModel):
    project_id: str
    material_type: str
    batch_number: str
    heat_number: str
    manufacturer: str
    gst_irn: str
    billed_quantity: float
    received_quantity: float

class LaborAttendanceRequest(BaseModel):
    project_id: str
    attendance_date: str
    nmms_muster_roll_id: str
    aadhaar_verified_workers: int
    biometric_auth_pct: float
    billed_labor_days: int

class ChangeOrderRequest(BaseModel):
    project_id: str
    original_contract_value: float
    revised_contract_value: float
    justification: str
    clause_reference: Optional[str] = "CPWD GCC Clause 12"

class EmergencyPathwayRequest(BaseModel):
    project_id: str
    disaster_type: str
    invoking_authority: str

class MCCFreezeRequest(BaseModel):
    jurisdiction: str
    election_name: str
    freeze_start_date: str
    freeze_end_date: str
    is_active: bool


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.post("/schemes")
def create_or_get_scheme(
    req: SchemeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.get_or_create_scheme(
        db, req.code, req.name, req.nodal_ministry, req.total_budget
    )

@router.get("/schemes")
def list_schemes(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    return ProjectLifecycleService.get_schemes_rollup(db)

@router.get("/gantt/{project_id}")
def get_gantt_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    return ProjectLifecycleService.get_project_milestones_gantt(db, project_id)

@router.post("/delay-cause")
def log_delay_cause(
    req: DelayCauseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.log_delay_root_cause(
        db, req.project_id, req.category, req.description, req.delay_days, current_user.id
    )

@router.get("/delay-analytics")
def get_delay_analytics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    return ProjectLifecycleService.get_statewide_delay_analytics(db)

@router.post("/weather-check")
def verify_weather_claim(
    req: WeatherCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectLifecycleService.verify_weather_claim(
        db, req.project_id, req.claim_date, req.claimed_event, req.claimed_rainfall_mm, req.station_code or "IMD-DELHI-01"
    )

@router.post("/land-acquisition")
def track_land_acquisition(
    req: LandAcquisitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.track_land_acquisition(
        db, req.project_id, req.section_11_date, req.section_19_date, req.total_hectares,
        req.handed_over_hectares, req.compensation_escrow_inr, req.displaced_families, req.rehabilitated_families
    )

@router.post("/environmental-clearance")
def register_environmental_clearance(
    req: EnvClearanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.register_environmental_clearance(
        db, req.project_id, req.authority, req.clearance_type, req.reference_number,
        req.issue_date, req.valid_until, req.conditions_summary
    )

@router.post("/milestone-payment-trigger")
def evaluate_payment_trigger(
    req: PaymentTriggerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.evaluate_milestone_payment_trigger(
        db, req.project_id, req.milestone_id, req.tranche_amount
    )

@router.post("/dlp")
def register_defect_liability(
    req: DLPRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.register_dlp(
        db, req.project_id, req.warranty_years, req.start_date, req.end_date, req.linked_pbg_id
    )

@router.post("/asset-twin")
def register_asset_twin(
    req: AssetTwinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.convert_to_asset_digital_twin(
        db, req.project_id, req.asset_type, req.geojson_geometry, req.condition_score
    )

@router.post("/om-contract")
def register_om_contract(
    req: OMContractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.register_om_contract(
        db, req.asset_id, req.contractor_name, req.start_date, req.end_date, req.annual_maintenance_value_inr
    )

@router.post("/utilization-certificate")
def generate_utilization_certificate(
    req: UCGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.generate_utilization_certificate(
        db, req.project_id, req.financial_year, req.sanctioned_amount, req.actual_spent_amount, current_user.id
    )

@router.post("/dashboard-feed")
def syndicate_dashboard_feed(
    req: DashboardFeedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.syndicate_dashboard_feed(db, req.project_id, req.target_portal)

@router.post("/material-provenance")
def record_material_provenance(
    req: MaterialProvenanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.record_material_provenance(
        db, req.project_id, req.material_type, req.batch_number, req.heat_number, req.manufacturer,
        req.gst_irn, req.billed_quantity, req.received_quantity
    )

@router.post("/labor-attendance")
def record_labor_attendance(
    req: LaborAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.record_labor_attendance(
        db, req.project_id, req.attendance_date, req.nmms_muster_roll_id, req.aadhaar_verified_workers,
        req.biometric_auth_pct, req.billed_labor_days
    )

@router.post("/change-order")
def file_change_order(
    req: ChangeOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.file_change_order(
        db, req.project_id, req.original_contract_value, req.revised_contract_value,
        req.justification, req.clause_reference or "CPWD GCC Clause 12"
    )

@router.post("/emergency-pathway")
def invoke_emergency_pathway(
    req: EmergencyPathwayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return ProjectLifecycleService.invoke_emergency_pathway(
        db, req.project_id, req.disaster_type, req.invoking_authority
    )

@router.post("/mcc-freeze")
def set_mcc_freeze(
    req: MCCFreezeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin])),
):
    return ProjectLifecycleService.set_mcc_freeze(
        db, req.jurisdiction, req.election_name, req.freeze_start_date, req.freeze_end_date, req.is_active
    )
