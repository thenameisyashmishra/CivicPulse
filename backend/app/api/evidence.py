import html
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.core.config import get_settings
from app.db.database import get_db
from app.core.deps import get_current_user
from app.db.models import ApprovalLevel, EvidenceStatus
from app.services.ai_pipeline import run_pipeline
from app.services.storage import get_storage
from app.core.websockets import ws_manager

router = APIRouter(prefix="/api", tags=["evidence"])
settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
DANGEROUS_PAYLOAD_SIGNATURES = (b"MZ", b"\x7fELF", b"<?php", b"<script", b"#!/bin/")


def _is_safe_image_binary(contents: bytes) -> bool:
    """Inspect binary header to prevent script/executable injection."""
    for sig in DANGEROUS_PAYLOAD_SIGNATURES:
        if contents.startswith(sig) or sig in contents[:64]:
            return False
    return True


def _to_evidence_out(evidence: models.Evidence) -> schemas.EvidenceOut:
    vote_summary: dict[str, int] = {}
    for vote in evidence.votes:
        key = vote.choice.value
        vote_summary[key] = vote_summary.get(key, 0) + 1

    data = schemas.EvidenceOut.model_validate(evidence)
    data.vote_summary = vote_summary
    return data


@router.post(
    "/projects/{project_id}/evidence",
    response_model=schemas.EvidenceOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_evidence(
    project_id: str,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    contents = file.file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 15 MB limit")

    if not _is_safe_image_binary(contents):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File contains invalid or disallowed executable binary signatures.",
        )

    safe_caption = html.escape(caption.strip()) if caption else None

    # --- Save the file via Pluggable Storage Backend ---
    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    relative_path = f"{project_id}/{uuid.uuid4().hex}{ext}"
    storage = get_storage()
    public_path = storage.upload(relative_path, contents, content_type=file.content_type or "image/jpeg")

    # Local disk path for local AI analysis pipeline
    disk_path = settings.upload_path / relative_path
    if not disk_path.exists():
        disk_path.parent.mkdir(parents=True, exist_ok=True)
        disk_path.write_bytes(contents)

    # --- Prior hashes for this project, for duplicate detection ---
    existing_hashes = [
        (e.id, e.phash)
        for e in db.query(models.Evidence).filter(models.Evidence.project_id == project_id, models.Evidence.phash.isnot(None)).all()
    ]

    result = run_pipeline(
        image_path=disk_path,
        project_lat=project.lat,
        project_lng=project.lng,
        existing_hashes=existing_hashes,
        project_type=project.type,
    )

    # `ai_status` is the AI pipeline's raw conclusion. `status` is the overall
    # workflow status shown across the app: it only becomes "verified" once
    # the full Pradhan -> Engineer -> Admin chain has signed off (see
    # api/reviews.py). An AI pass is necessary but not sufficient, so a
    # clean AI result still lands in "review" pending human approval; only a
    # hard AI rejection (duplicate) short-circuits straight to "failed".
    overall_status = EvidenceStatus.failed if result.status == EvidenceStatus.failed else EvidenceStatus.review

    evidence = models.Evidence(
        project_id=project_id,
        uploaded_by_id=current_user.id,
        image_path=public_path,
        caption=safe_caption,
        gps_lat=result.gps_lat,
        gps_lng=result.gps_lng,
        captured_at=result.captured_at,
        distance_from_site_m=result.distance_from_site_m,
        within_geofence=result.within_geofence,
        phash=result.phash,
        is_duplicate=result.is_duplicate,
        duplicate_of_id=result.duplicate_of_id,
        quality_score=result.quality_score,
        completion_estimate=result.completion_estimate,
        ai_confidence=result.ai_confidence,
        ai_status=result.status,
        ai_findings=result.findings,
        ai_analysis=result.analysis,
        status=overall_status,
    )
    db.add(evidence)
    db.flush()  # get evidence.id before creating approval steps

    # Only evidence that isn't immediately rejected by AI enters the human
    # Pradhan -> Engineer -> Admin approval chain.
    if result.status != EvidenceStatus.failed:
        for level in (ApprovalLevel.pradhan, ApprovalLevel.engineer, ApprovalLevel.admin):
            db.add(models.ApprovalStep(evidence_id=evidence.id, level=level))

    db.commit()
    db.refresh(evidence)

    # Broadcast evidence submission to project room, reviewers, and global feed
    ws_manager.emit_event(
        event_type="evidence_uploaded",
        data={
            "title": f"New Evidence Uploaded: {project.name}",
            "message": f"Evidence #{evidence.id} uploaded for {project.name} ({project_id}). AI status: {evidence.ai_status.value}.",
            "evidence_id": evidence.id,
            "project_id": project_id,
            "project_name": project.name,
            "uploaded_by_id": current_user.id,
            "uploaded_by_name": current_user.name,
            "status": evidence.status.value,
            "ai_status": evidence.ai_status.value,
            "quality_score": evidence.quality_score,
            "completion_estimate": evidence.completion_estimate,
            "caption": safe_caption,
            "image_path": public_path,
        },
        project_id=project_id,
        user_id=current_user.id,
        broadcast_global=True,
    )

    return _to_evidence_out(evidence)


@router.get("/projects/{project_id}/evidence", response_model=list[schemas.EvidenceListItem])
def list_project_evidence(
    project_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    if not db.get(models.Project, project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    items = (
        db.query(models.Evidence)
        .filter(models.Evidence.project_id == project_id)
        .order_by(models.Evidence.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items


@router.get("/evidence", response_model=list[schemas.EvidenceListItem])
def list_evidence(
    status_filter: EvidenceStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Evidence)
    if status_filter:
        query = query.filter(models.Evidence.status == status_filter)
    return query.order_by(models.Evidence.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/evidence/{evidence_id}", response_model=schemas.EvidenceOut)
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    return _to_evidence_out(evidence)
