"""
Unit & Integration Tests for B.5 Fraud & Anomaly Intelligence Suite (8 Features).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, UserRole
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
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


# 1. Cross-project anomaly scoring engine
def test_cross_project_anomaly_score(client):
    res = client.post(
        "/api/fraud-intel/anomaly-score",
        json={"entity_type": "contractor", "entity_id": "1"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "anomaly_score" in data
    assert "risk_level" in data


# 2. Ghost-project detection
def test_ghost_project_detection(client):
    res = client.post(
        "/api/fraud-intel/ghost-project/detect",
        json={"project_id": "PW-2024-001"},
    )
    assert res.status_code == 200
    assert "project_id" in res.json()


# 3. Collusion pattern detection
def test_collusion_pattern_detection(client, admin_token):
    edge_res = client.post(
        "/api/fraud-intel/collusion/edge",
        json={
            "node_a": "OFFICIAL-VERMA-P",
            "node_b": "CONTRACTOR-NCC-LTD",
            "edge_type": "repeat_approver_awardee",
            "weight": 0.85,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert edge_res.status_code == 200
    assert edge_res.json()["collusion_weight"] >= 0.85

    net_res = client.get("/api/fraud-intel/collusion/network")
    assert net_res.status_code == 200
    assert len(net_res.json()) >= 1


# 4. Over-billing / quantity-inflation detector
def test_overbilling_detector(client):
    res = client.post(
        "/api/fraud-intel/overbilling/check",
        json={
            "project_id": "PW-2024-001",
            "item_description": "Sub-base Granular Aggregate 40mm",
            "claimed_cost": 4200000.0,
            "benchmark_cost": 3100000.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "z_score" in data
    assert data["z_score"] > 2.0


# 5. Benford's-law / statistical bill-amount screening
def test_benford_bill_screening(client):
    res = client.post(
        "/api/fraud-intel/benford/screen",
        json={
            "project_id": "PW-2024-001",
            "contractor_id": 1,
            "bill_amounts": [12000, 14500, 18900, 24000, 31000, 45000, 67000, 89000],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "chi_square_stat" in data
    assert "conforms_to_benford" in data


# 6. Duplicate/split-tender detection
def test_split_tender_detection(client, admin_token):
    res = client.post(
        "/api/fraud-intel/split-tender/detect",
        json={
            "parent_scheme": "PMGSY-DELHI-ZONE",
            "detected_tenders": ["TDR-2024-001A", "TDR-2024-001B", "TDR-2024-001C"],
            "total_cost": 2850000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["tender_count"] == 3


# 7. Shell-contractor network detection
def test_shell_contractor_cluster(client, admin_token):
    res = client.post(
        "/api/fraud-intel/shell-cluster/detect",
        json={
            "cluster_name": "Yamuna Infra Cartel Cluster #4",
            "contractor_ids": [1, 2, 3],
            "shared_attributes": ["directors", "registered_gst_address", "bank_branch"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["confidence_pct"] > 90.0


# 8. Red flag fraud dashboard for Admin / Vigilance
def test_red_flag_fraud_dossier(client, admin_token):
    res = client.get("/api/fraud-intel/red-flag-dossier", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "critical_anomalies_count" in data
    assert "ghost_projects_detected" in data
