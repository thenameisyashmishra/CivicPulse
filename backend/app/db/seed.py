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

        # Seed Contractors
        from app.db.models import (
            ContractorRegistry,
            BankGuarantee,
            PreConstructionDisclosure,
            CPGRAMSGrievance,
            RTIRequest,
            SocialAuditRecord,
            LegislativeQuestion,
            CitizenProjectReview,
            utcnow,
        )
        from datetime import datetime, timezone, timedelta

        if not db.query(ContractorRegistry).first():
            c1 = ContractorRegistry(
                name="NCC Limited",
                gstin="07AAACN1234F1Z1",
                pan="AAACN1234F",
                registration_class="Class A",
                contact_email="tender@nccinfra.com",
                total_projects=14,
                completed_projects=11,
                on_time_rate=91.5,
                avg_quality_score=88.0,
                composite_score=89.2,
                active_pbg_total=45_000_000,
            )
            c2 = ContractorRegistry(
                name="Larsen & Toubro",
                gstin="07AAACL5678G2Z2",
                pan="AAACL5678G",
                registration_class="Class A",
                contact_email="civic@larsentoubro.com",
                total_projects=28,
                completed_projects=26,
                on_time_rate=96.0,
                avg_quality_score=94.5,
                composite_score=95.0,
                active_pbg_total=12_000_000,
            )
            c3 = ContractorRegistry(
                name="IL&FS Engineering",
                gstin="07AAACI9012H3Z3",
                pan="AAACI9012H",
                registration_class="Class B",
                contact_email="projects@ilfseng.com",
                total_projects=8,
                completed_projects=3,
                on_time_rate=55.0,
                avg_quality_score=51.0,
                composite_score=48.5,
                is_blacklisted=False,
                active_pbg_total=28_000_000,
            )
            db.add_all([c1, c2, c3])
            db.commit()

            # Seed PBGs
            db.add(BankGuarantee(
                bg_number="BG/SBI/2024/09812",
                project_id="PW-2024-001",
                contractor_id=c1.id,
                issuing_bank="State Bank of India (CAG Branch, New Delhi)",
                amount=22_500_000,
                issue_date="2024-01-10",
                expiry_date="2025-07-31",
                claim_deadline="2025-08-31",
                status="active",
            ))
            db.add(BankGuarantee(
                bg_number="BG/PNB/2023/1142",
                project_id="PW-2024-002",
                contractor_id=c3.id,
                issuing_bank="Punjab National Bank (Parliament Street)",
                amount=28_000_000,
                issue_date="2023-07-25",
                expiry_date="2024-11-30",
                claim_deadline="2024-12-31",
                status="active",
            ))

            # Seed Pre-Construction Disclosure
            db.add(PreConstructionDisclosure(
                project_id="PW-2024-001",
                dpr_reference="DPR/NHAI/2023/REV-4",
                sanctioning_authority="Ministry of Road Transport and Highways (MoRTH)",
                sanction_order_date="2023-11-15",
                environmental_clearance_status="Clearance Granted (MoEFCC File # 11-89/2023-IA.III)",
                land_acquisition_status="100% Right-of-Way (RoW) Demarcated & Handed Over",
                boq_key_items=[
                    {"item": "Dense Bituminous Macadam (DBM)", "quantity": "42,000 MT", "spec": "MoRTH Section 500"},
                    {"item": "Reinforced Earth Wall", "quantity": "8,500 Sqm", "spec": "IRC:75"},
                    {"item": "LED Solar High-Mast Fixtures", "quantity": "120 Units", "spec": "IS:10322"}
                ],
                baseline_duration_days=530,
                public_consultation_date="2023-10-05",
            ))

            # Seed CPGRAMS Grievance
            db.add(CPGRAMSGrievance(
                registration_number="DARPG/E/2024/0049281",
                project_id="PW-2024-002",
                complainant_name="Sunil Kumar Rathi",
                complainant_contact="sunil.rathi@gmail.com",
                category="Over-billing and Material Substandard Claim",
                description="Filtration clarifier tank shows signs of deep cracks and seepage prior to commissioning.",
                status="under_process",
                cpgrams_action_note="Forwarded to Superintending Engineer (Vigilance) for independent core-cut test.",
                synced_with_gov=True,
            ))

            # Seed RTI Request
            db.add(RTIRequest(
                rti_number="RTI/2024/PWD-1029",
                project_id="PW-2024-001",
                applicant_name="Devendra Pathak (Civic Watch)",
                queries=[
                    "Certified copy of 3rd party core test inspection report.",
                    "Itemized bill of quantities (BOQ) paid under Tranche 2."
                ],
                filing_date=utcnow() - timedelta(days=12),
                statutory_deadline=utcnow() + timedelta(days=18),
                status="under_scrutiny",
            ))

            # Seed Social Audit
            db.add(SocialAuditRecord(
                project_id="PW-2024-004",
                panchayat="Najafgarh Gram Sabha",
                audit_date="2024-08-10",
                quorum_present=84,
                social_audit_findings=[
                    "Classroom ceiling plaster completed with satisfactory finish.",
                    "Ramp construction for accessibility is pending handrails."
                ],
                resolutions_passed=[
                    "Gram Sabha approves milestone tranche 1 release subject to handrail installation within 15 days."
                ],
                gram_sabha_president="Sukhbir Singh Tokas",
                status="conducted",
            ))

            # Seed Legislative Question
            db.add(LegislativeQuestion(
                house="Vidhan Sabha",
                session_name="Budget Session 2024",
                question_number=142,
                question_type="Starred",
                member_name="Shri Anil Jha, MLA",
                constituency="Kirari",
                subject="Status and Timeline of Highway Expansion & Pavement Quality",
                linked_project_ids=["PW-2024-001"],
                status="received",
            ))

            # Seed B.3 Scheme Hierarchy & Milestones
            from app.db.models import (
                SchemeHierarchy,
                ProjectMilestone,
                DelayRootCause,
                DefectLiabilityRecord,
                AssetDigitalTwin,
                CrossProjectAnomalyScore,
                RegionalSentimentScore,
                CitizenCharterCompliance,
                UMANGServiceRegistry,
            )

            if not db.query(SchemeHierarchy).first():
                db.add_all([
                    SchemeHierarchy(
                        code="PMGSY",
                        name="Pradhan Mantri Gram Sadak Yojana (Phase-III)",
                        nodal_ministry="Ministry of Rural Development",
                        total_budget_inr=19000000000.0,
                        disbursed_budget_inr=14200000000.0,
                        active_projects_count=14,
                    ),
                    SchemeHierarchy(
                        code="JJM",
                        name="Jal Jeevan Mission - Har Ghar Jal",
                        nodal_ministry="Ministry of Jal Shakti",
                        total_budget_inr=36000000000.0,
                        disbursed_budget_inr=28500000000.0,
                        active_projects_count=22,
                    ),
                    SchemeHierarchy(
                        code="PMAY-G",
                        name="Pradhan Mantri Awaas Yojana - Gramin",
                        nodal_ministry="Ministry of Housing & Urban Affairs",
                        total_budget_inr=24000000000.0,
                        disbursed_budget_inr=19800000000.0,
                        active_projects_count=18,
                    ),
                ])

            if not db.query(ProjectMilestone).first():
                db.add_all([
                    ProjectMilestone(
                        project_id="PW-2024-001",
                        title="Sub-grade Earthwork & Soil Compaction (Chainage 0-15km)",
                        sequence_order=1,
                        baseline_start_date="2024-01-15",
                        baseline_finish_date="2024-03-31",
                        actual_start_date="2024-01-18",
                        actual_finish_date="2024-03-28",
                        slippage_days=0,
                        status="completed",
                        weightage_pct=25.0,
                    ),
                    ProjectMilestone(
                        project_id="PW-2024-001",
                        title="Granular Sub-Base (GSB) & Wet Mix Macadam (WMM)",
                        sequence_order=2,
                        baseline_start_date="2024-04-01",
                        baseline_finish_date="2024-06-30",
                        actual_start_date="2024-04-05",
                        actual_finish_date="2024-07-10",
                        slippage_days=10,
                        status="completed",
                        weightage_pct=35.0,
                    ),
                    ProjectMilestone(
                        project_id="PW-2024-001",
                        title="Dense Bituminous Macadam (DBM) & Wearing Course",
                        sequence_order=3,
                        baseline_start_date="2024-07-15",
                        baseline_finish_date="2024-11-30",
                        actual_start_date="2024-07-20",
                        actual_finish_date=None,
                        slippage_days=15,
                        status="in_progress",
                        weightage_pct=40.0,
                    ),
                ])

            if not db.query(DelayRootCause).first():
                db.add(DelayRootCause(
                    project_id="PW-2024-001",
                    category="weather",
                    description="Continuous monsoon inundation exceeding 110mm/day halting bitumen paving.",
                    delay_days=15,
                    logged_by_id=3,
                ))

            if not db.query(DefectLiabilityRecord).first():
                db.add(DefectLiabilityRecord(
                    project_id="PW-2024-001",
                    warranty_period_years=3,
                    dlp_start_date="2024-12-01",
                    dlp_end_date="2027-11-30",
                    inspection_schedule_json=[
                        {"survey_name": "6-Month Monsoon Check", "due_date": "2025-06-15", "status": "pending"},
                        {"survey_name": "12-Month Annual Core Audit", "due_date": "2025-12-15", "status": "pending"},
                    ],
                    status="active",
                ))

            if not db.query(AssetDigitalTwin).first():
                db.add(AssetDigitalTwin(
                    asset_code="ASSET-NH44-CORR-01",
                    project_id="PW-2024-001",
                    asset_type="4-Lane Bituminous Highway",
                    geojson_geometry={"type": "LineString", "coordinates": [[76.999, 28.4211], [77.015, 28.4355]]},
                    condition_score=94.2,
                    last_condition_survey="2024-08-20",
                    maintenance_calendar_json=[
                        {"year": 2025, "activity": "Shoulder De-silting", "cost_inr": 80000},
                        {"year": 2027, "activity": "Micro-surfacing 15mm", "cost_inr": 650000},
                    ],
                ))

            if not db.query(CrossProjectAnomalyScore).first():
                db.add(CrossProjectAnomalyScore(
                    entity_type="contractor",
                    entity_id="1",
                    anomaly_score=18.4,
                    repeat_defect_rate=2.1,
                    duplicate_image_attempts=0,
                    budget_burn_anomaly=1.02,
                    risk_level="low",
                ))

            if not db.query(RegionalSentimentScore).first():
                db.add(RegionalSentimentScore(
                    district_name="North East Delhi",
                    panchayat_name="Karawal Nagar Ward 12",
                    sentiment_index=0.68,
                    positive_ratio=0.82,
                    negative_ratio=0.14,
                    total_citizen_inputs=142,
                ))

            if not db.query(CitizenCharterCompliance).first():
                db.add(CitizenCharterCompliance(
                    department_name="Public Works Department (PWD)",
                    service_name="Pothole Repair & Surface Restoration",
                    statutory_timeline_days=7,
                    average_resolution_days=4.8,
                    compliance_pct=94.2,
                    year_month="2024-08",
                ))

            if not db.query(UMANGServiceRegistry).first():
                db.add(UMANGServiceRegistry(
                    service_code="UMANG-CIVICPULSE-V1",
                    endpoint_url="/api/transparency/public/projects",
                    schema_definition={"version": "1.0", "format": "JSON-LD"},
                    total_api_calls=4820,
                    is_active=True,
                ))

            # Seed Pillars B.7 through B.12
            from app.db.models import (
                DataSovereigntyConfig,
                VAPTAuditReport,
                GIGWComplianceManifest,
                PIIFieldEncryptionMeta,
                TenantHierarchy,
                TenantWhiteLabelConfig,
                TenantFeatureFlag,
                LocaleTranslationRegistry,
                ExecutiveBIDashboard,
                DistrictContractorLeaderboard,
                CarbonFootprintRecord,
                ModelRegistryRecord,
                ModelCardDocumentation,
                EdgeInferenceManifest,
            )

            if not db.query(DataSovereigntyConfig).first():
                db.add(DataSovereigntyConfig(
                    datacenter_provider="NIC Cloud / AWS GovCloud Mumbai (ap-south-1)",
                    jurisdiction_country="IN",
                    meity_audit_ref="MEITY-GOV-CLOUD-AUDIT-2024-91",
                    is_data_localized=True,
                    last_verified_at=datetime.now(timezone.utc).isoformat(),
                ))

            if not db.query(VAPTAuditReport).first():
                db.add(VAPTAuditReport(
                    cert_in_auditor_name="KPMG India Cyber Security (CERT-In Empaneled)",
                    report_reference_id="CERT-IN-VAPT-2024-Q3",
                    report_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    audit_date="2024-08-15",
                    critical_vulns_count=0,
                    high_vulns_count=0,
                    medium_vulns_count=2,
                    remediation_status="remediated",
                ))

            if not db.query(GIGWComplianceManifest).first():
                db.add(GIGWComplianceManifest(
                    gigw_version="GIGW-3.0",
                    wcag_conformance_level="AA",
                    audit_score_pct=99.2,
                    bilingual_nav_supported=True,
                    screen_reader_tested=True,
                    certified_by="STQC Directorate",
                ))

            if not db.query(PIIFieldEncryptionMeta).first():
                db.add(PIIFieldEncryptionMeta(
                    key_alias="alias/civicpulse-pii-kms-key",
                    algorithm="AES-256-GCM",
                    hsm_key_arn="arn:aws:kms:ap-south-1:112233445566:key/mrk-99182a4bc81",
                    rotation_interval_days=90,
                    last_rotated_at="2024-08-01",
                    encrypted_fields_count=14,
                ))

            if not db.query(TenantHierarchy).first():
                t1 = TenantHierarchy(
                    tenant_code="STATE-DL",
                    tenant_name="Government of NCT of Delhi",
                    tier_level="state",
                    parent_tenant_id=None,
                    state_code="DL",
                    is_active=True,
                )
                db.add(t1)
                db.flush()

                t2 = TenantHierarchy(
                    tenant_code="DIST-NEDL",
                    tenant_name="District North East Delhi",
                    tier_level="district",
                    parent_tenant_id=t1.id,
                    state_code="DL",
                    is_active=True,
                )
                db.add(t2)
                db.flush()

                db.add(TenantWhiteLabelConfig(
                    tenant_id=t1.id,
                    portal_title="CivicPulse NCT Delhi State Portal",
                    state_emblem_uri="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg",
                    primary_accent_color="#0284c7",
                    custom_domain_cname="projects.delhi.gov.in",
                    footer_text="An Official Platform of the Government of NCT of Delhi",
                ))

                db.add(TenantFeatureFlag(
                    tenant_id=t1.id,
                    module_key="satellite_diff",
                    is_enabled=True,
                    custom_parameters_json={"provider": "ISRO_Bhuvan", "min_ndvi_delta": -0.2},
                ))

            if not db.query(LocaleTranslationRegistry).first():
                db.add_all([
                    LocaleTranslationRegistry(
                        language_code="hi",
                        language_name="Hindi",
                        namespace="common",
                        translations_json={"welcome": "नागरिक पल्स में आपका स्वागत है", "status": "स्थिति", "projects": "परियोजनाएं"},
                        completeness_pct=100.0,
                    ),
                    LocaleTranslationRegistry(
                        language_code="bn",
                        language_name="Bengali",
                        namespace="common",
                        translations_json={"welcome": "সিভিকপাল্সে স্বাগতম", "status": "স্থিতি", "projects": "প্রকল্পসমূহ"},
                        completeness_pct=100.0,
                    ),
                ])

            if not db.query(ExecutiveBIDashboard).first():
                db.add(ExecutiveBIDashboard(
                    state_code="DL",
                    reporting_quarter="Q2-FY2024-25",
                    total_sanctioned_cr=1420.5,
                    total_disbursed_cr=980.2,
                    physical_completion_rate_pct=72.4,
                    average_delay_days=18.5,
                    defect_density_per_km=0.42,
                ))

            if not db.query(DistrictContractorLeaderboard).first():
                db.add_all([
                    DistrictContractorLeaderboard(
                        entity_type="contractor",
                        entity_identifier="NCC Limited",
                        overall_rank=1,
                        quality_score=94.5,
                        timeliness_score=91.0,
                        citizen_rating=4.8,
                        evaluation_cycle="2024-H1",
                    ),
                    DistrictContractorLeaderboard(
                        entity_type="district",
                        entity_identifier="North East Delhi",
                        overall_rank=1,
                        quality_score=92.1,
                        timeliness_score=89.4,
                        citizen_rating=4.6,
                        evaluation_cycle="2024-H1",
                    ),
                ])

            if not db.query(CarbonFootprintRecord).first():
                db.add(CarbonFootprintRecord(
                    project_id="PW-2024-001",
                    cement_consumption_mt=420.0,
                    steel_consumption_mt=150.0,
                    bitumen_consumption_mt=85.0,
                    embodied_carbon_tco2e=668.25,
                    green_rating_grade="GRIHA_4_STAR",
                ))

            if not db.query(ModelRegistryRecord).first():
                db.add(ModelRegistryRecord(
                    model_name="yolov8-pothole-crack",
                    model_version="v3.2.0",
                    framework="PyTorch / Ultralytics",
                    weights_sha256="4d89a71be82cf09182abcf18274a108428f9104",
                    storage_uri="/models/yolov8_pothole_crack_v3.2.0.pt",
                    deployment_stage="production",
                ))

            if not db.query(ModelCardDocumentation).first():
                db.add(ModelCardDocumentation(
                    model_name="yolov8-pothole-crack",
                    intended_domain="Indian National & State Highway Pavement Surface Inspection (IRC:82 Compliance)",
                    training_data_summary="14,200 annotated high-res road surface images across 8 Indian states under varied weather/lighting.",
                    quantitative_metrics_summary="Precision: 94.2%, Recall: 91.8%, mAP@0.5: 93.5%, Inference latency: 42.8ms on T4 GPU.",
                    ethical_and_operational_limits="Trained primarily on asphalt/concrete surfaces. Low light performance (<20 lux) requires aux floodlighting.",
                    license="Apache-2.0 / GoI Public",
                ))

            if not db.query(EdgeInferenceManifest).first():
                db.add(EdgeInferenceManifest(
                    model_code="EDGE-YOLO-INT8-V1",
                    quantization_type="INT8",
                    package_size_mb=12.4,
                    tflite_uri="/models/edge/yolov8_int8_quantized.tflite",
                    offline_sync_protocol_version="SYNC-v2.2",
                ))

        db.commit()
        print(f"Seed complete: {created_users} user(s), {created_projects} project(s), enterprise registry loaded.")
    finally:
        if db is not None:
            db.close()


if __name__ == "__main__":
    seed()

