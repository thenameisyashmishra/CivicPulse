from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import require_roles
from app.db.models import UserRole
from app.core.websockets import ws_manager

router = APIRouter(prefix="/api/evidence", tags=["votes"])


@router.post("/{evidence_id}/vote", response_model=schemas.VoteOut, status_code=status.HTTP_201_CREATED)
def cast_vote(
    evidence_id: int,
    payload: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.citizen)),
):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    existing = (
        db.query(models.Vote)
        .filter(models.Vote.evidence_id == evidence_id, models.Vote.citizen_id == current_user.id)
        .first()
    )
    if existing:
        # One citizen, one vote per piece of evidence — update instead of duplicating.
        existing.choice = payload.choice
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        target_vote = existing
    else:
        vote = models.Vote(
            evidence_id=evidence_id,
            citizen_id=current_user.id,
            choice=payload.choice,
            comment=payload.comment,
        )
        db.add(vote)
        db.commit()
        db.refresh(vote)
        target_vote = vote

    # Compute updated tally and broadcast
    db.refresh(evidence)
    vote_summary: dict[str, int] = {}
    for v in evidence.votes:
        vote_summary[v.choice.value] = vote_summary.get(v.choice.value, 0) + 1

    ws_manager.emit_event(
        event_type="vote_tally_updated",
        data={
            "title": f"Citizen Vote: {evidence.project_id}",
            "message": f"Citizen {current_user.name} voted '{payload.choice.value}' on evidence #{evidence.id}.",
            "evidence_id": evidence.id,
            "project_id": evidence.project_id,
            "choice": payload.choice.value,
            "comment": payload.comment,
            "vote_summary": vote_summary,
            "total_votes": sum(vote_summary.values()),
        },
        project_id=evidence.project_id,
        user_id=evidence.uploaded_by_id,
        broadcast_global=True,
    )

    return target_vote


@router.get("/{evidence_id}/votes", response_model=list[schemas.VoteOut])
def list_votes(
    evidence_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.citizen, UserRole.pradhan, UserRole.engineer, UserRole.admin)),
):
    if not db.get(models.Evidence, evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    return db.query(models.Vote).filter(models.Vote.evidence_id == evidence_id).all()
