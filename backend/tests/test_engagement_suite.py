"""
Unit & Integration Tests for B.6 Citizen Engagement & Grievance Redressal Suite (9 Features).
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


# 1. Multilingual WhatsApp/IVR bot
def test_whatsapp_message_handling(client):
    res = client.post(
        "/api/engagement/whatsapp/message",
        json={
            "phone_number": "+919876543210",
            "message_text": "सड़क पर गड्ढे की शिकायत दर्ज करनी है",
            "language": "hi",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "report_defect"
    assert "wa_message_id" in data


# 2. SMS/feature-phone fallback reporting
def test_sms_fallback_reporting(client):
    res = client.post(
        "/api/engagement/sms/command",
        json={"phone_number": "+919123456789", "raw_sms": "STATUS PW-2024-001"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_command"] == "STATUS"
    assert "Progress:" in data["response_sms"]


# 3. Voice-based grievance filing (Speech-to-Text)
def test_voice_grievance_filing(client):
    res = client.post(
        "/api/engagement/voice/grievance",
        json={
            "project_id": "PW-2024-001",
            "audio_path": "/audio/voice_complaint_901.wav",
            "duration_seconds": 24.5,
            "language": "hi-IN",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["transcribed_text"]) > 10
    assert data["transcription_confidence"] > 0.9


# 4. NLP-based complaint categorization & auto-routing
def test_nlp_complaint_categorization(client):
    res = client.post(
        "/api/engagement/nlp/categorize",
        json={
            "grievance_id": 101,
            "complaint_text": "ठेकेदार ने सड़क निर्माण के लिए कनिष्ठ अभियंता से मिलकर रिश्वत माँगी।",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_category"] == "corruption_bribe"
    assert "Vigilance" in data["routed_department"]


# 5. Citizen sentiment analysis across regions
def test_citizen_sentiment_analysis(client):
    res = client.post(
        "/api/engagement/sentiment/record",
        json={
            "district_name": "Shahdara",
            "panchayat_name": "Dilshad Garden Block B",
            "positive_ratio": 0.78,
            "negative_ratio": 0.22,
        },
    )
    assert res.status_code == 200
    assert res.json()["sentiment_index"] == 0.56


# 6. Grievance officer assignment with auto-escalation timers
def test_grievance_sla_assignment(client, admin_token):
    res = client.post(
        "/api/engagement/sla/assign",
        json={
            "grievance_id": 101,
            "officer_id": 3,
            "designation": "Executive Engineer (Quality & Grievances)",
            "days_allowed": 10,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["tier"] == 1
    assert res.json()["is_breached"] is False


# 7. Citizen charter / service-level compliance tracker
def test_citizen_charter_tracking(client, admin_token):
    res = client.post(
        "/api/engagement/charter/track",
        json={
            "department_name": "Irrigation & Flood Control",
            "service_name": "Drain Cleaning & Desilting",
            "target_days": 5,
            "actual_days": 3.8,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["compliance_pct"] >= 90.0


# 8. UMANG app integration
def test_umang_service_registry(client, admin_token):
    res = client.post(
        "/api/engagement/umang/register",
        json={
            "service_code": "UMANG-CP-GRIEVANCE-V2",
            "endpoint_url": "/api/transparency/cpgrams/file",
            "schema_definition": {"version": "2.0", "auth": "Aadhaar_OTP"},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True


# 9. Accessibility: screen-reader & voice-navigation support
def test_accessibility_manifest(client):
    res = client.get("/api/engagement/accessibility/manifest")
    assert res.status_code == 200
    data = res.json()
    assert data["standards_compliance"] == "WCAG 2.1 Level AA"
    assert len(data["voice_navigation_commands"]) >= 1
