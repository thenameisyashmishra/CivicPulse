"""
Accountability API Router 🎯
Handles all 14 B.1 features: Digital Signatures, Liability Ledgers, Maker-Checker,
Contractor Registry, Blacklisting, AI Overrides, XAI, CAG Audit Packs, SLAs,
Vigilance ACB cases, Whistleblower channel, PBGs, COI engine, and Audit Diffs.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.db.models import (
    User,
    UserRole,
    ContractorRegistry,
    BlacklistRecommendation,
    AIOverrideRecord,
    EscalationMatrixRecord,
    VigilanceReferral,
    WhistleblowerTip,
    BankGuarantee,
    ConflictOfInterestDeclaration,
    AuditDiffLog,
    FinancialReleaseRequest,
)
from app.services.accountability_service import AccountabilityService

router = APIRouter(prefix="/api/accountability", tags=["Enterprise Accountability 🎯"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class ESignRequest(BaseModel):
    approval_step_id: int
    cert_serial: str = "DSC-GOV-2026-IN-9812"
    cert_issuer: str = "National Informatics Centre (NIC) Sub-CA, India"

class FinancialRaiseRequest(BaseModel):
    project_id: str
    amount: float = Field(..., gt=0)
    purpose: str
    maker_notes: Optional[str] = None
    tranche_number: int = 1

class FinancialApproveRequest(BaseModel):
    request_id: int
    decision: str  # "approved" or "rejected"
    remarks: str

class ContractorCreateRequest(BaseModel):
    name: str
    gstin: str
    pan: str
    registration_class: str = "Class A"
    contact_email: str
    avg_quality_score: float = 85.0
    on_time_rate: float = 90.0

class BlacklistDecisionRequest(BaseModel):
    decision: str  # "confirmed_blacklisted" or "rejected"
    authority_remarks: str

class AIOverrideCreateRequest(BaseModel):
    evidence_id: int
    override_decision: str  # "verified" or "failed"
    justification: str  # minimum 50 characters

class SLAEscalateRequest(BaseModel):
    item_type: str
    item_id: str
    assigned_role: str = "pradhan"

class VigilanceReferralRequest(BaseModel):
    project_id: str
    contractor_name: str
    fraud_severity: str = "high"
    allegation: str
    dossier_data: Optional[Dict[str, Any]] = None

class WhistleblowerTipRequest(BaseModel):
    category: str
    raw_tip: str
    project_id: Optional[str] = None

class PBGRegisterRequest(BaseModel):
    bg_number: str
    project_id: str
    contractor_id: int
    issuing_bank: str
    amount: float
    issue_date: str
    expiry_date: str
    claim_deadline: str

class PBGForfeitRequest(BaseModel):
    pbg_id: int
    reason: str

class COIDeclareRequest(BaseModel):
    contractor_id: int
    relationship_type: str
    details: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

# 1. Digital Signature (DSC/eSign) on Official Sign-offs
@router.post("/esign/sign")
def sign_step(
    body: ESignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        sig = AccountabilityService.sign_approval_step(
            db=db,
            approval_step_id=body.approval_step_id,
            signer=current_user,
            cert_serial=body.cert_serial,
            cert_issuer=body.cert_issuer,
        )
        return {
            "success": True,
            "signature_id": sig.id,
            "cert_serial": sig.cert_serial,
            "algorithm": sig.algorithm,
            "document_hash": sig.document_hash,
            "signature_envelope": sig.signature_value,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/esign/verify/{step_id}")
def verify_step_signature(step_id: int, db: Session = Depends(get_db)):
    return AccountabilityService.verify_digital_signature(db, step_id)


# 2. Personal Liability Ledger per Official
@router.get("/officials")
def get_officials_ledger(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    officials = db.execute(
        select(User).where(User.role.in_([UserRole.pradhan, UserRole.engineer, UserRole.admin]))
    ).scalars().all()
    results = []
    for off in officials:
        ledger = AccountabilityService.evaluate_official_liability(db, off.id)
        results.append({
            "user_id": off.id,
            "name": off.name,
            "email": off.email,
            "role": off.role.value,
            "officer_code": ledger.officer_code,
            "designation": ledger.designation,
            "total_signoffs": ledger.total_signoffs,
            "ai_overrides_count": ledger.ai_overrides_count,
            "accountability_score": ledger.accountability_score,
            "risk_tier": ledger.risk_tier,
            "last_evaluated_at": ledger.last_evaluated_at.isoformat() if ledger.last_evaluated_at else None,
        })
    return results


@router.get("/officials/{user_id}/ledger")
def get_single_official_ledger(user_id: int, db: Session = Depends(get_db)):
    try:
        ledger = AccountabilityService.evaluate_official_liability(db, user_id)
        return ledger
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 3. Maker-Checker (Two-Person Integrity) Rule on Financial Actions
@router.post("/financial/raise")
def raise_financial_release(
    body: FinancialRaiseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        req = AccountabilityService.raise_financial_request(
            db=db,
            project_id=body.project_id,
            amount=body.amount,
            purpose=body.purpose,
            maker=current_user,
            maker_notes=body.maker_notes,
            tranche_number=body.tranche_number,
        )
        return req
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/financial/approve")
def approve_financial_release(
    body: FinancialApproveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        req = AccountabilityService.approve_financial_request(
            db=db,
            request_id=body.request_id,
            checker=current_user,
            decision=body.decision,
            remarks=body.remarks,
        )
        return req
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/financial/requests")
def list_financial_requests(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(FinancialReleaseRequest)
    if project_id:
        query = query.where(FinancialReleaseRequest.project_id == project_id)
    records = db.execute(query).scalars().all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "project_id": r.project_id,
            "tranche_number": r.tranche_number,
            "amount": float(r.amount),
            "purpose": r.purpose,
            "maker_id": r.maker_id,
            "checker_id": r.checker_id,
            "status": r.status,
            "voucher_ref": r.voucher_ref,
            "maker_notes": r.maker_notes,
            "checker_remarks": r.checker_remarks,
            "raised_at": r.raised_at.isoformat() if r.raised_at else None,
            "checked_at": r.checked_at.isoformat() if r.checked_at else None,
        })
    return results


# 4. Contractor Performance Scorecard & Registry
@router.get("/contractors")
def list_contractors(db: Session = Depends(get_db)):
    contractors = db.execute(select(ContractorRegistry)).scalars().all()
    results = []
    for c in contractors:
        results.append({
            "id": c.id,
            "name": c.name,
            "gstin": c.gstin,
            "pan": c.pan,
            "registration_class": c.registration_class,
            "contact_email": c.contact_email,
            "total_projects": c.total_projects,
            "completed_projects": c.completed_projects,
            "on_time_rate": c.on_time_rate,
            "avg_quality_score": c.avg_quality_score,
            "composite_score": c.composite_score,
            "is_blacklisted": c.is_blacklisted,
            "blacklist_reason": c.blacklist_reason,
            "active_pbg_total": float(c.active_pbg_total or 0),
        })
    return results


@router.post("/contractors")
def register_contractor(
    body: ContractorCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    c = ContractorRegistry(
        name=body.name,
        gstin=body.gstin,
        pan=body.pan,
        registration_class=body.registration_class,
        contact_email=body.contact_email,
        avg_quality_score=body.avg_quality_score,
        on_time_rate=body.on_time_rate,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    AccountabilityService.recalculate_contractor_score(db, c.id)
    return c


@router.get("/contractors/{contractor_id}/scorecard")
def get_contractor_scorecard(contractor_id: int, db: Session = Depends(get_db)):
    try:
        c = AccountabilityService.recalculate_contractor_score(db, contractor_id)
        return c
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 5. Automated Contractor Blacklist Trigger
@router.get("/blacklist")
def list_blacklist_recommendations(db: Session = Depends(get_db)):
    recs = db.execute(select(BlacklistRecommendation)).scalars().all()
    results = []
    for r in recs:
        results.append({
            "id": r.id,
            "contractor_id": r.contractor_id,
            "trigger_score": r.trigger_score,
            "reasons": r.reasons,
            "fraud_count": r.fraud_count,
            "docket_hash": r.docket_hash,
            "status": r.status,
            "authority_remarks": r.authority_remarks,
            "recommended_at": r.recommended_at.isoformat() if r.recommended_at else None,
            "actioned_at": r.actioned_at.isoformat() if r.actioned_at else None,
        })
    return results


@router.post("/blacklist/evaluate/{contractor_id}")
def evaluate_contractor_for_blacklist(contractor_id: int, db: Session = Depends(get_db)):
    rec = AccountabilityService.evaluate_blacklist_trigger(db, contractor_id)
    if not rec:
        return {"status": "compliant", "message": "Contractor metrics meet statutory thresholds."}
    return {"status": "blacklist_triggered", "recommendation": rec}


@router.post("/blacklist/{rec_id}/decision")
def action_blacklist_decision(
    rec_id: int,
    body: BlacklistDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    rec = db.get(BlacklistRecommendation, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation docket not found.")

    rec.status = body.decision
    rec.authority_remarks = body.authority_remarks
    rec.actioned_at = AccountabilityService.utcnow() if hasattr(AccountabilityService, "utcnow") else None

    if body.decision == "confirmed_blacklisted":
        contractor = db.get(ContractorRegistry, rec.contractor_id)
        if contractor:
            contractor.is_blacklisted = True
            contractor.blacklist_reason = body.authority_remarks

    db.commit()
    db.refresh(rec)
    return rec


# 6. Human-in-the-Loop Override with Mandatory Justification
@router.post("/overrides")
def submit_ai_override(
    body: AIOverrideCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        rec = AccountabilityService.record_ai_override(
            db=db,
            evidence_id=body.evidence_id,
            official=current_user,
            override_decision=body.override_decision,
            justification=body.justification,
        )
        return rec
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/overrides")
def list_ai_overrides(evidence_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = select(AIOverrideRecord)
    if evidence_id:
        query = query.where(AIOverrideRecord.evidence_id == evidence_id)
    records = db.execute(query).scalars().all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "evidence_id": r.evidence_id,
            "official_id": r.official_id,
            "original_ai_score": r.original_ai_score,
            "original_ai_status": r.original_ai_status,
            "override_decision": r.override_decision,
            "justification": r.justification,
            "evidence_hash": r.evidence_hash,
            "audit_signature": r.audit_signature,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


# 7. Explainable AI (XAI) on Every Flag
@router.get("/xai/explain/{evidence_id}")
def explain_evidence_flag(evidence_id: int, db: Session = Depends(get_db)):
    try:
        return AccountabilityService.generate_xai_explanation(db, evidence_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 8. CAG / Departmental Audit Export Pack
@router.get("/audit-pack/{project_id}")
def export_cag_audit_pack(project_id: str, db: Session = Depends(get_db)):
    try:
        return AccountabilityService.generate_cag_audit_pack(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 9. Escalation Matrix with SLA Timers
@router.get("/escalations")
def list_sla_escalations(db: Session = Depends(get_db)):
    recs = db.execute(select(EscalationMatrixRecord)).scalars().all()
    results = []
    for r in recs:
        results.append({
            "id": r.id,
            "item_type": r.item_type,
            "item_id": r.item_id,
            "tier": r.tier,
            "assigned_to_role": r.assigned_to_role,
            "sla_deadline": r.sla_deadline.isoformat() if r.sla_deadline else None,
            "is_breached": r.is_breached,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


@router.post("/escalations/trigger")
def trigger_or_escalate_sla(body: SLAEscalateRequest, db: Session = Depends(get_db)):
    return AccountabilityService.register_or_escalate_sla(
        db=db, item_type=body.item_type, item_id=body.item_id, assigned_role=body.assigned_role
    )


# 10. Vigilance / Anti-Corruption Bureau (ACB) Referral Workflow
@router.post("/vigilance/refer")
def refer_to_vigilance(
    body: VigilanceReferralRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    try:
        ref = AccountabilityService.create_vigilance_referral(
            db=db,
            project_id=body.project_id,
            contractor_name=body.contractor_name,
            fraud_severity=body.fraud_severity,
            allegation=body.allegation,
            dossier_data=body.dossier_data,
        )
        return ref
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/vigilance/cases")
def list_vigilance_cases(db: Session = Depends(get_db)):
    cases = db.execute(select(VigilanceReferral)).scalars().all()
    results = []
    for c in cases:
        results.append({
            "id": c.id,
            "case_number": c.case_number,
            "project_id": c.project_id,
            "contractor_name": c.contractor_name,
            "fraud_severity": c.fraud_severity,
            "evidence_hash_chain": c.evidence_hash_chain,
            "allegation_summary": c.allegation_summary,
            "status": c.status,
            "referred_at": c.referred_at.isoformat() if c.referred_at else None,
        })
    return results


# 11. Whistleblower / Anonymous Fraud-Reporting Channel
@router.post("/whistleblower/submit")
def submit_whistleblower(body: WhistleblowerTipRequest, db: Session = Depends(get_db)):
    tip, token = AccountabilityService.submit_whistleblower_tip(
        db=db, category=body.category, raw_tip=body.raw_tip, project_id=body.project_id
    )
    return {
        "success": True,
        "tracking_code": token,
        "message": "Tip encrypted and anonymized. Store your tracking code to view progress.",
    }


@router.get("/whistleblower/track/{tracking_code}")
def track_whistleblower(tracking_code: str, db: Session = Depends(get_db)):
    res = AccountabilityService.track_whistleblower_tip(db, tracking_code)
    if not res:
        raise HTTPException(status_code=404, detail="Invalid tracking code.")
    return res


# 12. Performance Bank Guarantee (PBG) & Security-Deposit Tracker
@router.get("/pbg")
def list_bank_guarantees(
    project_id: Optional[str] = None,
    contractor_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = select(BankGuarantee)
    if project_id:
        query = query.where(BankGuarantee.project_id == project_id)
    if contractor_id:
        query = query.where(BankGuarantee.contractor_id == contractor_id)
    guarantees = db.execute(query).scalars().all()
    results = []
    for g in guarantees:
        results.append({
            "id": g.id,
            "bg_number": g.bg_number,
            "project_id": g.project_id,
            "contractor_id": g.contractor_id,
            "issuing_bank": g.issuing_bank,
            "amount": float(g.amount),
            "issue_date": g.issue_date,
            "expiry_date": g.expiry_date,
            "claim_deadline": g.claim_deadline,
            "status": g.status,
            "forfeiture_reason": g.forfeiture_reason,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        })
    return results


@router.post("/pbg")
def register_bank_guarantee(
    body: PBGRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return AccountabilityService.register_bank_guarantee(
        db=db,
        bg_number=body.bg_number,
        project_id=body.project_id,
        contractor_id=body.contractor_id,
        issuing_bank=body.issuing_bank,
        amount=body.amount,
        issue_date=body.issue_date,
        expiry_date=body.expiry_date,
        claim_deadline=body.claim_deadline,
    )


@router.post("/pbg/{id}/forfeit")
def forfeit_pbg(
    id: int,
    body: PBGForfeitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return AccountabilityService.trigger_pbg_forfeiture(db, id, body.reason)


# 13. Conflict-of-Interest Declaration & Auto-Check
@router.get("/coi/declarations")
def list_coi_declarations(db: Session = Depends(get_db)):
    decls = db.execute(select(ConflictOfInterestDeclaration)).scalars().all()
    return decls


@router.post("/coi/declare")
def declare_coi(
    body: COIDeclareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AccountabilityService.declare_conflict(
        db=db,
        official_id=current_user.id,
        contractor_id=body.contractor_id,
        rel_type=body.relationship_type,
        details=body.details,
    )


@router.get("/coi/check")
def check_coi(
    official_id: int,
    contractor_id: int,
    db: Session = Depends(get_db),
):
    return AccountabilityService.check_conflict(db, official_id, contractor_id)


# 14. Immutable Who Changed What Diff View on Every Record
@router.get("/audit-diffs")
def list_audit_diffs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(AuditDiffLog)
    if entity_type:
        query = query.where(AuditDiffLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditDiffLog.entity_id == entity_id)
    logs = db.execute(query).scalars().all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "action": l.action,
            "before_state": l.before_state,
            "after_state": l.after_state,
            "diff_summary": l.diff_summary,
            "signature_hash": l.signature_hash,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })
    return results
