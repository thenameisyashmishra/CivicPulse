"""
Data Principal Rights & Privacy Router (Digital Personal Data Protection Act 2023).

Endpoints:
- GET /api/privacy/my-data     — Right to Access (export all PII & activity data)
- POST /api/privacy/consent    — Consent Management with explicit purpose-limitation
- DELETE /api/privacy/my-data  — Right to Erasure / Anonymization
- GET /api/privacy/policy      — DPDP Compliance Statement & Processing Purposes
"""

import logging
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import schemas
from app.core.deps import get_current_user
from app.db import models
from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/privacy", tags=["privacy"])


class ConsentRecordIn(BaseModel):
    purpose: str = Field(description="Purpose of data processing (e.g. civic_verification, notification)")
    consented: bool = True
    notice_version: str = "2026.1"


class DataExportOut(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    aadhaar_verified: bool
    aadhaar_last_4: Optional[str]
    created_at: datetime
    evidence_uploads_count: int
    votes_cast_count: int
    data_retention_policy: str
    export_timestamp: str


@router.get("/my-data", response_model=DataExportOut)
def get_personal_data_export(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DPDP Act 2023 — Section 11: Right to Access Information about Personal Data.
    Provides a machine-readable summary of all personal data held about the user.
    """
    evidence_count = (
        db.query(models.Evidence)
        .filter(models.Evidence.uploaded_by_id == current_user.id)
        .count()
    )
    votes_count = (
        db.query(models.Vote)
        .filter(models.Vote.citizen_id == current_user.id)
        .count()
    )

    return DataExportOut(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        aadhaar_verified=current_user.aadhaar_verified,
        aadhaar_last_4=current_user.aadhaar_last_4,
        created_at=current_user.created_at,
        evidence_uploads_count=evidence_count,
        votes_cast_count=votes_count,
        data_retention_policy="Statutory public works audit records are retained for 7 years under General Financial Rules (GFR).",
        export_timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/consent")
def record_consent(
    payload: ConsentRecordIn,
    current_user: models.User = Depends(get_current_user),
):
    """
    DPDP Act 2023 — Section 6: Notice and Consent Management.
    Records explicit consent with purpose-limitation.
    """
    logger.info(
        "User consent recorded",
        extra={"extra_context": {
            "user_id": current_user.id,
            "purpose": payload.purpose,
            "consented": payload.consented,
            "notice_version": payload.notice_version,
        }},
    )
    return {
        "status": "recorded",
        "user_id": current_user.id,
        "purpose": payload.purpose,
        "consented": payload.consented,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/my-data")
def request_data_erasure(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DPDP Act 2023 — Section 12: Right to Correction and Erasure of Personal Data.
    Anonymizes citizen identity while preserving cryptographic hashes in the public audit ledger.
    """
    # Anonymize personal identifier fields
    current_user.name = f"Anonymized Citizen #{current_user.id}"
    current_user.email = f"anonymized_{current_user.id}@civicpulse.deleted"
    current_user.is_active = False
    current_user.aadhaar_verified = False
    current_user.aadhaar_last_4 = None

    db.add(current_user)
    db.commit()

    logger.info("Personal data erased and anonymized for user ID %d", current_user.id)
    return {
        "status": "anonymized",
        "message": "Personal identifiers successfully erased per DPDP Act 2023 compliance. Audit trail retained in anonymized format.",
    }


@router.get("/policy")
def get_privacy_policy():
    """Returns DPDP 2023 compliance statement & statutory data handling guidelines."""
    return {
        "legislation": "Digital Personal Data Protection Act (DPDP), 2023",
        "data_fiduciary": "CivicPulse Public Works Monitoring Platform",
        "purposes": [
            "Civic infrastructure progress verification",
            "Geotagged photographic fraud prevention",
            "Transparent multi-tier municipal approval chains",
            "Aadhaar identity confirmation via DigiLocker",
        ],
        "rights_supported": [
            "Right to Access Information (Sec 11)",
            "Right to Correction and Erasure (Sec 12)",
            "Right of Grievance Redressal (Sec 13)",
            "Right to Nominate (Sec 14)",
        ],
        "data_localization": "All data hosted exclusively on MeitY-empanelled data centers within the Republic of India.",
        "version": "2026.1",
    }
