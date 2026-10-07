from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user, require_roles
from app.db.models import EvidenceStatus, UserRole
from app.core.websockets import ws_manager

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_project_out(project: models.Project) -> schemas.ProjectOut:
    image_count = len(project.evidence)
    verified_count = sum(1 for e in project.evidence if e.status == EvidenceStatus.verified)
    data = schemas.ProjectOut.model_validate(project)
    data.image_count = image_count
    data.verified_count = verified_count
    return data


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(
    status_filter: models.ProjectStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Project)
    if status_filter:
        query = query.filter(models.Project.status == status_filter)
    projects = query.order_by(models.Project.id).offset(offset).limit(limit).all()
    return [_to_project_out(p) for p in projects]


@router.post("", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.admin, UserRole.engineer, UserRole.pradhan)),
):
    if db.get(models.Project, payload.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Project {payload.id} already exists")

    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)

    # Broadcast project creation
    ws_manager.emit_event(
        event_type="project_created",
        data={
            "title": f"New Project: {project.name}",
            "message": f"New public work '{project.name}' ({project.id}) launched in {project.location}.",
            "project_id": project.id,
            "name": project.name,
            "type": project.type,
            "location": project.location,
            "budget": project.budget,
            "status": project.status.value,
        },
        broadcast_global=True,
    )

    return _to_project_out(project)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _to_project_out(project)


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: str,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.admin, UserRole.engineer)),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    # Broadcast project update/status change
    ws_manager.emit_event(
        event_type="project_status_changed",
        data={
            "title": f"Project Updated: {project.name}",
            "message": f"Project '{project.name}' ({project.id}) updated. Status: {project.status.value}, Progress: {project.progress}%.",
            "project_id": project.id,
            "name": project.name,
            "status": project.status.value,
            "progress": project.progress,
            "budget": project.budget,
            "spent": project.spent,
        },
        project_id=project.id,
        broadcast_global=True,
    )

    return _to_project_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.admin)),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    project_name = project.name
    db.delete(project)
    db.commit()

    # Broadcast project deletion
    ws_manager.emit_event(
        event_type="project_deleted",
        data={
            "title": f"Project Deleted: {project_id}",
            "message": f"Project '{project_name}' ({project_id}) was removed.",
            "project_id": project_id,
        },
        project_id=project_id,
        broadcast_global=True,
    )
