"""
Comprehensive Pytest Test Suite for CivicPulse API
Tests all endpoints, authentication, DigiLocker verification, password updates,
MFA password resets, project management, evidence uploads, AI duplicate checks,
citizen voting, multi-tier review chains, dashboard stats, and report exports.
"""

import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io
import tempfile
from pathlib import Path

from app.main import app
from app.db.database import Base, engine, get_db
from app.db import models
from app.db.seed import seed
from app.core.security import hash_password

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


class TestAuthentication:
    def test_login_all_demo_roles(self):
        roles = [
            ("admin@civicpulse.gov.in", "Admin@1234", "admin"),
            ("pradhan@civicpulse.gov.in", "Pradhan@1234", "pradhan"),
            ("engineer@civicpulse.gov.in", "Engineer@1234", "engineer"),
            ("citizen@civicpulse.gov.in", "Citizen@1234", "citizen"),
        ]
        for email, password, expected_role in roles:
            response = client.post("/api/auth/login", data={"username": email, "password": password})
            assert response.status_code == 200, f"Login failed for {email}"
            data = response.json()
            assert "access_token" in data
            assert data["user"]["role"] == expected_role

    def test_login_invalid_password(self):
        response = client.post("/api/auth/login", data={"username": "admin@civicpulse.gov.in", "password": "WrongPassword"})
        assert response.status_code == 401

    def test_register_user(self):
        payload = {
            "name": "New Test User",
            "email": "newuser@civicpulse.gov.in",
            "password": "Password@123",
            "role": "citizen"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == payload["email"]
        assert data["user"]["role"] == "citizen"

    def test_get_current_user_me(self):
        headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["email"] == "citizen@civicpulse.gov.in"

    def test_digilocker_aadhaar_verification(self):
        headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        
        # Invalid format checks
        bad_payload = {"aadhaar_number": "12345", "otp_code": "123456"}
        res_bad = client.post("/api/auth/digilocker/verify", json=bad_payload, headers=headers)
        assert res_bad.status_code == 400

        # Valid payload
        valid_payload = {"aadhaar_number": "999988887777", "otp_code": "654321"}
        res_valid = client.post("/api/auth/digilocker/verify", json=valid_payload, headers=headers)
        assert res_valid.status_code == 200
        data = res_valid.json()
        assert data["aadhaar_verified"] is True
        assert data["aadhaar_last_4"] == "7777"

    def test_change_password(self):
        # Register a dedicated user for password change testing
        reg_payload = {
            "name": "Pwd Change User",
            "email": "pwd_user@civicpulse.gov.in",
            "password": "InitialPassword@123",
            "role": "citizen"
        }
        reg_res = client.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 201

        headers = get_auth_headers("pwd_user@civicpulse.gov.in", "InitialPassword@123")
        
        # Wrong current password
        bad_change = {"current_password": "WrongPassword", "new_password": "NewSecretPassword@123"}
        res_bad = client.put("/api/auth/profile/password", json=bad_change, headers=headers)
        assert res_bad.status_code == 400

        # Valid password change
        good_change = {"current_password": "InitialPassword@123", "new_password": "NewSecretPassword@123"}
        res_good = client.put("/api/auth/profile/password", json=good_change, headers=headers)
        assert res_good.status_code == 200

        # Verify login with new password
        login_res = client.post("/api/auth/login", data={"username": "pwd_user@civicpulse.gov.in", "password": "NewSecretPassword@123"})
        assert login_res.status_code == 200

    def test_password_reset_mfa_flow(self):
        # 1. Request reset code
        req_res = client.post("/api/auth/reset-password/request", json={"email": "engineer@civicpulse.gov.in"})
        assert req_res.status_code == 200
        code = req_res.json()["simulated_mfa_code"]
        assert len(code) == 6

        # 2. Verify with wrong code
        bad_verify = client.post("/api/auth/reset-password/verify", json={"email": "engineer@civicpulse.gov.in", "mfa_code": "000000", "new_password": "ResetPassword@123"})
        assert bad_verify.status_code == 400

        # 3. Verify with valid code
        good_verify = client.post("/api/auth/reset-password/verify", json={"email": "engineer@civicpulse.gov.in", "mfa_code": code, "new_password": "ResetPassword@123"})
        assert good_verify.status_code == 200

        # 4. Verify login with reset password
        login_res = client.post("/api/auth/login", data={"username": "engineer@civicpulse.gov.in", "password": "ResetPassword@123"})
        assert login_res.status_code == 200


class TestProjects:
    def test_list_projects(self):
        headers = get_auth_headers()
        res = client.get("/api/projects", headers=headers)
        assert res.status_code == 200
        assert len(res.json()) >= 6

    def test_get_project_detail(self):
        headers = get_auth_headers()
        res = client.get("/api/projects/PW-2024-001", headers=headers)
        assert res.status_code == 200
        assert res.json()["id"] == "PW-2024-001"

    def test_create_project_role_authorization(self):
        cit_headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        new_project = {
            "id": "PW-2024-888",
            "name": "Test Citizen Road",
            "type": "Road Infrastructure",
            "location": "Test Village",
            "contractor": "Test Build Corp",
            "budget": 500000.0,
            "spent": 0.0,
            "progress": 0,
            "status": "active",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "lat": 26.8467,
            "lng": 80.9462
        }
        res_cit = client.post("/api/projects", json=new_project, headers=cit_headers)
        assert res_cit.status_code == 403

        # Admin can create project
        admin_headers = get_auth_headers("admin@civicpulse.gov.in", "Admin@1234")
        res_admin = client.post("/api/projects", json=new_project, headers=admin_headers)
        assert res_admin.status_code == 201
        assert res_admin.json()["id"] == "PW-2024-888"

    def test_update_project(self):
        headers = get_auth_headers("engineer@civicpulse.gov.in", "Engineer@1234")
        update_payload = {"budget": 1200000.0, "status": "active"}
        res = client.patch("/api/projects/PW-2024-001", json=update_payload, headers=headers)
        assert res.status_code == 200
        assert res.json()["budget"] == 1200000.0


class TestEvidenceAndAI:
    def create_dummy_image(self) -> bytes:
        img = Image.new("RGB", (200, 200), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()

    def test_upload_evidence(self):
        headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        image_bytes = self.create_dummy_image()
        files = {"file": ("test_site.jpg", image_bytes, "image/jpeg")}
        data = {"caption": "Road construction site test photo"}
        
        res = client.post("/api/projects/PW-2024-001/evidence", files=files, data=data, headers=headers)
        assert res.status_code == 201
        ev_data = res.json()
        assert ev_data["project_id"] == "PW-2024-001"
        assert ev_data["ai_status"] in ["verified", "review", "failed"]

    def test_unsupported_media_type(self):
        headers = get_auth_headers()
        files = {"file": ("test.txt", b"plain text content", "text/plain")}
        res = client.post("/api/projects/PW-2024-001/evidence", files=files, headers=headers)
        assert res.status_code == 415


class TestCitizenVoting:
    def test_citizen_vote_on_evidence(self):
        # Upload evidence first
        cit_headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        img_bytes = Image.new("RGB", (100, 100), color="red")
        buf = io.BytesIO()
        img_bytes.save(buf, format="JPEG")
        
        up_res = client.post("/api/projects/PW-2024-001/evidence", files={"file": ("site.jpg", buf.getvalue(), "image/jpeg")}, headers=cit_headers)
        assert up_res.status_code == 201
        ev_id = up_res.json()["id"]

        # Vote
        vote_payload = {"choice": "completed", "comment": "Verified on ground"}
        vote_res = client.post(f"/api/evidence/{ev_id}/vote", json=vote_payload, headers=cit_headers)
        assert vote_res.status_code == 201

        # Check votes summary
        votes_res = client.get(f"/api/evidence/{ev_id}/votes", headers=cit_headers)
        assert votes_res.status_code == 200
        assert len(votes_res.json()) >= 1


class TestReviewsAndApprovalChain:
    def test_multi_level_approval_chain(self):
        # 1. Citizen uploads photo
        cit_headers = get_auth_headers("citizen@civicpulse.gov.in", "Citizen@1234")
        buf = io.BytesIO()
        Image.new("RGB", (120, 120), color="green").save(buf, format="JPEG")
        up_res = client.post("/api/projects/PW-2024-001/evidence", files={"file": ("green_site.jpg", buf.getvalue(), "image/jpeg")}, headers=cit_headers)
        assert up_res.status_code == 201
        ev_id = up_res.json()["id"]

        # 2. Engineer attempts to review before Pradhan -> 409 Conflict
        eng_headers = get_auth_headers("engineer@civicpulse.gov.in", "Engineer@1234")
        res_early = client.post(f"/api/evidence/{ev_id}/review", json={"decision": "approved", "remarks": "Looks good"}, headers=eng_headers)
        assert res_early.status_code == 409

        # 3. Pradhan approves -> 200
        prd_headers = get_auth_headers("pradhan@civicpulse.gov.in", "Pradhan@1234")
        res_prd = client.post(f"/api/evidence/{ev_id}/review", json={"decision": "approved", "remarks": "Pradhan verified site"}, headers=prd_headers)
        assert res_prd.status_code == 200

        # 4. Engineer approves -> 200
        res_eng = client.post(f"/api/evidence/{ev_id}/review", json={"decision": "approved", "remarks": "Engineer technical check pass"}, headers=eng_headers)
        assert res_eng.status_code == 200

        # 5. Admin approves (final level) -> evidence status becomes 'verified'
        adm_headers = get_auth_headers("admin@civicpulse.gov.in", "Admin@1234")
        res_adm = client.post(f"/api/evidence/{ev_id}/review", json={"decision": "approved", "remarks": "Final clearance"}, headers=adm_headers)
        assert res_adm.status_code == 200
        assert res_adm.json()["status"] == "verified"


class TestDashboardAndReports:
    def test_dashboard_stats(self):
        headers = get_auth_headers()
        res = client.get("/api/dashboard/stats", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_projects" in data
        assert "verifications_total" in data

    def test_budget_summary(self):
        headers = get_auth_headers()
        res = client.get("/api/reports/budget-summary", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_csv_export(self):
        headers = get_auth_headers()
        res = client.get("/api/reports/budget-summary.csv", headers=headers)
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]

    def test_map_data(self):
        headers = get_auth_headers()
        res = client.get("/api/map/projects", headers=headers)
        assert res.status_code == 200
        assert len(res.json()) >= 1
