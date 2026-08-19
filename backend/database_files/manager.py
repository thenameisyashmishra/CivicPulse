#!/usr/bin/env python3
"""
CivicPulse Database Manager CLI Utility
Provides administrative commands for database initialization, status, seeding,
backups, JSON data export, and SQLite integrity optimization.
"""

import argparse
import datetime
import json
import os
import shutil
import sys
from pathlib import Path

# Add backend directory to Python path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.db.database import Base, engine, SessionLocal
from app.db import models
from app.db.seed import seed as seed_db


def get_db_file_path() -> Path | None:
    settings = get_settings()
    if settings.database_url.startswith("sqlite:///"):
        rel_or_abs = settings.database_url.replace("sqlite:///", "")
        if rel_or_abs == ":memory:":
            return None
        p = Path(rel_or_abs)
        if not p.is_absolute():
            p = BACKEND_DIR / p
        return p
    return None


def cmd_status():
    """Print current database engine and table row counts."""
    settings = get_settings()
    print("=" * 60)
    print(" CIVICPULSE DATABASE STATUS ")
    print("=" * 60)
    print(f"Database URL: {settings.database_url}")
    print(f"Environment : {settings.app_env}")
    
    db_file = get_db_file_path()
    if db_file:
        print(f"SQLite File : {db_file}")
        print(f"File Exists : {db_file.exists()}")
        if db_file.exists():
            size_kb = db_file.stat().st_size / 1024
            print(f"File Size   : {size_kb:.2f} KB")
    
    # Query row counts
    try:
        with SessionLocal() as db:
            user_count = db.query(models.User).count()
            project_count = db.query(models.Project).count()
            evidence_count = db.query(models.Evidence).count()
            vote_count = db.query(models.Vote).count()
            approval_count = db.query(models.ApprovalStep).count()
            
            print("-" * 60)
            print("TABLE ROW COUNTS:")
            print(f"  • Users           : {user_count}")
            print(f"  • Projects        : {project_count}")
            print(f"  • Evidence Photos : {evidence_count}")
            print(f"  • Citizen Votes   : {vote_count}")
            print(f"  • Approval Steps  : {approval_count}")
            print("-" * 60)
    except Exception as e:
        print(f"[!] Error querying database: {e}")


def cmd_init():
    """Initialize database tables."""
    print("[*] Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("[+] Database tables initialized successfully.")


def cmd_seed():
    """Seed initial demo data."""
    print("[*] Seeding database with demo data...")
    seed_db()
    print("[+] Database seeded successfully.")


def cmd_backup():
    """Create a timestamped backup of the SQLite database file."""
    db_file = get_db_file_path()
    if not db_file or not db_file.exists():
        print(f"[!] SQLite database file not found or running on remote server: {db_file}")
        return

    backup_dir = BACKEND_DIR / "database_files" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"civicpulse_backup_{timestamp}.db"
    backup_path = backup_dir / backup_filename
    
    shutil.copy2(db_file, backup_path)
    size_kb = backup_path.stat().st_size / 1024
    print(f"[+] Backup created successfully:")
    print(f"    Path: {backup_path}")
    print(f"    Size: {size_kb:.2f} KB")


def cmd_export_json():
    """Export table contents to a structured JSON file."""
    export_dir = BACKEND_DIR / "database_files" / "backups"
    export_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = export_dir / f"db_export_{timestamp}.json"
    
    data = {"exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    with SessionLocal() as db:
        users = [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "aadhaar_verified": u.aadhaar_verified}
            for u in db.query(models.User).all()
        ]
        projects = [
            {
                "id": p.id, "name": p.name, "type": p.type, "location": p.location,
                "contractor": p.contractor, "budget": p.budget, "spent": p.spent,
                "progress": p.progress, "status": p.status.value, "lat": p.lat, "lng": p.lng,
                "start_date": str(p.start_date), "end_date": str(p.end_date)
            }
            for p in db.query(models.Project).all()
        ]
        evidence = [
            {
                "id": e.id, "project_id": e.project_id, "uploaded_by_id": e.uploaded_by_id,
                "status": e.status.value, "ai_status": e.ai_status.value, "confidence": e.ai_confidence,
                "quality_score": e.quality_score, "image_path": e.image_path
            }
            for e in db.query(models.Evidence).all()
        ]
        data["users"] = users
        data["projects"] = projects
        data["evidence"] = evidence

    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print(f"[+] JSON Export created successfully at: {export_path}")


def cmd_vacuum():
    """Optimize SQLite storage via VACUUM."""
    settings = get_settings()
    if not settings.database_url.startswith("sqlite"):
        print("[!] VACUUM optimization is only applicable to SQLite databases.")
        return

    print("[*] Running SQLite VACUUM optimization...")
    with engine.connect() as conn:
        conn.exec_driver_sql("VACUUM")
    print("[+] Database vacuumed and optimized.")


def main():
    parser = argparse.ArgumentParser(description="CivicPulse Database Manager CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    subparsers.add_parser("status", help="Show database status & table counts")
    subparsers.add_parser("init", help="Create database tables")
    subparsers.add_parser("seed", help="Seed demo data")
    subparsers.add_parser("backup", help="Create timestamped SQLite backup")
    subparsers.add_parser("export-json", help="Export database to JSON file")
    subparsers.add_parser("vacuum", help="Run SQLite VACUUM optimization")
    
    args = parser.parse_args()
    
    if args.command == "status" or not args.command:
        cmd_status()
    elif args.command == "init":
        cmd_init()
    elif args.command == "seed":
        cmd_seed()
    elif args.command == "backup":
        cmd_backup()
    elif args.command == "export-json":
        cmd_export_json()
    elif args.command == "vacuum":
        cmd_vacuum()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
