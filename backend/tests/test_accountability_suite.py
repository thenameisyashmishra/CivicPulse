"""
Unit & Integration Tests for B.1 Accountability Suite (14 Features).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import (
    User,
    UserRole,
    Project,
    Evidence,
    ApprovalStep,
    ApprovalLevel,
    ApprovalDecision,
    EvidenceStatus,
    ContractorRegistry,
)
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
def engineer_token(db_session):
    eng = db_session.query(User).filter(User.role == UserRole.engineer).first()
    return create_access_token(subject=eng.email, role=eng.role.value)


@pytest.fixture(scope="module")
def pradhan_token(db_session):
    pradhan = db_session.query(User).filter(User.role == UserRole.pradhan).first()
    return create_access_token(subject=pradhan.email, role=pradhan.role.value)


# 1. Digital signature (DSC/eSign) on official sign-offs
def test_digital_signature_sign_and_verify(client, engineer_token, db_session):
    step = db_session.query(ApprovalStep).first()
    if not step:
        proj = db_session.query(Project).first()
        admin = db_session.query(User).filter(User.role == UserRole.admin).first()
        ev = Evidence(
            project_id=proj.id,
            uploaded_by_id=admin.id,
            image_path="/uploads/test.jpg",
            status=EvidenceStatus.verified,
        )
        db_session.add(ev)
        db_session.commit()
        step = ApprovalStep(
            evidence_id=ev.id,
            level=ApprovalLevel.engineer,
            decision=ApprovalDecision.approved,
            reviewer_id=admin.id,
            remarks="Verified on-site.",
        )
        db_session.add(step)
        db_session.commit()

    res = client.post(
        "/api/accountability/esign/sign",
        json={"approval_step_id": step.id, "cert_serial": "DSC-TEST-001"},
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert "signature_envelope" in data

    v_res = client.get(f"/api/accountability/esign/verify/{step.id}")
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["verified"] is True
    assert v_data["it_act_compliance"] is True


# 2. Personal liability ledger per official
def test_official_liability_ledger(client, admin_token):
    res = client.get("/api/accountability/officials", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    officials = res.json()
    assert len(officials) >= 3
    for off in officials:
        assert "officer_code" in off
        assert "accountability_score" in off
        assert off["risk_tier"] in ["low", "medium", "high", "critical"]


# 3. Maker-checker rule on financial actions
def test_maker_checker_integrity(client, engineer_token, admin_token):
    raise_res = client.post(
        "/api/accountability/financial/raise",
        json={
            "project_id": "PW-2024-001",
            "amount": 500000.0,
            "purpose": "Tranche 2 Sub-grade Earthwork settlement",
            "maker_notes": "All soil compaction reports cleared",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert raise_res.status_code == 200, raise_res.text
    req_id = raise_res.json()["id"]

    viol_res = client.post(
        "/api/accountability/financial/approve",
        json={"request_id": req_id, "decision": "approved", "remarks": "Self-approval attempt"},
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert viol_res.status_code == 403

    appr_res = client.post(
        "/api/accountability/financial/approve",
        json={"request_id": req_id, "decision": "approved", "remarks": "Dual countersigned by Admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "approved"


# 4. Contractor performance scorecard & registry
def test_contractor_registry_and_scorecard(client):
    res = client.get("/api/accountability/contractors")
    assert res.status_code == 200
    contractors = res.json()
    assert len(contractors) >= 1
    c_id = contractors[0]["id"]

    score_res = client.get(f"/api/accountability/contractors/{c_id}/scorecard")
    assert score_res.status_code == 200
    assert score_res.json()["composite_score"] > 0


# 5. Automated contractor blacklist trigger
def test_contractor_blacklist_trigger(client, db_session):
    contractor = db_session.query(ContractorRegistry).filter(ContractorRegistry.composite_score < 50.0).first()
    if not contractor:
        contractor = ContractorRegistry(
            name="Defaulting Constr Corp",
            gstin="07BADDEF1234Z9",
            pan="BADDEF1234",
            registration_class="Class C",
            contact_email="bad@corp.com",
            composite_score=42.0,
            avg_quality_score=45.0,
        )
        db_session.add(contractor)
        db_session.commit()

    res = client.post(f"/api/accountability/blacklist/evaluate/{contractor.id}")
    assert res.status_code == 200
    assert res.json()["status"] == "blacklist_triggered"


# 6. Human-in-the-Loop override with mandatory justification
def test_ai_override_mandatory_justification(client, engineer_token, db_session):
    ev = db_session.query(Evidence).first()
    if not ev:
        proj = db_session.query(Project).first()
        admin = db_session.query(User).filter(User.role == UserRole.admin).first()
        ev = Evidence(
            project_id=proj.id,
            uploaded_by_id=admin.id,
            image_path="/uploads/test.jpg",
            status=EvidenceStatus.pending,
            quality_score=68.0,
        )
        db_session.add(ev)
        db_session.commit()

    short_res = client.post(
        "/api/accountability/overrides",
        json={
            "evidence_id": ev.id,
            "override_decision": "verified",
            "justification": "Looks good to me.",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert short_res.status_code == 422

    valid_text = "Detailed on-site core inspection conducted by Executive Engineer; hairline surface fissure is non-structural and within IRC tolerance."
    good_res = client.post(
        "/api/accountability/overrides",
        json={
            "evidence_id": ev.id,
            "override_decision": "verified",
            "justification": valid_text,
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert good_res.status_code == 200
    assert good_res.json()["justification"] == valid_text


# 7. Explainable AI (XAI) on every flag
def test_xai_explanation(client, db_session):
    ev = db_session.query(Evidence).first()
    if not ev:
        proj = db_session.query(Project).first()
        admin = db_session.query(User).filter(User.role == UserRole.admin).first()
        ev = Evidence(
            project_id=proj.id,
            uploaded_by_id=admin.id,
            image_path="/uploads/test.jpg",
            status=EvidenceStatus.pending,
            quality_score=72.0,
        )
        db_session.add(ev)
        db_session.commit()

    res = client.get(f"/api/accountability/xai/explain/{ev.id}")
    assert res.status_code == 200
    data = res.json()
    assert "xai_breakdown" in data
    assert len(data["xai_breakdown"]) >= 1
    assert "threshold_rule" in data["xai_breakdown"][0]


# 8. CAG / departmental audit export pack
def test_cag_audit_pack_generation(client):
    res = client.get("/api/accountability/audit-pack/PW-2024-001")
    assert res.status_code == 200
    pack = res.json()
    assert "merkle_root_hash" in pack
    assert "manifest" in pack


# 9. Escalation matrix with SLA timers
def test_sla_escalation_matrix(client):
    res = client.post(
        "/api/accountability/escalations/trigger",
        json={"item_type": "review", "item_id": "REV-9912", "assigned_role": "pradhan"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["tier"] == 1
    assert data["status"] == "open"


# 10. Vigilance / Anti-Corruption Bureau referral workflow
def test_vigilance_referral(client, admin_token):
    res = client.post(
        "/api/accountability/vigilance/refer",
        json={
            "project_id": "PW-2024-002",
            "contractor_name": "IL&FS Engineering",
            "fraud_severity": "critical",
            "allegation": "Continuous false billing without sub-grade compaction.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "case_number" in res.json()


# 11. Whistleblower / anonymous fraud-reporting channel
def test_whistleblower_submission_and_tracking(client):
    sub_res = client.post(
        "/api/accountability/whistleblower/submit",
        json={
            "category": "substandard_material",
            "raw_tip": "Contractor is mixing fly-ash beyond 35% specified limit in cement batch #440.",
            "project_id": "PW-2024-001",
        },
    )
    assert sub_res.status_code == 200
    token = sub_res.json()["tracking_code"]
    assert token.startswith("WB-")

    track_res = client.get(f"/api/accountability/whistleblower/track/{token}")
    assert track_res.status_code == 200
    assert track_res.json()["status"] == "submitted"


# 12. Performance bank guarantee (PBG) tracker
def test_pbg_tracker_and_forfeiture(client, admin_token):
    list_res = client.get("/api/accountability/pbg")
    assert list_res.status_code == 200
    pbgs = list_res.json()
    assert len(pbgs) >= 1

    pbg_id = pbgs[0]["id"]
    forfeit_res = client.post(
        f"/api/accountability/pbg/{pbg_id}/forfeit",
        json={"pbg_id": pbg_id, "reason": "Failure to rectify structural defect within 30-day notice."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert forfeit_res.status_code == 200
    assert forfeit_res.json()["status"] == "forfeited"


# 13. Conflict-of-interest declaration & auto-check
def test_conflict_of_interest(client, engineer_token, db_session):
    eng = db_session.query(User).filter(User.role == UserRole.engineer).first()
    con = db_session.query(ContractorRegistry).first()

    dec_res = client.post(
        "/api/accountability/coi/declare",
        json={
            "contractor_id": con.id,
            "relationship_type": "family",
            "details": "First cousin is managing partner of contractor firm.",
        },
        headers={"Authorization": f"Bearer {engineer_token}"},
    )
    assert dec_res.status_code == 200

    chk_res = client.get(f"/api/accountability/coi/check?official_id={eng.id}&contractor_id={con.id}")
    assert chk_res.status_code == 200
    assert chk_res.json()["has_conflict"] is True
    assert "blocking_action" in chk_res.json()


# 14. Immutable who changed what diff view on every record
def test_audit_diff_logs(client):
    res = client.get("/api/accountability/audit-diffs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
