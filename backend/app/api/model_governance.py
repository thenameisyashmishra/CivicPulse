"""
API Router for Pillar B.12: AI/ML Platform Engineering & Model Governance (6 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.model_governance_service import ModelGovernanceService

router = APIRouter(prefix="/api/model-governance", tags=["AI/ML Platform Engineering & Model Governance"])


class ModelRegisterRequest(BaseModel):
    model_name: str
    model_version: str
    framework: Optional[str] = "PyTorch / Ultralytics"
    storage_uri: str
    deployment_stage: Optional[str] = "production"

class DriftMetricRequest(BaseModel):
    model_version: str
    test_sample_size: int
    precision_score: float
    recall_score: float
    map50_score: float

class HumanFeedbackRequest(BaseModel):
    evidence_id: int
    ai_prediction: Dict[str, Any]
    ground_truth: Dict[str, Any]

class FairnessAuditRequest(BaseModel):
    model_name: str
    evaluated_districts_count: int
    max_regional_accuracy_disparity_pct: float
    disparate_impact_ratio: float

class ModelCardRequest(BaseModel):
    model_name: str
    intended_domain: str
    training_data_summary: str
    quantitative_metrics_summary: str
    ethical_and_operational_limits: str


@router.post("/registry")
def register_model_version(
    req: ModelRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return ModelGovernanceService.register_model_version(
        db, req.model_name, req.model_version, req.framework or "PyTorch", req.storage_uri, req.deployment_stage or "production"
    )

@router.post("/drift")
def record_model_drift(
    req: DriftMetricRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return ModelGovernanceService.record_model_drift(
        db, req.model_version, req.test_sample_size, req.precision_score, req.recall_score, req.map50_score
    )

@router.post("/human-feedback")
def submit_human_feedback(
    req: HumanFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.engineer)),
):
    return ModelGovernanceService.submit_human_feedback(
        db, req.evidence_id, req.ai_prediction, req.ground_truth, current_user.id
    )

@router.post("/fairness-audit")
def audit_model_fairness(
    req: FairnessAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return ModelGovernanceService.audit_model_fairness(
        db, req.model_name, req.evaluated_districts_count, req.max_regional_accuracy_disparity_pct, req.disparate_impact_ratio
    )

@router.post("/model-card")
def get_or_create_model_card(req: ModelCardRequest, db: Session = Depends(get_db)):
    return ModelGovernanceService.get_or_create_model_card(
        db, req.model_name, req.intended_domain, req.training_data_summary,
        req.quantitative_metrics_summary, req.ethical_and_operational_limits
    )

@router.get("/edge-manifest")
def get_edge_manifest(model_code: str = "EDGE-YOLO-INT8-V1", db: Session = Depends(get_db)):
    return ModelGovernanceService.get_edge_manifest(db, model_code)
