"""
Unit & Integration Tests for B.3 Project Tracking & Lifecycle Suite (17 Features).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, UserRole, Project
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


@pytest.fixture(scope="module")
def engineer_token(db_session):
    eng = db_session.query(User).filter(User.role == UserRole.engineer).first()
    return create_access_token(subject=eng.email, role=eng.role.value)


# 1. Full project hierarchy (Scheme -> Project -> Work Order)
def test_scheme_hierarchy(client, admin_token):
    res = client.post(
        "/api/lifecycle/schemes",
        json={
            "code": "AMRUT-2.0",
            "name": "Atal Mission for Rejuvenation and Urban Transformation",
            "nodal_ministry": "Ministry of Housing and Urban Affairs",
            "total_budget": 5000000000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["code"] == "AMRUT-2.0"

    list_res = client.get("/api/lifecycle/schemes")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


# 2. Gantt-style milestone timeline with baseline vs actual
def test_milestone_gantt(client):
    res = client.get("/api/lifecycle/gantt/PW-2024-001")
    assert res.status_code == 200
    data = res.json()
    assert "milestones" in data
    assert len(data["milestones"]) >= 1
    assert "total_slippage_days" in data


# 3. Delay root-cause tagging & analytics
def test_delay_root_cause_logging(client, engineer_token):
    res = client.post(
        "/api/lifecycle/delay-cause",
        json={
            "project_id": "PW-2024-001",
            "category": "utility_shifting",
            "description": "High-tension underground electrical cables required BSES clearance.",
            "delay_days": 18,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["category"] == "utility_shifting"

    analytics_res = client.get("/api/lifecycle/delay-analytics")
    assert analytics_res.status_code == 200
    assert analytics_res.json()["total_accumulated_delay_days"] > 0


# 4. Weather-linked delay verification (IMD data)
def test_weather_delay_verification(client):
    res = client.post(
        "/api/lifecycle/weather-check",
        json={
            "project_id": "PW-2024-001",
            "claim_date": "2024-08-12",
            "claimed_event": "Excessive Cloudburst & Inundation",
            "claimed_rainfall_mm": 72.0,
            "station_code": "IMD-DELHI-01",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_verified_disaster"] is True
    assert "deviation_score" in data


# 5. Land acquisition & R&R tracking
def test_land_acquisition_tracking(client, admin_token):
    res = client.post(
        "/api/lifecycle/land-acquisition",
        json={
            "project_id": "PW-2024-001",
            "section_11_date": "2023-04-10",
            "section_19_date": "2023-09-15",
            "total_hectares": 24.5,
            "handed_over_hectares": 22.0,
            "compensation_escrow_inr": 85000000.0,
            "displaced_families": 42,
            "rehabilitated_families": 38,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["rehabilitated_families_count"] == 38


# 6. Environmental & forest clearance compliance tracker
def test_environmental_clearance(client, engineer_token):
    res = client.post(
        "/api/lifecycle/environmental-clearance",
        json={
            "project_id": "PW-2024-001",
            "authority": "MoEFCC",
            "clearance_type": "Stage-II Forest Clearance",
            "reference_number": "FC-DL-2023-9901",
            "issue_date": "2023-06-01",
            "valid_until": "2028-05-31",
            "conditions_summary": "Compensatory afforestation of 2500 saplings in Asola Bhatti Wildlife Sanctuary.",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "active"


# 7. Milestone-based automated payment triggers
def test_milestone_payment_trigger(client, engineer_token):
    res = client.post(
        "/api/lifecycle/milestone-payment-trigger",
        json={
            "project_id": "PW-2024-001",
            "milestone_id": 1,
            "tranche_amount": 750000.0,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["triggered"] is True
    assert "voucher_ref" in res.json()


# 8. Post-completion Defect Liability Period (DLP) tracker
def test_defect_liability_period(client, admin_token):
    res = client.post(
        "/api/lifecycle/dlp",
        json={
            "project_id": "PW-2024-001",
            "warranty_years": 3,
            "start_date": "2024-12-01",
            "end_date": "2027-11-30",
            "linked_pbg_id": 1,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["warranty_period_years"] == 3


# 9. Asset lifecycle / digital twin registry
def test_asset_digital_twin(client, engineer_token):
    res = client.post(
        "/api/lifecycle/asset-twin",
        json={
            "project_id": "PW-2024-001",
            "asset_type": "4-Lane Bituminous Pavement",
            "geojson_geometry": {"type": "LineString", "coordinates": [[76.999, 28.4211], [77.015, 28.4355]]},
            "condition_score": 92.5,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert "asset_code" in res.json()


# 10. Multi-year Operation & Maintenance (O&M) contract tracking
def test_om_contract_tracking(client, admin_token):
    res = client.post(
        "/api/lifecycle/om-contract",
        json={
            "asset_id": 1,
            "contractor_name": "NCC Limited Maintenance Division",
            "start_date": "2025-01-01",
            "end_date": "2029-12-31",
            "annual_maintenance_value_inr": 1200000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "active"


# 11. Utilization Certificate (UC) generation & tracking
def test_utilization_certificate(client, admin_token):
    res = client.post(
        "/api/lifecycle/utilization-certificate",
        json={
            "project_id": "PW-2024-001",
            "financial_year": "2024-25",
            "sanctioned_amount": 5000000.0,
            "actual_spent_amount": 4200000.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["unspent_balance"] == 800000.0
    assert res.json()["gfr_form_type"] == "GFR 12-C"


# 12. Integration with PRAGATI / e-Samiksha dashboards
def test_dashboard_syndication(client):
    res = client.post(
        "/api/lifecycle/dashboard-feed",
        json={"project_id": "PW-2024-001", "target_portal": "PRAGATI_PMO"},
    )
    assert res.status_code == 200
    assert res.json()["sync_status"] == "synced"


# 13. Material & supply-chain provenance tracking
def test_material_provenance(client, engineer_token):
    res = client.post(
        "/api/lifecycle/material-provenance",
        json={
            "project_id": "PW-2024-001",
            "material_type": "TMT Steel Fe500D",
            "batch_number": "BATCH-SAIL-2024-88A",
            "heat_number": "HEAT-88741",
            "manufacturer": "Steel Authority of India Ltd (SAIL)",
            "gst_irn": "4a5c891f7e34d28109bfca3398ad1104e12398a",
            "billed_quantity": 150.0,
            "received_quantity": 150.0,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_reconciled"] is True


# 14. Labour deployment & attendance verification (NMMS)
def test_labor_attendance(client, engineer_token):
    res = client.post(
        "/api/lifecycle/labor-attendance",
        json={
            "project_id": "PW-2024-001",
            "attendance_date": "2024-08-16",
            "nmms_muster_roll_id": "NMMS-DL-MR-901",
            "aadhaar_verified_workers": 64,
            "biometric_auth_pct": 98.4,
            "billed_labor_days": 64,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["discrepancy_flag"] is False


# 15. Change-order / scope-variation workflow
def test_change_order_workflow(client, engineer_token):
    res = client.post(
        "/api/lifecycle/change-order",
        json={
            "project_id": "PW-2024-001",
            "original_contract_value": 45000000.0,
            "revised_contract_value": 48500000.0,
            "justification": "Additional 2.5km RCC roadside drain to prevent flooding near village settlement.",
            "clause_reference": "CPWD GCC Clause 12",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["cost_variation_pct"] == 7.78


# 16. Emergency / fast-track works pathway
def test_emergency_pathway(client, admin_token):
    res = client.post(
        "/api/lifecycle/emergency-pathway",
        json={
            "project_id": "PW-2024-002",
            "disaster_type": "Embankment Breach & Flash Flood",
            "invoking_authority": "District Magistrate & Chairman DDMA",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "expedited_procurement_code" in res.json()


# 17. Model Code of Conduct (MCC election) freeze controls
def test_mcc_freeze_controls(client, admin_token):
    res = client.post(
        "/api/lifecycle/mcc-freeze",
        json={
            "jurisdiction": "state_delhi",
            "election_name": "General Assembly Elections 2025",
            "freeze_start_date": "2025-01-05",
            "freeze_end_date": "2025-02-15",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True
