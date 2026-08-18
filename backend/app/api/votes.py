from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import require_roles
from app.db.models import UserRole

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
        return existing

    vote = models.Vote(
        evidence_id=evidence_id,
        citizen_id=current_user.id,
        choice=payload.choice,
        comment=payload.comment,
    )
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return vote


@router.get("/{evidence_id}/votes", response_model=list[schemas.VoteOut])
def list_votes(
    evidence_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.citizen, UserRole.pradhan, UserRole.engineer, UserRole.admin)),
):
    if not db.get(models.Evidence, evidence_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    return db.query(models.Vote).filter(models.Vote.evidence_id == evidence_id).all()
