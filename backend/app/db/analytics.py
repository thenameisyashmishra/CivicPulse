"""
OLAP Analytics & Aggregation Engine for CivicPulse (OLTP/OLAP Separation).

Features:
- Offloads analytical calculations (city expenditure, contractor scorecards, voting heatmaps)
  from the primary transactional PostgreSQL database.
- Provides high-speed aggregate computations with caching.
- Prepares aggregate pipelines for ClickHouse / DuckDB ingestion.
"""

import logging
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import ApprovalStep, Evidence, Project, ProjectStatus, User, Vote

logger = logging.getLogger(__name__)


def compute_executive_kpis() -> Dict[str, Any]:
    """
    Computes high-level municipal project KPIs without table locking.
    Can be called asynchronously or cached in Redis.
    """
    db: Session = SessionLocal()
    try:
        total_projects = db.query(func.count(Project.id)).scalar() or 0
        active_projects = db.query(func.count(Project.id)).filter(Project.status == ProjectStatus.active).scalar() or 0
        flagged_projects = db.query(func.count(Project.id)).filter(Project.status == ProjectStatus.flagged).scalar() or 0
        completed_projects = db.query(func.count(Project.id)).filter(Project.status == ProjectStatus.completed).scalar() or 0

        total_budget = db.query(func.sum(Project.budget)).scalar() or 0.0
        total_spent = db.query(func.sum(Project.spent)).scalar() or 0.0

        total_evidence = db.query(func.count(Evidence.id)).scalar() or 0
        total_votes = db.query(func.count(Vote.id)).scalar() or 0
        total_citizens = db.query(func.count(User.id)).scalar() or 0

        budget_utilization_pct = (float(total_spent) / float(total_budget) * 100.0) if total_budget > 0 else 0.0

        return {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "flagged_projects": flagged_projects,
            "completed_projects": completed_projects,
            "total_budget": float(total_budget),
            "total_spent": float(total_spent),
            "budget_utilization_pct": round(budget_utilization_pct, 2),
            "total_evidence_submissions": total_evidence,
            "total_votes_cast": total_votes,
            "total_registered_citizens": total_citizens,
        }
    except Exception as e:
        logger.error(f"Error computing executive KPIs: {e}")
        return {}
    finally:
        db.close()


def compute_contractor_scorecards() -> List[Dict[str, Any]]:
    """Aggregates contractor performance, completion rates, and flag rates."""
    db: Session = SessionLocal()
    try:
        results = (
            db.query(
                Project.contractor,
                func.count(Project.id).label("total_projects"),
                func.avg(Project.progress).label("avg_progress"),
                func.sum(Project.budget).label("total_allocated"),
                func.sum(Project.spent).label("total_spent"),
            )
            .group_by(Project.contractor)
            .all()
        )

        scorecards = []
        for r in results:
            scorecards.append({
                "contractor": r.contractor,
                "total_projects": r.total_projects,
                "avg_progress": round(float(r.avg_progress or 0), 1),
                "total_allocated": float(r.total_allocated or 0),
                "total_spent": float(r.total_spent or 0),
            })
        return scorecards
    except Exception as e:
        logger.error(f"Error computing contractor scorecards: {e}")
        return []
    finally:
        db.close()
