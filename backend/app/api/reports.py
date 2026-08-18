import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import models
from app import schemas
from app.db.database import get_db
from app.core.deps import get_current_user
from app.db.models import EvidenceStatus

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/budget-summary", response_model=list[schemas.BudgetSummaryRow])
def budget_summary(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).order_by(models.Project.id).all()
    rows = []
    for p in projects:
        remaining = p.budget - p.spent
        utilization = round((p.spent / p.budget) * 100, 1) if p.budget else 0.0
        rows.append(
            schemas.BudgetSummaryRow(
                project_id=p.id,
                name=p.name,
                allocated=p.budget,
                spent=p.spent,
                remaining=remaining,
                utilization_pct=utilization,
                status=p.status,
            )
        )
    return rows


@router.get("/verification-outcomes", response_model=schemas.VerificationOutcomeCounts)
def verification_outcomes(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    evidence = db.query(models.Evidence).all()
    counts = {status.value: 0 for status in EvidenceStatus}
    for e in evidence:
        counts[e.status.value] += 1
    return schemas.VerificationOutcomeCounts(**counts)


@router.get("/budget-summary.csv")
def budget_summary_csv(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).order_by(models.Project.id).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Project ID", "Name", "Allocated", "Spent", "Remaining", "Utilization %", "Status"])
    for p in projects:
        remaining = p.budget - p.spent
        utilization = round((p.spent / p.budget) * 100, 1) if p.budget else 0.0
        writer.writerow([p.id, p.name, p.budget, p.spent, remaining, utilization, p.status.value])
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=civicpulse-budget-summary.csv"},
    )
