"""
Open Data & Open Contracting Data Standard (OCDS 1.1) Export API.

Exposes public works projects in the international Open Contracting Data Standard (OCDS)
format, enabling interoperability with:
- Comptroller and Auditor General (CAG) audit portals
- Central / State RTI portals
- Independent civic journalism & public infrastructure research
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import models
from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/opendata", tags=["opendata"])


@router.get("/ocds/releases")
def get_ocds_releases(
    status: str | None = Query(default=None, description="Filter by project status (active, completed, delayed, flagged)"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Exports projects conforming to the Open Contracting Data Standard (OCDS 1.1)
    Release Package specification.
    """
    query = db.query(models.Project)
    if status:
        query = query.filter(models.Project.status == status)

    projects = query.limit(limit).all()
    now_iso = datetime.now(timezone.utc).isoformat()

    releases: List[Dict[str, Any]] = []

    for p in projects:
        release = {
            "ocid": f"ocds-civicpulse-in-{p.id}",
            "id": f"release-{p.id}-{now_iso}",
            "date": p.created_at.isoformat() if p.created_at else now_iso,
            "tag": ["implementation" if p.status == models.ProjectStatus.active else "contract"],
            "initiationType": "tender",
            "parties": [
                {
                    "name": p.contractor or "Registered Public Works Contractor",
                    "id": f"contractor-{p.contractor or 'unassigned'}",
                    "roles": ["supplier"],
                },
                {
                    "name": "Department of Rural Development & Panchayati Raj",
                    "id": "gov-dept-rdpr",
                    "roles": ["procuringEntity", "buyer"],
                },
            ],
            "planning": {
                "budget": {
                    "amount": {"amount": float(p.budget), "currency": "INR"},
                    "project": p.name,
                    "projectID": p.id,
                },
            },
            "tender": {
                "id": p.id,
                "title": p.name,
                "description": f"Public works {p.type} construction and maintenance in {p.location}.",
                "status": "complete" if p.status == models.ProjectStatus.completed else "active",
                "value": {"amount": float(p.budget), "currency": "INR"},
                "procurementMethod": "open",
            },
            "contracts": [
                {
                    "id": f"cnt-{p.id}",
                    "awardID": f"awd-{p.id}",
                    "title": p.name,
                    "status": "terminated" if p.status == models.ProjectStatus.flagged else "active",
                    "period": {
                        "startDate": p.start_date,
                        "endDate": p.end_date,
                    },
                    "value": {"amount": float(p.spent), "currency": "INR"},
                    "implementation": {
                        "milestones": [
                            {
                                "id": f"milestone-progress-{p.id}",
                                "title": "Physical Progress Completion",
                                "type": "physical",
                                "status": "met" if p.progress == 100 else "scheduled",
                                "description": f"Verified physical progress currently at {p.progress}%.",
                            }
                        ],
                    },
                }
            ],
            "spatial": {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [p.lng, p.lat],
                },
                "properties": {
                    "location": p.location,
                    "type": p.type,
                    "progress": p.progress,
                },
            },
        }
        releases.append(release)

    return {
        "uri": "/api/opendata/ocds/releases",
        "version": "1.1",
        "publishedDate": now_iso,
        "publisher": {
            "name": "CivicPulse Open Governance Data Gateway",
            "scheme": "IN-GOV",
        },
        "license": "https://data.gov.in/open-data-license-india",
        "publicationPolicy": "https://civicpulse.gov.in/opendata/policy",
        "releases": releases,
    }
