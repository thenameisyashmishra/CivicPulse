"""
SQLAlchemy ORM models with Enterprise Production-Grade High-Scale Indexing.

Schema overview
----------------
User        -> citizens, gram pradhans, VDO/engineers, and admins.
Project     -> a public-works project (road, drain, school, etc.)
Evidence    -> a geotagged photo submitted as proof of progress/completion,
               plus the result of the AI verification pipeline
                 (GPS/EXIF check, duplicate/perceptual-hash check,
                  quality + completion heuristics).
Vote        -> a citizen's completed/incomplete vote on a piece of evidence.
ApprovalStep-> one row per stage of the Pradhan -> Engineer -> Admin
               multi-level approval chain, forming the audit trail.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    citizen = "citizen"
    pradhan = "pradhan"
    engineer = "engineer"
    admin = "admin"


class ProjectStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    delayed = "delayed"
    flagged = "flagged"


class VoteChoice(str, enum.Enum):
    completed = "completed"
    incomplete = "incomplete"


class ApprovalLevel(str, enum.Enum):
    pradhan = "pradhan"
    engineer = "engineer"
    admin = "admin"


class ApprovalDecision(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    escalated = "escalated"


class EvidenceStatus(str, enum.Enum):
    pending = "pending"
    review = "review"
    verified = "verified"
    failed = "failed"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role_active", "role", "is_active"),
        Index("ix_users_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.citizen)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    aadhaar_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    aadhaar_last_4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

    evidence_uploads: Mapped[list["Evidence"]] = relationship(back_populates="uploaded_by", foreign_keys="Evidence.uploaded_by_id")
    votes: Mapped[list["Vote"]] = relationship(back_populates="citizen")


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_projects_status_created", "status", "created_at"),
        Index("ix_projects_type_status", "type", "status"),
        Index("ix_projects_lat_lng", "lat", "lng"),
    )

    # Human-readable IDs like "PW-2024-001"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(200))
    contractor: Mapped[str] = mapped_column(String(200))
    budget: Mapped[float] = mapped_column(Numeric(15, 2))
    spent: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.active)
    start_date: Mapped[str] = mapped_column(String(20))
    end_date: Mapped[str] = mapped_column(String(20))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    evidence: Mapped[list["Evidence"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (
        Index("ix_evidence_project_status", "project_id", "status"),
        Index("ix_evidence_uploaded_by", "uploaded_by_id"),
        Index("ix_evidence_phash", "phash"),
        Index("ix_evidence_gps", "gps_lat", "gps_lng"),
        Index("ix_evidence_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    image_path: Mapped[str] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # --- GPS / EXIF verification ---
    gps_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    captured_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    distance_from_site_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    within_geofence: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # --- Duplicate detection (perceptual hash) ---
    phash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"), nullable=True)

    # --- AI analysis result ---
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completion_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_status: Mapped[EvidenceStatus] = mapped_column(Enum(EvidenceStatus), default=EvidenceStatus.pending)
    ai_findings: Mapped[list] = mapped_column(JSON, default=list)
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Overall workflow status ---
    status: Mapped[EvidenceStatus] = mapped_column(Enum(EvidenceStatus), default=EvidenceStatus.pending)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="evidence")
    uploaded_by: Mapped["User"] = relationship(back_populates="evidence_uploads", foreign_keys=[uploaded_by_id])
    votes: Mapped[list["Vote"]] = relationship(back_populates="evidence", cascade="all, delete-orphan")
    approval_steps: Mapped[list["ApprovalStep"]] = relationship(
        back_populates="evidence", cascade="all, delete-orphan", order_by="ApprovalStep.id"
    )


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        UniqueConstraint("evidence_id", "citizen_id", name="uq_one_vote_per_citizen"),
        Index("ix_votes_evidence_choice", "evidence_id", "choice"),
        Index("ix_votes_citizen_id", "citizen_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    choice: Mapped[VoteChoice] = mapped_column(Enum(VoteChoice))
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

    evidence: Mapped["Evidence"] = relationship(back_populates="votes")
    citizen: Mapped["User"] = relationship(back_populates="votes")


class ApprovalStep(Base):
    """One row per stage in the Pradhan -> Engineer -> Admin chain."""

    __tablename__ = "approval_steps"
    __table_args__ = (
        Index("ix_approval_evidence_level", "evidence_id", "level"),
        Index("ix_approval_reviewer_decision", "reviewer_id", "decision"),
        Index("ix_approval_created_at", "created_at"),
        Index("ix_approval_block_hash", "block_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    level: Mapped[ApprovalLevel] = mapped_column(Enum(ApprovalLevel))
    decision: Mapped[ApprovalDecision] = mapped_column(Enum(ApprovalDecision), default=ApprovalDecision.pending)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

    # --- Cryptographic Audit Ledger Fields ---
    block_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    signature: Mapped[str | None] = mapped_column(String(128), nullable=True)

    evidence: Mapped["Evidence"] = relationship(back_populates="approval_steps")
    reviewer: Mapped["User | None"] = relationship(foreign_keys=[reviewer_id])


# =====================================================================
# B.1 ACCOUNTABILITY 🎯 MODELS
# =====================================================================

class DigitalSignature(Base):
    """IT Act-compliant electronic / digital signature on official sign-offs."""
    __tablename__ = "digital_signatures"
    __table_args__ = (
        Index("ix_digital_signatures_step", "approval_step_id"),
        Index("ix_digital_signatures_signer", "signer_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    approval_step_id: Mapped[int] = mapped_column(ForeignKey("approval_steps.id"))
    signer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    cert_serial: Mapped[str] = mapped_column(String(64))
    cert_issuer: Mapped[str] = mapped_column(String(200))
    signer_dn: Mapped[str] = mapped_column(String(300))
    document_hash: Mapped[str] = mapped_column(String(64))  # SHA-256
    signature_value: Mapped[str] = mapped_column(Text)
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    algorithm: Mapped[str] = mapped_column(String(50), default="SHA256withRSA")
    signed_attributes: Mapped[dict] = mapped_column(JSON, default=dict)


class OfficialLiabilityLedger(Base):
    """Personal liability ledger per official with running accountability score."""
    __tablename__ = "official_liability_ledger"
    __table_args__ = (
        Index("ix_liability_user", "user_id"),
        Index("ix_liability_score", "accountability_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    officer_code: Mapped[str] = mapped_column(String(50), unique=True)
    designation: Mapped[str] = mapped_column(String(100))
    department: Mapped[str] = mapped_column(String(100))
    total_signoffs: Mapped[int] = mapped_column(Integer, default=0)
    ai_overrides_count: Mapped[int] = mapped_column(Integer, default=0)
    overturned_decisions: Mapped[int] = mapped_column(Integer, default=0)
    accountability_score: Mapped[float] = mapped_column(Float, default=100.0)
    risk_tier: Mapped[str] = mapped_column(String(20), default="low")  # low, medium, high, critical
    last_evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class FinancialReleaseRequest(Base):
    """Maker-checker (two-person integrity) rule on financial actions."""
    __tablename__ = "financial_release_requests"
    __table_args__ = (
        Index("ix_financial_proj_status", "project_id", "status"),
        Index("ix_financial_maker", "maker_id"),
        Index("ix_financial_checker", "checker_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    tranche_number: Mapped[int] = mapped_column(Integer, default=1)
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    purpose: Mapped[str] = mapped_column(String(255))
    maker_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    checker_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending_checker")  # draft, pending_checker, approved, rejected
    maker_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    checker_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    raised_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    voucher_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)


class ContractorRegistry(Base):
    """Contractor performance scorecard & registry."""
    __tablename__ = "contractor_registry"
    __table_args__ = (
        Index("ix_contractor_gstin", "gstin"),
        Index("ix_contractor_score", "composite_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    gstin: Mapped[str] = mapped_column(String(15), unique=True)
    pan: Mapped[str] = mapped_column(String(10))
    registration_class: Mapped[str] = mapped_column(String(50))  # Class A, Class B, Class C
    contact_email: Mapped[str] = mapped_column(String(255))
    total_projects: Mapped[int] = mapped_column(Integer, default=0)
    completed_projects: Mapped[int] = mapped_column(Integer, default=0)
    on_time_rate: Mapped[float] = mapped_column(Float, default=100.0)
    avg_quality_score: Mapped[float] = mapped_column(Float, default=85.0)
    composite_score: Mapped[float] = mapped_column(Float, default=90.0)  # 0 - 100
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False)
    blacklist_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_pbg_total: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class BlacklistRecommendation(Base):
    """Automated contractor blacklist trigger recommendation docket."""
    __tablename__ = "blacklist_recommendations"
    __table_args__ = (
        Index("ix_blacklist_contractor", "contractor_id"),
        Index("ix_blacklist_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contractor_id: Mapped[int] = mapped_column(ForeignKey("contractor_registry.id"))
    trigger_score: Mapped[float] = mapped_column(Float)
    reasons: Mapped[list] = mapped_column(JSON, default=list)
    fraud_count: Mapped[int] = mapped_column(Integer, default=0)
    docket_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="pending_review")  # pending_review, confirmed_blacklisted, rejected
    authority_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    actioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AIOverrideRecord(Base):
    """Human-in-the-loop override with mandatory justification."""
    __tablename__ = "ai_override_records"
    __table_args__ = (
        Index("ix_override_evidence", "evidence_id"),
        Index("ix_override_official", "official_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    official_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    original_ai_score: Mapped[float] = mapped_column(Float)
    original_ai_status: Mapped[str] = mapped_column(String(30))
    override_decision: Mapped[str] = mapped_column(String(30))
    justification: Mapped[str] = mapped_column(Text)  # min 50 chars required
    evidence_hash: Mapped[str] = mapped_column(String(64))
    audit_signature: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EscalationMatrixRecord(Base):
    """Escalation matrix with SLA timers (Pradhan -> BDO -> District Collector)."""
    __tablename__ = "escalation_matrix_records"
    __table_args__ = (
        Index("ix_escalation_status_deadline", "status", "sla_deadline"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_type: Mapped[str] = mapped_column(String(50))  # review, grievance, rti
    item_id: Mapped[str] = mapped_column(String(64))
    tier: Mapped[int] = mapped_column(Integer, default=1)  # 1: Pradhan, 2: BDO, 3: Collector
    assigned_to_role: Mapped[str] = mapped_column(String(50))
    sla_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_breached: Mapped[bool] = mapped_column(Boolean, default=False)
    breach_logged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated_to_tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")  # open, escalated, resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class VigilanceReferral(Base):
    """Vigilance / Anti-Corruption Bureau referral case."""
    __tablename__ = "vigilance_referrals"
    __table_args__ = (
        Index("ix_vigilance_case_no", "case_number"),
        Index("ix_vigilance_project", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_number: Mapped[str] = mapped_column(String(64), unique=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    contractor_name: Mapped[str] = mapped_column(String(200))
    fraud_severity: Mapped[str] = mapped_column(String(30))  # medium, high, critical
    evidence_hash_chain: Mapped[str] = mapped_column(Text)
    allegation_summary: Mapped[str] = mapped_column(Text)
    dossier_data: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="drafted")  # drafted, referred_to_acb, under_investigation, closed
    referred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class WhistleblowerTip(Base):
    """Whistleblower / anonymous fraud-reporting channel."""
    __tablename__ = "whistleblower_tips"
    __table_args__ = (
        Index("ix_whistleblower_tracking", "tracking_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tracking_code: Mapped[str] = mapped_column(String(64), unique=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(60))  # kickbacks, ghost_work, substandard_material, measurement_inflation
    encrypted_tip: Mapped[str] = mapped_column(Text)
    tip_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="submitted")  # submitted, triaged, investigating, action_taken, closed
    status_update_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now())


class BankGuarantee(Base):
    """Performance Bank Guarantee (PBG) & security-deposit tracker."""
    __tablename__ = "bank_guarantees"
    __table_args__ = (
        Index("ix_pbg_number", "bg_number"),
        Index("ix_pbg_project", "project_id"),
        Index("ix_pbg_contractor", "contractor_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bg_number: Mapped[str] = mapped_column(String(64), unique=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    contractor_id: Mapped[int] = mapped_column(ForeignKey("contractor_registry.id"))
    issuing_bank: Mapped[str] = mapped_column(String(150))
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    issue_date: Mapped[str] = mapped_column(String(20))
    expiry_date: Mapped[str] = mapped_column(String(20))
    claim_deadline: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="active")  # active, expired, forfeited, released
    forfeiture_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ConflictOfInterestDeclaration(Base):
    """Conflict-of-interest declaration & auto-check."""
    __tablename__ = "conflict_of_interest_declarations"
    __table_args__ = (
        Index("ix_coi_official", "official_id"),
        Index("ix_coi_contractor", "contractor_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    official_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    contractor_id: Mapped[int] = mapped_column(ForeignKey("contractor_registry.id"))
    relationship_type: Mapped[str] = mapped_column(String(50))  # family, financial_interest, past_employment, none
    details: Mapped[str] = mapped_column(Text)
    has_active_conflict: Mapped[bool] = mapped_column(Boolean, default=True)
    declared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class AuditDiffLog(Base):
    """Immutable 'who changed what' diff view on every record."""
    __tablename__ = "audit_diff_logs"
    __table_args__ = (
        Index("ix_audit_diff_entity", "entity_type", "entity_id"),
        Index("ix_audit_diff_actor", "actor_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50))  # project, budget, review, contractor
    entity_id: Mapped[str] = mapped_column(String(64))
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_role: Mapped[str] = mapped_column(String(50))
    action: Mapped[str] = mapped_column(String(30))  # create, update, override, delete
    before_state: Mapped[dict] = mapped_column(JSON, default=dict)
    after_state: Mapped[dict] = mapped_column(JSON, default=dict)
    diff_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    signature_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =====================================================================
# B.2 TRANSPARENCY 🔍 MODELS
# =====================================================================

class CPGRAMSGrievance(Base):
    """CPGRAMS integration (Centralized Public Grievance system)."""
    __tablename__ = "cpgrams_grievances"
    __table_args__ = (
        Index("ix_cpgrams_reg_no", "registration_number"),
        Index("ix_cpgrams_proj", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    registration_number: Mapped[str] = mapped_column(String(64), unique=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    complainant_name: Mapped[str] = mapped_column(String(150))
    complainant_contact: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="registered")  # registered, under_process, action_taken, resolved, rejected
    cpgrams_action_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_with_gov: Mapped[bool] = mapped_column(Boolean, default=True)
    filed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    last_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now())


class RTIRequest(Base):
    """RTI request intake & statutory-timeline tracker."""
    __tablename__ = "rti_requests"
    __table_args__ = (
        Index("ix_rti_number", "rti_number"),
        Index("ix_rti_project", "project_id"),
        Index("ix_rti_deadline", "statutory_deadline"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rti_number: Mapped[str] = mapped_column(String(64), unique=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    applicant_name: Mapped[str] = mapped_column(String(150))
    queries: Mapped[list] = mapped_column(JSON, default=list)
    filing_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    statutory_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pio_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="received")  # received, under_scrutiny, information_provided, appeal_pending, disposed
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    disposed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SocialAuditRecord(Base):
    """MGNREGA-style social audit module."""
    __tablename__ = "social_audit_records"
    __table_args__ = (
        Index("ix_social_audit_proj", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    panchayat: Mapped[str] = mapped_column(String(150))
    audit_date: Mapped[str] = mapped_column(String(20))
    quorum_present: Mapped[int] = mapped_column(Integer, default=0)
    social_audit_findings: Mapped[list] = mapped_column(JSON, default=list)
    resolutions_passed: Mapped[list] = mapped_column(JSON, default=list)
    gram_sabha_president: Mapped[str] = mapped_column(String(150))
    action_taken_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="conducted")  # scheduled, conducted, atr_submitted
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class LegislativeQuestion(Base):
    """Legislative Assembly Question (LAQ) linkage."""
    __tablename__ = "legislative_questions"
    __table_args__ = (
        Index("ix_laq_house_no", "house", "question_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    house: Mapped[str] = mapped_column(String(50))  # Vidhan Sabha, Lok Sabha, Rajya Sabha
    session_name: Mapped[str] = mapped_column(String(100))
    question_number: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[str] = mapped_column(String(30))  # Starred, Unstarred
    member_name: Mapped[str] = mapped_column(String(150))
    constituency: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(255))
    linked_project_ids: Mapped[list] = mapped_column(JSON, default=list)
    minister_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="received")  # received, data_compiled, reply_tabled
    tabled_date: Mapped[str | None] = mapped_column(String(20), nullable=True)


class CitizenProjectReview(Base):
    """Public star-rating & citizen review per completed project."""
    __tablename__ = "citizen_project_reviews"
    __table_args__ = (
        Index("ix_citizen_reviews_proj", "project_id"),
        Index("ix_citizen_reviews_citizen", "citizen_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    rating_durability: Mapped[int] = mapped_column(Integer)  # 1-5
    rating_utility: Mapped[int] = mapped_column(Integer)     # 1-5
    rating_execution_speed: Mapped[int] = mapped_column(Integer) # 1-5
    overall_stars: Mapped[float] = mapped_column(Float)
    review_title: Mapped[str] = mapped_column(String(150))
    review_comment: Mapped[str] = mapped_column(Text)
    verified_resident: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ThirdPartyAudit(Base):
    """Third-party independent audit agency portal."""
    __tablename__ = "third_party_audits"
    __table_args__ = (
        Index("ix_third_party_proj", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    agency_name: Mapped[str] = mapped_column(String(200))
    empanelment_code: Mapped[str] = mapped_column(String(64))
    inspection_date: Mapped[str] = mapped_column(String(20))
    core_test_data: Mapped[dict] = mapped_column(JSON, default=dict)
    compliance_score: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(10))  # A, B, C, D
    certificate_hash: Mapped[str] = mapped_column(String(64))
    remarks: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class APIKeyRegistry(Base):
    """Open data API + developer portal key registry."""
    __tablename__ = "api_key_registries"
    __table_args__ = (
        Index("ix_api_keys_hash", "key_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    key_prefix: Mapped[str] = mapped_column(String(12))
    client_name: Mapped[str] = mapped_column(String(150))
    organization: Mapped[str] = mapped_column(String(200))
    tier: Mapped[str] = mapped_column(String(30), default="public")  # public, research, enterprise
    rate_limit_per_min: Mapped[int] = mapped_column(Integer, default=60)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PreConstructionDisclosure(Base):
    """'Right to know before it's built' pre-construction disclosure."""
    __tablename__ = "pre_construction_disclosures"
    __table_args__ = (
        Index("ix_pre_const_proj", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), unique=True)
    dpr_reference: Mapped[str] = mapped_column(String(100))
    sanctioning_authority: Mapped[str] = mapped_column(String(200))
    sanction_order_date: Mapped[str] = mapped_column(String(20))
    environmental_clearance_status: Mapped[str] = mapped_column(String(100))
    land_acquisition_status: Mapped[str] = mapped_column(String(100))
    boq_key_items: Mapped[list] = mapped_column(JSON, default=list)
    baseline_duration_days: Mapped[int] = mapped_column(Integer)
    public_consultation_date: Mapped[str] = mapped_column(String(20))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.3: PROJECT TRACKING & LIFECYCLE MODELS (17 FEATURES)
# =============================================================================

class SchemeHierarchy(Base):
    """Full project hierarchy: Scheme -> Project -> Work Order."""
    __tablename__ = "scheme_hierarchies"
    __table_args__ = (Index("ix_scheme_code", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)  # PMGSY, PMAY, JJM, AMRUT
    name: Mapped[str] = mapped_column(String(200))
    nodal_ministry: Mapped[str] = mapped_column(String(200))
    total_budget_inr: Mapped[float] = mapped_column(Float, default=0.0)
    disbursed_budget_inr: Mapped[float] = mapped_column(Float, default=0.0)
    active_projects_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ProjectWorkOrder(Base):
    """Work order contracts linked to projects."""
    __tablename__ = "project_work_orders"
    __table_args__ = (Index("ix_wo_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    work_order_number: Mapped[str] = mapped_column(String(100), unique=True)
    award_date: Mapped[str] = mapped_column(String(20))
    sanctioned_amount: Mapped[float] = mapped_column(Float)
    contractor_id: Mapped[int] = mapped_column(Integer)
    completion_deadline: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ProjectMilestone(Base):
    """Gantt-style milestone schedule with baseline vs actual."""
    __tablename__ = "project_milestones"
    __table_args__ = (Index("ix_pm_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(200))
    sequence_order: Mapped[int] = mapped_column(Integer)
    baseline_start_date: Mapped[str] = mapped_column(String(20))
    baseline_finish_date: Mapped[str] = mapped_column(String(20))
    actual_start_date: Mapped[str] = mapped_column(String(20), nullable=True)
    actual_finish_date: Mapped[str] = mapped_column(String(20), nullable=True)
    slippage_days: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, in_progress, completed, delayed
    weightage_pct: Mapped[float] = mapped_column(Float, default=20.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class MilestoneTask(Base):
    """Sub-tasks within a project milestone."""
    __tablename__ = "milestone_tasks"
    __table_args__ = (Index("ix_task_milestone", "milestone_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("project_milestones.id"))
    name: Mapped[str] = mapped_column(String(200))
    assigned_team: Mapped[str] = mapped_column(String(100))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DelayRootCause(Base):
    """Root cause taxonomy for project stalls & slippages."""
    __tablename__ = "delay_root_causes"
    __table_args__ = (Index("ix_delay_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    category: Mapped[str] = mapped_column(String(50))  # land_dispute, funds_delay, weather, contractor_default, utility_shifting, litigation
    description: Mapped[str] = mapped_column(Text)
    delay_days: Mapped[int] = mapped_column(Integer)
    logged_by_id: Mapped[int] = mapped_column(Integer)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class WeatherVerification(Base):
    """IMD weather cross-check against claimed weather delays."""
    __tablename__ = "weather_verifications"
    __table_args__ = (Index("ix_weather_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    claim_date: Mapped[str] = mapped_column(String(20))
    claimed_event: Mapped[str] = mapped_column(String(100))
    claimed_rainfall_mm: Mapped[float] = mapped_column(Float)
    imd_station_code: Mapped[str] = mapped_column(String(50))
    imd_rainfall_mm: Mapped[float] = mapped_column(Float)
    imd_max_temp_c: Mapped[float] = mapped_column(Float)
    is_verified_disaster: Mapped[bool] = mapped_column(Boolean, default=False)
    deviation_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class LandAcquisitionRecord(Base):
    """LARR Act 2013 Land Handover and R&R Tracking."""
    __tablename__ = "land_acquisition_records"
    __table_args__ = (Index("ix_land_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    section_11_notification_date: Mapped[str] = mapped_column(String(20))
    section_19_declaration_date: Mapped[str] = mapped_column(String(20))
    total_land_required_hectares: Mapped[float] = mapped_column(Float)
    land_handed_over_hectares: Mapped[float] = mapped_column(Float)
    compensation_escrow_inr: Mapped[float] = mapped_column(Float)
    displaced_families_count: Mapped[int] = mapped_column(Integer)
    rehabilitated_families_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EnvironmentalClearance(Base):
    """MoEFCC and SPCB Statutory Clearance Tracker."""
    __tablename__ = "environmental_clearances"
    __table_args__ = (Index("ix_env_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    authority: Mapped[str] = mapped_column(String(100))  # MoEFCC, StatePollutionControlBoard, ForestDept
    clearance_type: Mapped[str] = mapped_column(String(100))  # Stage-I, Stage-II, CTE, CTO
    reference_number: Mapped[str] = mapped_column(String(100))
    issue_date: Mapped[str] = mapped_column(String(20))
    valid_until: Mapped[str] = mapped_column(String(20))
    conditions_summary: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, expired, pending_renewal
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DefectLiabilityRecord(Base):
    """Post-completion Defect Liability Period (DLP) tracker."""
    __tablename__ = "defect_liability_records"
    __table_args__ = (Index("ix_dlp_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    warranty_period_years: Mapped[int] = mapped_column(Integer, default=3)
    dlp_start_date: Mapped[str] = mapped_column(String(20))
    dlp_end_date: Mapped[str] = mapped_column(String(20))
    inspection_schedule_json: Mapped[list] = mapped_column(JSON, default=list)
    total_claims_logged: Mapped[int] = mapped_column(Integer, default=0)
    claims_resolved: Mapped[int] = mapped_column(Integer, default=0)
    linked_pbg_id: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, claim_triggered, warranty_closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class AssetDigitalTwin(Base):
    """Permanent Municipal Asset Digital Twin Registry."""
    __tablename__ = "asset_digital_twins"
    __table_args__ = (Index("ix_asset_code", "asset_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_code: Mapped[str] = mapped_column(String(100), unique=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    asset_type: Mapped[str] = mapped_column(String(100))  # road, culvert, building, water_tank
    geojson_geometry: Mapped[dict] = mapped_column(JSON, default=dict)
    condition_score: Mapped[float] = mapped_column(Float, default=100.0)
    last_condition_survey: Mapped[str] = mapped_column(String(20))
    maintenance_calendar_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class OperationMaintenanceContract(Base):
    """Multi-year O&M contract tracking."""
    __tablename__ = "operation_maintenance_contracts"
    __table_args__ = (Index("ix_om_asset", "asset_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("asset_digital_twins.id"))
    contractor_name: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[str] = mapped_column(String(20))
    end_date: Mapped[str] = mapped_column(String(20))
    annual_maintenance_value_inr: Mapped[float] = mapped_column(Float)
    monthly_sla_score: Mapped[float] = mapped_column(Float, default=100.0)
    penalty_deductions_inr: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class UtilizationCertificate(Base):
    """Statutory Form GFR 12-C Utilization Certificate."""
    __tablename__ = "utilization_certificates"
    __table_args__ = (Index("ix_uc_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    uc_number: Mapped[str] = mapped_column(String(100), unique=True)
    gfr_form_type: Mapped[str] = mapped_column(String(50), default="GFR 12-C")
    financial_year: Mapped[str] = mapped_column(String(20))
    sanctioned_amount: Mapped[float] = mapped_column(Float)
    actual_spent_amount: Mapped[float] = mapped_column(Float)
    unspent_balance: Mapped[float] = mapped_column(Float)
    certifying_officer_id: Mapped[int] = mapped_column(Integer)
    submission_deadline: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(50), default="drafted")  # drafted, countersigned, submitted_to_cag
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ExternalDashboardFeed(Base):
    """Syndication feeds into PRAGATI, e-Samiksha & NITI Aayog."""
    __tablename__ = "external_dashboard_feeds"
    __table_args__ = (Index("ix_feed_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    target_portal: Mapped[str] = mapped_column(String(100))  # PRAGATI, e-Samiksha, NITI_Aayog, CM_Dashboard
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    sync_status: Mapped[str] = mapped_column(String(50), default="synced")
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    api_response_code: Mapped[int] = mapped_column(Integer, default=200)


class MaterialProvenance(Base):
    """Batch numbers + GST e-Invoice matching for cement/steel."""
    __tablename__ = "material_provenance_records"
    __table_args__ = (Index("ix_mat_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    material_type: Mapped[str] = mapped_column(String(100))  # cement, tmt_steel, bitumen, aggregates
    batch_number: Mapped[str] = mapped_column(String(100))
    heat_number: Mapped[str] = mapped_column(String(100))
    manufacturer: Mapped[str] = mapped_column(String(200))
    gst_irn: Mapped[str] = mapped_column(String(100))
    billed_qty: Mapped[float] = mapped_column(Float)
    received_qty: Mapped[float] = mapped_column(Float)
    test_certificate_hash: Mapped[str] = mapped_column(String(64))
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class LaborAttendanceRecord(Base):
    """NMMS / Aadhaar-based muster roll verification."""
    __tablename__ = "labor_attendance_records"
    __table_args__ = (Index("ix_labor_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    attendance_date: Mapped[str] = mapped_column(String(20))
    nmms_muster_roll_id: Mapped[str] = mapped_column(String(100))
    aadhaar_verified_workers_count: Mapped[int] = mapped_column(Integer)
    biometric_auth_pct: Mapped[float] = mapped_column(Float)
    billed_labor_days: Mapped[int] = mapped_column(Integer)
    discrepancy_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ChangeOrder(Base):
    """Clause 12 CPWD/IRC scope variations and rate amendments."""
    __tablename__ = "change_orders"
    __table_args__ = (Index("ix_co_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    change_order_number: Mapped[str] = mapped_column(String(100), unique=True)
    original_contract_value: Mapped[float] = mapped_column(Float)
    revised_contract_value: Mapped[float] = mapped_column(Float)
    cost_variation_pct: Mapped[float] = mapped_column(Float)
    justification: Mapped[str] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, approved, rejected
    clause_reference: Mapped[str] = mapped_column(String(100), default="CPWD GCC Clause 12")
    approved_by_id: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EmergencyWorkPathway(Base):
    """DMA 2005 Expedited pathway with post-facto audit trail."""
    __tablename__ = "emergency_work_pathways"
    __table_args__ = (Index("ix_em_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    disaster_type: Mapped[str] = mapped_column(String(100))  # flash_flood, landslide, embankment_breach
    expedited_procurement_code: Mapped[str] = mapped_column(String(100), unique=True)
    invoking_authority: Mapped[str] = mapped_column(String(200))
    post_facto_ratification_deadline: Mapped[str] = mapped_column(String(20))
    is_ratified: Mapped[bool] = mapped_column(Boolean, default=False)
    cryptographic_audit_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ModelCodeConductFreeze(Base):
    """Election Commission of India (ECI) MCC Freeze Controls."""
    __tablename__ = "mcc_freeze_controls"
    __table_args__ = (Index("ix_mcc_jurisdiction", "jurisdiction"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jurisdiction: Mapped[str] = mapped_column(String(100))  # state_delhi, district_east, nationwide
    election_name: Mapped[str] = mapped_column(String(200))
    freeze_start_date: Mapped[str] = mapped_column(String(20))
    freeze_end_date: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_blocked_actions: Mapped[int] = mapped_column(Integer, default=0)
    exception_log_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.4: QUALITY ASSURANCE & ENGINEERING VERIFICATION MODELS (18 FEATURES)
# =============================================================================

class YOLOInferenceRecord(Base):
    """Trained YOLOv8 road crack & pothole detection inference record."""
    __tablename__ = "yolo_inference_records"
    __table_args__ = (Index("ix_yolo_ev", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    model_version: Mapped[str] = mapped_column(String(50), default="yolov8x-pothole-crack-v3")
    detected_potholes_count: Mapped[int] = mapped_column(Integer, default=0)
    detected_cracks_count: Mapped[int] = mapped_column(Integer, default=0)
    irc82_severity_score: Mapped[float] = mapped_column(Float, default=0.0)
    bounding_boxes_json: Mapped[list] = mapped_column(JSON, default=list)
    inference_latency_ms: Mapped[float] = mapped_column(Float, default=45.2)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SatelliteChangeDetection(Base):
    """ISRO Bhuvan / Sentinel-2 NDVI & SAR temporal change detection."""
    __tablename__ = "satellite_change_detections"
    __table_args__ = (Index("ix_sat_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    satellite_source: Mapped[str] = mapped_column(String(50), default="ISRO_Bhuvan")
    baseline_capture_date: Mapped[str] = mapped_column(String(20))
    latest_capture_date: Mapped[str] = mapped_column(String(20))
    ndvi_delta: Mapped[float] = mapped_column(Float)
    built_up_index_delta: Mapped[float] = mapped_column(Float)
    ground_disturbance_sqm: Mapped[float] = mapped_column(Float)
    is_activity_confirmed: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GISAlignmentCheck(Base):
    """Survey of India / PMGSY GIS Centerline Vector cross-check."""
    __tablename__ = "gis_alignment_checks"
    __table_args__ = (Index("ix_gis_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    billed_chainage_km: Mapped[float] = mapped_column(Float)
    surveyed_centerline_km: Mapped[float] = mapped_column(Float)
    alignment_deviation_pct: Mapped[float] = mapped_column(Float)
    max_lateral_drift_meters: Mapped[float] = mapped_column(Float)
    is_within_tolerance: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class CadastralParcelCheck(Base):
    """Bhu-Naksha / Bhoomi Cadastral Boundary Encroachment Check."""
    __tablename__ = "cadastral_parcel_checks"
    __table_args__ = (Index("ix_cad_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    bhu_naksha_parcel_id: Mapped[str] = mapped_column(String(100))
    surveyed_geofence_wkt: Mapped[str] = mapped_column(Text)
    encroachment_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    overlap_pct: Mapped[float] = mapped_column(Float, default=100.0)
    survey_remarks: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DroneSurveyRegistry(Base):
    """DGCA Digital Sky-compliant UAV Orthomosaic and DEM ingestion."""
    __tablename__ = "drone_survey_registries"
    __table_args__ = (Index("ix_drone_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    dgca_uin: Mapped[str] = mapped_column(String(100))  # Unique Identification Number
    flight_date: Mapped[str] = mapped_column(String(20))
    orthomosaic_uri: Mapped[str] = mapped_column(String(255))
    dem_uri: Mapped[str] = mapped_column(String(255))
    covered_area_sqm: Mapped[float] = mapped_column(Float)
    average_gsd_cm: Mapped[float] = mapped_column(Float)
    pilot_license_num: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PhotogrammetryVolume(Base):
    """SfM 3D Dense Reconstruction Volumetric Estimation."""
    __tablename__ = "photogrammetry_volumes"
    __table_args__ = (Index("ix_photo_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    inspection_id: Mapped[str] = mapped_column(String(100))
    point_cloud_density: Mapped[int] = mapped_column(Integer)
    calculated_volume_m3: Mapped[float] = mapped_column(Float)
    billed_volume_m3: Mapped[float] = mapped_column(Float)
    variance_pct: Mapped[float] = mapped_column(Float)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class RoadRoughnessIndex(Base):
    """IRI Road Roughness proxy from video & accelerometer."""
    __tablename__ = "road_roughness_indices"
    __table_args__ = (Index("ix_rough_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    video_uri: Mapped[str] = mapped_column(String(255))
    iri_m_per_km: Mapped[float] = mapped_column(Float)
    irc_sp16_rating: Mapped[str] = mapped_column(String(50))  # Good, Fair, Poor
    bump_integrator_equivalent: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SurfaceDefectClassification(Base):
    """IS 456 / MoRTH Section 500 Deep Learning Defect Classifier."""
    __tablename__ = "surface_defect_classifications"
    __table_args__ = (Index("ix_surf_ev", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    defect_category: Mapped[str] = mapped_column(String(100))  # honeycombing, segregation, raveling, bleeding, under_compaction
    confidence_pct: Mapped[float] = mapped_column(Float)
    is_code_violation: Mapped[bool] = mapped_column(Boolean, default=False)
    standard_reference: Mapped[str] = mapped_column(String(100), default="IS 456:2000 Cl. 10.3")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class BuildingStructuralDefect(Base):
    """NBC 2016 / CPWD Structural Defect Classifier."""
    __tablename__ = "building_structural_defects"
    __table_args__ = (Index("ix_bld_ev", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    defect_type: Mapped[str] = mapped_column(String(100))  # shear_crack, rebar_spalling, dampness, out_of_plumb
    nbc2016_clause: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(50))  # minor, moderate, critical
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class MaterialLabReport(Base):
    """NABL Concrete Cube, Soil, Bitumen Lab Test Report Validation."""
    __tablename__ = "material_lab_reports"
    __table_args__ = (Index("ix_lab_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    lab_name: Mapped[str] = mapped_column(String(200))
    nabl_accreditation_no: Mapped[str] = mapped_column(String(100))
    sample_type: Mapped[str] = mapped_column(String(100))  # cube_compressive, soil_proctor, bitumen_penetration
    test_standard: Mapped[str] = mapped_column(String(100))  # IS 516, IS 2720, IS 1205
    reported_value: Mapped[float] = mapped_column(Float)
    required_value: Mapped[float] = mapped_column(Float)
    is_compliant: Mapped[bool] = mapped_column(Boolean, default=True)
    ocr_extracted_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class IoTSensorTelemetry(Base):
    """IoT Structural Health Monitoring Telemetry."""
    __tablename__ = "iot_sensor_telemetry"
    __table_args__ = (Index("ix_iot_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    asset_id: Mapped[int] = mapped_column(Integer)
    sensor_id: Mapped[str] = mapped_column(String(100))
    sensor_type: Mapped[str] = mapped_column(String(100))  # strain_gauge, tiltmeter, moisture_probe
    telemetry_timestamp: Mapped[str] = mapped_column(String(30))
    metric_value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(30))
    alert_state: Mapped[str] = mapped_column(String(30), default="normal")  # normal, warning, critical
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class RandomInspectionSchedule(Base):
    """Risk-Weighted Random Surprise Physical Inspection Scheduler."""
    __tablename__ = "random_inspection_schedules"
    __table_args__ = (Index("ix_rand_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    scheduled_audit_date: Mapped[str] = mapped_column(String(20))
    risk_weight_score: Mapped[float] = mapped_column(Float)
    assigned_auditor_id: Mapped[int] = mapped_column(Integer)
    surprise_factor_token: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(50), default="scheduled")  # scheduled, completed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PhotoAuthenticityProof(Base):
    """Error Level Analysis (ELA) + PRNU Sensor Fingerprint + C2PA Proof."""
    __tablename__ = "photo_authenticity_proofs"
    __table_args__ = (Index("ix_auth_ev", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    ela_noise_variance: Mapped[float] = mapped_column(Float)
    prnu_sensor_fingerprint: Mapped[str] = mapped_column(String(64))
    c2pa_manifest_found: Mapped[bool] = mapped_column(Boolean, default=True)
    is_authentic: Mapped[bool] = mapped_column(Boolean, default=True)
    anomaly_flags_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class MultiAngleCaptureProtocol(Base):
    """Mandatory Multi-Angle Shot Sequence Protocol."""
    __tablename__ = "multi_angle_capture_protocols"
    __table_args__ = (Index("ix_macp_ev", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    protocol_version: Mapped[str] = mapped_column(String(20), default="MACP-v2")
    start_chainage_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    mid_chainage_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    end_chainage_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    cross_section_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    material_stack_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    is_protocol_complete: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class BOQVerificationRecord(Base):
    """Measurement Book (MB) OCR vs AI Visual Quantity Reconciliation."""
    __tablename__ = "boq_verification_records"
    __table_args__ = (Index("ix_boq_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    measurement_book_ref: Mapped[str] = mapped_column(String(100))
    billed_item_code: Mapped[str] = mapped_column(String(50))
    billed_quantity: Mapped[float] = mapped_column(Float)
    ai_verified_quantity: Mapped[float] = mapped_column(Float)
    discrepancy_pct: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class StandardChecklistRecord(Base):
    """Digitized IRC / IS / NBC Work-Type Inspection Checklists."""
    __tablename__ = "standard_checklist_records"
    __table_args__ = (Index("ix_chk_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    work_type: Mapped[str] = mapped_column(String(50))  # road, bridge, building, drain
    checklist_code: Mapped[str] = mapped_column(String(50))
    responses_json: Mapped[dict] = mapped_column(JSON, default=dict)
    total_score_pct: Mapped[float] = mapped_column(Float)
    inspecting_engineer_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class RemoteVideoInspection(Base):
    """On-demand recorded remote video call inspection with cryptographic hash."""
    __tablename__ = "remote_video_inspections"
    __table_args__ = (Index("ix_vid_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    session_id: Mapped[str] = mapped_column(String(100), unique=True)
    host_engineer_id: Mapped[int] = mapped_column(Integer)
    field_officer_id: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    recording_hash: Mapped[str] = mapped_column(String(64))
    audit_notes: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class LabSampleChainCustody(Base):
    """Barcoded tamper-evident physical field sample chain-of-custody."""
    __tablename__ = "lab_sample_chain_custody"
    __table_args__ = (Index("ix_sample_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    sample_code: Mapped[str] = mapped_column(String(100), unique=True)
    barcode: Mapped[str] = mapped_column(String(100))
    collection_date: Mapped[str] = mapped_column(String(20))
    collected_by_id: Mapped[int] = mapped_column(Integer)
    target_lab: Mapped[str] = mapped_column(String(200))
    tamper_seal_intact: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="in_transit")  # collected, in_transit, testing, completed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.5: FRAUD & ANOMALY INTELLIGENCE MODELS (8 FEATURES)
# =============================================================================

class CrossProjectAnomalyScore(Base):
    """Statistical & ML isolation forest anomaly score."""
    __tablename__ = "cross_project_anomaly_scores"
    __table_args__ = (Index("ix_cpa_entity", "entity_type", "entity_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50))  # contractor, official, project
    entity_id: Mapped[str] = mapped_column(String(100))
    anomaly_score: Mapped[float] = mapped_column(Float)  # 0 to 100
    repeat_defect_rate: Mapped[float] = mapped_column(Float)
    duplicate_image_attempts: Mapped[int] = mapped_column(Integer, default=0)
    budget_burn_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(String(30))  # low, medium, high, critical
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GhostProjectAlert(Base):
    """High expenditure with zero photographic/satellite physical progress."""
    __tablename__ = "ghost_project_alerts"
    __table_args__ = (Index("ix_ghost_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    total_disbursed_inr: Mapped[float] = mapped_column(Float)
    days_since_sanction: Mapped[int] = mapped_column(Integer)
    photographic_evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    satellite_activity_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_severity: Mapped[str] = mapped_column(String(30), default="critical")  # high, critical
    is_cleared: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class CollusionGraphEdge(Base):
    """Approver-Contractor network graph edges for collusion detection."""
    __tablename__ = "collusion_graph_edges"
    __table_args__ = (Index("ix_coll_nodes", "node_a", "node_b"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_a: Mapped[str] = mapped_column(String(100))
    node_b: Mapped[str] = mapped_column(String(100))
    edge_type: Mapped[str] = mapped_column(String(50))  # approver_contractor, shared_director, joint_bidding
    frequency_count: Mapped[int] = mapped_column(Integer, default=1)
    collusion_weight: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class OverbillingAnomaly(Base):
    """Statistical Z-score quantity inflation detector."""
    __tablename__ = "overbilling_anomalies"
    __table_args__ = (Index("ix_overbill_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    item_description: Mapped[str] = mapped_column(String(200))
    claimed_cost_inr: Mapped[float] = mapped_column(Float)
    statistical_benchmark_cost_inr: Mapped[float] = mapped_column(Float)
    z_score: Mapped[float] = mapped_column(Float)
    alert_status: Mapped[str] = mapped_column(String(50), default="flagged")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class BenfordAnalysisResult(Base):
    """Benford's Law First & Second-digit bill distribution tests."""
    __tablename__ = "benford_analysis_results"
    __table_args__ = (Index("ix_benford_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(String(100))
    contractor_id: Mapped[int] = mapped_column(Integer)
    sample_size: Mapped[int] = mapped_column(Integer)
    p_value: Mapped[float] = mapped_column(Float)
    chi_square_stat: Mapped[float] = mapped_column(Float)
    conforms_to_benford: Mapped[bool] = mapped_column(Boolean, default=True)
    risk_tier: Mapped[str] = mapped_column(String(30))  # low, medium, elevated, high
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SplitTenderAlert(Base):
    """Detection of split tenders bypassing approval ceilings."""
    __tablename__ = "split_tender_alerts"
    __table_args__ = (Index("ix_split_scheme", "parent_scheme"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_scheme: Mapped[str] = mapped_column(String(100))
    detected_cluster_tender_ids: Mapped[list] = mapped_column(JSON, default=list)
    combined_estimated_cost_inr: Mapped[float] = mapped_column(Float)
    tender_count: Mapped[int] = mapped_column(Integer)
    bypass_threshold_reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ShellContractorCluster(Base):
    """Graph clusters of entities sharing PAN, GSTIN, directors or addresses."""
    __tablename__ = "shell_contractor_clusters"
    __table_args__ = (Index("ix_shell_name", "cluster_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cluster_name: Mapped[str] = mapped_column(String(150))
    matched_contractor_ids: Mapped[list] = mapped_column(JSON, default=list)
    shared_attributes: Mapped[list] = mapped_column(JSON, default=list)  # ["pan", "directors", "registered_address"]
    confidence_pct: Mapped[float] = mapped_column(Float)
    is_reported: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.6: CITIZEN ENGAGEMENT & GRIEVANCE REDRESSAL MODELS (9 FEATURES)
# =============================================================================

class WhatsAppMessageLog(Base):
    """Multilingual WhatsApp/IVR conversational logging."""
    __tablename__ = "whatsapp_message_logs"
    __table_args__ = (Index("ix_wa_phone", "sender_phone_hash"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wa_message_id: Mapped[str] = mapped_column(String(100), unique=True)
    sender_phone_hash: Mapped[str] = mapped_column(String(64))
    direction: Mapped[str] = mapped_column(String(20))  # inbound, outbound
    intent: Mapped[str] = mapped_column(String(50))  # status_inquiry, report_defect, vote_milestone
    message_body: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(10), default="hi")  # hi, en, te, ta, bn
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SMSFallbackRecord(Base):
    """Structured SMS shortcode fallback transactions."""
    __tablename__ = "sms_fallback_records"
    __table_args__ = (Index("ix_sms_phone", "sender_phone_hash"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender_phone_hash: Mapped[str] = mapped_column(String(64))
    raw_sms: Mapped[str] = mapped_column(String(255))
    parsed_command: Mapped[str] = mapped_column(String(50))  # STATUS, REPORT, VOTE
    project_id: Mapped[str] = mapped_column(String(100))
    response_sms: Mapped[str] = mapped_column(String(255))
    delivery_status: Mapped[str] = mapped_column(String(30), default="delivered")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class VoiceGrievanceRecord(Base):
    """Speech-to-Text Voice Grievance Transcriptions."""
    __tablename__ = "voice_grievance_records"
    __table_args__ = (Index("ix_voice_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(String(100))
    audio_file_path: Mapped[str] = mapped_column(String(255))
    audio_duration_seconds: Mapped[float] = mapped_column(Float)
    detected_language: Mapped[str] = mapped_column(String(20), default="hi-IN")
    transcribed_text: Mapped[str] = mapped_column(Text)
    transcription_confidence: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class NLPComplaintCategory(Base):
    """Automated NLP Categorization & Department Routing."""
    __tablename__ = "nlp_complaint_categories"
    __table_args__ = (Index("ix_nlp_cat", "predicted_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grievance_id: Mapped[int] = mapped_column(Integer)
    predicted_category: Mapped[str] = mapped_column(String(100))  # quality_failure, execution_delay, corruption_bribe, safety_hazard, waterlogging
    classification_confidence: Mapped[float] = mapped_column(Float)
    routed_department: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class RegionalSentimentScore(Base):
    """Aggregated citizen sentiment index across panchayats and districts."""
    __tablename__ = "regional_sentiment_scores"
    __table_args__ = (Index("ix_sent_dist", "district_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district_name: Mapped[str] = mapped_column(String(100))
    panchayat_name: Mapped[str] = mapped_column(String(100))
    sentiment_index: Mapped[float] = mapped_column(Float)  # -1.0 to +1.0
    positive_ratio: Mapped[float] = mapped_column(Float)
    negative_ratio: Mapped[float] = mapped_column(Float)
    total_citizen_inputs: Mapped[int] = mapped_column(Integer)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GrievanceAssignmentSLA(Base):
    """Designated officer assignment with auto-escalation clocks."""
    __tablename__ = "grievance_assignment_slas"
    __table_args__ = (Index("ix_gas_grievance", "grievance_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grievance_id: Mapped[int] = mapped_column(Integer)
    assigned_officer_id: Mapped[int] = mapped_column(Integer)
    designation: Mapped[str] = mapped_column(String(100))
    sla_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_breached: Mapped[bool] = mapped_column(Boolean, default=False)
    tier: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class CitizenCharterCompliance(Base):
    """Citizen Charter statutory service-level timeline tracker."""
    __tablename__ = "citizen_charter_compliances"
    __table_args__ = (Index("ix_cc_dept", "department_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_name: Mapped[str] = mapped_column(String(150))
    service_name: Mapped[str] = mapped_column(String(150))
    statutory_timeline_days: Mapped[int] = mapped_column(Integer)
    average_resolution_days: Mapped[float] = mapped_column(Float)
    compliance_pct: Mapped[float] = mapped_column(Float)
    year_month: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class UMANGServiceRegistry(Base):
    """OpenAPI and JSON connectors for Government of India UMANG Super-App."""
    __tablename__ = "umang_service_registries"
    __table_args__ = (Index("ix_umang_code", "service_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_code: Mapped[str] = mapped_column(String(100), unique=True)
    endpoint_url: Mapped[str] = mapped_column(String(255))
    schema_definition: Mapped[dict] = mapped_column(JSON, default=dict)
    total_api_calls: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())

# =============================================================================
# PILLAR B.7: Interoperability & Government Integration (8 Models)
# =============================================================================

class DigiLockerKycProfile(Base):
    """Real DigiLocker / Aadhaar e-KYC profile with Meri Pehchaan."""
    __tablename__ = "digilocker_kyc_profiles"
    __table_args__ = (Index("ix_digilocker_user", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    digilocker_id: Mapped[str] = mapped_column(String(100), unique=True)
    meri_pehchaan_token_hash: Mapped[str] = mapped_column(String(128))
    masked_aadhaar_number: Mapped[str] = mapped_column(String(20))
    kyc_verified_at: Mapped[str] = mapped_column(String(40))
    issued_document_uris_json: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(50), default="verified")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PFMSReconciliationRecord(Base):
    """PFMS (Public Financial Management System) tranche reconciliation."""
    __tablename__ = "pfms_reconciliation_records"
    __table_args__ = (Index("ix_pfms_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    sanction_order_number: Mapped[str] = mapped_column(String(100))
    pfms_tranche_id: Mapped[str] = mapped_column(String(100), unique=True)
    disbursed_amount_inr: Mapped[float] = mapped_column(Float)
    dbt_beneficiary_count: Mapped[int] = mapped_column(Integer, default=0)
    bank_acknowledgement_ref: Mapped[str] = mapped_column(String(100))
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GeMContractorProfile(Base):
    """Government e-Marketplace (GeM) & CPPP contractor past performance profile."""
    __tablename__ = "gem_contractor_profiles"
    __table_args__ = (Index("ix_gem_contractor", "contractor_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contractor_id: Mapped[int] = mapped_column(ForeignKey("contractor_registry.id"))
    gem_seller_id: Mapped[str] = mapped_column(String(100), unique=True)
    past_performance_score: Mapped[float] = mapped_column(Float, default=85.0)
    total_gem_orders_count: Mapped[int] = mapped_column(Integer, default=12)
    active_debarments_count: Mapped[int] = mapped_column(Integer, default=0)
    is_blacklisted_national: Mapped[bool] = mapped_column(Boolean, default=False)
    last_synced_at: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EGApiGatewayRegistry(Base):
    """e-Gov Interoperability Framework (e-GIF) API gateway client registry."""
    __tablename__ = "egov_api_gateway_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    consumer_system_name: Mapped[str] = mapped_column(String(120), unique=True)
    oauth2_client_id: Mapped[str] = mapped_column(String(100), unique=True)
    hmac_secret_hash: Mapped[str] = mapped_column(String(128))
    allowed_namespaces_json: Mapped[list] = mapped_column(JSON, default=list)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=1000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GISLandParcelLayer(Base):
    """Bhu-Naksha / Bhoomi cadastral parcel spatial layer cross-reference."""
    __tablename__ = "gis_land_parcel_layers"
    __table_args__ = (Index("ix_land_parcel_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    khasra_number: Mapped[str] = mapped_column(String(50))
    state_land_record_code: Mapped[str] = mapped_column(String(50))
    bhu_naksha_geometry_wkt: Mapped[str] = mapped_column(Text)
    is_within_sanctioned_alignment: Mapped[bool] = mapped_column(Boolean, default=True)
    disputed_boundary_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class NationalAssetDirectorySync(Base):
    """Sync log with National Asset Directory (Ministry of Panchayati Raj / MoHUA)."""
    __tablename__ = "national_asset_directory_sync"
    __table_args__ = (Index("ix_nad_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    nad_asset_uin: Mapped[str] = mapped_column(String(100), unique=True)
    asset_category_code: Mapped[str] = mapped_column(String(50))
    panchayat_lgd_code: Mapped[int] = mapped_column(Integer)
    syndication_status: Mapped[str] = mapped_column(String(50), default="published")
    ack_reference: Mapped[str] = mapped_column(String(100))
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GSTEWayBillVerification(Base):
    """GST e-Invoice and e-Way Bill verification against GSTN / NIC."""
    __tablename__ = "gst_eway_bill_verifications"
    __table_args__ = (Index("ix_eway_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    gstin_supplier: Mapped[str] = mapped_column(String(20))
    eway_bill_number: Mapped[str] = mapped_column(String(50), unique=True)
    irn_hash: Mapped[str] = mapped_column(String(100))
    consignment_value_inr: Mapped[float] = mapped_column(Float)
    vehicle_number: Mapped[str] = mapped_column(String(25))
    is_gstn_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class StateTreasuryIFMSHook(Base):
    """State Integrated Financial Management System (IFMS) treasury voucher hook."""
    __tablename__ = "state_treasury_ifms_hooks"
    __table_args__ = (Index("ix_ifms_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    state_code: Mapped[str] = mapped_column(String(10))
    ddo_code: Mapped[str] = mapped_column(String(50))
    treasury_bill_number: Mapped[str] = mapped_column(String(100), unique=True)
    passed_amount_inr: Mapped[float] = mapped_column(Float)
    electronic_scroll_id: Mapped[str] = mapped_column(String(100))
    treasury_clearance_date: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.8: Security, Compliance & Data Sovereignty (11 Models)
# =============================================================================

class DataSovereigntyConfig(Base):
    """MeitY-empanelled cloud hosting & Indian data localization configuration."""
    __tablename__ = "data_sovereignty_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    datacenter_provider: Mapped[str] = mapped_column(String(100), default="NIC Cloud / AWS GovCloud Mumbai")
    jurisdiction_country: Mapped[str] = mapped_column(String(20), default="IN")
    meity_audit_ref: Mapped[str] = mapped_column(String(100))
    is_data_localized: Mapped[bool] = mapped_column(Boolean, default=True)
    last_verified_at: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class VAPTAuditReport(Base):
    """CERT-In empanelled periodic VAPT security audit report."""
    __tablename__ = "vapt_audit_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cert_in_auditor_name: Mapped[str] = mapped_column(String(150))
    report_reference_id: Mapped[str] = mapped_column(String(100), unique=True)
    report_sha256: Mapped[str] = mapped_column(String(64))
    audit_date: Mapped[str] = mapped_column(String(30))
    critical_vulns_count: Mapped[int] = mapped_column(Integer, default=0)
    high_vulns_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_vulns_count: Mapped[int] = mapped_column(Integer, default=0)
    remediation_status: Mapped[str] = mapped_column(String(50), default="remediated")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class GIGWComplianceManifest(Base):
    """Guidelines for Indian Government Websites (GIGW 3.0) compliance ledger."""
    __tablename__ = "gigw_compliance_manifests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    gigw_version: Mapped[str] = mapped_column(String(20), default="GIGW-3.0")
    wcag_conformance_level: Mapped[str] = mapped_column(String(10), default="AA")
    audit_score_pct: Mapped[float] = mapped_column(Float, default=98.5)
    bilingual_nav_supported: Mapped[bool] = mapped_column(Boolean, default=True)
    screen_reader_tested: Mapped[bool] = mapped_column(Boolean, default=True)
    certified_by: Mapped[str] = mapped_column(String(100), default="STQC Directorate")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DPDPConsentRegistry(Base):
    """Digital Personal Data Protection (DPDP) Act 2023 consent & principal rights."""
    __tablename__ = "dpdp_consent_registry"
    __table_args__ = (Index("ix_dpdp_user", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    purpose_code: Mapped[str] = mapped_column(String(50))  # grievance_filing, aadhaar_kyc, voting
    consent_given: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_timestamp: Mapped[str] = mapped_column(String(40))
    withdrawn_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rights_exercised_log_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PIIFieldEncryptionMeta(Base):
    """Field-level envelope encryption metadata for sensitive citizen PII."""
    __tablename__ = "pii_field_encryption_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key_alias: Mapped[str] = mapped_column(String(100), unique=True)
    algorithm: Mapped[str] = mapped_column(String(50), default="AES-256-GCM")
    hsm_key_arn: Mapped[str] = mapped_column(String(200))
    rotation_interval_days: Mapped[int] = mapped_column(Integer, default=90)
    last_rotated_at: Mapped[str] = mapped_column(String(40))
    encrypted_fields_count: Mapped[int] = mapped_column(Integer, default=14)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class AdminActionAuditLog(Base):
    """Tamper-evident cryptographically chained audit log of all administrator actions."""
    __tablename__ = "admin_action_audit_logs"
    __table_args__ = (Index("ix_admin_audit_admin", "admin_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action_type: Mapped[str] = mapped_column(String(100))  # role_elevation, threshold_override, data_export
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[str] = mapped_column(String(100))
    previous_log_hash: Mapped[str] = mapped_column(String(64))
    current_entry_hash: Mapped[str] = mapped_column(String(64))
    client_ip: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DataRetentionPolicy(Base):
    """Automated statutory retention policy engine per Public Records Act."""
    __tablename__ = "data_retention_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_category: Mapped[str] = mapped_column(String(100), unique=True)  # vouchers, telemetry, evidence_photos
    retention_period_years: Mapped[int] = mapped_column(Integer)
    cag_mandate_reference: Mapped[str] = mapped_column(String(100))
    auto_purge_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    archival_target_uri: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DisasterRecoveryConfig(Base):
    """Multi-region disaster recovery and continuous failover config."""
    __tablename__ = "disaster_recovery_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    primary_region: Mapped[str] = mapped_column(String(50), default="ap-south-1 (Mumbai)")
    secondary_region: Mapped[str] = mapped_column(String(50), default="ap-south-2 (Hyderabad)")
    rpo_minutes: Mapped[int] = mapped_column(Integer, default=5)
    rto_hours: Mapped[float] = mapped_column(Float, default=1.0)
    replication_lag_seconds: Mapped[float] = mapped_column(Float, default=1.2)
    last_failover_drill_date: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(50), default="active_standby")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SecretsVaultConfig(Base):
    """Centralized secrets vault and automatic credential rotation registry."""
    __tablename__ = "secrets_vault_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vault_provider: Mapped[str] = mapped_column(String(50), default="HashiCorp Vault")
    secret_path: Mapped[str] = mapped_column(String(100), unique=True)
    lease_duration_seconds: Mapped[int] = mapped_column(Integer, default=86400)
    auto_rotation_days: Mapped[int] = mapped_column(Integer, default=30)
    last_rotated_at: Mapped[str] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ScopedApiToken(Base):
    """Role-scoped fine-grained API tokens with expiry and instant revocation."""
    __tablename__ = "scoped_api_tokens"
    __table_args__ = (Index("ix_scoped_token_user", "created_by_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_identifier: Mapped[str] = mapped_column(String(100), unique=True)
    token_hash: Mapped[str] = mapped_column(String(128))
    assigned_scopes_json: Mapped[list] = mapped_column(JSON, default=list)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[str] = mapped_column(String(40))
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class BugBountyVulnerability(Base):
    """Responsible disclosure and bug-bounty vulnerability tracking."""
    __tablename__ = "bug_bounty_vulnerabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_ref: Mapped[str] = mapped_column(String(100), unique=True)
    researcher_pseudonym: Mapped[str] = mapped_column(String(100))
    vulnerability_title: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(20))  # low, medium, high, critical
    cvss_score: Mapped[float] = mapped_column(Float)
    remediation_state: Mapped[str] = mapped_column(String(50), default="triaged")
    bounty_awarded_inr: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.9: Platform Scale & Multi-Tenancy (7 Models)
# =============================================================================

class TenantHierarchy(Base):
    """Hierarchical multi-tenant organizational structure."""
    __tablename__ = "tenant_hierarchies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_code: Mapped[str] = mapped_column(String(50), unique=True)
    tenant_name: Mapped[str] = mapped_column(String(150))
    tier_level: Mapped[str] = mapped_column(String(30))  # state, district, block, panchayat
    parent_tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    state_code: Mapped[str] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ConfigurableApprovalWorkflow(Base):
    """Configurable state/department approval step sequence builder."""
    __tablename__ = "configurable_approval_workflows"
    __table_args__ = (Index("ix_caw_tenant", "tenant_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant_hierarchies.id"))
    work_category: Mapped[str] = mapped_column(String(50))  # road, bridge, school, water
    workflow_steps_json: Mapped[list] = mapped_column(JSON, default=list)
    financial_threshold_ceiling: Mapped[float] = mapped_column(Float, default=10000000.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class TenantWhiteLabelConfig(Base):
    """White-label branding and styling per state/department tenant."""
    __tablename__ = "tenant_white_label_configs"
    __table_args__ = (Index("ix_twl_tenant", "tenant_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant_hierarchies.id"), unique=True)
    portal_title: Mapped[str] = mapped_column(String(150))
    state_emblem_uri: Mapped[str] = mapped_column(String(200))
    primary_accent_color: Mapped[str] = mapped_column(String(20), default="#0284c7")
    custom_domain_cname: Mapped[str] = mapped_column(String(150))
    footer_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EofficeSSOConfig(Base):
    """Single sign-on metadata with NIC Parichay and eOffice."""
    __tablename__ = "eoffice_sso_configs"
    __table_args__ = (Index("ix_sso_tenant", "tenant_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant_hierarchies.id"), unique=True)
    idp_entity_id: Mapped[str] = mapped_column(String(150))
    sso_url: Mapped[str] = mapped_column(String(200))
    x509_certificate_fingerprint: Mapped[str] = mapped_column(String(100))
    protocol: Mapped[str] = mapped_column(String(20), default="SAML_2.0")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class LocaleTranslationRegistry(Base):
    """Localization and internationalization dictionary across 22 scheduled languages."""
    __tablename__ = "locale_translation_registries"
    __table_args__ = (Index("ix_locale_lang", "language_code", "namespace"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    language_code: Mapped[str] = mapped_column(String(10))  # hi, bn, te, mr, ta, ur, gu, kn, ml, or, pa, as, etc.
    language_name: Mapped[str] = mapped_column(String(50))
    namespace: Mapped[str] = mapped_column(String(50))
    translations_json: Mapped[dict] = mapped_column(JSON, default=dict)
    completeness_pct: Mapped[float] = mapped_column(Float, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class TenantFeatureFlag(Base):
    """Runtime tenant feature flags and module configuration console."""
    __tablename__ = "tenant_feature_flags"
    __table_args__ = (Index("ix_flag_tenant_module", "tenant_id", "module_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenant_hierarchies.id"))
    module_key: Mapped[str] = mapped_column(String(50))  # drone_survey, satellite_diff, benford_check
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    custom_parameters_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ShardScalingMeta(Base):
    """Horizontal database read-replica scaling and sharding metadata."""
    __tablename__ = "shard_scaling_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shard_name: Mapped[str] = mapped_column(String(50), unique=True)
    region_cluster: Mapped[str] = mapped_column(String(50))
    assigned_states_json: Mapped[list] = mapped_column(JSON, default=list)
    read_replica_count: Mapped[int] = mapped_column(Integer, default=3)
    current_qps: Mapped[float] = mapped_column(Float, default=420.0)
    is_healthy: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.10: Analytics, BI & Policy Tools (7 Models)
# =============================================================================

class ExecutiveBIDashboard(Base):
    """Executive BI dashboard KPI snapshot for Secretaries and Ministers."""
    __tablename__ = "executive_bi_dashboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    state_code: Mapped[str] = mapped_column(String(10))
    reporting_quarter: Mapped[str] = mapped_column(String(20))
    total_sanctioned_cr: Mapped[float] = mapped_column(Float)
    total_disbursed_cr: Mapped[float] = mapped_column(Float)
    physical_completion_rate_pct: Mapped[float] = mapped_column(Float)
    average_delay_days: Mapped[float] = mapped_column(Float)
    defect_density_per_km: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class PredictiveMaintenanceModel(Base):
    """Predictive deterioration curves forecasting asset intervention schedules."""
    __tablename__ = "predictive_maintenance_models"
    __table_args__ = (Index("ix_pred_asset", "asset_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("asset_digital_twins.id"))
    current_health_index: Mapped[float] = mapped_column(Float)
    forecasted_degradation_year: Mapped[int] = mapped_column(Integer)
    recommended_intervention: Mapped[str] = mapped_column(String(150))
    estimated_rehab_cost_inr: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.92)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class SchemeBenchmarkComparison(Base):
    """Cross-scheme comparative benchmarking analytics."""
    __tablename__ = "scheme_benchmark_comparisons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scheme_a_code: Mapped[str] = mapped_column(String(50))
    scheme_b_code: Mapped[str] = mapped_column(String(50))
    delay_variance_pct: Mapped[float] = mapped_column(Float)
    cost_overrun_variance_pct: Mapped[float] = mapped_column(Float)
    citizen_satisfaction_gap: Mapped[float] = mapped_column(Float)
    benchmark_summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class DistrictContractorLeaderboard(Base):
    """District and contractor quality and timeliness leaderboard."""
    __tablename__ = "district_contractor_leaderboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(30))  # district or contractor
    entity_identifier: Mapped[str] = mapped_column(String(100))
    overall_rank: Mapped[int] = mapped_column(Integer)
    quality_score: Mapped[float] = mapped_column(Float)
    timeliness_score: Mapped[float] = mapped_column(Float)
    citizen_rating: Mapped[float] = mapped_column(Float)
    evaluation_cycle: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class AuditDataExportRequest(Base):
    """Export request logger for CAG, NITI Aayog, and statutory RTI inquiries."""
    __tablename__ = "audit_data_export_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requesting_agency: Mapped[str] = mapped_column(String(100))  # CAG, NITI_Aayog, Lokayukta
    query_scope: Mapped[str] = mapped_column(String(150))
    export_format: Mapped[str] = mapped_column(String(20))  # CSV, JSON-LD, Parquet
    download_uri: Mapped[str] = mapped_column(String(200))
    records_count: Mapped[int] = mapped_column(Integer)
    export_sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class NaturalLanguageQueryAudit(Base):
    """NL 'Ask Your Data' query assistant logging and feedback."""
    __tablename__ = "natural_language_query_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_prompt: Mapped[str] = mapped_column(Text)
    generated_query_type: Mapped[str] = mapped_column(String(50))
    structured_response_json: Mapped[dict] = mapped_column(JSON, default=dict)
    execution_time_ms: Mapped[float] = mapped_column(Float)
    feedback_rating: Mapped[str] = mapped_column(String(20), default="positive")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class FundFlowForecast(Base):
    """Budget forecasting and multi-year fund-flow projection planner."""
    __tablename__ = "fund_flow_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scheme_code: Mapped[str] = mapped_column(String(50))
    target_financial_year: Mapped[str] = mapped_column(String(20))
    projected_capital_outlay_cr: Mapped[float] = mapped_column(Float)
    historical_burn_rate_pct: Mapped[float] = mapped_column(Float)
    recommended_budgetary_allocation_cr: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.11: Sustainability & Environmental Compliance (4 Models)
# =============================================================================

class CarbonFootprintRecord(Base):
    """Green infrastructure embodied-carbon emissions tracking."""
    __tablename__ = "carbon_footprint_records"
    __table_args__ = (Index("ix_carbon_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    cement_consumption_mt: Mapped[float] = mapped_column(Float)
    steel_consumption_mt: Mapped[float] = mapped_column(Float)
    bitumen_consumption_mt: Mapped[float] = mapped_column(Float)
    embodied_carbon_tco2e: Mapped[float] = mapped_column(Float)
    green_rating_grade: Mapped[str] = mapped_column(String(20), default="GRIHA_4_STAR")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class CompensatoryPlantationTracker(Base):
    """Tree felling and compensatory afforestation survival tracker (1:10 ratio)."""
    __tablename__ = "compensatory_plantation_trackers"
    __table_args__ = (Index("ix_cpt_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    trees_felled_count: Mapped[int] = mapped_column(Integer)
    mandatory_plantation_count: Mapped[int] = mapped_column(Integer)
    actual_planted_count: Mapped[int] = mapped_column(Integer)
    satellite_verified_survival_rate_pct: Mapped[float] = mapped_column(Float)
    plantation_geofence_wkt: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class WasteDisposalLog(Base):
    """Construction and Demolition (C&D) waste disposal compliance ledger."""
    __tablename__ = "waste_disposal_logs"
    __table_args__ = (Index("ix_waste_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    waste_quantity_metric_tons: Mapped[float] = mapped_column(Float)
    authorized_recycling_facility: Mapped[str] = mapped_column(String(150))
    transport_manifest_receipt_id: Mapped[str] = mapped_column(String(100))
    municipal_clearance_status: Mapped[str] = mapped_column(String(50), default="cleared")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ClimateRiskTag(Base):
    """Climate resilience and hazard-zone risk classification."""
    __tablename__ = "climate_risk_tags"
    __table_args__ = (Index("ix_climate_proj", "project_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    hazard_zone_type: Mapped[str] = mapped_column(String(50))  # flood_plain, seismic_zone_iv, landslide_prone, extreme_heat
    vulnerability_score: Mapped[float] = mapped_column(Float)
    climate_resilience_design_mitigations: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


# =============================================================================
# PILLAR B.12: AI/ML Platform Engineering & Model Governance (6 Models)
# =============================================================================

class ModelRegistryRecord(Base):
    """Computer-vision model registry, versioning, and deployment lifecycle."""
    __tablename__ = "model_registry_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100))  # yolov8-pothole, nbc-structural, iri-roughness
    model_version: Mapped[str] = mapped_column(String(50), unique=True)
    framework: Mapped[str] = mapped_column(String(50), default="PyTorch / Ultralytics")
    weights_sha256: Mapped[str] = mapped_column(String(64))
    storage_uri: Mapped[str] = mapped_column(String(200))
    deployment_stage: Mapped[str] = mapped_column(String(30), default="production")  # staging, production, canary, archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ModelDriftMetric(Base):
    """Continuous accuracy evaluation and concept drift tracking."""
    __tablename__ = "model_drift_metrics"
    __table_args__ = (Index("ix_drift_model", "model_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_version: Mapped[str] = mapped_column(String(50))
    evaluation_date: Mapped[str] = mapped_column(String(30))
    test_sample_size: Mapped[int] = mapped_column(Integer)
    precision_score: Mapped[float] = mapped_column(Float)
    recall_score: Mapped[float] = mapped_column(Float)
    map50_score: Mapped[float] = mapped_column(Float)
    drift_alert_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class HumanFeedbackRetrainingSample(Base):
    """Human engineer verification overrides feeding the active retraining loop."""
    __tablename__ = "human_feedback_retraining_samples"
    __table_args__ = (Index("ix_hfr_evidence", "evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    original_ai_prediction_json: Mapped[dict] = mapped_column(JSON, default=dict)
    engineer_ground_truth_json: Mapped[dict] = mapped_column(JSON, default=dict)
    reviewing_engineer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    is_queued_for_retraining: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class FairnessAuditReport(Base):
    """Regional and demographic fairness assessment for AI vision pipelines."""
    __tablename__ = "fairness_audit_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    audit_date: Mapped[str] = mapped_column(String(30))
    model_name: Mapped[str] = mapped_column(String(100))
    evaluated_districts_count: Mapped[int] = mapped_column(Integer)
    max_regional_accuracy_disparity_pct: Mapped[float] = mapped_column(Float)
    disparate_impact_ratio: Mapped[float] = mapped_column(Float)
    is_fairness_certified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class ModelCardDocumentation(Base):
    """Formal Model Card documenting training provenance, ethical bounds, and metrics."""
    __tablename__ = "model_card_documentations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100), unique=True)
    intended_domain: Mapped[str] = mapped_column(Text)
    training_data_summary: Mapped[Text] = mapped_column(Text)
    quantitative_metrics_summary: Mapped[Text] = mapped_column(Text)
    ethical_and_operational_limits: Mapped[Text] = mapped_column(Text)
    license: Mapped[str] = mapped_column(String(50), default="Apache-2.0 / GoI Public")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())


class EdgeInferenceManifest(Base):
    """Quantized edge/offline inference model manifest for low-connectivity field apps."""
    __tablename__ = "edge_inference_manifests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_code: Mapped[str] = mapped_column(String(50), unique=True)
    quantization_type: Mapped[str] = mapped_column(String(30), default="INT8")  # INT8, FP16
    package_size_mb: Mapped[float] = mapped_column(Float, default=14.5)
    tflite_uri: Mapped[str] = mapped_column(String(200))
    offline_sync_protocol_version: Mapped[str] = mapped_column(String(20), default="SYNC-v2.2")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
