"""
API Router for Pillar B.11: Sustainability & Environmental Compliance (4 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.sustainability_service import SustainabilityService

router = APIRouter(prefix="/api/sustainability", tags=["Sustainability & Environmental Compliance"])


class CarbonFootprintRequest(BaseModel):
    project_id: str
    cement_consumption_mt: float
    steel_consumption_mt: float
    bitumen_consumption_mt: float

class PlantationTrackerRequest(BaseModel):
    project_id: str
    trees_felled_count: int
    actual_planted_count: int
    satellite_verified_survival_rate_pct: float
    plantation_geofence_wkt: str

class WasteDisposalRequest(BaseModel):
    project_id: str
    waste_quantity_metric_tons: float
    authorized_recycling_facility: str
    transport_manifest_receipt_id: str

class ClimateRiskRequest(BaseModel):
    project_id: str
    hazard_zone_type: str
    vulnerability_score: float
    climate_resilience_design_mitigations: str


@router.post("/carbon/calculate")
def calculate_carbon_footprint(
    req: CarbonFootprintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return SustainabilityService.calculate_carbon_footprint(
        db, req.project_id, req.cement_consumption_mt, req.steel_consumption_mt, req.bitumen_consumption_mt
    )

@router.post("/plantation/track")
def track_compensatory_plantation(
    req: PlantationTrackerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return SustainabilityService.track_compensatory_plantation(
        db, req.project_id, req.trees_felled_count, req.actual_planted_count,
        req.satellite_verified_survival_rate_pct, req.plantation_geofence_wkt
    )

@router.post("/waste/log")
def log_waste_disposal(
    req: WasteDisposalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return SustainabilityService.log_waste_disposal(
        db, req.project_id, req.waste_quantity_metric_tons, req.authorized_recycling_facility, req.transport_manifest_receipt_id
    )

@router.post("/climate/tag")
def tag_climate_risk(
    req: ClimateRiskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return SustainabilityService.tag_climate_risk(
        db, req.project_id, req.hazard_zone_type, req.vulnerability_score, req.climate_resilience_design_mitigations
    )
