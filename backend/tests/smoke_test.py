"""
End-to-end smoke test against a running instance of the API
(python -m uvicorn app.main:app --> http://localhost:8000).

Exercises: auth for all 4 roles, project CRUD + permissions, evidence upload
with real GPS/EXIF verification, duplicate detection, quality heuristics,
citizen voting, the full Pradhan -> Engineer -> Admin approval chain
(both an approval path and a rejection path), dashboard stats, reports,
and the map endpoint.

Run with: python3 tests/smoke_test.py
"""

import sys
import os
import tempfile

import httpx

BASE = "http://localhost:8000"
PASSED = 0
FAILED = 0


def check(label, condition, extra=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  [PASS] {label}")
    else:
        FAILED += 1
        print(f"  [FAIL] {label} {extra}")


def login(client, email, password):
    r = client.post(f"{BASE}/api/auth/login", data={"username": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def main():
    client = httpx.Client(timeout=30)
    temp_dir = tempfile.gettempdir()

    print("\n=== 1. Auth ===")
    admin_token = login(client, "admin@civicpulse.gov.in", "Admin@1234")
    pradhan_token = login(client, "pradhan@civicpulse.gov.in", "Pradhan@1234")
    engineer_token = login(client, "engineer@civicpulse.gov.in", "Engineer@1234")
    citizen_token = login(client, "citizen@civicpulse.gov.in", "Citizen@1234")
    check("all 4 demo roles log in", all([admin_token, pradhan_token, engineer_token, citizen_token]))

    me = client.get(f"{BASE}/api/auth/me", headers=auth_headers(admin_token)).json()
    check("me returns admin role", me["role"] == "admin", me)

    bad_login = client.post(f"{BASE}/api/auth/login", data={"username": "admin@civicpulse.gov.in", "password": "wrong"})
    check("wrong password rejected (401)", bad_login.status_code == 401)

    print("\n=== 2. Projects ===")
    projects = client.get(f"{BASE}/api/projects", headers=auth_headers(citizen_token)).json()
    check("6 seeded projects visible", len(projects) == 6, len(projects))

    nh44 = client.get(f"{BASE}/api/projects/PW-2024-001", headers=auth_headers(citizen_token)).json()
    check("project detail fetch", nh44["id"] == "PW-2024-001")

    forbidden = client.post(
        f"{BASE}/api/projects",
        headers=auth_headers(citizen_token),
        json={
            "id": "PW-2024-999", "name": "x", "type": "x", "location": "x", "contractor": "x",
            "budget": 1000, "start_date": "2025-01-01", "end_date": "2025-02-01", "lat": 1, "lng": 1,
        },
    )
    check("citizen cannot create project (403)", forbidden.status_code == 403, forbidden.text)

    created = client.post(
        f"{BASE}/api/projects",
        headers=auth_headers(admin_token),
        json={
            "id": "PW-2024-999", "name": "Test Culvert Repair", "type": "Road Infrastructure",
            "location": "Test Zone", "contractor": "Test Co", "budget": 5_000_000,
            "start_date": "2025-01-01", "end_date": "2025-06-01", "lat": 28.4211, "lng": 76.999,
        },
    )
    check("admin can create project", created.status_code == 201, created.text)

    print("\n=== 3. Evidence upload + AI pipeline ===")

    # 3a. Near GPS -> should pass geofence
    with open(os.path.join(temp_dir, "evidence_near.jpg"), "rb") as f:
        r = client.post(
            f"{BASE}/api/projects/PW-2024-001/evidence",
            headers=auth_headers(citizen_token),
            files={"file": ("near.jpg", f, "image/jpeg")},
            data={"caption": "Foundation work near Km 42"},
        )
    check("upload near-GPS evidence succeeds", r.status_code == 201, r.text)
    ev_near = r.json()
    check("within_geofence True for nearby GPS", ev_near["within_geofence"] is True, ev_near.get("distance_from_site_m"))
    check("gps extracted from EXIF", ev_near["gps_lat"] is not None and ev_near["gps_lng"] is not None)
    check("status is verified or review (not failed)", ev_near["status"] in ("verified", "review"), ev_near["status"])
    check("3 approval steps created (pradhan/engineer/admin)", len(ev_near["approval_steps"]) == 3, ev_near["approval_steps"])
    check("quality_score computed", isinstance(ev_near["quality_score"], (int, float)))
    check("completion_estimate computed", isinstance(ev_near["completion_estimate"], (int, float)))

    # 3b. Exact duplicate of 3a -> should be flagged as duplicate & failed
    with open(os.path.join(temp_dir, "evidence_near.jpg"), "rb") as f:
        r = client.post(
            f"{BASE}/api/projects/PW-2024-001/evidence",
            headers=auth_headers(citizen_token),
            files={"file": ("near_dup.jpg", f, "image/jpeg")},
            data={"caption": "duplicate resubmit"},
        )
    ev_dup = r.json()
    check("duplicate upload accepted (201)", r.status_code == 201, r.text)
    check("is_duplicate True", ev_dup["is_duplicate"] is True, ev_dup)
    check("duplicate_of_id points at first evidence", ev_dup["duplicate_of_id"] == ev_near["id"])
    check("status failed for duplicate", ev_dup["status"] == "failed", ev_dup["status"])
    check("no approval steps for AI-rejected duplicate", len(ev_dup["approval_steps"]) == 0)

    # 3c. Far-away GPS -> outside geofence -> review
    with open(os.path.join(temp_dir, "evidence_far.jpg"), "rb") as f:
        r = client.post(
            f"{BASE}/api/projects/PW-2024-001/evidence",
            headers=auth_headers(citizen_token),
            files={"file": ("far.jpg", f, "image/jpeg")},
            data={},
        )
    ev_far = r.json()
    check("far-GPS upload succeeds", r.status_code == 201, r.text)
    check("within_geofence False for far GPS", ev_far["within_geofence"] is False, ev_far.get("distance_from_site_m"))
    check("status review for out-of-geofence photo", ev_far["status"] == "review", ev_far["status"])
    check("distance_from_site_m is large", ev_far["distance_from_site_m"] > 1000, ev_far["distance_from_site_m"])

    # 3d. No GPS at all -> review
    with open(os.path.join(temp_dir, "evidence_nogps.jpg"), "rb") as f:
        r = client.post(
            f"{BASE}/api/projects/PW-2024-001/evidence",
            headers=auth_headers(citizen_token),
            files={"file": ("nogps.jpg", f, "image/jpeg")},
            data={},
        )
    ev_nogps = r.json()
    check("no-GPS upload succeeds", r.status_code == 201, r.text)
    check("gps_lat is None", ev_nogps["gps_lat"] is None)
    check("status review for missing GPS", ev_nogps["status"] == "review", ev_nogps["status"])

    # Reject bad file type
    r = client.post(
        f"{BASE}/api/projects/PW-2024-001/evidence",
        headers=auth_headers(citizen_token),
        files={"file": ("not_an_image.txt", b"hello world", "text/plain")},
    )
    check("non-image upload rejected (415)", r.status_code == 415, r.text)

    print("\n=== 4. Citizen voting ===")
    r = client.post(
        f"{BASE}/api/evidence/{ev_near['id']}/vote",
        headers=auth_headers(citizen_token),
        json={"choice": "completed", "comment": "Looks done to me"},
    )
    check("citizen can vote", r.status_code == 201, r.text)

    r2 = client.post(
        f"{BASE}/api/evidence/{ev_near['id']}/vote",
        headers=auth_headers(citizen_token),
        json={"choice": "incomplete", "comment": "changed my mind"},
    )
    check("re-voting updates existing vote (still 201)", r2.status_code == 201)

    votes = client.get(f"{BASE}/api/evidence/{ev_near['id']}/votes", headers=auth_headers(citizen_token)).json()
    check("only one vote recorded per citizen (upsert)", len(votes) == 1, votes)

    r3 = client.post(
        f"{BASE}/api/evidence/{ev_near['id']}/vote",
        headers=auth_headers(admin_token),
        json={"choice": "completed"},
    )
    check("non-citizen role cannot vote (403)", r3.status_code == 403, r3.text)

    print("\n=== 5. Approval chain — happy path (near-GPS evidence) ===")
    target_id = ev_near["id"]

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(engineer_token),
        json={"decision": "approved", "remarks": "trying to skip ahead"},
    )
    check("engineer cannot review before pradhan (409)", r.status_code == 409, r.text)

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(citizen_token),
        json={"decision": "approved"},
    )
    check("citizen role cannot review (403)", r.status_code == 403, r.text)

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(pradhan_token),
        json={"decision": "approved", "remarks": "Site visit confirms progress"},
    )
    check("pradhan approves", r.status_code == 200, r.text)
    check("status still 'review' pending engineer/admin", r.json()["status"] == "review", r.json()["status"])

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(pradhan_token),
        json={"decision": "approved"},
    )
    check("pradhan cannot review twice (409)", r.status_code == 409, r.text)

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(engineer_token),
        json={"decision": "approved", "remarks": "Measurements verified on site"},
    )
    check("engineer approves after pradhan", r.status_code == 200, r.text)

    r = client.post(
        f"{BASE}/api/evidence/{target_id}/review",
        headers=auth_headers(admin_token),
        json={"decision": "approved", "remarks": "Final sign-off"},
    )
    check("admin approves (final)", r.status_code == 200, r.text)
    final = r.json()
    check("evidence status is now 'verified'", final["status"] == "verified", final["status"])
    check("all 3 approval steps show approved", all(s["decision"] == "approved" for s in final["approval_steps"]))

    print("\n=== 6. Approval chain — rejection path (far-GPS evidence) ===")
    target2 = ev_far["id"]
    client.post(f"{BASE}/api/evidence/{target2}/review", headers=auth_headers(pradhan_token), json={"decision": "approved"})
    r = client.post(
        f"{BASE}/api/evidence/{target2}/review",
        headers=auth_headers(engineer_token),
        json={"decision": "rejected", "remarks": "GPS location does not match site boundary"},
    )
    check("engineer rejects", r.status_code == 200, r.text)
    check("evidence status is 'failed' after rejection", r.json()["status"] == "failed", r.json()["status"])

    r = client.post(
        f"{BASE}/api/evidence/{target2}/review",
        headers=auth_headers(admin_token),
        json={"decision": "approved"},
    )
    check("admin cannot review already-rejected evidence (409)", r.status_code == 409, r.text)

    print("\n=== 7. Dashboard / Reports / Map ===")
    stats = client.get(f"{BASE}/api/dashboard/stats", headers=auth_headers(admin_token)).json()
    check("dashboard stats has 7 projects (6 seed + 1 created)", stats["total_projects"] == 7, stats)
    check("verifications_total counts uploaded evidence", stats["verifications_total"] >= 4, stats)

    budget = client.get(f"{BASE}/api/reports/budget-summary", headers=auth_headers(admin_token)).json()
    check("budget summary returns rows", len(budget) == 7, len(budget))

    outcomes = client.get(f"{BASE}/api/reports/verification-outcomes", headers=auth_headers(admin_token)).json()
    check("verification outcomes has verified>=1 and failed>=2", outcomes["verified"] >= 1 and outcomes["failed"] >= 2, outcomes)

    csv_resp = client.get(f"{BASE}/api/reports/budget-summary.csv", headers=auth_headers(admin_token))
    check("CSV export returns csv content-type", "text/csv" in csv_resp.headers.get("content-type", ""), csv_resp.headers)

    map_points = client.get(f"{BASE}/api/map/projects", headers=auth_headers(citizen_token)).json()
    check("map returns lat/lng for all projects", all("lat" in p and "lng" in p for p in map_points))

    print("\n=== 8. Static file serving for uploaded evidence ===")
    img_resp = client.get(f"{BASE}{ev_near['image_path']}")
    check("uploaded evidence image is retrievable", img_resp.status_code == 200 and img_resp.headers["content-type"].startswith("image/"))

    print("\n=== 9. No-auth request rejected ===")
    r = client.get(f"{BASE}/api/projects")
    check("unauthenticated request is 401", r.status_code == 401, r.status_code)

    print(f"\n{'='*50}\nRESULTS: {PASSED} passed, {FAILED} failed\n{'='*50}")
    return 0 if FAILED == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
