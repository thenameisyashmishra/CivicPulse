"""
API Router for Pillar B.9: Platform Scale & Multi-Tenancy (7 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.multi_tenancy_service import MultiTenancyService

router = APIRouter(prefix="/api/tenants", tags=["Platform Scale & Multi-Tenancy"])


class TenantCreateRequest(BaseModel):
    tenant_code: str
    tenant_name: str
    tier_level: str
    state_code: str
    parent_tenant_id: Optional[int] = None

class ApprovalWorkflowRequest(BaseModel):
    tenant_id: int
    work_category: str
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    financial_threshold_ceiling: float

class WhiteLabelRequest(BaseModel):
    tenant_id: int
    portal_title: str
    state_emblem_uri: str
    primary_accent_color: str
    custom_domain_cname: str
    footer_text: str

class EofficeSSORequest(BaseModel):
    tenant_id: int
    idp_entity_id: str
    sso_url: str
    x509_certificate_fingerprint: str

class LocaleTranslationRequest(BaseModel):
    language_code: str
    language_name: str
    namespace: str
    translations: Dict[str, Any]

class FeatureFlagRequest(BaseModel):
    tenant_id: int
    module_key: str
    is_enabled: bool
    custom_parameters: Dict[str, Any] = Field(default_factory=dict)


@router.post("/hierarchy")
def create_tenant_node(
    req: TenantCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.create_tenant_node(
        db, req.tenant_code, req.tenant_name, req.tier_level, req.state_code, req.parent_tenant_id
    )

@router.get("/hierarchy")
def list_tenants(db: Session = Depends(get_db)):
    return MultiTenancyService.list_tenants(db)

@router.post("/workflow")
def configure_approval_workflow(
    req: ApprovalWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.configure_approval_workflow(
        db, req.tenant_id, req.work_category, req.steps, req.financial_threshold_ceiling
    )

@router.post("/white-label")
def configure_white_label(
    req: WhiteLabelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.configure_white_label(
        db, req.tenant_id, req.portal_title, req.state_emblem_uri, req.primary_accent_color,
        req.custom_domain_cname, req.footer_text
    )

@router.post("/sso")
def configure_eoffice_sso(
    req: EofficeSSORequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.configure_eoffice_sso(
        db, req.tenant_id, req.idp_entity_id, req.sso_url, req.x509_certificate_fingerprint
    )

@router.post("/locale")
def register_locale_translations(
    req: LocaleTranslationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.register_locale_translations(
        db, req.language_code, req.language_name, req.namespace, req.translations
    )

@router.post("/feature-flag")
def set_tenant_feature_flag(
    req: FeatureFlagRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return MultiTenancyService.set_tenant_feature_flag(
        db, req.tenant_id, req.module_key, req.is_enabled, req.custom_parameters
    )

@router.get("/shard/meta")
def get_shard_scaling_meta(shard_name: str = "SHARD-NORTH-01", db: Session = Depends(get_db)):
    return MultiTenancyService.get_shard_scaling_meta(db, shard_name)
