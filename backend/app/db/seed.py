"""
Seeds the database with demo users (one per role) and initial projects
used in the CivicPulse frontend's mock data. Gated behind development mode.

Usage:
    python -m app.db.seed
"""

import time
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.db.models import Project, ProjectStatus, User, UserRole

DEMO_USERS = [
    {"name": "Admin Officer", "email": "admin@civicpulse.gov.in", "password": "Admin@1234", "role": UserRole.admin, "aadhaar_verified": True, "aadhaar_last_4": "9901"},
    {"name": "Ramesh Yadav (Pradhan)", "email": "pradhan@civicpulse.gov.in", "password": "Pradhan@1234", "role": UserRole.pradhan, "aadhaar_verified": True, "aadhaar_last_4": "4210"},
    {"name": "Priya Verma (Engineer)", "email": "engineer@civicpulse.gov.in", "password": "Engineer@1234", "role": UserRole.engineer, "aadhaar_verified": True, "aadhaar_last_4": "1198"},
    {"name": "Anita Sharma (Citizen)", "email": "citizen@civicpulse.gov.in", "password": "Citizen@1234", "role": UserRole.citizen, "aadhaar_verified": False, "aadhaar_last_4": None},
]

DEMO_PROJECTS = [
    dict(
        id="PW-2024-001", name="National Highway 44 Expansion", type="Road Infrastructure",
        location="Delhi-Jaipur Corridor", contractor="NCC Limited", budget=450_000_000, spent=312_000_000,
        progress=69, status=ProjectStatus.active, start_date="2024-01-15", end_date="2025-06-30",
        lat=28.4211, lng=76.999,
    ),
    dict(
        id="PW-2024-002", name="Municipal Water Treatment Plant", type="Water Infrastructure",
        location="Zone 4, South Delhi", contractor="IL&FS Engineering", budget=280_000_000, spent=325_000_000,
        progress=85, status=ProjectStatus.flagged, start_date="2023-08-01", end_date="2024-12-31",
        lat=28.5245, lng=77.2066,
    ),
    dict(
        id="PW-2024-003", name="Smart Street Lighting Network", type="Urban Development",
        location="Central Delhi District", contractor="Larsen & Toubro", budget=120_000_000, spent=118_000_000,
        progress=98, status=ProjectStatus.completed, start_date="2024-03-01", end_date="2025-01-15",
        lat=28.6289, lng=77.2065,
    ),
    dict(
        id="PW-2024-004", name="Primary School Construction", type="Education Infrastructure",
        location="Najafgarh Block, West Delhi", contractor="Afcons Infrastructure", budget=45_000_000, spent=18_000_000,
        progress=32, status=ProjectStatus.delayed, start_date="2024-06-01", end_date="2025-03-31",
        lat=28.6091, lng=76.9784,
    ),
    dict(
        id="PW-2024-005", name="Drainage System Upgrade", type="Sanitation",
        location="Shahdara Zone", contractor="Hindustan Construction", budget=190_000_000, spent=95_000_000,
        progress=50, status=ProjectStatus.active, start_date="2024-04-01", end_date="2025-09-30",
        lat=28.6742, lng=77.293,
    ),
    dict(
        id="PW-2024-006", name="Community Health Center", type="Healthcare Infrastructure",
        location="Rohini Sector 7", contractor="RDS Project Limited", budget=85_000_000, spent=82_000_000,
        progress=92, status=ProjectStatus.active, start_date="2024-02-15", end_date="2025-02-28",
        lat=28.7248, lng=77.1201,
    ),
]


def seed() -> None:
    settings = get_settings()
    if settings.app_env == "production":
        print("ERROR: Seed script is disabled in production mode. Set APP_ENV=development to seed.")
        return

    db = None
    retries = 5
    while retries > 0:
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            break
        except OperationalError as e:
            retries -= 1
            if retries == 0:
                print("Could not connect to database. Exiting.")
                raise e
            print(f"Database connection failed. Retrying in 3 seconds... ({retries} retries left)")
            time.sleep(3)

    try:
        if db is None:
            return

        created_users = 0
        for u in DEMO_USERS:
            if not db.query(User).filter(User.email == u["email"]).first():
                db.add(
                    User(
                        name=u["name"],
                        email=u["email"],
                        hashed_password=hash_password(u["password"]),
                        role=u["role"],
                        aadhaar_verified=u["aadhaar_verified"],
                        aadhaar_last_4=u["aadhaar_last_4"],
                    )
                )
                created_users += 1

        created_projects = 0
        for p in DEMO_PROJECTS:
            if not db.get(Project, p["id"]):
                db.add(Project(**p))
                created_projects += 1

        db.commit()
        print(f"Seed complete: {created_users} user(s), {created_projects} project(s) added.")
    finally:
        if db is not None:
            db.close()


if __name__ == "__main__":
    seed()
