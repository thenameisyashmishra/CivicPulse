"""
API Router for Pillar B.10: Analytics, BI & Policy Tools (7 Features).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_role
from app.db.models import User, UserRole
from app.services.analytics_policy_service import AnalyticsPolicyService

router = APIRouter(prefix="/api/analytics-policy", tags=["Analytics, BI & Policy Tools"])


class MaintenancePredictRequest(BaseModel):
    asset_id: int
    current_health_index: float

class BenchmarkCompareRequest(BaseModel):
    scheme_a_code: str
    scheme_b_code: str

class AuditExportRequest(BaseModel):
    requesting_agency: str
    query_scope: str
    export_format: Optional[str] = "CSV"

class NLQueryRequest(BaseModel):
    user_prompt: str

class FundFlowForecastRequest(BaseModel):
    scheme_code: str
    target_financial_year: str


@router.get("/bi/kpis")
def get_executive_bi_kpis(
    state_code: str = "DL",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer, UserRole.pradhan])),
):
    return AnalyticsPolicyService.get_executive_bi_kpis(db, state_code)

@router.post("/maintenance/predict")
def run_predictive_maintenance_model(
    req: MaintenancePredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer])),
):
    return AnalyticsPolicyService.run_predictive_maintenance_model(db, req.asset_id, req.current_health_index)

@router.post("/benchmark/compare")
def compare_scheme_benchmarks(
    req: BenchmarkCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer, UserRole.pradhan])),
):
    return AnalyticsPolicyService.compare_scheme_benchmarks(db, req.scheme_a_code, req.scheme_b_code)

@router.get("/leaderboards")
def get_leaderboards(
    entity_type: str = "contractor",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer, UserRole.pradhan])),
):
    return AnalyticsPolicyService.get_leaderboard(db, entity_type)

@router.post("/export/audit")
def export_audit_data(
    req: AuditExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return AnalyticsPolicyService.export_audit_data(
        db, req.requesting_agency, req.query_scope, req.export_format or "CSV"
    )

@router.post("/nl/query")
def process_nl_query(
    req: NLQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.admin, UserRole.engineer, UserRole.pradhan])),
):
    return AnalyticsPolicyService.process_nl_query(db, req.user_prompt)

@router.post("/fund-flow/forecast")
def forecast_fund_flow(
    req: FundFlowForecastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return AnalyticsPolicyService.forecast_fund_flow(db, req.scheme_code, req.target_financial_year)
