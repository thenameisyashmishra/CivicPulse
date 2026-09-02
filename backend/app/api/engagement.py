"""
API Router for Pillar B.6: Citizen Engagement & Grievance Redressal (9 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.citizen_engagement_service import CitizenEngagementService

router = APIRouter(prefix="/api/engagement", tags=["Citizen Engagement & Grievance Redressal"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class WhatsAppMsgRequest(BaseModel):
    phone_number: str
    message_text: str
    language: Optional[str] = "hi"

class SMSCommandRequest(BaseModel):
    phone_number: str
    raw_sms: str

class VoiceGrievanceRequest(BaseModel):
    project_id: str
    audio_path: str
    duration_seconds: float
    language: Optional[str] = "hi-IN"

class NLPCategorizeRequest(BaseModel):
    grievance_id: int
    complaint_text: str

class SentimentRecordRequest(BaseModel):
    district_name: str
    panchayat_name: str
    positive_ratio: float
    negative_ratio: float

class SLAAssignRequest(BaseModel):
    grievance_id: int
    officer_id: int
    designation: str
    days_allowed: Optional[int] = 15

class CharterTrackRequest(BaseModel):
    department_name: str
    service_name: str
    target_days: int
    actual_days: float

class UMANGRegisterRequest(BaseModel):
    service_code: str
    endpoint_url: str
    schema_definition: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.post("/whatsapp/message")
def handle_whatsapp_message(req: WhatsAppMsgRequest, db: Session = Depends(get_db)):
    return CitizenEngagementService.handle_whatsapp_message(
        db, req.phone_number, req.message_text, req.language or "hi"
    )

@router.post("/sms/command")
def handle_sms_command(req: SMSCommandRequest, db: Session = Depends(get_db)):
    return CitizenEngagementService.handle_sms_command(db, req.phone_number, req.raw_sms)

@router.post("/voice/grievance")
def ingest_voice_grievance(req: VoiceGrievanceRequest, db: Session = Depends(get_db)):
    return CitizenEngagementService.ingest_voice_grievance(
        db, req.project_id, req.audio_path, req.duration_seconds, req.language or "hi-IN"
    )

@router.post("/nlp/categorize")
def categorize_complaint_nlp(req: NLPCategorizeRequest, db: Session = Depends(get_db)):
    return CitizenEngagementService.categorize_complaint_nlp(db, req.grievance_id, req.complaint_text)

@router.post("/sentiment/record")
def record_regional_sentiment(req: SentimentRecordRequest, db: Session = Depends(get_db)):
    return CitizenEngagementService.compute_regional_sentiment(
        db, req.district_name, req.panchayat_name, req.positive_ratio, req.negative_ratio
    )

@router.post("/sla/assign")
def assign_grievance_sla(
    req: SLAAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return CitizenEngagementService.assign_grievance_sla(
        db, req.grievance_id, req.officer_id, req.designation, req.days_allowed or 15
    )

@router.post("/charter/track")
def track_citizen_charter(
    req: CharterTrackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin])),
):
    return CitizenEngagementService.track_citizen_charter(
        db, req.department_name, req.service_name, req.target_days, req.actual_days
    )

@router.post("/umang/register")
def register_umang_service(
    req: UMANGRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin])),
):
    return CitizenEngagementService.register_umang_service(
        db, req.service_code, req.endpoint_url, req.schema_definition
    )

@router.get("/accessibility/manifest")
def get_accessibility_manifest():
    return CitizenEngagementService.get_accessibility_manifest()
