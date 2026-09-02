"""
Unit & Integration Tests for B.8 Security, Compliance & Data Sovereignty Suite (11 Features).
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
def citizen_token(db_session):
    cit = db_session.query(User).filter(User.role == UserRole.citizen).first()
    return create_access_token(subject=cit.email, role=cit.role.value)


# 1. MeitY data localization
def test_data_sovereignty_status(client):
    res = client.get("/api/security/sovereignty")
    assert res.status_code == 200
    assert res.json()["is_data_localized"] is True
    assert res.json()["jurisdiction_country"] == "IN"


# 2. CERT-In VAPT audit
def test_vapt_audit_registration(client, admin_token):
    res = client.post(
        "/api/security/vapt/report",
        json={
            "cert_in_auditor_name": "PwC Cyber Security (CERT-In Empaneled)",
            "report_reference_id": "CERT-VAPT-2024-TEST-01",
            "report_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
            "critical_vulns_count": 0,
            "high_vulns_count": 0,
            "medium_vulns_count": 1,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["remediation_status"] == "remediated"


# 3. GIGW 3.0 accessibility manifest
def test_gigw_manifest(client):
    res = client.get("/api/security/gigw/manifest")
    assert res.status_code == 200
    assert res.json()["wcag_conformance_level"] == "AA"
    assert res.json()["audit_score_pct"] > 90.0


# 4. DPDP Act 2023 consent & principal rights
def test_dpdp_consent_management(client, citizen_token):
    res = client.post(
        "/api/security/dpdp/consent",
        json={"purpose_code": "grievance_filing", "consent_given": True},
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res.status_code == 200
    assert res.json()["consent_given"] is True


# 5. Field-level PII encryption meta
def test_pii_encryption_meta(client):
    res = client.get("/api/security/encryption/meta")
    assert res.status_code == 200
    assert res.json()["algorithm"] == "AES-256-GCM"


# 6. Immutable admin action audit log
def test_admin_action_audit_log(client, admin_token):
    res = client.post(
        "/api/security/admin/audit-log",
        json={"action_type": "threshold_override", "resource_type": "project", "resource_id": "PW-2024-001"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()["current_entry_hash"]) == 64


# 7. Data retention policy
def test_data_retention_policy(client, admin_token):
    res = client.post(
        "/api/security/retention/policy",
        json={
            "record_category": "financial_vouchers",
            "retention_period_years": 7,
            "cag_mandate_reference": "CAG-GFR-RULE-288",
            "auto_purge_enabled": False,
            "archival_target_uri": "s3://nic-delhi-cold-archive/vouchers/",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["retention_period_years"] == 7


# 8. Disaster recovery & backup
def test_disaster_recovery_config(client):
    res = client.get("/api/security/disaster-recovery/config")
    assert res.status_code == 200
    assert res.json()["rpo_minutes"] <= 15


# 9. Secrets vault & credential rotation
def test_secrets_vault_registration(client, admin_token):
    res = client.post(
        "/api/security/vault/secret",
        json={"secret_path": "secret/civicpulse/db-primary", "lease_duration_seconds": 86400, "auto_rotation_days": 30},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True


# 10. Role-scoped API tokens with expiry & revocation
def test_scoped_api_token(client, admin_token):
    res = client.post(
        "/api/security/tokens/scoped",
        json={"assigned_scopes": ["projects:read", "evidence:verify"], "ttl_hours": 48},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_revoked"] is False


# 11. Bug bounty & responsible disclosure
def test_bug_bounty_submission(client):
    res = client.post(
        "/api/security/bug-bounty/submit",
        json={
            "researcher_pseudonym": "whitehat_delhi",
            "vulnerability_title": "Informational CORS header configuration",
            "severity": "low",
            "cvss_score": 3.1,
            "bounty_awarded_inr": 10000.0,
        },
    )
    assert res.status_code == 200
    assert res.json()["remediation_state"] == "triaged"
