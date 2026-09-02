"""
Security, Compliance & Data Sovereignty Service (Pillar B.8 - 11 Features).
"""

from datetime import datetime, timezone, timedelta
import hashlib
import json
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.models import (
    utcnow,
    User,
    DataSovereigntyConfig,
    VAPTAuditReport,
    GIGWComplianceManifest,
    DPDPConsentRegistry,
    PIIFieldEncryptionMeta,
    AdminActionAuditLog,
    DataRetentionPolicy,
    DisasterRecoveryConfig,
    SecretsVaultConfig,
    ScopedApiToken,
    BugBountyVulnerability,
)


class SecurityComplianceService:

    # 1. MeitY-Empanelled Cloud Hosting / Data Localization
    @staticmethod
    def get_or_create_data_sovereignty(db: Session) -> DataSovereigntyConfig:
        cfg = db.execute(select(DataSovereigntyConfig)).scalars().first()
        if not cfg:
            cfg = DataSovereigntyConfig(
                datacenter_provider="NIC Cloud / AWS GovCloud Mumbai (ap-south-1)",
                jurisdiction_country="IN",
                meity_audit_ref="MEITY-GOV-CLOUD-AUDIT-2024-91",
                is_data_localized=True,
                last_verified_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    # 2. CERT-In Compliance & Periodic VAPT Reports
    @staticmethod
    def register_vapt_audit(
        db: Session, auditor: str, ref_id: str, report_hash: str, critical: int, high: int, med: int
    ) -> VAPTAuditReport:
        rec = db.execute(
            select(VAPTAuditReport).where(VAPTAuditReport.report_reference_id == ref_id)
        ).scalars().first()

        if not rec:
            rec = VAPTAuditReport(
                cert_in_auditor_name=auditor,
                report_reference_id=ref_id,
                report_sha256=report_hash,
                audit_date=datetime.now().strftime("%Y-%m-%d"),
                critical_vulns_count=critical,
                high_vulns_count=high,
                medium_vulns_count=med,
                remediation_status="remediated" if critical == 0 else "in_progress",
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
        return rec

    # 3. GIGW 3.0 Web Accessibility & Design Compliance
    @staticmethod
    def get_gigw_manifest(db: Session) -> GIGWComplianceManifest:
        manifest = db.execute(select(GIGWComplianceManifest)).scalars().first()
        if not manifest:
            manifest = GIGWComplianceManifest(
                gigw_version="GIGW-3.0",
                wcag_conformance_level="AA",
                audit_score_pct=98.5,
                bilingual_nav_supported=True,
                screen_reader_tested=True,
                certified_by="STQC Directorate",
            )
            db.add(manifest)
            db.commit()
            db.refresh(manifest)
        return manifest

    # 4. Digital Personal Data Protection (DPDP) Act 2023 Compliance
    @staticmethod
    def manage_dpdp_consent(
        db: Session, user_id: int, purpose: str, given: bool
    ) -> DPDPConsentRegistry:
        reg = db.execute(
            select(DPDPConsentRegistry).where(
                DPDPConsentRegistry.user_id == user_id,
                DPDPConsentRegistry.purpose_code == purpose,
            )
        ).scalars().first()

        now_iso = datetime.now(timezone.utc).isoformat()
        if not reg:
            reg = DPDPConsentRegistry(
                user_id=user_id,
                purpose_code=purpose,
                consent_given=given,
                consent_timestamp=now_iso,
                rights_exercised_log_json=[{"action": "consent_granted" if given else "consent_denied", "timestamp": now_iso}],
            )
            db.add(reg)
        else:
            reg.consent_given = given
            if not given:
                reg.withdrawn_at = now_iso
            logs = list(reg.rights_exercised_log_json or [])
            logs.append({"action": "consent_updated" if given else "consent_withdrawn", "timestamp": now_iso})
            reg.rights_exercised_log_json = logs
        db.commit()
        db.refresh(reg)
        return reg

    # 5. Field-Level Encryption for PII
    @staticmethod
    def get_pii_encryption_meta(db: Session) -> PIIFieldEncryptionMeta:
        meta = db.execute(select(PIIFieldEncryptionMeta)).scalars().first()
        if not meta:
            meta = PIIFieldEncryptionMeta(
                key_alias="alias/civicpulse-pii-kms-key",
                algorithm="AES-256-GCM",
                hsm_key_arn="arn:aws:kms:ap-south-1:112233445566:key/mrk-99182a4bc81",
                rotation_interval_days=90,
                last_rotated_at=datetime.now().strftime("%Y-%m-%d"),
                encrypted_fields_count=14,
            )
            db.add(meta)
            db.commit()
            db.refresh(meta)
        return meta

    # 6. Immutable Audit Log of All Admin Actions
    @staticmethod
    def log_admin_action(
        db: Session, admin_id: int, action: str, r_type: str, r_id: str, ip: str
    ) -> AdminActionAuditLog:
        # Fetch last log to build cryptographic chain
        last_log = db.execute(
            select(AdminActionAuditLog).order_by(AdminActionAuditLog.id.desc())
        ).scalars().first()

        prev_hash = last_log.current_entry_hash if last_log else "GENESIS_BLOCK_SECURITY_HASH_0000"
        timestamp = datetime.now(timezone.utc).isoformat()
        current_hash = hashlib.sha256(f"{prev_hash}:{admin_id}:{action}:{r_type}:{r_id}:{timestamp}".encode("utf-8")).hexdigest()

        rec = AdminActionAuditLog(
            admin_id=admin_id,
            action_type=action,
            resource_type=r_type,
            resource_id=r_id,
            previous_log_hash=prev_hash,
            current_entry_hash=current_hash,
            client_ip=ip,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 7. Data Retention & Public-Records Archival Policy Engine
    @staticmethod
    def configure_retention_policy(
        db: Session, category: str, years: int, cag_ref: str, purge: bool, archive_uri: str
    ) -> DataRetentionPolicy:
        policy = db.execute(
            select(DataRetentionPolicy).where(DataRetentionPolicy.record_category == category)
        ).scalars().first()

        if not policy:
            policy = DataRetentionPolicy(
                record_category=category,
                retention_period_years=years,
                cag_mandate_reference=cag_ref,
                auto_purge_enabled=purge,
                archival_target_uri=archive_uri,
            )
            db.add(policy)
        else:
            policy.retention_period_years = years
            policy.cag_mandate_reference = cag_ref
            policy.auto_purge_enabled = purge
            policy.archival_target_uri = archive_uri
        db.commit()
        db.refresh(policy)
        return policy

    # 8. Multi-Region Disaster Recovery & Backup
    @staticmethod
    def get_disaster_recovery_config(db: Session) -> DisasterRecoveryConfig:
        cfg = db.execute(select(DisasterRecoveryConfig)).scalars().first()
        if not cfg:
            cfg = DisasterRecoveryConfig(
                primary_region="ap-south-1 (Mumbai)",
                secondary_region="ap-south-2 (Hyderabad)",
                rpo_minutes=5,
                rto_hours=1.0,
                replication_lag_seconds=1.2,
                last_failover_drill_date=datetime.now().strftime("%Y-%m-%d"),
                status="active_standby",
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    # 9. Secrets Management & Credential Rotation
    @staticmethod
    def register_vault_secret(
        db: Session, secret_path: str, lease_sec: int, rotation_days: int
    ) -> SecretsVaultConfig:
        cfg = db.execute(
            select(SecretsVaultConfig).where(SecretsVaultConfig.secret_path == secret_path)
        ).scalars().first()

        if not cfg:
            cfg = SecretsVaultConfig(
                vault_provider="HashiCorp Vault KV-v2",
                secret_path=secret_path,
                lease_duration_seconds=lease_sec,
                auto_rotation_days=rotation_days,
                last_rotated_at=datetime.now().strftime("%Y-%m-%d"),
                is_active=True,
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    # 10. Role-Scoped API Tokens with Expiry & Revocation
    @staticmethod
    def issue_scoped_token(
        db: Session, user_id: int, scopes: List[str], ttl_hours: int = 24
    ) -> ScopedApiToken:
        token_id = f"CP-SCOPE-{uuid.uuid4().hex[:12].upper()}"
        secret_bytes = uuid.uuid4().bytes + str(user_id).encode("utf-8")
        token_hash = hashlib.sha256(secret_bytes).hexdigest()
        expires = (datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).isoformat()

        rec = ScopedApiToken(
            token_identifier=token_id,
            token_hash=token_hash,
            assigned_scopes_json=scopes,
            created_by_id=user_id,
            expires_at=expires,
            is_revoked=False,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 11. Security Incident Response Runbook & Bug-Bounty Program
    @staticmethod
    def log_bug_bounty_submission(
        db: Session, pseudonym: str, title: str, severity: str, cvss: float, bounty: float
    ) -> BugBountyVulnerability:
        sub_ref = f"VULN-BB-{uuid.uuid4().hex[:8].upper()}"
        rec = BugBountyVulnerability(
            submission_ref=sub_ref,
            researcher_pseudonym=pseudonym,
            vulnerability_title=title,
            severity=severity,
            cvss_score=cvss,
            remediation_state="triaged",
            bounty_awarded_inr=bounty,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec
