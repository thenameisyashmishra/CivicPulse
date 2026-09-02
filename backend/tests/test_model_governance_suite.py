"""
Unit & Integration Tests for B.12 AI/ML Platform Engineering & Model Governance Suite (6 Features).
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


@pytest.fixture(scope="module")
def engineer_token(db_session):
    eng = db_session.query(User).filter(User.role == UserRole.engineer).first()
    return create_access_token(subject=eng.email, role=eng.role.value)


# 1. Model Registry & Versioning
def test_register_model_version(client, admin_token):
    res = client.post(
        "/api/model-governance/registry",
        json={
            "model_name": "rt-detr-structural-crack",
            "model_version": "v1.2.0-canary",
            "framework": "PyTorch / Ultralytics",
            "storage_uri": "s3://civicpulse-models/cv/rt_detr_crack_v1.2.0.pt",
            "deployment_stage": "canary",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()["weights_sha256"]) == 64
    assert res.json()["deployment_stage"] == "canary"


# 2. Continuous Model Evaluation & Drift Monitoring
def test_record_model_drift(client, engineer_token):
    res = client.post(
        "/api/model-governance/drift",
        json={
            "model_version": "v3.2.0",
            "test_sample_size": 500,
            "precision_score": 0.932,
            "recall_score": 0.914,
            "map50_score": 0.925,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["drift_alert_triggered"] is False


# 3. Human Feedback Loop for Model Retraining
def test_submit_human_feedback(client, engineer_token):
    res = client.post(
        "/api/model-governance/human-feedback",
        json={
            "evidence_id": 1,
            "ai_prediction": {"classes": ["pothole"], "confidence": 0.62},
            "ground_truth": {"classes": ["surface_shadow"], "is_defect": False},
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_queued_for_retraining"] is True


# 4. Bias & Fairness Audit Across Regions
def test_audit_model_fairness(client, admin_token):
    res = client.post(
        "/api/model-governance/fairness-audit",
        json={
            "model_name": "yolov8-pothole-crack",
            "evaluated_districts_count": 14,
            "max_regional_accuracy_disparity_pct": 3.2,
            "disparate_impact_ratio": 0.96,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_fairness_certified"] is True


# 5. Model Card & Documentation
def test_model_card_documentation(client):
    res = client.post(
        "/api/model-governance/model-card",
        json={
            "model_name": "yolov8-pothole-crack",
            "intended_domain": "IRC:82 Road Surface Defect Detection",
            "training_data_summary": "14,200 Indian highway camera frames",
            "quantitative_metrics_summary": "mAP: 93.5%, Latency: 42.8ms",
            "ethical_and_operational_limits": "Requires minimum 20 lux ambient illumination",
        },
    )
    assert res.status_code == 200
    assert "IRC:82" in res.json()["intended_domain"]


# 6. Offline / Edge Inference Mode
def test_edge_inference_manifest(client):
    res = client.get("/api/model-governance/edge-manifest?model_code=EDGE-YOLO-INT8-V1")
    assert res.status_code == 200
    assert res.json()["quantization_type"] == "INT8"
    assert res.json()["package_size_mb"] < 20.0
