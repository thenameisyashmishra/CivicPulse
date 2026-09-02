"""
API Router for Pillar B.8: Security, Compliance & Data Sovereignty (11 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.security_compliance_service import SecurityComplianceService

router = APIRouter(prefix="/api/security", tags=["Security, Compliance & Data Sovereignty"])


class VAPTReportRequest(BaseModel):
    cert_in_auditor_name: str
    report_reference_id: str
    report_sha256: str
    critical_vulns_count: int
    high_vulns_count: int
    medium_vulns_count: int

class DPDPConsentRequest(BaseModel):
    purpose_code: str
    consent_given: bool

class AdminActionLogRequest(BaseModel):
    action_type: str
    resource_type: str
    resource_id: str
    client_ip: Optional[str] = "127.0.0.1"

class RetentionPolicyRequest(BaseModel):
    record_category: str
    retention_period_years: int
    cag_mandate_reference: str
    auto_purge_enabled: bool
    archival_target_uri: str

class VaultSecretRequest(BaseModel):
    secret_path: str
    lease_duration_seconds: int
    auto_rotation_days: int

class ScopedTokenRequest(BaseModel):
    assigned_scopes: List[str]
    ttl_hours: Optional[int] = 24

class BugBountyRequest(BaseModel):
    researcher_pseudonym: str
    vulnerability_title: str
    severity: str
    cvss_score: float
    bounty_awarded_inr: Optional[float] = 0.0


@router.get("/sovereignty")
def get_data_sovereignty_status(db: Session = Depends(get_db)):
    return SecurityComplianceService.get_or_create_data_sovereignty(db)

@router.post("/vapt/report")
def register_vapt_audit(
    req: VAPTReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return SecurityComplianceService.register_vapt_audit(
        db, req.cert_in_auditor_name, req.report_reference_id, req.report_sha256,
        req.critical_vulns_count, req.high_vulns_count, req.medium_vulns_count
    )

@router.get("/gigw/manifest")
def get_gigw_manifest(db: Session = Depends(get_db)):
    return SecurityComplianceService.get_gigw_manifest(db)

@router.post("/dpdp/consent")
def manage_dpdp_consent(
    req: DPDPConsentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SecurityComplianceService.manage_dpdp_consent(
        db, current_user.id, req.purpose_code, req.consent_given
    )

@router.get("/encryption/meta")
def get_pii_encryption_meta(db: Session = Depends(get_db)):
    return SecurityComplianceService.get_pii_encryption_meta(db)

@router.post("/admin/audit-log")
def log_admin_action(
    req: AdminActionLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return SecurityComplianceService.log_admin_action(
        db, current_user.id, req.action_type, req.resource_type, req.resource_id, req.client_ip or "127.0.0.1"
    )

@router.post("/retention/policy")
def configure_retention_policy(
    req: RetentionPolicyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return SecurityComplianceService.configure_retention_policy(
        db, req.record_category, req.retention_period_years, req.cag_mandate_reference,
        req.auto_purge_enabled, req.archival_target_uri
    )

@router.get("/disaster-recovery/config")
def get_disaster_recovery_config(db: Session = Depends(get_db)):
    return SecurityComplianceService.get_disaster_recovery_config(db)

@router.post("/vault/secret")
def register_vault_secret(
    req: VaultSecretRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return SecurityComplianceService.register_vault_secret(
        db, req.secret_path, req.lease_duration_seconds, req.auto_rotation_days
    )

@router.post("/tokens/scoped")
def issue_scoped_token(
    req: ScopedTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return SecurityComplianceService.issue_scoped_token(
        db, current_user.id, req.assigned_scopes, req.ttl_hours or 24
    )

@router.post("/bug-bounty/submit")
def log_bug_bounty_submission(req: BugBountyRequest, db: Session = Depends(get_db)):
    return SecurityComplianceService.log_bug_bounty_submission(
        db, req.researcher_pseudonym, req.vulnerability_title, req.severity, req.cvss_score, req.bounty_awarded_inr or 0.0
    )
