"""
SQLAlchemy ORM models.

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
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
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
    # Mirrors the frontend's VerificationStatus so the two systems line up.
    pending = "pending"     # uploaded, AI analysis not yet run / awaiting review
    review = "review"       # AI flagged something ambiguous, needs human eyes
    verified = "verified"   # passed AI checks + human approval chain
    failed = "failed"       # AI or a human reviewer rejected it


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.citizen)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    aadhaar_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    aadhaar_last_4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    evidence_uploads: Mapped[list["Evidence"]] = relationship(back_populates="uploaded_by", foreign_keys="Evidence.uploaded_by_id")
    votes: Mapped[list["Vote"]] = relationship(back_populates="citizen")


class Project(Base):
    __tablename__ = "projects"

    # Human-readable IDs like "PW-2024-001", matching the frontend's format.
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(200))
    contractor: Mapped[str] = mapped_column(String(200))
    budget: Mapped[float] = mapped_column(Float)
    spent: Mapped[float] = mapped_column(Float, default=0)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.active)
    start_date: Mapped[str] = mapped_column(String(20))
    end_date: Mapped[str] = mapped_column(String(20))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    evidence: Mapped[list["Evidence"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

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

    # --- Overall workflow status (driven by AI + approval chain) ---
    status: Mapped[EvidenceStatus] = mapped_column(Enum(EvidenceStatus), default=EvidenceStatus.pending)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped["Project"] = relationship(back_populates="evidence")
    uploaded_by: Mapped["User"] = relationship(back_populates="evidence_uploads", foreign_keys=[uploaded_by_id])
    votes: Mapped[list["Vote"]] = relationship(back_populates="evidence", cascade="all, delete-orphan")
    approval_steps: Mapped[list["ApprovalStep"]] = relationship(
        back_populates="evidence", cascade="all, delete-orphan", order_by="ApprovalStep.id"
    )


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("evidence_id", "citizen_id", name="uq_one_vote_per_citizen"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    choice: Mapped[VoteChoice] = mapped_column(Enum(VoteChoice))
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    evidence: Mapped["Evidence"] = relationship(back_populates="votes")
    citizen: Mapped["User"] = relationship(back_populates="votes")


class ApprovalStep(Base):
    """One row per stage in the Pradhan -> Engineer -> Admin chain."""

    __tablename__ = "approval_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    level: Mapped[ApprovalLevel] = mapped_column(Enum(ApprovalLevel))
    decision: Mapped[ApprovalDecision] = mapped_column(Enum(ApprovalDecision), default=ApprovalDecision.pending)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    evidence: Mapped["Evidence"] = relationship(back_populates="approval_steps")
    reviewer: Mapped["User | None"] = relationship(foreign_keys=[reviewer_id])
