"""
Transparency API Router 🔍
Handles all 13 B.2 features: Public Portal, OCDS 1.1 JSON, Budget-vs-Spend Variance,
CPGRAMS Sync, RTI 30-day Tracker, MGNREGA Social Audits, LAQ Linkage, Citizen Star Ratings,
Press Releases, Third-Party Audits, District Heatmap, Open Data Dev Portal, and Pre-Construction Disclosures.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.db.models import User, UserRole
from app.services.transparency_service import TransparencyService

router = APIRouter(prefix="/api/transparency", tags=["Enterprise Transparency 🔍"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class CPGRAMSFileRequest(BaseModel):
    project_id: str
    name: str
    contact: str
    category: str
    description: str

class CPGRAMSSyncRequest(BaseModel):
    registration_number: str
    status: str
    action_note: Optional[str] = None

class RTISubmitRequest(BaseModel):
    project_id: str
    applicant_name: str
    queries: List[str]
    pio_user_id: Optional[int] = None

class RTIRespondRequest(BaseModel):
    response_text: str

class SocialAuditScheduleRequest(BaseModel):
    project_id: str
    panchayat: str
    audit_date: str
    president: str

class SocialAuditMinutesRequest(BaseModel):
    quorum: int
    findings: List[str]
    resolutions: List[str]
    atr: Optional[str] = None

class LAQLinkRequest(BaseModel):
    house: str
    session_name: str
    question_number: int
    question_type: str
    member_name: str
    constituency: str
    subject: str
    linked_project_ids: List[str]

class CitizenReviewRequest(BaseModel):
    project_id: str
    durability: int = Field(..., ge=1, le=5)
    utility: int = Field(..., ge=1, le=5)
    speed: int = Field(..., ge=1, le=5)
    title: str
    comment: str

class ThirdPartyAuditRequest(BaseModel):
    project_id: str
    agency_name: str
    empanelment_code: str
    inspection_date: str
    core_test_data: Dict[str, Any] = {}
    compliance_score: float = Field(..., ge=0, le=100)
    quality_grade: str = "A"
    remarks: str

class APIKeyCreateRequest(BaseModel):
    client_name: str
    organization: str
    tier: str = "public"

class PreConstructionCreateRequest(BaseModel):
    project_id: str
    dpr_reference: str
    sanctioning_authority: str
    sanction_order_date: str
    environmental_clearance_status: str
    land_acquisition_status: str
    boq_key_items: List[Dict[str, Any]] = []
    baseline_duration_days: int
    public_consultation_date: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

# 1. Public Read-Only Transparency Portal (No Login)
@router.get("/public/projects")
def get_public_projects(
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return TransparencyService.get_public_projects_catalog(
        db=db, search=search, project_type=type, status=status, limit=limit, offset=offset
    )


@router.get("/public/projects/{project_id}")
def get_public_project_details(project_id: str, db: Session = Depends(get_db)):
    res = TransparencyService.get_public_project_detail(db, project_id)
    if not res:
        raise HTTPException(status_code=404, detail="Project not found.")
    return res


# 2. Open Contracting Data Standard (OCDS 1.1) Compliance
@router.get("/ocds/releases")
def get_ocds_releases(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return TransparencyService.generate_ocds_release_package(db, project_id)


# 3. Real-Time Budget-vs-Spend Variance Dashboard (Public)
@router.get("/budget-variance")
def get_budget_variance_analytics(db: Session = Depends(get_db)):
    return TransparencyService.compute_budget_variance_analytics(db)


# 4. CPGRAMS Integration (Centralized Public Grievance system)
@router.post("/cpgrams/file")
def file_cpgrams(body: CPGRAMSFileRequest, db: Session = Depends(get_db)):
    return TransparencyService.file_cpgrams_grievance(
        db=db,
        project_id=body.project_id,
        name=body.name,
        contact=body.contact,
        category=body.category,
        description=body.description,
    )


@router.post("/cpgrams/sync")
def sync_cpgrams(
    body: CPGRAMSSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    try:
        return TransparencyService.sync_cpgrams_status(
            db=db,
            reg_no=body.registration_number,
            status=body.status,
            action_note=body.action_note,
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/cpgrams/list")
def list_cpgrams(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.db.models import CPGRAMSGrievance
    query = select(CPGRAMSGrievance)
    if project_id:
        query = query.where(CPGRAMSGrievance.project_id == project_id)
    records = db.execute(query).scalars().all()
    return records


# 5. RTI Request Intake & Statutory-Timeline Tracker
@router.post("/rti/submit")
def submit_rti(body: RTISubmitRequest, db: Session = Depends(get_db)):
    return TransparencyService.submit_rti_request(
        db=db,
        project_id=body.project_id,
        applicant_name=body.applicant_name,
        queries=body.queries,
        pio_user_id=body.pio_user_id,
    )


@router.get("/rti/requests")
def list_rti_requests(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return TransparencyService.get_rti_tracking_list(db, project_id)


@router.post("/rti/{id}/respond")
def respond_to_rti(
    id: int,
    body: RTIRespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.db.models import RTIRequest
    r = db.get(RTIRequest, id)
    if not r:
        raise HTTPException(status_code=404, detail="RTI Request not found.")
    r.response_text = body.response_text
    r.status = "information_provided"
    from datetime import datetime, timezone
    r.disposed_at = datetime.now(timezone.utc)
    r.pio_officer_id = current_user.id
    db.commit()
    db.refresh(r)
    return r


# 6. MGNREGA-Style Social Audit Module
@router.post("/social-audit/schedule")
def schedule_audit(
    body: SocialAuditScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TransparencyService.schedule_social_audit(
        db=db,
        project_id=body.project_id,
        panchayat=body.panchayat,
        audit_date=body.audit_date,
        president=body.president,
    )


@router.post("/social-audit/{id}/minutes")
def record_audit_minutes(
    id: int,
    body: SocialAuditMinutesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return TransparencyService.record_social_audit_minutes(
            db=db,
            audit_id=id,
            quorum=body.quorum,
            findings=body.findings,
            resolutions=body.resolutions,
            atr=body.atr,
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/social-audit")
def list_social_audits(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.db.models import SocialAuditRecord
    query = select(SocialAuditRecord)
    if project_id:
        query = query.where(SocialAuditRecord.project_id == project_id)
    return db.execute(query).scalars().all()


# 7. Legislative Assembly Question (LAQ) Linkage
@router.post("/laq/link")
def link_laq(
    body: LAQLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return TransparencyService.link_legislative_question(
        db=db,
        house=body.house,
        session_name=body.session_name,
        q_num=body.question_number,
        q_type=body.question_type,
        member=body.member_name,
        constituency=body.constituency,
        subject=body.subject,
        linked_project_ids=body.linked_project_ids,
    )


@router.get("/laq/list")
def list_laq(db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.db.models import LegislativeQuestion
    return db.execute(select(LegislativeQuestion)).scalars().all()


@router.get("/laq/{id}/dossier")
def get_laq_dossier(id: int, db: Session = Depends(get_db)):
    try:
        return TransparencyService.compile_laq_dossier(db, id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 8. Public Star-Rating & Citizen Review per Completed Project
@router.post("/reviews/rate")
def rate_project(
    body: CitizenReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TransparencyService.submit_citizen_project_review(
        db=db,
        project_id=body.project_id,
        citizen_id=current_user.id,
        durability=body.durability,
        utility=body.utility,
        speed=body.speed,
        title=body.title,
        comment=body.comment,
    )


@router.get("/reviews/{project_id}")
def get_project_reviews(project_id: str, db: Session = Depends(get_db)):
    return TransparencyService.get_project_reviews_aggregate(db, project_id)


# 9. Auto-Generated Press/Media Release on Milestone Completion
@router.get("/press-releases/{project_id}")
def get_press_release(project_id: str, db: Session = Depends(get_db)):
    try:
        return TransparencyService.generate_press_release(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# 10. Third-Party Independent Audit Agency Portal
@router.post("/third-party-audit")
def create_third_party_audit(
    body: ThirdPartyAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return TransparencyService.submit_third_party_audit(
        db=db,
        project_id=body.project_id,
        agency_name=body.agency_name,
        empanelment_code=body.empanelment_code,
        inspection_date=body.inspection_date,
        core_test_data=body.core_test_data,
        compliance_score=body.compliance_score,
        quality_grade=body.quality_grade,
        remarks=body.remarks,
    )


@router.get("/third-party-audit/{project_id}")
def get_third_party_audits(project_id: str, db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.db.models import ThirdPartyAudit
    return db.execute(
        select(ThirdPartyAudit).where(ThirdPartyAudit.project_id == project_id)
    ).scalars().all()


# 11. Public Corruption/Quality Heat-Map by District
@router.get("/heatmap/districts")
def get_district_heatmap(db: Session = Depends(get_db)):
    return TransparencyService.get_district_risk_heatmap(db)


# 12. Open Data API + Developer Portal
@router.post("/developer/keys")
def generate_api_key(
    body: APIKeyCreateRequest,
    db: Session = Depends(get_db),
):
    reg, key = TransparencyService.register_api_key(
        db=db, client_name=body.client_name, organization=body.organization, tier=body.tier
    )
    return {
        "client_name": reg.client_name,
        "organization": reg.organization,
        "tier": reg.tier,
        "rate_limit_per_min": reg.rate_limit_per_min,
        "api_key": key,
        "note": "Save your API key securely. It will not be displayed again.",
    }


@router.get("/developer/catalog")
def get_open_data_catalog():
    return {
        "catalog_title": "CivicPulse Open Data Portal API (v1.0)",
        "standards": ["Open Contracting Data Standard (OCDS 1.1)", "GeoJSON RFC 7946"],
        "endpoints": [
            {"path": "/api/transparency/public/projects", "description": "Public verified projects list"},
            {"path": "/api/transparency/ocds/releases", "description": "OCDS 1.1 JSON format release package"},
            {"path": "/api/transparency/budget-variance", "description": "Real-time macro budget variance data"},
            {"path": "/api/transparency/heatmap/districts", "description": "District anomaly and quality risk scores"},
        ],
    }


# 13. Pre-Construction Disclosure
@router.post("/pre-construction")
def create_pre_construction_disclosure(
    body: PreConstructionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return TransparencyService.publish_pre_construction_disclosure(
        db=db,
        project_id=body.project_id,
        dpr_ref=body.dpr_reference,
        authority=body.sanctioning_authority,
        sanction_date=body.sanction_order_date,
        env_status=body.environmental_clearance_status,
        land_status=body.land_acquisition_status,
        boq_items=body.boq_key_items,
        duration_days=body.baseline_duration_days,
        consultation_date=body.public_consultation_date,
    )


@router.get("/pre-construction")
def list_pre_construction_disclosures(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return TransparencyService.get_pre_construction_disclosures(db, project_id)
