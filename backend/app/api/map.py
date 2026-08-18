from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/projects", response_model=list[schemas.MapPoint])
def map_projects(
    status_filter: models.ProjectStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Project)
    if status_filter:
        query = query.filter(models.Project.status == status_filter)
    projects = query.order_by(models.Project.id).all()
    return [schemas.MapPoint(id=p.id, name=p.name, status=p.status, lat=p.lat, lng=p.lng) for p in projects]
