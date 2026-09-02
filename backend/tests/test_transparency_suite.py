"""
Unit & Integration Tests for B.2 Transparency Suite (13 Features).
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
def citizen_token(db_session):
    citizen = db_session.query(User).filter(User.role == UserRole.citizen).first()
    return create_access_token(subject=citizen.email, role=citizen.role.value)


@pytest.fixture(scope="module")
def admin_token(db_session):
    admin = db_session.query(User).filter(User.role == UserRole.admin).first()
    return create_access_token(subject=admin.email, role=admin.role.value)


# 1. Public read-only transparency portal (no login)
def test_public_projects_portal_no_auth(client):
    res = client.get("/api/transparency/public/projects")
    assert res.status_code == 200
    data = res.json()
    assert "projects" in data
    assert len(data["projects"]) >= 1
    assert "disclaimer" in data

    p_id = data["projects"][0]["id"]
    det_res = client.get(f"/api/transparency/public/projects/{p_id}")
    assert det_res.status_code == 200
    assert det_res.json()["id"] == p_id


# 2. Open Contracting Data Standard (OCDS 1.1) compliance
def test_ocds_release_package(client):
    res = client.get("/api/transparency/ocds/releases")
    assert res.status_code == 200
    ocds = res.json()
    assert ocds["version"] == "1.1"
    assert "publisher" in ocds
    assert "releases" in ocds
    assert len(ocds["releases"]) >= 1
    rel = ocds["releases"][0]
    assert "ocid" in rel
    assert "tender" in rel
    assert "contracts" in rel


# 3. Real-time budget-vs-spend variance dashboard
def test_budget_variance_analytics(client):
    res = client.get("/api/transparency/budget-variance")
    assert res.status_code == 200
    var = res.json()
    assert "total_sanctioned_budget_inr" in var
    assert "projects_variance_breakdown" in var
    assert len(var["projects_variance_breakdown"]) >= 1


# 4. CPGRAMS integration
def test_cpgrams_flow(client, admin_token):
    file_res = client.post(
        "/api/transparency/cpgrams/file",
        json={
            "project_id": "PW-2024-001",
            "name": "Kavita Singhal",
            "contact": "kavita@domain.in",
            "category": "Construction Dust & Drainage Block",
            "description": "Debris dumped directly into open village drain.",
        },
    )
    assert file_res.status_code == 200
    g_data = file_res.json()
    assert g_data["registration_number"].startswith("DARPG/E/")

    sync_res = client.post(
        "/api/transparency/cpgrams/sync",
        json={
            "registration_number": g_data["registration_number"],
            "status": "action_taken",
            "action_note": "Drain de-silted and barrier installed.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "action_taken"


# 5. RTI request intake & statutory-timeline tracker
def test_rti_intake_and_tracking(client, admin_token):
    sub_res = client.post(
        "/api/transparency/rti/submit",
        json={
            "project_id": "PW-2024-003",
            "applicant_name": "RTI Activist Cell",
            "queries": ["Copy of final measurement sheet", "VDO inspection sign-off"],
        },
    )
    assert sub_res.status_code == 200
    rti = sub_res.json()
    assert rti["rti_number"].startswith("RTI/")

    track_res = client.get("/api/transparency/rti/requests?project_id=PW-2024-003")
    assert track_res.status_code == 200
    records = track_res.json()
    assert len(records) >= 1
    assert "days_remaining" in records[0]

    resp_res = client.post(
        f"/api/transparency/rti/{rti['id']}/respond",
        json={"response_text": "Requested measurement book extracts attached in Appendix-IV."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "information_provided"


# 6. MGNREGA-style social audit module
def test_social_audit_workflow(client, admin_token):
    sch_res = client.post(
        "/api/transparency/social-audit/schedule",
        json={
            "project_id": "PW-2024-005",
            "panchayat": "Shahdara Gram Sabha",
            "audit_date": "2024-09-15",
            "president": "Ch. Dharampal",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert sch_res.status_code == 200
    audit_id = sch_res.json()["id"]

    min_res = client.post(
        f"/api/transparency/social-audit/{audit_id}/minutes",
        json={
            "quorum": 112,
            "findings": ["Culvert opening is clear of blockages."],
            "resolutions": ["Approved unanimous social audit sign-off."],
            "atr": "Action taken report accepted.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert min_res.status_code == 200
    assert min_res.json()["status"] == "atr_submitted"


# 7. Legislative Assembly Question (LAQ) linkage
def test_laq_linkage_and_dossier(client, admin_token):
    link_res = client.post(
        "/api/transparency/laq/link",
        json={
            "house": "Vidhan Sabha",
            "session_name": "Monsoon 2024",
            "question_number": 210,
            "question_type": "Starred",
            "member_name": "Smt. Meenakshi Lekhi",
            "constituency": "New Delhi",
            "subject": "Expenditure and Audit Findings on Delhi Drain Works",
            "linked_project_ids": ["PW-2024-005"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert link_res.status_code == 200
    laq_id = link_res.json()["id"]

    dos_res = client.get(f"/api/transparency/laq/{laq_id}/dossier")
    assert dos_res.status_code == 200
    dos = dos_res.json()
    assert "draft_minister_reply" in dos
    assert len(dos["verified_project_records"]) == 1


# 8. Public star-rating & citizen review per completed project
def test_citizen_star_rating(client, citizen_token):
    rate_res = client.post(
        "/api/transparency/reviews/rate",
        json={
            "project_id": "PW-2024-003",
            "durability": 5,
            "utility": 5,
            "speed": 4,
            "title": "Excellent street lighting",
            "comment": "All lane corners are illuminated, feels much safer at night.",
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert rate_res.status_code == 200

    get_res = client.get("/api/transparency/reviews/PW-2024-003")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["total_reviews"] >= 1
    assert data["average_stars"] > 0


# 9. Auto-generated press/media release
def test_press_release_generation(client):
    res = client.get("/api/transparency/press-releases/PW-2024-003")
    assert res.status_code == 200
    pr = res.json()
    assert "english_dispatch" in pr
    assert "hindi_dispatch" in pr
    assert "verification_qr_url" in pr


# 10. Third-party independent audit agency portal
def test_third_party_audit(client, admin_token):
    sub_res = client.post(
        "/api/transparency/third-party-audit",
        json={
            "project_id": "PW-2024-001",
            "agency_name": "Central Road Research Institute (CRRI)",
            "empanelment_code": "CRRI-QA-2024",
            "inspection_date": "2024-08-18",
            "core_test_data": {"bitumen_content_pct": 5.2, "compaction_pct": 98.4},
            "compliance_score": 96.5,
            "quality_grade": "A",
            "remarks": "Exceeds MoRTH 5th revision standards.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert sub_res.status_code == 200
    assert "certificate_hash" in sub_res.json()


# 11. Public corruption/quality heat-map by district
def test_district_heatmap(client):
    res = client.get("/api/transparency/heatmap/districts")
    assert res.status_code == 200
    heatmap = res.json()
    assert isinstance(heatmap, list)
    assert len(heatmap) >= 1
    assert "anomaly_risk_index" in heatmap[0]


# 12. Open data API + developer portal
def test_open_data_developer_portal(client):
    cat_res = client.get("/api/transparency/developer/catalog")
    assert cat_res.status_code == 200
    assert "endpoints" in cat_res.json()

    key_res = client.post(
        "/api/transparency/developer/keys",
        json={
            "client_name": "CivicData Labs",
            "organization": "Open Contracting India",
            "tier": "research",
        },
    )
    assert key_res.status_code == 200
    assert key_res.json()["api_key"].startswith("cp_live_")


# 13. Pre-construction disclosure
def test_pre_construction_disclosure(client):
    res = client.get("/api/transparency/pre-construction?project_id=PW-2024-001")
    assert res.status_code == 200
    discs = res.json()
    assert len(discs) >= 1
    assert discs[0]["dpr_reference"] == "DPR/NHAI/2023/REV-4"
