"""
Unit & Integration Tests for B.11 Sustainability & Environmental Compliance Suite (4 Features).
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


# 1. Green infrastructure / carbon footprint tracking
def test_calculate_carbon_footprint(client, admin_token):
    res = client.post(
        "/api/sustainability/carbon/calculate",
        json={
            "project_id": "PW-2024-001",
            "cement_consumption_mt": 350.0,
            "steel_consumption_mt": 120.0,
            "bitumen_consumption_mt": 60.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["embodied_carbon_tco2e"] > 0
    assert "GRIHA" in res.json()["green_rating_grade"]


# 2. Tree clearance & compensatory plantation tracker (1:10 ratio)
def test_track_compensatory_plantation(client, admin_token):
    res = client.post(
        "/api/sustainability/plantation/track",
        json={
            "project_id": "PW-2024-001",
            "trees_felled_count": 50,
            "actual_planted_count": 520,
            "satellite_verified_survival_rate_pct": 88.5,
            "plantation_geofence_wkt": "POLYGON((77.10 28.50, 77.12 28.50, 77.12 28.52, 77.10 28.52, 77.10 28.50))",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["mandatory_plantation_count"] == 500  # 50 * 10
    assert res.json()["satellite_verified_survival_rate_pct"] == 88.5


# 3. Waste & debris disposal compliance logging
def test_log_waste_disposal(client, admin_token):
    res = client.post(
        "/api/sustainability/waste/log",
        json={
            "project_id": "PW-2024-001",
            "waste_quantity_metric_tons": 240.5,
            "authorized_recycling_facility": "Bhalaswa C&D Waste Processing Plant",
            "transport_manifest_receipt_id": "CD-MANIFEST-2024-8812",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["municipal_clearance_status"] == "cleared"


# 4. Climate resilience risk tagging
def test_tag_climate_risk(client, admin_token):
    res = client.post(
        "/api/sustainability/climate/tag",
        json={
            "project_id": "PW-2024-001",
            "hazard_zone_type": "flood_plain",
            "vulnerability_score": 0.68,
            "climate_resilience_design_mitigations": "Elevated road embankment by +1.5m above 50-year HFL and added box culverts.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["vulnerability_score"] == 0.68
