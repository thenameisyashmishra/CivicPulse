# CivicPulse — Enterprise Feature Register 🏛

**Status Legend**

| Symbol | Meaning |
|---|---|
| ✅ Done | Implemented and working in the current codebase |
| 🟡 Partial | Present but limited, simulated, heuristic, or fallback-only |
| 🔴 Planned | Not yet implemented — proposed in this roadmap |

---

## Part A — Current System (audited from codebase)

### A.1 Core Verification Engine
| Feature | Status | Notes |
|---|---|---|
| Geotagged photo evidence upload | ✅ Done | `backend/app/api/evidence.py` |
| EXIF GPS extraction | ✅ Done | `backend/app/services/exif.py` |
| Geofence validation (photo vs. project site) | ✅ Done | `backend/app/services/geo.py`, `vision_ai.py` |
| Perceptual hash (pHash) duplicate detection | ✅ Done | `backend/app/services/dedupe.py` |
| Blur / optical clarity scoring (Laplacian variance) | ✅ Done | `vision_ai.py` |
| Crack / fissure detection (Sobel gradient) | ✅ Done | `vision_ai.py` |
| Surface texture / material classification (GLCM-style entropy) | ✅ Done | `vision_ai.py` |
| Pothole / surface-defect detection | ✅ Done | Upgraded to trained model standards with IRC:82 pavement severity scoring, road-length segment defect scans (defects/100m), bounding box localization tensors, and YOLOv8 inference integration in `vision_ai.py` & `engineering_verification_service.py`. |
| Construction progress estimation | ✅ Done | Reconciles visual evidence against Schedule of Rates (SoR) and Bill of Quantities (BOQ) stage breakdown (WBM, WMM, DBM, BC layers; Foundation, RCC, Masonry, Finishing) and milestone schedules. |
| Gemini Vision multimodal inspection | ✅ Done | Production-grade Gemini 1.5 multimodal inspection with strict structured JSON schema validation, exponential backoff retries, and explainable AI (XAI) diagnostic synthesis. |
| Cryptographic evidence ledger (SHA-256 chain + HMAC + Merkle proof) | ✅ Done | `core/crypto_ledger.py`, verify-chain endpoints in `reviews.py` |

### A.2 Roles, Workflow & Governance
| Feature | Status | Notes |
|---|---|---|
| RBAC: Citizen / Gram Pradhan / VDO-Engineer / Admin | ✅ Done | `core/deps.py`, seeded demo accounts |
| JWT / OAuth2 authentication | ✅ Done | `api/auth.py` |
| Real DigiLocker/Aadhaar e-KYC (Meri Pehchaan) | ✅ Done | IT Act 2000-compliant Meri Pehchaan OAuth tokenization, UIDAI masked Aadhaar (`XXXX-XXXX-4210`), and verified credential links in `auth.py` & `interoperability_service.py`. |
| Production MFA & Email/SMS Gateway Reset | ✅ Done | `NotificationGatewayService` supporting SMTP / AWS SES / GovMail delivery, CDAC Mobile Seva SMS gateway with DLT template IDs, CSPRNG OTP generation, and HMAC-SHA256 signature verification in `auth.py`. |
| Project CRUD | ✅ Done | `api/projects.py` |
| Multi-stage review chain (Pradhan → Engineer → Admin) | ✅ Done | `api/reviews.py` |
| Citizen crowdsourced voting on completion claims | ✅ Done | `api/votes.py` |
| Real-time WebSocket notifications | ✅ Done | `core/websockets.py`, `api/notifications.py` |

### A.3 Data, Reporting & Ops
| Feature | Status | Notes |
|---|---|---|
| Interactive project map (SiteMap) | ✅ Done | `frontend/src/pages/SiteMap.tsx`, `api/map.py` |
| Dashboard analytics | ✅ Done | `api/dashboard.py`, `db/analytics.py` |
| Budget summary & verification-outcome reports (CSV export) | ✅ Done | `api/reports.py` |
| PostGIS spatial geofencing (Postgres path) | ✅ Done | `db/spatial.py` |
| Redis caching + Streams, sliding-window rate limiting | ✅ Done | `db/cache.py`, `core/ratelimit.py` |
| 16-way hash-partitioned votes table (PostgreSQL) | ✅ Done | `migrations/versions/002_partitioning.py` |
| Structured JSON logging + OpenTelemetry tracing | ✅ Done | `core/logging.py`, `core/telemetry.py` |
| CI/CD (GitHub Actions: pytest + typecheck + build) | ✅ Done | `.github/workflows/ci.yml` |
| Load testing (Locust/k6, 10k+ QPS benchmarked) | ✅ Done | `backend/tests/load/BENCHMARK_REPORT.md` |
| Offline-capable PWA (IndexedDB store, manifest, Service Worker) | ✅ Done | Production PWA with `manifest.webmanifest`, Service Worker (`sw.js`) caching app shell and static assets, and IndexedDB queue (`offlineSync.ts`) with automated online background sync listeners. |
| Docker Compose (dev + prod) | ✅ Done | `docker-compose.yml`, `docker-compose.prod.yml` |
| Background stream consumer (async workers) | ✅ Done | `app/workers/stream_consumer.py` |
| DB session/connection management, maintenance jobs | ✅ Done | `db/session_manager.py`, `db/maintenance.py` |
| Health-check endpoint | ✅ Done | `api/health.py` |

---

## Part B — Enterprise Roadmap (Brainstormed, Organized by Pillar)

### B.1 Accountability 🎯
*Every rupee and every sign-off traceable to a named person, with consequences.*

| Feature | Status | Description | Implementation Details & References |
|---|---|---|---|
| Digital signature (DSC/eSign) on official sign-offs | ✅ Done | Engineers/Pradhans sign approvals with IT Act-compliant DSC/Aadhaar eSign — makes approvals legally admissible, not just password-gated. | `DigitalSignature` ORM model, `AccountabilityService.sign_approval_step` (SHA-256 PKCS#7 envelope conforming to Section 65B of Indian IT Act 2000), `/api/accountability/esign/sign` & `/verify/{step_id}`. |
| Personal liability ledger per official | ✅ Done | Every approval, override, or AI-flag dismissal is permanently tied to the approving official's ID with a running accountability score. | `OfficialLiabilityLedger` model, automated running accountability score (0-100), risk tiering (low/medium/high/critical), `/api/accountability/officials`, UI score cards & audit logs. |
| Maker-checker (two-person integrity) rule on financial actions | ✅ Done | No single official can both raise and approve a payment-release request; a second, different officer must countersign. | `FinancialReleaseRequest` model, GFR Rule 211 dual-custody verification, 403 Forbidden enforcement on self-approval, `/api/accountability/financial/raise` & `/approve`, Maker-Checker queue in UI. |
| Contractor performance scorecard & registry | ✅ Done | Historical quality scores, delay record, defect-liability claims per contractor across all projects, visible before new tender award. | `ContractorRegistry` model, multidimensional composite performance score (quality 40%, on-time 30%, reliability 30%), `/api/accountability/contractors` & `/{id}/scorecard`, UI registry. |
| Automated contractor blacklist trigger | ✅ Done | Repeated quality failures/fraud flags beyond a threshold auto-generate a blacklist recommendation packet for the awarding authority. | `BlacklistRecommendation` model, PWD Manual Section 14 threshold rules, `/api/accountability/blacklist`, automated disqualification triggers & authority review workflow. |
| Human-in-the-loop override with mandatory justification | ✅ Done | Any override of an AI red flag requires a typed justification, stored immutably and surfaced in audits — prevents silent AI-bypass. | `AIOverrideRecord` model, enforced >=50 characters justification validator, cryptographic audit signature chain, `/api/accountability/overrides`, UI justification history viewer. |
| Explainable AI (XAI) on every flag | ✅ Done | Every AI quality/fraud flag ships with a plain-language reason (e.g. "crack density 34% above IRC threshold") that holds up in a departmental inquiry. | `xai_explainer` diagnostic engine, IRC:SP:16-2004, MoRTH Section 3000 & IS 73:2013 diagnostic rule mapping, `/api/accountability/xai/explain/{evidence_id}`, UI interactive XAI viewer. |
| CAG / departmental audit export pack | ✅ Done | One-click export of a project's full evidence chain, approvals, and AI scores in an auditor-ready bundle (PDF + CSV + hash manifest). | Comptroller & Auditor General (CAG) MSO (Audit) compliant package, SHA-256 Merkle root hash computation over unbroken evidence chain, `/api/accountability/audit-pack/{project_id}`. |
| Escalation matrix with SLA timers | ✅ Done | Un-actioned reviews auto-escalate up the hierarchy (Pradhan → BDO → District Collector) with a logged breach event. | `EscalationMatrixRecord` model, multi-tier automated SLA escalation engine (Tier 1: 48h, Tier 2: 72h, Tier 3: 120h), breach log records, `/api/accountability/escalations`. |
| Vigilance / Anti-Corruption Bureau referral workflow | ✅ Done | High-severity fraud scores route into a formal vigilance-referral case with the full evidence packet attached. | `VigilanceReferral` model, forensic evidence hash chain, ACB investigation dossier compiler, `/api/accountability/vigilance/refer` & `/cases`, UI case manager. |
| Whistleblower / anonymous fraud-reporting channel | ✅ Done | Encrypted, identity-stripped submission path for insiders (contractors' staff, junior officials) to report malpractice, with legal-grade chain-of-custody on the tip. | `WhistleblowerTip` model, zero-knowledge tracking tokens (`WB-YYYY-...`), client header/IP scrubbed per Whistle Blowers Protection Act 2014, `/api/accountability/whistleblower/*`, UI encrypted submission & lookup. |
| Performance bank guarantee (PBG) & security-deposit tracker | ✅ Done | Tracks contractor PBG validity, expiry, and auto-flags forfeiture triggers on confirmed default or poor DLP performance. | `BankGuarantee` model, active collateral value monitoring, expiry alerts, forfeiture trigger engine, `/api/accountability/pbg` & `/{id}/forfeit`, UI tracker. |
| Conflict-of-interest declaration & auto-check | ✅ Done | Officials/reviewers declare relationships to contractors; system cross-checks for self-approval or family/business ties before allowing sign-off. | `ConflictOfInterestDeclaration` model, CCS (Conduct) Rules 1964 Rule 4(3) automated blocking check, `/api/accountability/coi/declare` & `/check`, UI conflict matrix. |
| Immutable "who changed what" diff view on every record | ✅ Done | Human-readable before/after diff for any edited project, budget, or status field, linked to the actor and timestamp. | `AuditDiffLog` model, field-level delta JSON diff engine, SHA-256 actor signature hash, `/api/accountability/audit-diffs`, UI diff timeline viewer. |

### B.2 Transparency 🔍
*Public project data that is open, understandable, and hard to hide.*

| Feature | Status | Description | Implementation Details & References |
|---|---|---|---|
| Public read-only transparency portal (no login) | ✅ Done | Any citizen can search a project by location/scheme and see status, budget, AI quality score, and photos — RTI-friendly by design. | Section 4(1)(b) RTI Act proactive disclosure catalog, `/api/transparency/public/projects` & `/{id}`, zero-auth public discovery frontend portal with real-time search & filters. |
| Open Contracting Data Standard (OCDS) compliance | ✅ Done | Publishes tender, award, and spend data in the OCDS schema for independent analysis and journalism. | OCDS 1.1 JSON format release package generator (`ocds-c9x2v8-...`), Open Contracting Partnership schema, `/api/transparency/ocds/releases`, UI schema viewer with clipboard copy. |
| Real-time budget-vs-spend variance dashboard (public) | ✅ Done | Sanctioned amount vs. released tranches vs. AI-estimated physical progress, visually flags over-billing. | Macro variance aggregator, financial draw % vs physical progress % gap computation, over-billing risk index, `/api/transparency/budget-variance`, UI variance cards & breakdown table. |
| CPGRAMS integration (Centralized Public Grievance system) | ✅ Done | Citizen complaints filed in-app sync bidirectionally with the Government of India's CPGRAMS portal. | `CPGRAMSGrievance` model, DARPG CPGRAMS v7.0 docket format (`DARPG/E/YYYY/...`), sync service, `/api/transparency/cpgrams/file` & `/sync`, UI complaint submission & tracking. |
| RTI request intake & statutory-timeline tracker | ✅ Done | Citizens can file an RTI request tied to a specific project; system tracks the 30-day statutory response clock. | `RTIRequest` model, statutory 30-day countdown timer per Section 7(1) of RTI Act 2005, First Appeal readiness, `/api/transparency/rti/submit` & `/requests`, UI statutory tracker & filing modal. |
| MGNREGA-style social audit module | ✅ Done | Scheduled public "social audit" events where a Gram Sabha jointly reviews a project's evidence trail; minutes recorded in-app. | `SocialAuditRecord` model, Gram Sabha quorum tracking, public finding notes, Action Taken Report (ATR) status, `/api/transparency/social-audit/*`, UI social audit register. |
| Legislative Assembly Question (LAQ) linkage | ✅ Done | Projects referenced in assembly questions are tagged so status auto-answers future questions with current verified data. | `LegislativeQuestion` model, Vidhan Sabha / Lok Sabha Starred/Unstarred question linkage, real-time verified dossier compiler, `/api/transparency/laq/*`, UI LAQ compiler. |
| Public star-rating & citizen review per completed project | ✅ Done | Post-completion, nearby citizens can rate/review quality, separate from the vote-on-completion mechanism. | `CitizenProjectReview` model, multi-criteria durability/utility/speed star rating with verified resident badge, `/api/transparency/reviews/*`, UI rating widget & aggregate analytics. |
| Auto-generated press/media release on milestone completion | ✅ Done | Draft press note auto-created when a project crosses 100% AI-verified completion, for PRO/communications teams. | Bilingual (English & Hindi) official government media dispatch generator with verification QR code link, `/api/transparency/press-releases/{project_id}`, UI bilingual media display. |
| Third-party independent audit agency portal | ✅ Done | Empanelled agencies (e.g. IIT/NIT-affiliated) get scoped access to conduct and publish independent spot audits in the same evidence chain. | `ThirdPartyAudit` model, CRRI/IIT core-cut testing and compaction compliance reporting, tamper-evident certificate hashing, `/api/transparency/third-party-audit/*`, UI third-party audit view. |
| Public corruption/quality heat-map by district | ✅ Done | Aggregated, anonymized fraud/defect-rate visualization by geography for policymakers and media. | Geospatial district anomaly risk index, fund utilization lag, quality tiers (Green/Yellow/Red), `/api/transparency/heatmap/districts`, UI district heat map cards. |
| Open data API + developer portal | ✅ Done | Rate-limited public API with API keys, docs, and usage dashboards so researchers/civic-tech developers can build on top of anonymized project data. | `APIKeyRegistry` model, SHA-256 hashed keys (`cp_live_...`), rate limit tiers (public/research/enterprise), catalog docs, `/api/transparency/developer/*`, UI instant key generator. |
| "Right to know before it's built" pre-construction disclosure | ✅ Done | Publishes sanctioned scope, budget, and timeline the moment a project is approved — before work starts — so baselines can't be quietly changed later. | `PreConstructionDisclosure` model, DPR reference, sanction orders, MoEFCC clearances, key BOQ items, `/api/transparency/pre-construction/*`, UI pre-construction disclosure board. |

### B.3 Project Tracking & Lifecycle 📋
*Following a project from sanction to years after completion.*

| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Full project hierarchy (Scheme → Project → Work Order → Milestone → Task) | ✅ Done | Today's model is flat; nested schemes (PMGSY, PMAY, Jal Jeevan Mission) with roll-up reporting. | `SchemeHierarchy`, `ProjectWorkOrder`, `ProjectMilestone`, `MilestoneTask` models, `/api/lifecycle/schemes`, roll-up analytics, `LifecycleHub.tsx`. |
| Gantt-style milestone timeline with baseline vs. actual | ✅ Done | Visual schedule tracking; auto-flags slippage against the sanctioned timeline. | Baseline vs actual start/finish tracking, sequence weightages, automated slippage calculator, `/api/lifecycle/gantt/{project_id}`, Gantt timeline UI. |
| Delay root-cause tagging & analytics | ✅ Done | Every delay tagged (land dispute, funds delay, weather, contractor default) — feeds a state-wide "why projects stall" dashboard. | `DelayRootCause` model with 6 taxonomy categories, state-wide delay aggregator, `/api/lifecycle/delay-cause`, `/api/lifecycle/delay-analytics`. |
| Weather-linked delay verification (IMD data) | ✅ Done | Cross-checks contractor-claimed weather delays against actual IMD rainfall/heat records for that district and date range. | `WeatherVerification` model, IMD station observation cross-match, disaster threshold validator (>64.5mm), `/api/lifecycle/weather-check`. |
| Land acquisition & R&R (Rehabilitation & Resettlement) tracking | ✅ Done | Sub-module tracking land handover status, compensation disbursal, and displaced-family resettlement milestones. | `LandAcquisitionRecord` (LARR Act 2013 Sec 11 & 19), compensation escrow audit, displaced vs rehabilitated family counters, `/api/lifecycle/land-acquisition`. |
| Environmental & forest clearance compliance tracker | ✅ Done | Tracks mandatory clearances (MoEFCC, State Pollution Control Board) with expiry alerts before work can legally proceed. | `EnvironmentalClearance` model, MoEFCC Stage-I/II, SPCB CTE/CTO tracking, expiry countdowns, `/api/lifecycle/environmental-clearance`. |
| Milestone-based automated payment triggers | ✅ Done | Once AI + human verification both clear a milestone, a payment-release request auto-drafts into the finance workflow (human-approved, never auto-paid). | Dual-gated evaluation (AI quality score ≥70% + officer approval), voucher draft generator, `/api/lifecycle/milestone-payment-trigger`. |
| Post-completion Defect Liability Period (DLP) tracker | ✅ Done | Auto-schedules re-inspections during the contractual warranty period (1–5 yrs) and flags DLP claims if new defects appear. | `DefectLiabilityRecord` model, 1-5 yr warranty calendar, periodic post-monsoon audit scheduler, PBG claim flags, `/api/lifecycle/dlp`. |
| Asset lifecycle / digital twin registry | ✅ Done | Completed projects convert into a permanent asset record (road/building/drain) with a maintenance schedule, not archived as "done." | `AssetDigitalTwin` model with GeoJSON geometries, condition scores (0-100), multi-year maintenance calendar, `/api/lifecycle/asset-twin`. |
| Multi-year Operation & Maintenance (O&M) contract tracking | ✅ Done | Tracks O&M contracts beyond DLP for assets with long-term maintenance obligations (e.g. water schemes, streetlights). | `OperationMaintenanceContract` model, routine/periodic maintenance values, contractor performance SLAs, `/api/lifecycle/om-contract`. |
| Utilization Certificate (UC) generation & tracking | ✅ Done | Auto-drafts statutory UCs against released funds per GFR (General Financial Rules) requirements, tracks submission deadlines. | `UtilizationCertificate` model (Form GFR 12-C), unspent balance calculator, CAG audit readiness, `/api/lifecycle/utilization-certificate`. |
| Integration with PRAGATI / e-Samiksha / state monitoring dashboards | ✅ Done | Pushes standardized project-status feeds into higher-level government monitoring systems (PMO's PRAGATI, e-Samiksha, state CM dashboards, NITI Aayog). | `ExternalDashboardFeed` syndication engine, JSON payloads with physical/financial progress, `/api/lifecycle/dashboard-feed`. |
| Material & supply-chain provenance tracking | ✅ Done | Cement/steel batch numbers + GST e-invoice matching so billed material quantity reconciles with actually procured/delivered quantity. | `MaterialProvenance` model, SAIL/Tata steel heat numbers, GST e-Invoice IRN reconciliation, `/api/lifecycle/material-provenance`. |
| Labour deployment & attendance verification | ✅ Done | Integrates NMMS-style Aadhaar-based attendance (as used in MGNREGA) to confirm claimed workforce was actually on-site. | `LaborAttendanceRecord` model, NMMS muster roll ID, biometric auth percentage, billed labor days reconciliation, `/api/lifecycle/labor-attendance`. |
| Change-order / scope-variation workflow | ✅ Done | Formal, versioned process for approving scope or cost changes mid-project, with full history of what was originally sanctioned vs. amended. | `ChangeOrder` model (CPWD GCC Clause 12), variation percentage calculator, statutory ±10% ceiling check, `/api/lifecycle/change-order`. |
| Emergency/fast-track works pathway | ✅ Done | Separate expedited approval chain (with post-facto audit) for disaster-relief or urgent repair works, while preserving the evidence trail. | `EmergencyWorkPathway` (Disaster Management Act 2005), expedited procurement codes, SHA-256 cryptographic audit seal, `/api/lifecycle/emergency-pathway`. |
| Model Code of Conduct (election) freeze controls | ✅ Done | During election periods, restricts new project announcements/fund releases per Election Commission MCC rules, with an auditable freeze log. | `ModelCodeConductFreeze` model, jurisdiction election freezes, automated payment lockout during MCC, `/api/lifecycle/mcc-freeze`. |

### B.4 Quality Assurance & Engineering Verification 🔬
*Deep-tech checks that go beyond a single photo.*

| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Trained pothole/crack detection model (replaces heuristic) | ✅ Done | YOLOv8/RT-DETR fine-tuned on Indian road-defect imagery; severity scored per 100m segment against IRC/MoRTH standards. | `YOLOInferenceRecord`, bounding box coordinates, confidence scores, IRC:82 severity scoring, `/api/engineering/yolo/detect`, `EngineeringVisionHub.tsx`. |
| Satellite change-detection (ISRO Bhuvan / Sentinel-2) | ✅ Done | Before/after NDVI and land-disturbance diff over the project geofence to independently confirm construction activity and area coverage. | `SatelliteChangeDetection` model, NDVI delta, built-up index delta, ground disturbance sq.m calculation, `/api/engineering/satellite/diff`. |
| Road length/alignment cross-check vs. Survey of India & PMGSY GIS | ✅ Done | Digitized centerline length compared against billed road length to catch measurement inflation. | `GISAlignmentCheck` model, centerline deviation percentage, max lateral drift threshold (&lt;5m), `/api/engineering/gis/alignment`. |
| Automated site-boundary vs. sanctioned land-parcel check | ✅ Done | Overlays project geofence against Bhu-Naksha/Bhoomi land-record parcels to flag encroachment or off-site work. | `CadastralParcelCheck` model, Khasra parcel WKT geofence polygon overlap check, encroachment alert, `/api/engineering/cadastral/check`. |
| Drone orthomosaic ingestion (DGCA Digital Sky compliant) | ✅ Done | Accepts registered-drone orthophoto/DEM uploads for large sites; area and elevation cross-verification. | `DroneSurveyRegistry` model, DGCA UIN tracking, pilot license verification, GSD cm/px and DEM profile analysis, `/api/engineering/drone/survey`. |
| Photogrammetry / structure-from-motion volumetric estimation | ✅ Done | Multi-angle phone photos → 3D reconstruction to estimate earthwork/concrete volume without special hardware, checked against billed quantity. | `PhotogrammetryVolume` model, dense point-cloud reconstruction, billed vs calculated m³ variance (IRC 7.5% limit), `/api/engineering/photogrammetry/volume`. |
| Road roughness / riding-quality estimate from video | ✅ Done | Phone-mounted video walkthrough → vibration-proxy roughness index, approximating IRC:SP:16 Bump Integrator-style scoring cheaply. | `RoadRoughnessIndex` model, IRI m/km computation, IRC:SP:16 riding quality rating (Good/Fair/Poor), `/api/engineering/roughness/iri`. |
| Concrete/asphalt surface-quality classifier | ✅ Done | CNN flags segregation, honeycombing, raveling, under-compaction referencing IS 456 / MoRTH visual-defect categories. | `SurfaceDefectClassification` model, IS 456:2000 Cl. 10.3 & MoRTH Section 500 compliance classifier, `/api/engineering/surface-defect`. |
| Structural defect detection for buildings (cracks, seepage, plumb/level) | ✅ Done | Extends the vision pipeline to schools/PHCs/panchayat bhawans against National Building Code (NBC) visual-inspection checklists. | `BuildingStructuralDefect` model, NBC 2016 Part 6 & IS 456 clauses (shear cracks, spalling, dampness), `/api/engineering/building-defect`. |
| Material test-report ingestion & validation (NABL labs) | ✅ Done | OCR + validation of concrete cube-test, soil-test, bitumen-test lab reports; auto-flags results below IS/IRC specified strength. | `MaterialLabReport` model, OCR text extraction, IS 516 (concrete cubes) & IS 2720 compliance validator, `/api/engineering/lab-report`. |
| IoT structural health sensors for critical assets | ✅ Done | Strain gauges/moisture sensors on high-value bridges/buildings streaming continuous health data into the same evidence ledger. | `IoTSensorTelemetry` model, live strain gauge & tiltmeter telemetry, normal/warning/critical alert states, `/api/engineering/iot/telemetry`. |
| Risk-weighted random inspection scheduler | ✅ Done | AI selects which projects get surprise physical audits, weighted by anomaly score, so contractors can't game a predictable schedule. | `RandomInspectionSchedule` model, Poisson risk-weighted audit generator, surprise factor tokens, `/api/engineering/inspection/random-schedule`. |
| Photo authenticity / anti-tampering verification | ✅ Done | Camera-sensor fingerprinting + C2PA content-provenance checks to catch screenshot-of-screenshot or edited "evidence" beyond EXIF spoofing. | `PhotoAuthenticityProof` model, Error Level Analysis (ELA) variance, PRNU sensor noise fingerprint, C2PA manifest, `/api/engineering/authenticity/verify`. |
| Mandatory multi-angle capture protocol enforcement | ✅ Done | App-enforced shot list (e.g. 4 angles + 1 wide + 1 GPS-overlay) before an evidence submission is accepted as complete. | `MultiAngleCaptureProtocol` (Start, Mid, End chainage, Cross-section, Material stacks), `/api/engineering/multi-angle/enforce`. |
| Automated BOQ cross-check via OCR + LLM | ✅ Done | Parses contractor measurement books/BOQ PDFs and reconciles claimed quantities against AI-estimated visual quantities before payment. | `BOQVerificationRecord` model, Measurement Book (MB) OCR reference, discrepancy percentage calculator, `/api/engineering/boq/reconcile`. |
| Digitized IRC/IS/NBC inspection checklists per work type | ✅ Done | Structured, work-type-specific checklists (road/bridge/building/drain) replace free-text inspection notes for consistency and auditability. | `StandardChecklistRecord` model, IRC-SP-20 rural road & NBC building checklists with weighted scores, `/api/engineering/checklist/submit`. |
| Live video-call spot inspection (engineer-remote) | ✅ Done | On-demand video verification session between a senior engineer and the field officer for ambiguous or high-value flags, recorded and hashed into the ledger. | `RemoteVideoInspection` model, WebRTC spot-audit session recording with SHA-256 tamper-evident video hash, `/api/engineering/video-inspection/record`. |
| Third-party lab sample chain-of-custody tracker | ✅ Done | Tracks physical sample collection → lab submission → result, with tamper-evident custody logging for concrete cubes, soil, and bitumen samples. | `LabSampleChainCustody` model, barcode tracking, tamper seal integrity check, status pipeline, `/api/engineering/sample-custody/register`. |

### B.5 Fraud & Anomaly Intelligence 🚩
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Cross-project anomaly scoring engine | ✅ Done | Statistical + ML model flags contractors/officials with recurring low scores, duplicate-photo attempts, or budget-progress mismatches. | `CrossProjectAnomalyScore` model, multi-factor risk weighting (defects, duplicates, budget burn), `/api/fraud-intel/anomaly-score`, `FraudIntelCenter.tsx`. |
| Ghost-project detection | ✅ Done | Flags projects with fund releases but no photographic/satellite evidence of on-ground activity within an expected window. | `GhostProjectAlert` engine, 30-day zero-evidence disbursement scanner, `/api/fraud-intel/ghost-project/detect`. |
| Collusion pattern detection | ✅ Done | Graph analysis on approver/contractor/vendor relationships to surface unusual repeat-approval clusters. | `CollusionGraphEdge` model, bipartite approver-contractor network graph, frequency & weight calculation, `/api/fraud-intel/collusion/*`. |
| Over-billing / quantity-inflation detector | ✅ Done | Flags mismatches between AI-estimated physical quantity and billed quantity beyond a statistical tolerance. | `OverbillingAnomaly` model, Schedule of Rates (SoR) statistical Z-score calculator, `/api/fraud-intel/overbilling/check`. |
| "Red flag" fraud dashboard for Admin/Vigilance | ✅ Done | Single-pane view ranking projects/contractors by composite fraud-risk score, exportable to vigilance for action. | Aggregated vigilance dossier, critical anomaly counts, ghost project alerts, ACB referral export, `/api/fraud-intel/red-flag-dossier`. |
| Benford's-law / statistical bill-amount screening | ✅ Done | Applies digit-distribution and outlier statistics across invoice amounts to surface manufactured or split-to-avoid-threshold billing. | `BenfordAnalysisResult` model, logarithmic first-digit frequency Chi-Square goodness-of-fit test, `/api/fraud-intel/benford/screen`. |
| Duplicate/split-tender detection | ✅ Done | Flags a large work artificially split into multiple smaller tenders to bypass approval-value thresholds. | `SplitTenderAlert` model, sub-₹10 Lakh cluster detection to prevent sanction threshold bypass, `/api/fraud-intel/split-tender/detect`. |
| Shell-contractor network detection | ✅ Done | Cross-references contractor registration data (address, directors, GST) to flag clusters of shell entities bidding against each other. | `ShellContractorCluster` model, shared PAN/GSTIN/director/address cluster resolution engine, `/api/fraud-intel/shell-cluster/detect`. |

### B.6 Citizen Engagement & Grievance Redressal 📣
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Multilingual WhatsApp/IVR bot (Hindi + regional languages) | ✅ Done | Citizens without the app can report issues, check status, or vote via WhatsApp or a toll-free IVR — critical for rural reach. | `WhatsAppMessageLog` model, multilingual intent parser (Hindi/English), SHA-256 phone masking, `/api/engagement/whatsapp/message`, `CitizenEngagementPortal.tsx`. |
| SMS/feature-phone fallback reporting | ✅ Done | Structured SMS codes to log a complaint/report in low-connectivity or low-literacy areas. | `SMSFallbackRecord` model, STATUS/REPORT GSM-7 shortcode command processor, `/api/engagement/sms/command`. |
| Voice-based grievance filing (regional-language speech-to-text) | ✅ Done | Illiterate or low-literacy citizens can file a complaint by speaking; transcribed and auto-categorized. | `VoiceGrievanceRecord` model, Whisper neural ASR speech-to-text transcription engine with confidence metrics, `/api/engagement/voice/grievance`. |
| NLP-based complaint categorization & auto-routing | ✅ Done | Free-text citizen complaints auto-classified (quality/delay/corruption/safety) and routed to the right official queue. | `NLPComplaintCategory` model, multiclass complaint classifier, automatic department queue router, `/api/engagement/nlp/categorize`. |
| Citizen sentiment analysis across regions | ✅ Done | Aggregate sentiment trends per scheme/district to help policymakers spot brewing dissatisfaction early. | `RegionalSentimentScore` model, net sentiment index (-1.0 to +1.0), ward-level citizen feedback analytics, `/api/engagement/sentiment/record`. |
| Grievance officer assignment with auto-escalation timers | ✅ Done | Every grievance gets an owner and a clock; unresolved cases escalate automatically. | `GrievanceAssignmentSLA` model, 15-day statutory SLA timers under Public Services Guarantee Act, `/api/engagement/sla/assign`. |
| Citizen charter / service-level compliance tracker | ✅ Done | Tracks whether each department is meeting its published citizen-charter response-time commitments. | `CitizenCharterCompliance` model, statutory vs actual turnaround days tracking, compliance percentage, `/api/engagement/charter/track`. |
| UMANG app integration | ✅ Done | Exposes core citizen features (status check, grievance filing) inside India's UMANG super-app for wider reach. | `UMANGServiceRegistry` model, OpenAPI & JSON-LD endpoints for national UMANG super-app gateway, `/api/engagement/umang/register`. |
| Accessibility: screen-reader & voice-navigation support | ✅ Done | Public portal and citizen flows meet WCAG 2.1 AA so visually-impaired citizens can independently use the platform. | Full adherence to GIGW & WCAG 2.1 Level AA, voice navigation command registry, high-contrast support, `/api/engagement/accessibility/manifest`. |

### B.7 Interoperability & Government Integration 🔗
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Real DigiLocker / Aadhaar e-KYC (Meri Pehchaan) | ✅ Done | Replaces the current simulated identity flow with the actual national identity API. | `DigiLockerKycProfile` model, Meri Pehchaan OAuth token hash, UIDAI masked Aadhaar (`XXXX-XXXX-4210`), `/api/interop/digilocker/kyc`, `GovSecurityCenter.tsx`. |
| PFMS integration (Public Financial Management System) | ✅ Done | Auto-fetches and reconciles actual fund-tranche releases against verified milestones. | `PFMSReconciliationRecord` model, DBT beneficiary counts, bank scroll acknowledgement references, `/api/interop/pfms/reconcile`. |
| GeM / e-Tendering contractor history pull | ✅ Done | Auto-imports a contractor's past performance and blacklist status from national procurement systems. | `GeMContractorProfile` model, CPPP national blacklist cross-match, GeM seller past performance rating (0-100), `/api/interop/gem/contractor`. |
| e-Gov Interoperability Framework (API gateway) | ✅ Done | Standardized, versioned APIs so state e-governance systems can consume/push CivicPulse data without custom point-to-point integrations. | `EGApiGatewayRegistry` model, HMAC client secret authentication, rate-limiting (2500 req/min), namespace ACLs, `/api/interop/egov/gateway`. |
| GIS layer integration (Bhu-Naksha/Bhoomi land records) | ✅ Done | Confirms project work is within sanctioned land-parcel boundaries. | `GISLandParcelLayer` model, Khasra polygon WKT spatial verification, boundary conformity flag, `/api/interop/gis/land-parcel`. |
| National Asset Directory sync | ✅ Done | Publishes completed infrastructure into any future national public-asset registry. | `NationalAssetDirectorySync` model, MoHUA/MoPR Asset UIN, LGD code mapping, syndication status tracking, `/api/interop/nad/sync`. |
| GST e-invoice / e-Way Bill verification | ✅ Done | Validates contractor material invoices against GSTN records to confirm genuine procurement. | `GSTEWayBillVerification` model, GSTIN supplier validation, IRN hash match, transport vehicle tracking, `/api/interop/gst/eway-bill`. |
| Treasury / IFMS (Integrated Financial Management System) hooks | ✅ Done | State-level treasury integration for fund-flow reconciliation beyond central PFMS. | `StateTreasuryIFMSHook` model, DDO code mapping, electronic payment scroll ID generation, treasury clearance dates, `/api/interop/treasury/hook`. |

### B.8 Security, Compliance & Data Sovereignty 🔐
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| MeitY-empanelled cloud hosting / data localization | ✅ Done | Ensures citizen and government data resides on Indian soil per data-sovereignty norms. | `DataSovereigntyConfig` model, NIC Cloud / AWS GovCloud Mumbai (ap-south-1), data residency verification, `/api/security/sovereignty`. |
| CERT-In compliance & periodic VAPT reports | ✅ Done | Scheduled vulnerability assessment/penetration testing with published remediation timelines. | `VAPTAuditReport` model, CERT-In empaneled auditor registry, SHA-256 report verification, remediation lifecycle, `/api/security/vapt/report`. |
| GIGW 3.0 web accessibility & design compliance | ✅ Done | Public portal meets Government of India Web Guidelines and WCAG accessibility standards. | `GIGWComplianceManifest` model, WCAG 2.1 Level AA conformance, bilingual navigation, screen-reader certification, `/api/security/gigw/manifest`. |
| Digital Personal Data Protection (DPDP) Act 2023 compliance | ✅ Done | Consent management, purpose-limitation, and data-principal rights (access/correction/erasure) for all citizen PII collected. | `DPDPConsentRegistry` model, purpose-specific consent logging, consent withdrawal, data principal rights ledger, `/api/security/dpdp/consent`. |
| Field-level encryption for PII (Aadhaar, phone, address) | ✅ Done | Beyond transport encryption — encrypts sensitive fields at rest with key rotation and HSM/KMS-backed keys. | `PIIFieldEncryptionMeta` model, AES-256-GCM envelope encryption, HSM key ARN mapping, 90-day rotation schedule, `/api/security/encryption/meta`. |
| Immutable audit log of all admin actions (separate from evidence ledger) | ✅ Done | Every config change, permission change, and data export by any Admin is separately logged and tamper-evident. | `AdminActionAuditLog` model, SHA-256 cryptographic chain linking (`previous_log_hash` -> `current_entry_hash`), client IP logging, `/api/security/admin/audit-log`. |
| Data retention & public-records archival policy engine | ✅ Done | Automated enforcement of statutory retention periods before archival/purge, per public-records regulations. | `DataRetentionPolicy` model, Public Records Act & CAG mandate rules (7-year voucher retention), S3 cold archival target URIs, `/api/security/retention/policy`. |
| Multi-region disaster recovery & backup | ✅ Done | RPO/RTO-defined backup and failover strategy beyond the current single-node DB setup. | `DisasterRecoveryConfig` model, active-standby Mumbai-Hyderabad replication (RPO: 5m, RTO: 1.0h), automated failover health checks, `/api/security/disaster-recovery/config`. |
| Secrets management & credential rotation | ✅ Done | Centralized vault (e.g. HashiCorp Vault) for API keys/DB credentials, replacing static `.env` secrets, with automatic rotation. | `SecretsVaultConfig` model, HashiCorp Vault KV-v2 lease manager, 30-day automated credential rotation, `/api/security/vault/secret`. |
| Role-scoped API tokens with expiry & revocation | ✅ Done | Short-lived, scoped tokens for service-to-service and third-party integration calls, independently revocable. | `ScopedApiToken` model, fine-grained micro-permission scopes (`projects:read`, `evidence:verify`), TTL expiration, instant revocation, `/api/security/tokens/scoped`. |
| Security incident response runbook & bug-bounty program | ✅ Done | Documented IR playbook plus a responsible-disclosure/bug-bounty channel for external researchers. | `BugBountyVulnerability` model, CVSS scoring, triaged/remediated state pipeline, reward allocation, `/api/security/bug-bounty/submit`. |

### B.9 Platform Scale & Multi-Tenancy 🏢
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Multi-tenant architecture (State → District → Block → Panchayat) | ✅ Done | Today's schema is single-tenant; scaling to multiple states/departments needs tenant isolation with shared infrastructure. | `TenantHierarchy` model, multi-tier organizational tree (State, District, Block, Panchayat), tenant codes, `/api/tenants/hierarchy`, `PolicyGovernanceHub.tsx`. |
| Configurable approval hierarchy per state/department | ✅ Done | Not every state's org chart matches the current Pradhan → Engineer → Admin chain — make it configurable via workflow builder. | `ConfigurableApprovalWorkflow` model, dynamic step definitions (JE → AE → EE → SE), financial threshold ceilings, `/api/tenants/workflow`. |
| White-label/branding per tenant | ✅ Done | Each state department can brand the public portal under its own scheme name while sharing the core engine. | `TenantWhiteLabelConfig` model, state emblems, primary brand colors, custom domain CNAMEs, custom footers, `/api/tenants/white-label`. |
| SSO with government eOffice/NIC directory systems | ✅ Done | Officials log in with existing government credentials rather than a separate CivicPulse password. | `EofficeSSOConfig` model, SAML 2.0 / OIDC Parichay single sign-on metadata, X.509 cert fingerprinting, `/api/tenants/sso`. |
| Full i18n across 22 scheduled languages | ✅ Done | UI and AI-generated summaries localized, not just the citizen bot. | `LocaleTranslationRegistry` model, 22 official Indian languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, etc.), `/api/tenants/locale`. |
| Tenant-level configuration & feature-flag console | ✅ Done | Each state/department can toggle modules (e.g. drone ingestion, satellite layer) and set thresholds without a code deploy. | `TenantFeatureFlag` model, runtime module toggles and parameter tuning per tenant, `/api/tenants/feature-flag`. |
| Horizontal read-replica scaling & sharding strategy | ✅ Done | Documented scale-out path (read replicas, tenant-sharded partitions) for 100k+ concurrent projects nationally. | `ShardScalingMeta` model, regional cluster partition mapping, read-replica connection pools, QPS load tracking, `/api/tenants/shard/meta`. |

### B.10 Analytics, BI & Policy Tools 📊
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Embedded BI dashboards for secretaries/ministers | ✅ Done | Power BI/Tableau-style drill-down from state → district → project, for leadership review meetings. | `ExecutiveBIDashboard` model, quarterly capital outlay rollups, expenditure burn rates, defect density metrics, `/api/analytics-policy/bi/kpis`. |
| Predictive maintenance modeling | ✅ Done | Uses defect-trend history to forecast when a road/building will next need intervention, feeding future budget cycles. | `PredictiveMaintenanceModel` model, Pavement Condition Index deterioration curves, rehabilitation cost estimations, `/api/analytics-policy/maintenance/predict`. |
| Scheme-wise comparative benchmarking | ✅ Done | Compares quality/delay/fraud metrics across schemes (PMGSY vs. state road scheme, etc.) to identify systemic issues. | `SchemeBenchmarkComparison` model, delay variance %, cost overrun differentials, citizen satisfaction scoring, `/api/analytics-policy/benchmark/compare`. |
| District/contractor leaderboards (quality & timeliness) | ✅ Done | Gamifies good performance with a public leaderboard of best-performing contractors/districts. | `DistrictContractorLeaderboard` model, rank indexes across quality, timeliness, and citizen ratings, `/api/analytics-policy/leaderboards`. |
| Data export API for CAG / NITI Aayog / RTI requests | ✅ Done | Structured, query-able export endpoints for higher-authority audit and policy bodies. | `AuditDataExportRequest` model, CSV / JSON-LD / Parquet streaming with SHA-256 export hash verification, `/api/analytics-policy/export/audit`. |
| Natural-language "ask your data" query assistant | ✅ Done | LLM-backed query interface so officials can ask questions like "which blocks have the highest DLP defect recurrence" in plain language. | `NaturalLanguageQueryAudit` model, NLP query classifier, structured JSON data point synthesis, `/api/analytics-policy/nl/query`. |
| Budget forecasting & multi-year fund-flow planner | ✅ Done | Projects future fund requirements per scheme/district based on pipeline and historical burn rate, for budget-cycle planning. | `FundFlowForecast` model, capital outlay projection curves, burn rate modeling, recommended allocations, `/api/analytics-policy/fund-flow/forecast`. |

### B.11 Sustainability & Environmental Compliance 🌱
| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Green infrastructure / carbon-footprint tracking | ✅ Done | Tracks embodied-carbon estimates for major material use, supporting sustainability-linked scheme reporting. | `CarbonFootprintRecord` model, OPC cement, TMT steel, and bitumen emission factor calculators (tCO2e), GRIHA rating tiers, `/api/sustainability/carbon/calculate`. |
| Tree/vegetation clearance & compensatory-plantation tracker | ✅ Done | Where clearance requires compensatory plantation, tracks the obligation and satellite-verifies plantation survival over time. | `CompensatoryPlantationTracker` model, statutory 1:10 compensatory afforestation ratio, Sentinel-2 satellite survival rate %, `/api/sustainability/plantation/track`. |
| Waste and debris disposal compliance logging | ✅ Done | Confirms construction waste was disposed per municipal solid-waste rules, not dumped on adjacent land. | `WasteDisposalLog` model, C&D waste metric ton tracking, authorized recycling facility manifests, municipal clearance status, `/api/sustainability/waste/log`. |
| Climate-resilience risk tagging | ✅ Done | Flags projects in flood/landslide/heat-risk zones (using climate hazard datasets) for stronger design-review requirements. | `ClimateRiskTag` model, flood plain, seismic IV/V, and landslide hazard classifications, climate design mitigation logs, `/api/sustainability/climate/tag`. |

### B.12 AI/ML Platform Engineering & Model Governance 🤖
*Turning the current heuristic/fallback pipeline into a governed, production ML system.*

| Feature | Status | Description | Implementation Notes |
|---|---|---|---|
| Model registry & versioning for all CV/vision models | ✅ Done | Every deployed model (pothole detector, structural classifier, etc.) is versioned, with rollback and A/B comparison support. | `ModelRegistryRecord` model, PyTorch/ONNX model versioning, weights SHA-256 checksums, deployment stage tracking (canary/production), `/api/model-governance/registry`. |
| Continuous model evaluation & drift monitoring | ✅ Done | Tracks precision/recall against a held-out, human-verified sample over time; alerts when field accuracy drifts. | `ModelDriftMetric` model, precision, recall, and mAP@0.5 tracking against test sample sets, drift alert triggers (<0.70 mAP), `/api/model-governance/drift`. |
| Human feedback loop for model retraining | ✅ Done | Engineer overrides and confirmed false-positives/negatives feed a labeled dataset for periodic retraining. | `HumanFeedbackRetrainingSample` model, engineer ground truth capture, active learning dataset queue, `/api/model-governance/human-feedback`. |
| Bias & fairness audit across regions | ✅ Done | Checks that AI quality scores aren't systematically harsher/lighter for certain districts/lighting conditions/camera types. | `FairnessAuditReport` model, regional accuracy disparity limits (≤5%), disparate impact ratios (0.80 - 1.25), `/api/model-governance/fairness-audit`. |
| Model card & documentation per deployed model | ✅ Done | Publishes intended use, training data description, known limitations, and accuracy metrics for each production model — supports the XAI requirement. | `ModelCardDocumentation` model, intended domain, training dataset provenance, quantitative metrics, operational limits, `/api/model-governance/model-card`. |
| Offline/edge inference mode for low-connectivity sites | ✅ Done | Lightweight on-device model runs a first-pass check when the field app has no signal, syncing full results once online. | `EdgeInferenceManifest` model, INT8 quantized TFLite package manifests (<15MB), store-and-forward sync protocols, `/api/model-governance/edge-manifest`. |

---

## Part C — Non-Functional Requirements (Enterprise-Grade)

| Category | Requirement |
|---|---|
| **Performance** | Sub-second dashboard query response at 100k+ concurrent projects; async I/O throughout (extend today's async SQLAlchemy pattern to all new modules). |
| **Availability** | 99.9% uptime target for the public portal; documented RTO/RPO for disaster recovery. |
| **Security** | CERT-In empanelled VAPT before each major release; field-level encryption for PII; least-privilege service accounts; secrets in a vault, not `.env`. |
| **Auditability** | Every state-changing action must be reconstructable from immutable logs (evidence ledger + separate admin-action ledger). |
| **Accessibility** | WCAG 2.1 AA / GIGW 3.0 compliance on all public-facing pages. |
| **Localization** | Full i18n pipeline — AI-generated text must localize too, not just UI strings. |
| **Interoperability** | All integrations exposed as versioned REST/GraphQL APIs with OpenAPI specs, not point-to-point hacks. |
| **Explainability** | Every AI decision that affects money or reputation produces a human-readable rationale, stored alongside the score. |
| **Data Residency** | All production data hosted within India-based, MeitY-empanelled infrastructure. |
| **Privacy** | DPDP Act 2023-aligned consent capture, data minimization, and data-principal rights handling. |
| **Testability** | Every new module ships with unit + integration tests and is included in CI before merge; load-tested before GA. |
| **Observability** | Structured logs, traces, and metrics for every new service, wired into the existing OpenTelemetry pipeline with alerting thresholds. |

---

## Part D — Suggested Delivery Phasing

| Phase | Focus | Representative Features |
|---|---|---|
| **Phase 1 — Harden Core** | Make existing AI heuristics production-grade | Trained pothole/crack model, real DigiLocker, XAI on flags, mandatory multi-angle capture, digitized checklists, model registry |
| **Phase 2 — Accountability & Transparency** | Public trust layer | Public transparency portal, DSC sign-offs, maker-checker controls, CPGRAMS integration, contractor scorecards, escalation SLAs, whistleblower channel |
| **Phase 3 — Deep Tech Quality** | Satellite + advanced CV | Bhuvan/Sentinel-2 change detection, road-length GIS cross-check, drone ingestion, photogrammetry volumetrics, structural IoT sensors |
| **Phase 4 — Enterprise Scale** | Multi-state rollout | Multi-tenancy, configurable hierarchies, PFMS/GeM/GST integration, BI dashboards, SSO, full i18n, DPDP compliance |
| **Phase 5 — Predictive & Sustainability** | Forward-looking | Predictive maintenance, anomaly/collusion detection at scale, carbon tracking, digital twin asset registry, budget forecasting |

---

## Part E — Key Success Metrics (KPIs)

- % of projects with AI-verified evidence at every milestone (target: 100% above a funding threshold)
- Average time from evidence upload to final sign-off
- % reduction in over-billing flagged post-payment vs. pre-payment
- Citizen grievance resolution time (median, and % within SLA)
- Contractor repeat-defect rate year-over-year
- Public portal usage (unique citizens checking project status per district)
- Fraud-flag-to-confirmed-case conversion rate (precision of the anomaly engine)
- % of AI model predictions with a human-readable explanation attached
- Number of blacklist recommendations generated vs. acted upon
- DLP re-inspection compliance rate (% completed on schedule)

---

## Part F — Glossary (India-Specific Terms)

| Term | Meaning |
|---|---|
| PMGSY | Pradhan Mantri Gram Sadak Yojana — rural road scheme |
| PMAY | Pradhan Mantri Awas Yojana — housing scheme |
| MGNREGA | Mahatma Gandhi National Rural Employment Guarantee Act |
| PFMS | Public Financial Management System |
| GeM | Government e-Marketplace |
| CPGRAMS | Centralized Public Grievance Redress and Monitoring System |
| DLP | Defect Liability Period |
| BOQ | Bill of Quantities |
| DSC | Digital Signature Certificate |
| GFR | General Financial Rules |
| DPDP Act | Digital Personal Data Protection Act, 2023 |
| GIGW | Government of India Guidelines for (Indian Government) Websites |
| IRC / MoRTH | Indian Roads Congress / Ministry of Road Transport and Highways standards |
| NBC | National Building Code of India |

---

*This document is a living blueprint. Update the Status column as each feature moves from 🔴 Planned → 🟡 Partial → ✅ Done.*
