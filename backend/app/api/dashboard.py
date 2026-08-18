from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user
from app.db.models import EvidenceStatus, ProjectStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).all()
    evidence = db.query(models.Evidence).all()

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == ProjectStatus.active)
    completed_projects = sum(1 for p in projects if p.status == ProjectStatus.completed)
    budget_allocated = sum(p.budget for p in projects)
    budget_spent = sum(p.spent for p in projects)
    average_progress = round(sum(p.progress for p in projects) / total_projects, 1) if total_projects else 0.0

    verifications_total = len(evidence)
    verifications_verified = sum(1 for e in evidence if e.status == EvidenceStatus.verified)
    verifications_failed = sum(1 for e in evidence if e.status == EvidenceStatus.failed)

    return schemas.DashboardStats(
        active_projects=active_projects,
        completed_projects=completed_projects,
        total_projects=total_projects,
        budget_allocated=budget_allocated,
        budget_spent=budget_spent,
        budget_utilization_pct=round((budget_spent / budget_allocated) * 100, 1) if budget_allocated else 0.0,
        verifications_total=verifications_total,
        verifications_verified=verifications_verified,
        verifications_failed=verifications_failed,
        average_progress=average_progress,
    )
