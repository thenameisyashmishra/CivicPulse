"""
SLA Auto-Escalation Engine for CivicPulse Governance.

Scans for overdue approval steps in the verification workflow:
- Gram Pradhan: 48h SLA -> Auto-escalate to VDO/Engineer
- VDO / Engineer: 72h SLA -> Auto-escalate to Admin / District Level
- Admin: 96h SLA -> Flag breach for District Collector / Vigilance audit
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.websockets import ws_manager
from app.db.models import ApprovalDecision, ApprovalLevel, ApprovalStep

logger = logging.getLogger(__name__)

SLA_HOURS = {
    ApprovalLevel.pradhan: 48,
    ApprovalLevel.engineer: 72,
    ApprovalLevel.admin: 96,
}

ESCALATION_MAP = {
    ApprovalLevel.pradhan: ApprovalLevel.engineer,
    ApprovalLevel.engineer: ApprovalLevel.admin,
    ApprovalLevel.admin: None,  # Highest level; logs statutory breach
}


def check_and_escalate_overdue_steps(db: Session) -> dict[str, int]:
    """
    Scans the database for pending approval steps that have breached their statutory SLA.
    Advances them to the next hierarchy tier or records a vigilance escalation breach.
    """
    now = datetime.now(timezone.utc)
    pending_steps = (
        db.query(ApprovalStep)
        .filter(ApprovalStep.decision == ApprovalDecision.pending)
        .all()
    )

    escalated_count = 0
    breached_count = 0

    for step in pending_steps:
        created_time = step.created_at
        if created_time.tzinfo is None:
            created_time = created_time.replace(tzinfo=timezone.utc)

        sla_hours = SLA_HOURS.get(step.level, 72)
        deadline = created_time + timedelta(hours=sla_hours)

        if now > deadline:
            next_level = ESCALATION_MAP.get(step.level)
            hours_overdue = round((now - deadline).total_seconds() / 3600, 1)

            if next_level is not None:
                step.decision = ApprovalDecision.escalated
                step.remarks = f"AUTO-ESCALATED: SLA deadline breached by {hours_overdue}h (exceeded {sla_hours}h limit)."
                step.decided_at = now

                # Create next pending tier in the chain
                new_step = ApprovalStep(
                    evidence_id=step.evidence_id,
                    level=next_level,
                    decision=ApprovalDecision.pending,
                )
                db.add(new_step)
                escalated_count += 1

                # Broadcast real-time notification
                ws_manager.broadcast_sync({
                    "type": "sla_escalation",
                    "evidence_id": step.evidence_id,
                    "from_level": step.level.value,
                    "to_level": next_level.value,
                    "hours_overdue": hours_overdue,
                    "message": f"Evidence #{step.evidence_id} auto-escalated to {next_level.value} due to SLA breach.",
                })
            else:
                # Admin SLA breach - record breach flag
                step.remarks = f"CRITICAL SLA BREACH: Admin sign-off overdue by {hours_overdue}h. Surfaced to Vigilance."
                breached_count += 1

    if escalated_count > 0 or breached_count > 0:
        db.commit()
        logger.info("SLA scan complete: %d steps escalated, %d administrative breaches flagged.", escalated_count, breached_count)

    return {"escalated": escalated_count, "breached": breached_count, "scanned": len(pending_steps)}
