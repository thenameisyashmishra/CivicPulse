"""
Implements the Gram Pradhan -> VDO/Engineer -> Admin multi-level approval
chain from the spec. Each piece of evidence gets one ApprovalStep row per
level, created (as `pending`) at upload time. A reviewer can only act on
their own level, and only once every earlier level has been cleared —
enforced server-side, not just in the UI.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import require_roles
from app.db.models import ApprovalDecision, ApprovalLevel, EvidenceStatus, UserRole

router = APIRouter(prefix="/api/evidence", tags=["reviews"])

_LEVEL_ORDER = [ApprovalLevel.pradhan, ApprovalLevel.engineer, ApprovalLevel.admin]
_ROLE_TO_LEVEL = {
    UserRole.pradhan: ApprovalLevel.pradhan,
    UserRole.engineer: ApprovalLevel.engineer,
    UserRole.admin: ApprovalLevel.admin,
}


@router.post("/{evidence_id}/review", response_model=schemas.EvidenceOut)
def review_evidence(
    evidence_id: int,
    payload: schemas.ApprovalDecisionIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.pradhan, UserRole.engineer, UserRole.admin)),
):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    if evidence.status == EvidenceStatus.failed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evidence already rejected — no further review possible")
    if evidence.status == EvidenceStatus.verified:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evidence already fully approved")

    my_level = _ROLE_TO_LEVEL[current_user.role]
    steps_by_level = {s.level: s for s in evidence.approval_steps}
    my_step = steps_by_level.get(my_level)
    if my_step is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Approval step missing for this level")

    if my_step.decision != ApprovalDecision.pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{my_level.value} has already decided on this evidence")

    # Enforce ordering: every level before mine must already be cleared.
    my_index = _LEVEL_ORDER.index(my_level)
    for earlier_level in _LEVEL_ORDER[:my_index]:
        earlier_step = steps_by_level.get(earlier_level)
        if earlier_step is None or earlier_step.decision not in (ApprovalDecision.approved, ApprovalDecision.escalated):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot review at '{my_level.value}' level until '{earlier_level.value}' has approved",
            )

    if payload.decision == ApprovalDecision.escalated and my_level != ApprovalLevel.pradhan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only the Pradhan level can escalate")

    my_step.decision = payload.decision
    my_step.reviewer_id = current_user.id
    my_step.remarks = payload.remarks
    my_step.decided_at = datetime.now(timezone.utc)

    if payload.decision == ApprovalDecision.rejected:
        evidence.status = EvidenceStatus.failed
    elif my_level == ApprovalLevel.admin and payload.decision == ApprovalDecision.approved:
        evidence.status = EvidenceStatus.verified
    else:
        # Approved/escalated at a non-final level: still awaiting later levels.
        evidence.status = EvidenceStatus.review

    db.commit()
    db.refresh(evidence)

    vote_summary: dict[str, int] = {}
    for vote in evidence.votes:
        vote_summary[vote.choice.value] = vote_summary.get(vote.choice.value, 0) + 1
    out = schemas.EvidenceOut.model_validate(evidence)
    out.vote_summary = vote_summary
    return out
