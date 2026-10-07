"""
Unit & Integration Tests for B.4 Quality Assurance & Engineering Verification Suite (18 Features).
"""

import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, UserRole, Project, Evidence, EvidenceStatus
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client(engineer_token):
    with TestClient(app) as c:
        c.headers.update({"Authorization": f"Bearer {engineer_token}"})
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


@pytest.fixture(scope="module")
def test_evidence(db_session):
    ev = db_session.query(Evidence).first()
    if not ev:
        proj = db_session.query(Project).first()
        admin = db_session.query(User).filter(User.role == UserRole.admin).first()
        ev = Evidence(
            project_id=proj.id,
            uploaded_by_id=admin.id,
            image_path="/uploads/test_eng.jpg",
            status=EvidenceStatus.verified,
            quality_score=88.5,
        )
        db_session.add(ev)
        db_session.commit()
    return ev


# 1. Trained pothole/crack detection model (YOLOv8)
def test_yolo_detection(client, test_evidence):
    res = client.post("/api/engineering/yolo/detect", json={"evidence_id": test_evidence.id})
    assert res.status_code == 200
    data = res.json()
    assert "bounding_boxes_json" in data
    assert data["detected_potholes_count"] >= 1
    assert "irc82_severity_score" in data


# 1B. Live Camera & Upload Pothole Detection
def test_detect_potholes_image_file(client):
    import io
    from PIL import Image, ImageDraw

    # Create a synthetic road image with a dark pothole cavity
    img = Image.new("RGB", (320, 240), color=(110, 110, 110))
    draw = ImageDraw.Draw(img)
    # Draw dark depression (pothole)
    draw.ellipse([100, 70, 180, 150], fill=(20, 20, 20))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/engineering/pothole/detect-image",
        files={"file": ("road_surface.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert "potholes_detected" in data
    assert data["potholes_detected"] >= 1
    assert "irc82_severity_score" in data
    assert "bounding_boxes" in data
    assert len(data["bounding_boxes"]) >= 1
    assert "estimated_repair_cost_inr" in data
    assert data["urgency"] in ["immediate_action", "urgent", "normal", "low"]


def test_detect_potholes_image_base64(client):
    import base64
    import io
    from PIL import Image

    # Pristine road image without defects
    img = Image.new("RGB", (200, 200), color=(140, 140, 140))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    res = client.post(
        "/api/engineering/pothole/detect-image",
        data={"image_base64": b64, "project_id": "PW-2024-001"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "irc82_severity_score" in data
    assert data["potholes_detected"] == 0
    assert data["condition_rating"].startswith("Good")


# 2. Satellite change-detection (ISRO Bhuvan / Sentinel-2)
def test_satellite_change_detection(client):
    res = client.post(
        "/api/engineering/satellite/diff",
        json={"project_id": "PW-2024-001", "baseline_date": "2024-01-01", "latest_date": "2024-08-01"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_activity_confirmed"] is True
    assert "ndvi_delta" in data


# 3. Road length / alignment cross-check vs Survey of India GIS
def test_gis_alignment_check(client):
    res = client.post(
        "/api/engineering/gis/alignment",
        json={
            "project_id": "PW-2024-001",
            "billed_chainage_km": 15.2,
            "surveyed_centerline_km": 15.0,
            "max_lateral_drift_meters": 2.4,
        },
    )
    assert res.status_code == 200
    assert res.json()["is_within_tolerance"] is True


# 4. Automated site-boundary vs sanctioned land-parcel check (Bhu-Naksha)
def test_cadastral_parcel_check(client):
    res = client.post(
        "/api/engineering/cadastral/check",
        json={
            "project_id": "PW-2024-001",
            "parcel_id": "KHASRA-881/2",
            "geofence_wkt": "POLYGON((76.99 28.42, 77.01 28.42, 77.01 28.44, 76.99 28.44, 76.99 28.42))",
            "overlap_pct": 99.4,
        },
    )
    assert res.status_code == 200
    assert res.json()["encroachment_detected"] is False


# 5. Drone orthomosaic ingestion (DGCA Digital Sky compliant)
def test_drone_survey_ingestion(client, engineer_token):
    res = client.post(
        "/api/engineering/drone/survey",
        json={
            "project_id": "PW-2024-001",
            "dgca_uin": "UIN-2024-DELHI-0044",
            "flight_date": "2024-08-14",
            "orthomosaic_uri": "/surveys/drone_ortho_001.tif",
            "dem_uri": "/surveys/drone_dem_001.tif",
            "covered_area_sqm": 45000.0,
            "average_gsd_cm": 2.1,
            "pilot_license": "DGCA-RPL-99881",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["covered_area_sqm"] == 45000.0


# 6. Photogrammetry / structure-from-motion volumetric estimation
def test_photogrammetry_volume(client):
    res = client.post(
        "/api/engineering/photogrammetry/volume",
        json={
            "project_id": "PW-2024-001",
            "inspection_id": "INSP-3D-441",
            "calculated_volume_m3": 12400.0,
            "billed_volume_m3": 12850.0,
        },
    )
    assert res.status_code == 200
    assert res.json()["is_approved"] is True


# 7. Road roughness / riding-quality estimate from video (IRI)
def test_road_roughness_iri(client):
    res = client.post(
        "/api/engineering/roughness/iri",
        json={"project_id": "PW-2024-001", "video_uri": "/videos/walkthrough_ch0_15.mp4", "iri_m_per_km": 2.2},
    )
    assert res.status_code == 200
    assert res.json()["irc_sp16_rating"] == "Good"


# 8. Concrete/asphalt surface-quality classifier (IS 456 / MoRTH 500)
def test_surface_defect_classification(client, test_evidence):
    res = client.post(
        "/api/engineering/surface-defect",
        json={"evidence_id": test_evidence.id, "defect_category": "honeycombing", "confidence_pct": 84.5},
    )
    assert res.status_code == 200
    assert res.json()["is_code_violation"] is True


# 9. Structural defect detection for buildings (NBC 2016)
def test_building_structural_defect(client, test_evidence):
    res = client.post(
        "/api/engineering/building-defect",
        json={"evidence_id": test_evidence.id, "defect_type": "shear_crack", "severity": "moderate"},
    )
    assert res.status_code == 200
    assert "NBC 2016" in res.json()["nbc2016_clause"]


# 10. Material test-report ingestion & validation (NABL labs)
def test_nabl_lab_report_validation(client, engineer_token):
    res = client.post(
        "/api/engineering/lab-report",
        json={
            "project_id": "PW-2024-001",
            "lab_name": "National Test House (NTH), Northern Region",
            "nabl_no": "TC-5120",
            "sample_type": "cube_compressive",
            "reported_value": 34.5,
            "required_value": 30.0,
            "ocr_text": "28-day Compressive Strength test conducted on M30 Grade concrete cubes.",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_compliant"] is True


# 11. IoT structural health sensors for critical assets
def test_iot_sensor_telemetry(client):
    res = client.post(
        "/api/engineering/iot/telemetry",
        json={
            "project_id": "PW-2024-001",
            "asset_id": 1,
            "sensor_id": "STRAIN-G-440",
            "sensor_type": "strain_gauge",
            "metric_value": 240.5,
            "unit": "microstrain",
        },
    )
    assert res.status_code == 200
    assert res.json()["alert_state"] == "normal"


# 12. Risk-weighted random inspection scheduler
def test_random_inspection_scheduler(client, admin_token):
    res = client.post(
        "/api/engineering/inspection/random-schedule",
        json={"project_id": "PW-2024-001", "risk_score": 78.4},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "surprise_factor_token" in res.json()


# 13. Photo authenticity / anti-tampering verification (ELA + PRNU + C2PA)
def test_photo_authenticity(client, test_evidence):
    res = client.post("/api/engineering/authenticity/verify", json={"evidence_id": test_evidence.id})
    assert res.status_code == 200
    assert res.json()["is_authentic"] is True
    assert res.json()["c2pa_manifest_found"] is True


# 14. Mandatory multi-angle capture protocol enforcement
def test_multi_angle_protocol(client, test_evidence):
    res = client.post("/api/engineering/multi-angle/enforce", json={"evidence_id": test_evidence.id})
    assert res.status_code == 200
    assert res.json()["is_protocol_complete"] is True


# 15. Automated BOQ cross-check via OCR + LLM
def test_boq_reconciliation(client):
    res = client.post(
        "/api/engineering/boq/reconcile",
        json={
            "project_id": "PW-2024-001",
            "measurement_book_ref": "MB-NHAI-Vol-42-P18",
            "item_code": "BOQ-ITEM-4.1.2-WMM",
            "billed_quantity": 4800.0,
            "ai_verified_quantity": 4720.0,
        },
    )
    assert res.status_code == 200
    assert res.json()["discrepancy_pct"] < 2.0


# 16. Digitized IRC/IS/NBC inspection checklists per work type
def test_digitized_checklist(client, engineer_token):
    res = client.post(
        "/api/engineering/checklist/submit",
        json={
            "project_id": "PW-2024-001",
            "work_type": "road",
            "checklist_code": "IRC-SP-20-RURAL-ROAD",
            "responses": {
                "camber_slope_2_5_pct": True,
                "bitumen_temperature_150c": True,
                "compaction_passes_cleared": True,
            },
            "total_score_pct": 96.0,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["total_score_pct"] == 96.0


# 17. Live video-call spot inspection (engineer-remote)
def test_remote_video_inspection(client, engineer_token):
    res = client.post(
        "/api/engineering/video-inspection/record",
        json={
            "project_id": "PW-2024-001",
            "field_officer_id": 2,
            "duration_seconds": 420,
            "audit_notes": "Live remote WebRTC spot-check of pavement joints conducted with field JE.",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert "recording_hash" in res.json()


# 18. Third-party lab sample chain-of-custody tracker
def test_sample_chain_of_custody(client, engineer_token):
    res = client.post(
        "/api/engineering/sample-custody/register",
        json={
            "project_id": "PW-2024-001",
            "sample_code": "CUBE-M30-28D-SITE-04",
            "barcode": "BARCODE-889104",
            "target_lab": "Central Road Research Institute (CRRI)",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200
    assert res.json()["tamper_seal_intact"] is True


# 19. Direct image pothole detection with GPS geotagging & map hazard pins
def test_detect_potholes_gps_geotagging(client):
    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    # Draw a simulated dark hole in the middle
    for y in range(80, 120):
        for x in range(80, 120):
            img.putpixel((x, y), (20, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    res = client.post(
        "/api/engineering/pothole/detect-image",
        files={"file": ("field_road_audit.jpg", jpeg_bytes, "image/jpeg")},
        data={"project_id": "PW-2024-001", "latitude": "28.5245", "longitude": "77.2065"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == 28.5245
    assert data["longitude"] == 77.2065
    assert "hazard_pin_id" in data

    # Verify hazard pin appears on the GIS map endpoint
    pins_res = client.get("/api/engineering/pothole/hazard-pins")
    assert pins_res.status_code == 200
    pins = pins_res.json()
    assert len(pins) >= 3
    assert any(p["id"] == data["hazard_pin_id"] for p in pins)

