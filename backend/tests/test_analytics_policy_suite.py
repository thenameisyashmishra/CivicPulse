"""
Unit & Integration Tests for B.10 Analytics, BI & Policy Tools Suite (7 Features).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, UserRole
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client(admin_token):
    with TestClient(app) as c:
        c.headers.update({"Authorization": f"Bearer {admin_token}"})
        yield c


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def admin_token(db_session):
    admin = db_session.query(User).filter(User.role == UserRole.admin).first()
    return create_access_token(subject=admin.email, role=admin.role.value)


# 1. Executive BI Dashboard KPIs
def test_executive_bi_kpis(client):
    res = client.get("/api/analytics-policy/bi/kpis?state_code=DL")
    assert res.status_code == 200
    assert res.json()["physical_completion_rate_pct"] > 0


# 2. Predictive Maintenance Modeling
def test_predictive_maintenance_modeling(client):
    res = client.post(
        "/api/analytics-policy/maintenance/predict",
        json={"asset_id": 1, "current_health_index": 78.5},
    )
    assert res.status_code == 200
    assert res.json()["forecasted_degradation_year"] >= 2024
    assert res.json()["confidence_score"] > 0.85


# 3. Scheme-wise Comparative Benchmarking
def test_scheme_benchmark_comparison(client):
    res = client.post(
        "/api/analytics-policy/benchmark/compare",
        json={"scheme_a_code": "PMGSY", "scheme_b_code": "STATE-SH"},
    )
    assert res.status_code == 200
    assert "delay_variance_pct" in res.json()


# 4. District / Contractor Leaderboards
def test_district_contractor_leaderboards(client):
    res = client.get("/api/analytics-policy/leaderboards?entity_type=contractor")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert res.json()[0]["quality_score"] > 80.0


# 5. CAG / NITI Aayog Data Export API
def test_audit_data_export(client, admin_token):
    res = client.post(
        "/api/analytics-policy/export/audit",
        json={"requesting_agency": "CAG", "query_scope": "FY24_CAPEX_DELHI_PWD", "export_format": "CSV"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()["export_sha256"]) == 64


# 6. Natural-Language "Ask Your Data" Query Assistant
def test_natural_language_query_assistant(client):
    res = client.post(
        "/api/analytics-policy/nl/query",
        json={"user_prompt": "What are the primary causes of project delay in North East Delhi?"},
    )
    assert res.status_code == 200
    assert res.json()["generated_query_type"] == "delay_root_cause"
    assert "data_points" in res.json()["structured_response_json"]


# 7. Budget Forecasting & Multi-Year Fund-Flow Planner
def test_budget_fund_flow_forecast(client, admin_token):
    res = client.post(
        "/api/analytics-policy/fund-flow/forecast",
        json={"scheme_code": "PMGSY-IV", "target_financial_year": "2025-26"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["recommended_budgetary_allocation_cr"] > 100.0
