"""
Unit & Integration Tests for B.9 Platform Scale & Multi-Tenancy Suite (7 Features).
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


# 1. Multi-tenant hierarchy creation
def test_create_tenant_node(client, admin_token):
    res = client.post(
        "/api/tenants/hierarchy",
        json={
            "tenant_code": "STATE-UP",
            "tenant_name": "Government of Uttar Pradesh",
            "tier_level": "state",
            "state_code": "UP",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["tier_level"] == "state"


# 2. Configurable approval workflow
def test_configurable_approval_workflow(client, admin_token):
    res = client.post(
        "/api/tenants/workflow",
        json={
            "tenant_id": 1,
            "work_category": "bridge",
            "steps": [
                {"step": 1, "role": "assistant_engineer", "name": "Initial Site Verification"},
                {"step": 2, "role": "superintending_engineer", "name": "Load Bearing Verification"},
            ],
            "financial_threshold_ceiling": 50000000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()["workflow_steps_json"]) == 2


# 3. White-labeling configuration
def test_white_label_configuration(client, admin_token):
    res = client.post(
        "/api/tenants/white-label",
        json={
            "tenant_id": 1,
            "portal_title": "UP PWD Infrastructure Monitor",
            "state_emblem_uri": "https://example.gov.in/up-emblem.svg",
            "primary_accent_color": "#16a34a",
            "custom_domain_cname": "works.up.gov.in",
            "footer_text": "Government of Uttar Pradesh Official Infrastructure Portal",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["primary_accent_color"] == "#16a34a"


# 4. SSO eOffice integration
def test_eoffice_sso_configuration(client, admin_token):
    res = client.post(
        "/api/tenants/sso",
        json={
            "tenant_id": 1,
            "idp_entity_id": "https://parichay.nic.in/idp/shibboleth",
            "sso_url": "https://parichay.nic.in/saml2/sso",
            "x509_certificate_fingerprint": "AA:BB:CC:DD:EE:FF:11:22:33:44",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["protocol"] == "SAML_2.0"


# 5. Full i18n across 22 scheduled languages
def test_locale_translation_registration(client, admin_token):
    res = client.post(
        "/api/tenants/locale",
        json={
            "language_code": "te",
            "language_name": "Telugu",
            "namespace": "common",
            "translations": {"welcome": "సివిక్‌పల్స్‌కు స్వాగతం", "projects": "ప్రాజెక్ట్‌లు"},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["language_code"] == "te"


# 6. Tenant-level configuration & feature flags
def test_tenant_feature_flags(client, admin_token):
    res = client.post(
        "/api/tenants/feature-flag",
        json={
            "tenant_id": 1,
            "module_key": "drone_inspection",
            "is_enabled": True,
            "custom_parameters": {"max_altitude_m": 120, "dgca_required": True},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_enabled"] is True


# 7. Shard scaling and read replicas
def test_shard_scaling_meta(client):
    res = client.get("/api/tenants/shard/meta?shard_name=SHARD-NORTH-01")
    assert res.status_code == 200
    assert res.json()["read_replica_count"] >= 3
    assert res.json()["is_healthy"] is True
