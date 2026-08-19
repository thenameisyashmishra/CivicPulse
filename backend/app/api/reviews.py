"""
Implements the Gram Pradhan -> VDO/Engineer -> Admin multi-level approval
chain from the spec. Each piece of evidence gets one ApprovalStep row per
level, created (as `pending`) at upload time. A reviewer can only act on
their own level, and only once every earlier level has been cleared —
enforced server-side, not just in the UI.

Integrates with the Tamper-Proof Cryptographic Audit Ledger:
- SHA-256 block hash generation linked to previous block/genesis
- Reviewer HMAC-SHA256 digital signature
- Merkle root verification and tamper detection
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user, require_roles
from app.db.models import ApprovalDecision, ApprovalLevel, EvidenceStatus, UserRole
from app.core.websockets import ws_manager
from app.core.crypto_ledger import (
    compute_genesis_hash,
    compute_block_hash,
    compute_step_signature,
    validate_approval_chain,
)

router = APIRouter(tags=["reviews"])

_LEVEL_ORDER = [ApprovalLevel.pradhan, ApprovalLevel.engineer, ApprovalLevel.admin]
_ROLE_TO_LEVEL = {
    UserRole.pradhan: ApprovalLevel.pradhan,
    UserRole.engineer: ApprovalLevel.engineer,
    UserRole.admin: ApprovalLevel.admin,
}


@router.post("/api/evidence/{evidence_id}/review", response_model=schemas.EvidenceOut)
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
    prev_block_hash = None
    for earlier_level in _LEVEL_ORDER[:my_index]:
        earlier_step = steps_by_level.get(earlier_level)
        if earlier_step is None or earlier_step.decision not in (ApprovalDecision.approved, ApprovalDecision.escalated):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot review at '{my_level.value}' level until '{earlier_level.value}' has approved",
            )
        prev_block_hash = earlier_step.block_hash

    if payload.decision == ApprovalDecision.escalated and my_level != ApprovalLevel.pradhan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only the Pradhan level can escalate")

    # Determine previous hash in cryptographic chain
    if my_level == ApprovalLevel.pradhan:
        prev_hash = compute_genesis_hash(
            evidence_id=evidence.id,
            project_id=evidence.project_id,
            image_path=evidence.image_path,
            created_at=evidence.created_at,
            phash=evidence.phash,
        )
    else:
        prev_hash = prev_block_hash or compute_genesis_hash(
            evidence_id=evidence.id,
            project_id=evidence.project_id,
            image_path=evidence.image_path,
            created_at=evidence.created_at,
            phash=evidence.phash,
        )

    decided_time = datetime.now(timezone.utc)
    my_step.decision = payload.decision
    my_step.reviewer_id = current_user.id
    my_step.remarks = payload.remarks
    my_step.decided_at = decided_time
    my_step.prev_hash = prev_hash

    # Compute SHA-256 block hash for this approval step
    block_hash = compute_block_hash(
        prev_hash=prev_hash,
        step_id=my_step.id,
        evidence_id=evidence.id,
        level=my_level.value,
        decision=payload.decision.value,
        reviewer_id=current_user.id,
        remarks=payload.remarks,
        decided_at=decided_time,
    )
    my_step.block_hash = block_hash

    # Generate HMAC-SHA256 cryptographic signature
    my_step.signature = compute_step_signature(
        block_hash=block_hash,
        reviewer_id=current_user.id,
        role=current_user.role.value,
    )

    if payload.decision == ApprovalDecision.rejected:
        evidence.status = EvidenceStatus.failed
    elif my_level == ApprovalLevel.admin and payload.decision == ApprovalDecision.approved:
        evidence.status = EvidenceStatus.verified
    else:
        # Approved/escalated at a non-final level: still awaiting later levels.
        evidence.status = EvidenceStatus.review

    db.commit()
    db.refresh(evidence)

    # Broadcast review progression to project room, uploader, and global feed
    ws_manager.emit_event(
        event_type="approval_step_progression",
        data={
            "title": f"Review Update: {my_level.value.capitalize()} Decision",
            "message": (
                f"Evidence #{evidence.id} for {evidence.project_id} was marked '{payload.decision.value}' "
                f"by {current_user.name} ({current_user.role.value}). New status: {evidence.status.value}."
            ),
            "evidence_id": evidence.id,
            "project_id": evidence.project_id,
            "level": my_level.value,
            "decision": payload.decision.value,
            "remarks": payload.remarks,
            "new_status": evidence.status.value,
            "reviewer_id": current_user.id,
            "reviewer_name": current_user.name,
            "reviewer_role": current_user.role.value,
            "uploaded_by_id": evidence.uploaded_by_id,
            "block_hash": block_hash,
            "prev_hash": prev_hash,
        },
        project_id=evidence.project_id,
        user_id=evidence.uploaded_by_id,
        broadcast_global=True,
    )

    vote_summary: dict[str, int] = {}
    for vote in evidence.votes:
        vote_summary[vote.choice.value] = vote_summary.get(vote.choice.value, 0) + 1
    out = schemas.EvidenceOut.model_validate(evidence)
    out.vote_summary = vote_summary
    return out


@router.get("/api/reviews/verify-chain/{evidence_id}", response_model=schemas.ChainVerificationResponse)
@router.get("/api/evidence/verify-chain/{evidence_id}", response_model=schemas.ChainVerificationResponse)
@router.get("/api/evidence/{evidence_id}/verify-chain", response_model=schemas.ChainVerificationResponse)
def verify_approval_chain(
    evidence_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    """
    Validates the tamper-proof cryptographic audit chain for a piece of evidence.
    Verifies SHA-256 block hash chaining from Pradhan -> Engineer -> Admin,
    validates HMAC digital signatures, and computes the Merkle root.
    """
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    result = validate_approval_chain(evidence, evidence.approval_steps)
    return result

