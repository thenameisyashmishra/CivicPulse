"""
Unit & Integration Tests for B.7 Interoperability & Government Integration Suite (8 Features).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, UserRole, Project
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


# 1. Real DigiLocker / Aadhaar e-KYC (Meri Pehchaan)
def test_digilocker_kyc(client, citizen_token):
    res = client.post(
        "/api/interop/digilocker/kyc",
        json={
            "digilocker_id": "DL-IN-992144",
            "aadhaar_last_4": "4210",
            "doc_uris": ["uri:digilocker:aadhaar", "uri:digilocker:pan"],
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["masked_aadhaar_number"] == "XXXX-XXXX-4210"
    assert data["status"] == "verified"


# 2. PFMS integration
def test_pfms_reconciliation(client, admin_token):
    res = client.post(
        "/api/interop/pfms/reconcile",
        json={
            "project_id": "PW-2024-001",
            "sanction_order_number": "SANCTION-MORTH-2024-88",
            "pfms_tranche_id": "PFMS-TR-998810",
            "disbursed_amount_inr": 2500000.0,
            "dbt_beneficiary_count": 84,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_reconciled"] is True


# 3. GeM contractor history pull
def test_gem_contractor_profile(client, admin_token):
    res = client.post(
        "/api/interop/gem/contractor",
        json={"contractor_id": 1, "gem_seller_id": "GEM-SELLER-NCC-99"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["past_performance_score"] > 80.0
    assert data["is_blacklisted_national"] is False


# 4. e-Gov API gateway
def test_egov_api_gateway_registration(client, admin_token):
    res = client.post(
        "/api/interop/egov/gateway",
        json={
            "consumer_system_name": "Delhi State PWD Enterprise Portal",
            "oauth2_client_id": "CLIENT-DELHI-PWD-V1",
            "allowed_namespaces": ["projects", "evidence", "accountability"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True


# 5. GIS land parcel integration (Bhu-Naksha)
def test_gis_land_parcel_overlay(client, admin_token):
    res = client.post(
        "/api/interop/gis/land-parcel",
        json={
            "project_id": "PW-2024-001",
            "khasra_number": "KHASRA-991/1A",
            "state_land_record_code": "DL-REV-PARCEL-44",
            "bhu_naksha_geometry_wkt": "POLYGON((76.99 28.42, 77.01 28.42, 77.01 28.44, 76.99 28.44, 76.99 28.42))",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_within_sanctioned_alignment"] is True


# 6. National Asset Directory sync
def test_national_asset_directory_sync(client, admin_token):
    res = client.post(
        "/api/interop/nad/sync",
        json={"project_id": "PW-2024-001", "asset_category_code": "ROAD-MAJOR-DISTRICT", "panchayat_lgd_code": 110094},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["syndication_status"] == "published"


# 7. GST e-invoice / e-Way bill verification
def test_gst_eway_bill_verification(client, admin_token):
    res = client.post(
        "/api/interop/gst/eway-bill",
        json={
            "project_id": "PW-2024-001",
            "gstin_supplier": "07AAACN1234F1Z8",
            "eway_bill_number": "EWAY-DL-2024-88412",
            "consignment_value_inr": 1850000.0,
            "vehicle_number": "DL-01-AB-1234",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_gstn_verified"] is True


# 8. State Treasury / IFMS hook
def test_state_treasury_ifms_hook(client, admin_token):
    res = client.post(
        "/api/interop/treasury/hook",
        json={
            "project_id": "PW-2024-001",
            "state_code": "DL",
            "ddo_code": "DDO-PWD-NORTH-01",
            "treasury_bill_number": "TR-BILL-2024-99014",
            "passed_amount_inr": 2500000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "electronic_scroll_id" in res.json()
