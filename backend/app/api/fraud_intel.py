"""
API Router for Pillar B.5: Fraud & Anomaly Intelligence (8 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.fraud_intelligence_service import FraudIntelligenceService

router = APIRouter(prefix="/api/fraud-intel", tags=["Fraud & Anomaly Intelligence"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class AnomalyScoreRequest(BaseModel):
    entity_type: str
    entity_id: str

class GhostProjectRequest(BaseModel):
    project_id: str

class CollusionEdgeRequest(BaseModel):
    node_a: str
    node_b: str
    edge_type: str
    weight: float

class OverbillingCheckRequest(BaseModel):
    project_id: str
    item_description: str
    claimed_cost: float
    benchmark_cost: float

class BenfordScreenRequest(BaseModel):
    project_id: str
    contractor_id: int
    bill_amounts: List[float] = Field(default_factory=list)

class SplitTenderRequest(BaseModel):
    parent_scheme: str
    detected_tenders: List[str]
    total_cost: float

class ShellClusterRequest(BaseModel):
    cluster_name: str
    contractor_ids: List[int]
    shared_attributes: List[str]


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.post("/anomaly-score")
def evaluate_anomaly_score(
    req: AnomalyScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.evaluate_cross_project_anomaly(db, req.entity_type, req.entity_id)

@router.post("/ghost-project/detect")
def detect_ghost_project(
    req: GhostProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    alert = FraudIntelligenceService.run_ghost_project_detector(db, req.project_id)
    if not alert:
        return {"project_id": req.project_id, "is_ghost_project": False, "status": "active_evidence_confirmed"}
    return alert

@router.post("/collusion/edge")
def map_collusion_edge(
    req: CollusionEdgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin])),
):
    return FraudIntelligenceService.map_collusion_edge(db, req.node_a, req.node_b, req.edge_type, req.weight)

@router.get("/collusion/network")
def get_collusion_network(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.get_collusion_network(db)

@router.post("/overbilling/check")
def check_overbilling(
    req: OverbillingCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.check_overbilling_anomaly(
        db, req.project_id, req.item_description, req.claimed_cost, req.benchmark_cost
    )

@router.post("/benford/screen")
def screen_bills_benford(
    req: BenfordScreenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.screen_bills_benford(
        db, req.project_id, req.contractor_id, req.bill_amounts
    )

@router.post("/split-tender/detect")
def detect_split_tenders(
    req: SplitTenderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.detect_split_tenders(
        db, req.parent_scheme, req.detected_tenders, req.total_cost
    )

@router.post("/shell-cluster/detect")
def detect_shell_cluster(
    req: ShellClusterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.detect_shell_cluster(
        db, req.cluster_name, req.contractor_ids, req.shared_attributes
    )

@router.get("/red-flag-dossier")
def get_red_flag_dossier(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return FraudIntelligenceService.get_red_flag_dossier(db)
