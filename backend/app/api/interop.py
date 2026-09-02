"""
API Router for Pillar B.7: Interoperability & Government Integration (8 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.interoperability_service import InteroperabilityService

router = APIRouter(prefix="/api/interop", tags=["Interoperability & Government Integration"])


class DigiLockerKycRequest(BaseModel):
    digilocker_id: str
    aadhaar_last_4: str
    doc_uris: List[str] = Field(default_factory=list)

class PFMSReconcileRequest(BaseModel):
    project_id: str
    sanction_order_number: str
    pfms_tranche_id: str
    disbursed_amount_inr: float
    dbt_beneficiary_count: int

class GeMContractorRequest(BaseModel):
    contractor_id: int
    gem_seller_id: str

class EGApiConsumerRequest(BaseModel):
    consumer_system_name: str
    oauth2_client_id: str
    allowed_namespaces: List[str]

class GISLandParcelRequest(BaseModel):
    project_id: str
    khasra_number: str
    state_land_record_code: str
    bhu_naksha_geometry_wkt: str

class NADSyncRequest(BaseModel):
    project_id: str
    asset_category_code: str
    panchayat_lgd_code: int

class GSTEWayBillRequest(BaseModel):
    project_id: str
    gstin_supplier: str
    eway_bill_number: str
    consignment_value_inr: float
    vehicle_number: str

class StateTreasuryRequest(BaseModel):
    project_id: str
    state_code: str
    ddo_code: str
    treasury_bill_number: str
    passed_amount_inr: float


@router.post("/digilocker/kyc")
def verify_digilocker_kyc(
    req: DigiLockerKycRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InteroperabilityService.verify_digilocker_kyc(
        db, current_user.id, req.digilocker_id, req.aadhaar_last_4, req.doc_uris
    )

@router.post("/pfms/reconcile")
def reconcile_pfms_tranche(
    req: PFMSReconcileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.reconcile_pfms_tranche(
        db, req.project_id, req.sanction_order_number, req.pfms_tranche_id, req.disbursed_amount_inr, req.dbt_beneficiary_count
    )

@router.post("/gem/contractor")
def pull_gem_contractor_profile(
    req: GeMContractorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.pull_gem_contractor_profile(db, req.contractor_id, req.gem_seller_id)

@router.post("/egov/gateway")
def register_egov_api_consumer(
    req: EGApiConsumerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return InteroperabilityService.register_egov_api_consumer(
        db, req.consumer_system_name, req.oauth2_client_id, req.allowed_namespaces
    )

@router.post("/gis/land-parcel")
def overlay_gis_land_parcel(
    req: GISLandParcelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.overlay_gis_land_parcel(
        db, req.project_id, req.khasra_number, req.state_land_record_code, req.bhu_naksha_geometry_wkt
    )

@router.post("/nad/sync")
def sync_national_asset_directory(
    req: NADSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.sync_national_asset_directory(
        db, req.project_id, req.asset_category_code, req.panchayat_lgd_code
    )

@router.post("/gst/eway-bill")
def verify_gst_eway_bill(
    req: GSTEWayBillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.verify_gst_eway_bill(
        db, req.project_id, req.gstin_supplier, req.eway_bill_number, req.consignment_value_inr, req.vehicle_number
    )

@router.post("/treasury/hook")
def hook_state_treasury_ifms(
    req: StateTreasuryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return InteroperabilityService.hook_state_treasury_ifms(
        db, req.project_id, req.state_code, req.ddo_code, req.treasury_bill_number, req.passed_amount_inr
    )
