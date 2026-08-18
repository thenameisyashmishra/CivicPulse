from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import ApprovalDecision, ApprovalLevel, EvidenceStatus, ProjectStatus, UserRole, VoteChoice

# ---------------------------------------------------------------------------
# Auth / Users
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.citizen


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole
    aadhaar_verified: bool = False
    aadhaar_last_4: str | None = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class DigiLockerVerifyIn(BaseModel):
    aadhaar_number: str = Field(description="12 digit Aadhaar number")
    otp_code: str = Field(description="6-digit OTP code")


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordVerify(BaseModel):
    email: EmailStr
    mfa_code: str = Field(min_length=6, max_length=6, description="6-digit email verification code")
    new_password: str = Field(min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    id: str = Field(min_length=3, max_length=32, description="Human-readable ID, e.g. PW-2024-007")
    name: str
    type: str
    location: str
    contractor: str
    budget: float = Field(gt=0)
    spent: float = 0
    progress: int = Field(default=0, ge=0, le=100)
    status: ProjectStatus = ProjectStatus.active
    start_date: str
    end_date: str
    lat: float
    lng: float


class ProjectUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    location: str | None = None
    contractor: str | None = None
    budget: float | None = None
    spent: float | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    status: ProjectStatus | None = None
    end_date: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    location: str
    contractor: str
    budget: float
    spent: float
    progress: int
    status: ProjectStatus
    start_date: str
    end_date: str
    lat: float
    lng: float
    image_count: int = 0
    verified_count: int = 0


# ---------------------------------------------------------------------------
# Approval steps
# ---------------------------------------------------------------------------


class ApprovalStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    level: ApprovalLevel
    decision: ApprovalDecision
    reviewer_id: int | None
    remarks: str | None
    decided_at: datetime | None
    created_at: datetime


class ApprovalDecisionIn(BaseModel):
    decision: ApprovalDecision = Field(description="approved | rejected | escalated")
    remarks: str | None = Field(default=None, max_length=500)


# ---------------------------------------------------------------------------
# Evidence / AI verification
# ---------------------------------------------------------------------------


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    uploaded_by_id: int
    image_path: str
    caption: str | None
    gps_lat: float | None
    gps_lng: float | None
    captured_at: str | None
    distance_from_site_m: float | None
    within_geofence: bool | None
    phash: str | None
    is_duplicate: bool
    duplicate_of_id: int | None
    quality_score: float | None
    completion_estimate: float | None
    ai_confidence: float | None
    ai_status: EvidenceStatus
    ai_findings: list[str]
    ai_analysis: str | None
    status: EvidenceStatus
    created_at: datetime
    approval_steps: list[ApprovalStepOut] = []
    vote_summary: dict[str, int] = {}


class EvidenceListItem(BaseModel):
    """Lighter payload for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    status: EvidenceStatus
    ai_confidence: float | None
    is_duplicate: bool
    within_geofence: bool | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Votes
# ---------------------------------------------------------------------------


class VoteCreate(BaseModel):
    choice: VoteChoice
    comment: str | None = Field(default=None, max_length=500)


class VoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evidence_id: int
    citizen_id: int
    choice: VoteChoice
    comment: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Dashboard / Reports
# ---------------------------------------------------------------------------


class DashboardStats(BaseModel):
    active_projects: int
    completed_projects: int
    total_projects: int
    budget_allocated: float
    budget_spent: float
    budget_utilization_pct: float
    verifications_total: int
    verifications_verified: int
    verifications_failed: int
    average_progress: float


class BudgetSummaryRow(BaseModel):
    project_id: str
    name: str
    allocated: float
    spent: float
    remaining: float
    utilization_pct: float
    status: ProjectStatus


class VerificationOutcomeCounts(BaseModel):
    verified: int
    pending: int
    failed: int
    review: int


class MapPoint(BaseModel):
    id: str
    name: str
    status: ProjectStatus
    lat: float
    lng: float
