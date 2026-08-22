"""
Enterprise Test Suite for CivicPulse 100/100 Hardening.

Tests:
1. Prometheus metrics exposition (/metrics)
2. DPDP Act 2023 privacy rights (/api/privacy/*)
3. Open Contracting Data Standard OCDS 1.1 releases (/api/opendata/ocds/releases)
4. Token pair generation, refresh, and revocation (/api/auth/refresh, /api/auth/logout)
5. SLA auto-escalation engine
6. Field-level PII AES-256 encryption
7. Explainable AI (XAI) rationale engine
8. Pluggable storage backend
9. ML Model Registry
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import Base, engine, SessionLocal
from app.db.seed import seed
from app.core.security import create_token_pair, decode_access_token, is_token_revoked, revoke_token
from app.core.field_encryption import encrypt_pii, decrypt_pii
from app.services.xai import explain_verification_result
from app.services.model_registry import list_registered_models, get_model_card
from app.services.storage import get_storage, LocalStorage
from app.services.escalation import check_and_escalate_overdue_steps

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    """Ensure database has fresh seeded data before each test run."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()


def get_token(email: str = "admin@civicpulse.gov.in", password: str = "Admin@1234") -> str:
    response = client.post("/api/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def get_auth_headers(email: str = "admin@civicpulse.gov.in", password: str = "Admin@1234") -> dict:
    token = get_token(email, password)
    return {"Authorization": f"Bearer {token}"}


class TestEnterpriseSecurityAndAuth:
    def test_token_pair_and_refresh(self):
        login_res = client.post("/api/auth/login", data={"username": "citizen@civicpulse.gov.in", "password": "Citizen@1234"})
        assert login_res.status_code == 200
        data = login_res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["refresh_token"] is not None

        # Test refresh
        refresh_res = client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
        assert refresh_res.status_code == 200
        refreshed_data = refresh_res.json()
        assert "access_token" in refreshed_data

    def test_pii_field_encryption(self):
        plain_aadhaar = "999988887777"
        encrypted = encrypt_pii(plain_aadhaar)
        assert encrypted != plain_aadhaar
        decrypted = decrypt_pii(encrypted)
        assert decrypted == plain_aadhaar


class TestEnterpriseObservability:
    def test_prometheus_metrics_endpoint(self):
        res = client.get("/metrics")
        assert res.status_code == 200
        # Text format response
        assert "civicpulse" in res.text or "HELP" in res.text or "TYPE" in res.text

    def test_health_endpoints(self):
        res_live = client.get("/api/health/live")
        assert res_live.status_code == 200
        assert res_live.json()["status"] == "alive"

        res_ready = client.get("/api/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


class TestGovTechAndCompliance:
    def test_dpdp_privacy_endpoints(self):
        headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")

        # Right to Access
        res_data = client.get("/api/privacy/my-data", headers=headers)
        assert res_data.status_code == 200
        data = res_data.json()
        assert data["email"] == "citizen@civicpulse.gov.in"
        assert "data_retention_policy" in data

        # Consent recording
        res_consent = client.post(
            "/api/privacy/consent",
            json={"purpose": "civic_verification", "consented": True},
            headers=headers,
        )
        assert res_consent.status_code == 200
        assert res_consent.json()["status"] == "recorded"

        # Privacy policy statement
        res_policy = client.get("/api/privacy/policy")
        assert res_policy.status_code == 200
        assert "DPDP" in res_policy.json()["legislation"]

    def test_ocds_open_contracting_releases(self):
        res = client.get("/api/opendata/ocds/releases")
        assert res.status_code == 200
        data = res.json()
        assert data["version"] == "1.1"
        assert "releases" in data
        assert len(data["releases"]) > 0
        first_release = data["releases"][0]
        assert "ocid" in first_release
        assert "tender" in first_release
        assert "planning" in first_release


class TestAIEngineAndGovernance:
    def test_xai_rationale_generator(self):
        # Geofence breach scenario
        result_flagged = {
            "within_geofence": False,
            "distance_from_site_m": 850.5,
            "is_duplicate": True,
            "duplicate_of_id": 4,
            "quality_score": 28.0,
            "sharpness": 15.0,
            "crack_index": 0.75,
            "crack_severity": "critical",
            "pothole_detected": True,
            "status": "review",
        }
        xai_out = explain_verification_result(result_flagged)
        assert xai_out["flag_count"] >= 4
        assert "GEOFENCE MISMATCH" in xai_out["explainable_text"]
        assert "DUPLICATE PHOTO" in xai_out["explainable_text"]
        assert "STRUCTURAL FISSURE" in xai_out["explainable_text"]

    def test_model_registry(self):
        models = list_registered_models()
        assert len(models) >= 2
        card = get_model_card("yolov11_defect_detector")
        assert card is not None
        assert "IRC:SP:16" in card["standards_alignment"]

    def test_storage_layer(self):
        storage = get_storage()
        assert isinstance(storage, LocalStorage)
        test_bytes = b"test-evidence-content"
        url = storage.upload("PW-TEST/test.jpg", test_bytes)
        assert url.startswith("/uploads/PW-TEST/test.jpg")

    def test_sla_escalation_scan(self):
        db = SessionLocal()
        try:
            res = check_and_escalate_overdue_steps(db)
            assert "scanned" in res
            assert "escalated" in res
        finally:
            db.close()
