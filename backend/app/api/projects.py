from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user, require_roles
from app.db.models import EvidenceStatus, UserRole

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
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Project)
    if status_filter:
        query = query.filter(models.Project.status == status_filter)
    projects = query.order_by(models.Project.id).all()
    return [_to_project_out(p) for p in projects]


@router.post("", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_roles(UserRole.admin, UserRole.engineer)),
):
    if db.get(models.Project, payload.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Project {payload.id} already exists")

    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
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
    db.delete(project)
    db.commit()
