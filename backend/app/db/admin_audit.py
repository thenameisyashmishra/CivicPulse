"""
Immutable Admin Action Audit Log for CivicPulse Governance.

Ensures every administrative action (user privilege elevation, project deletion,
system configuration override, manual AI flag dismissal) is recorded with:
- Actor user ID and email
- Detailed action verb & resource identifier
- Exact JSON before/after state diff
- Timestamp, client IP, and User-Agent
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import DateTime, Index, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.db.database import Base

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    __table_args__ = (
        Index("ix_admin_audit_actor_created", "actor_id", "created_at"),
        Index("ix_admin_audit_action_resource", "action", "resource_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    before_state: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    after_state: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )


def log_admin_action(
    db: Session,
    *,
    actor_id: int,
    actor_email: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    before_state: Optional[dict[str, Any]] = None,
    after_state: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AdminAuditLog:
    """Records an immutable administrative action entry."""
    ip = None
    ua = None
    if request:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")

    log_entry = AdminAuditLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    logger.info(
        "Admin action logged",
        extra={"extra_context": {
            "actor": actor_email,
            "action": action,
            "resource": f"{resource_type}:{resource_id}",
        }},
    )
    return log_entry
