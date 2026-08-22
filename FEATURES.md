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
| Pothole / surface-defect detection | 🟡 Partial | Heuristic (box-blur/dark-drop), not a trained model; photo-only, not road-length scans |
| Construction progress estimation | 🟡 Partial | Heuristic, not BOQ/schedule-verified |
| Gemini Vision multimodal inspection | 🟡 Partial | Calls external Gemini REST API with safe local-CV fallback |
| Cryptographic evidence ledger (SHA-256 chain + HMAC + Merkle proof) | ✅ Done | `core/crypto_ledger.py`, verify-chain endpoints in `reviews.py` |

### A.2 Roles, Workflow & Governance
| Feature | Status | Notes |
|---|---|---|
| RBAC: Citizen / Gram Pradhan / VDO-Engineer / Admin | ✅ Done | `core/deps.py`, seeded demo accounts |
| JWT / OAuth2 authentication | ✅ Done | `api/auth.py` |
| Simulated DigiLocker/Aadhaar verification | 🟡 Partial | Simulated OAuth+OTP, not connected to real DigiLocker |
| Simulated MFA email password reset | 🟡 Partial | No real email/SMS gateway |
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
| Offline-capable PWA (IndexedDB store, manifest) | 🟡 Partial | Verify Web Worker/IndexedDB sync coverage end-to-end |
| Docker Compose (dev + prod) | ✅ Done | `docker-compose.yml`, `docker-compose.prod.yml` |
| Background stream consumer (async workers) | ✅ Done | `app/workers/stream_consumer.py` |
| DB session/connection management, maintenance jobs | ✅ Done | `db/session_manager.py`, `db/maintenance.py` |
| Health-check endpoint | ✅ Done | `api/health.py` |

---

## Part B — Enterprise Roadmap (Brainstormed, Organized by Pillar)

### B.1 Accountability 🎯
*Every rupee and every sign-off traceable to a named person, with consequences.*

| Feature | Status | Description |
|---|---|---|
| Digital signature (DSC/eSign) on official sign-offs | 🔴 Planned | Engineers/Pradhans sign approvals with IT Act-compliant DSC/Aadhaar eSign — makes approvals legally admissible, not just password-gated. |
| Personal liability ledger per official | 🔴 Planned | Every approval, override, or AI-flag dismissal is permanently tied to the approving official's ID with a running accountability score. |
| Maker-checker (two-person integrity) rule on financial actions | 🔴 Planned | No single official can both raise and approve a payment-release request; a second, different officer must countersign. |
| Contractor performance scorecard & registry | 🔴 Planned | Historical quality scores, delay record, defect-liability claims per contractor across all projects, visible before new tender award. |
| Automated contractor blacklist trigger | 🔴 Planned | Repeated quality failures/fraud flags beyond a threshold auto-generate a blacklist recommendation packet for the awarding authority. |
| Human-in-the-loop override with mandatory justification | 🔴 Planned | Any override of an AI red flag requires a typed justification, stored immutably and surfaced in audits — prevents silent AI-bypass. |
| Explainable AI (XAI) on every flag | 🔴 Planned | Every AI quality/fraud flag ships with a plain-language reason (e.g. "crack density 34% above IRC threshold") that holds up in a departmental inquiry. |
| CAG / departmental audit export pack | 🔴 Planned | One-click export of a project's full evidence chain, approvals, and AI scores in an auditor-ready bundle (PDF + CSV + hash manifest). |
| Escalation matrix with SLA timers | 🔴 Planned | Un-actioned reviews auto-escalate up the hierarchy (Pradhan → BDO → District Collector) with a logged breach event. |
| Vigilance / Anti-Corruption Bureau referral workflow | 🔴 Planned | High-severity fraud scores route into a formal vigilance-referral case with the full evidence packet attached. |
| Whistleblower / anonymous fraud-reporting channel | 🔴 Planned | Encrypted, identity-stripped submission path for insiders (contractors' staff, junior officials) to report malpractice, with legal-grade chain-of-custody on the tip. |
| Performance bank guarantee (PBG) & security-deposit tracker | 🔴 Planned | Tracks contractor PBG validity, expiry, and auto-flags forfeiture triggers on confirmed default or poor DLP performance. |
| Conflict-of-interest declaration & auto-check | 🔴 Planned | Officials/reviewers declare relationships to contractors; system cross-checks for self-approval or family/business ties before allowing sign-off. |
| Immutable "who changed what" diff view on every record | 🔴 Planned | Human-readable before/after diff for any edited project, budget, or status field, linked to the actor and timestamp. |

### B.2 Transparency 🔍
*Public project data that is open, understandable, and hard to hide.*

| Feature | Status | Description |
|---|---|---|
| Public read-only transparency portal (no login) | 🔴 Planned | Any citizen can search a project by location/scheme and see status, budget, AI quality score, and photos — RTI-friendly by design. |
| Open Contracting Data Standard (OCDS) compliance | 🔴 Planned | Publishes tender, award, and spend data in the OCDS schema for independent analysis and journalism. |
| Real-time budget-vs-spend variance dashboard (public) | 🔴 Planned | Sanctioned amount vs. released tranches vs. AI-estimated physical progress, visually flags over-billing. |
| CPGRAMS integration (Centralized Public Grievance system) | 🔴 Planned | Citizen complaints filed in-app sync bidirectionally with the Government of India's CPGRAMS portal. |
| RTI request intake & statutory-timeline tracker | 🔴 Planned | Citizens can file an RTI request tied to a specific project; system tracks the 30-day statutory response clock. |
| MGNREGA-style social audit module | 🔴 Planned | Scheduled public "social audit" events where a Gram Sabha jointly reviews a project's evidence trail; minutes recorded in-app. |
| Legislative Assembly Question (LAQ) linkage | 🔴 Planned | Projects referenced in assembly questions are tagged so status auto-answers future questions with current verified data. |
| Public star-rating & citizen review per completed project | 🔴 Planned | Post-completion, nearby citizens can rate/review quality, separate from the vote-on-completion mechanism. |
| Auto-generated press/media release on milestone completion | 🔴 Planned | Draft press note auto-created when a project crosses 100% AI-verified completion, for PRO/communications teams. |
| Third-party independent audit agency portal | 🔴 Planned | Empanelled agencies (e.g. IIT/NIT-affiliated) get scoped access to conduct and publish independent spot audits in the same evidence chain. |
| Public corruption/quality heat-map by district | 🔴 Planned | Aggregated, anonymized fraud/defect-rate visualization by geography for policymakers and media. |
| Open data API + developer portal | 🔴 Planned | Rate-limited public API with API keys, docs, and usage dashboards so researchers/civic-tech developers can build on top of anonymized project data. |
| "Right to know before it's built" pre-construction disclosure | 🔴 Planned | Publishes sanctioned scope, budget, and timeline the moment a project is approved — before work starts — so baselines can't be quietly changed later. |

### B.3 Project Tracking & Lifecycle 📋
*Following a project from sanction to years after completion.*

| Feature | Status | Description |
|---|---|---|
| Full project hierarchy (Scheme → Project → Work Order → Milestone → Task) | 🔴 Planned | Today's model is flat; nested schemes (PMGSY, PMAY, Jal Jeevan Mission) with roll-up reporting. |
| Gantt-style milestone timeline with baseline vs. actual | 🔴 Planned | Visual schedule tracking; auto-flags slippage against the sanctioned timeline. |
| Delay root-cause tagging & analytics | 🔴 Planned | Every delay tagged (land dispute, funds delay, weather, contractor default) — feeds a state-wide "why projects stall" dashboard. |
| Weather-linked delay verification (IMD data) | 🔴 Planned | Cross-checks contractor-claimed weather delays against actual IMD rainfall/heat records for that district and date range. |
| Land acquisition & R&R (Rehabilitation & Resettlement) tracking | 🔴 Planned | Sub-module tracking land handover status, compensation disbursal, and displaced-family resettlement milestones. |
| Environmental & forest clearance compliance tracker | 🔴 Planned | Tracks mandatory clearances (MoEFCC, State Pollution Control Board) with expiry alerts before work can legally proceed. |
| Milestone-based automated payment triggers | 🔴 Planned | Once AI + human verification both clear a milestone, a payment-release request auto-drafts into the finance workflow (human-approved, never auto-paid). |
| Post-completion Defect Liability Period (DLP) tracker | 🔴 Planned | Auto-schedules re-inspections during the contractual warranty period (1–5 yrs) and flags DLP claims if new defects appear. |
| Asset lifecycle / digital twin registry | 🔴 Planned | Completed projects convert into a permanent asset record (road/building/drain) with a maintenance schedule, not archived as "done." |
| Multi-year Operation & Maintenance (O&M) contract tracking | 🔴 Planned | Tracks O&M contracts beyond DLP for assets with long-term maintenance obligations (e.g. water schemes, streetlights). |
| Utilization Certificate (UC) generation & tracking | 🔴 Planned | Auto-drafts statutory UCs against released funds per GFR (General Financial Rules) requirements, tracks submission deadlines. |
| Integration with PRAGATI / e-Samiksha / state monitoring dashboards | 🔴 Planned | Pushes standardized project-status feeds into higher-level government monitoring systems (PMO's PRAGATI, e-Samiksha, state CM dashboards, NITI Aayog). |
| Material & supply-chain provenance tracking | 🔴 Planned | Cement/steel batch numbers + GST e-invoice matching so billed material quantity reconciles with actually procured/delivered quantity. |
| Labour deployment & attendance verification | 🔴 Planned | Integrates NMMS-style Aadhaar-based attendance (as used in MGNREGA) to confirm claimed workforce was actually on-site. |
| Change-order / scope-variation workflow | 🔴 Planned | Formal, versioned process for approving scope or cost changes mid-project, with full history of what was originally sanctioned vs. amended. |
| Emergency/fast-track works pathway | 🔴 Planned | Separate expedited approval chain (with post-facto audit) for disaster-relief or urgent repair works, while preserving the evidence trail. |
| Model Code of Conduct (election) freeze controls | 🔴 Planned | During election periods, restricts new project announcements/fund releases per Election Commission MCC rules, with an auditable freeze log. |

### B.4 Quality Assurance & Engineering Verification 🔬
*Deep-tech checks that go beyond a single photo.*

| Feature | Status | Description |
|---|---|---|
| Trained pothole/crack detection model (replaces heuristic) | 🔴 Planned | YOLOv8/RT-DETR fine-tuned on Indian road-defect imagery; severity scored per 100m segment against IRC/MoRTH standards. |
| Satellite change-detection (ISRO Bhuvan / Sentinel-2) | 🔴 Planned | Before/after NDVI and land-disturbance diff over the project geofence to independently confirm construction activity and area coverage. |
| Road length/alignment cross-check vs. Survey of India & PMGSY GIS | 🔴 Planned | Digitized centerline length compared against billed road length to catch measurement inflation. |
| Automated site-boundary vs. sanctioned land-parcel check | 🔴 Planned | Overlays project geofence against Bhu-Naksha/Bhoomi land-record parcels to flag encroachment or off-site work. |
| Drone orthomosaic ingestion (DGCA Digital Sky compliant) | 🔴 Planned | Accepts registered-drone orthophoto/DEM uploads for large sites; area and elevation cross-verification. |
| Photogrammetry / structure-from-motion volumetric estimation | 🔴 Planned | Multi-angle phone photos → 3D reconstruction to estimate earthwork/concrete volume without special hardware, checked against billed quantity. |
| Road roughness / riding-quality estimate from video | 🔴 Planned | Phone-mounted video walkthrough → vibration-proxy roughness index, approximating IRC:SP:16 Bump Integrator-style scoring cheaply. |
| Concrete/asphalt surface-quality classifier | 🔴 Planned | CNN flags segregation, honeycombing, raveling, under-compaction referencing IS 456 / MoRTH visual-defect categories. |
| Structural defect detection for buildings (cracks, seepage, plumb/level) | 🔴 Planned | Extends the vision pipeline to schools/PHCs/panchayat bhawans against National Building Code (NBC) visual-inspection checklists. |
| Material test-report ingestion & validation (NABL labs) | 🔴 Planned | OCR + validation of concrete cube-test, soil-test, bitumen-test lab reports; auto-flags results below IS/IRC specified strength. |
| IoT structural health sensors for critical assets | 🔴 Planned | Strain gauges/moisture sensors on high-value bridges/buildings streaming continuous health data into the same evidence ledger. |
| Risk-weighted random inspection scheduler | 🔴 Planned | AI selects which projects get surprise physical audits, weighted by anomaly score, so contractors can't game a predictable schedule. |
| Photo authenticity / anti-tampering verification | 🔴 Planned | Camera-sensor fingerprinting + C2PA content-provenance checks to catch screenshot-of-screenshot or edited "evidence" beyond EXIF spoofing. |
| Mandatory multi-angle capture protocol enforcement | 🔴 Planned | App-enforced shot list (e.g. 4 angles + 1 wide + 1 GPS-overlay) before an evidence submission is accepted as complete. |
| Automated BOQ cross-check via OCR + LLM | 🔴 Planned | Parses contractor measurement books/BOQ PDFs and reconciles claimed quantities against AI-estimated visual quantities before payment. |
| Digitized IRC/IS/NBC inspection checklists per work type | 🔴 Planned | Structured, work-type-specific checklists (road/bridge/building/drain) replace free-text inspection notes for consistency and auditability. |
| Live video-call spot inspection (engineer-remote) | 🔴 Planned | On-demand video verification session between a senior engineer and the field officer for ambiguous or high-value flags, recorded and hashed into the ledger. |
| Third-party lab sample chain-of-custody tracker | 🔴 Planned | Tracks physical sample collection → lab submission → result, with tamper-evident custody logging for concrete cubes, soil, and bitumen samples. |

### B.5 Fraud & Anomaly Intelligence 🚩
| Feature | Status | Description |
|---|---|---|
| Cross-project anomaly scoring engine | 🔴 Planned | Statistical + ML model flags contractors/officials with recurring low scores, duplicate-photo attempts, or budget-progress mismatches. |
| Ghost-project detection | 🔴 Planned | Flags projects with fund releases but no photographic/satellite evidence of on-ground activity within an expected window. |
| Collusion pattern detection | 🔴 Planned | Graph analysis on approver/contractor/vendor relationships to surface unusual repeat-approval clusters. |
| Over-billing / quantity-inflation detector | 🔴 Planned | Flags mismatches between AI-estimated physical quantity and billed quantity beyond a statistical tolerance. |
| "Red flag" fraud dashboard for Admin/Vigilance | 🔴 Planned | Single-pane view ranking projects/contractors by composite fraud-risk score, exportable to vigilance for action. |
| Benford's-law / statistical bill-amount screening | 🔴 Planned | Applies digit-distribution and outlier statistics across invoice amounts to surface manufactured or split-to-avoid-threshold billing. |
| Duplicate/split-tender detection | 🔴 Planned | Flags a large work artificially split into multiple smaller tenders to bypass approval-value thresholds. |
| Shell-contractor network detection | 🔴 Planned | Cross-references contractor registration data (address, directors, GST) to flag clusters of shell entities bidding against each other. |

### B.6 Citizen Engagement & Grievance Redressal 📣
| Feature | Status | Description |
|---|---|---|
| Multilingual WhatsApp/IVR bot (Hindi + regional languages) | 🔴 Planned | Citizens without the app can report issues, check status, or vote via WhatsApp or a toll-free IVR — critical for rural reach. |
| SMS/feature-phone fallback reporting | 🔴 Planned | Structured SMS codes to log a complaint/report in low-connectivity or low-literacy areas. |
| Voice-based grievance filing (regional-language speech-to-text) | 🔴 Planned | Illiterate or low-literacy citizens can file a complaint by speaking; transcribed and auto-categorized. |
| NLP-based complaint categorization & auto-routing | 🔴 Planned | Free-text citizen complaints auto-classified (quality/delay/corruption/safety) and routed to the right official queue. |
| Citizen sentiment analysis across regions | 🔴 Planned | Aggregate sentiment trends per scheme/district to help policymakers spot brewing dissatisfaction early. |
| Grievance officer assignment with auto-escalation timers | 🔴 Planned | Every grievance gets an owner and a clock; unresolved cases escalate automatically. |
| Citizen charter / service-level compliance tracker | 🔴 Planned | Tracks whether each department is meeting its published citizen-charter response-time commitments. |
| UMANG app integration | 🔴 Planned | Exposes core citizen features (status check, grievance filing) inside India's UMANG super-app for wider reach. |
| Accessibility: screen-reader & voice-navigation support | 🔴 Planned | Public portal and citizen flows meet WCAG 2.1 AA so visually-impaired citizens can independently use the platform. |

### B.7 Interoperability & Government Integration 🔗
| Feature | Status | Description |
|---|---|---|
| Real DigiLocker / Aadhaar e-KYC (Meri Pehchaan) | 🔴 Planned | Replaces the current simulated identity flow with the actual national identity API. |
| PFMS integration (Public Financial Management System) | 🔴 Planned | Auto-fetches and reconciles actual fund-tranche releases against verified milestones. |
| GeM / e-Tendering contractor history pull | 🔴 Planned | Auto-imports a contractor's past performance and blacklist status from national procurement systems. |
| e-Gov Interoperability Framework (API gateway) | 🔴 Planned | Standardized, versioned APIs so state e-governance systems can consume/push CivicPulse data without custom point-to-point integrations. |
| GIS layer integration (Bhu-Naksha/Bhoomi land records) | 🔴 Planned | Confirms project work is within sanctioned land-parcel boundaries. |
| National Asset Directory sync | 🔴 Planned | Publishes completed infrastructure into any future national public-asset registry. |
| GST e-invoice / e-Way Bill verification | 🔴 Planned | Validates contractor material invoices against GSTN records to confirm genuine procurement. |
| Treasury / IFMS (Integrated Financial Management System) hooks | 🔴 Planned | State-level treasury integration for fund-flow reconciliation beyond central PFMS. |

### B.8 Security, Compliance & Data Sovereignty 🔐
| Feature | Status | Description |
|---|---|---|
| MeitY-empanelled cloud hosting / data localization | 🔴 Planned | Ensures citizen and government data resides on Indian soil per data-sovereignty norms. |
| CERT-In compliance & periodic VAPT reports | 🔴 Planned | Scheduled vulnerability assessment/penetration testing with published remediation timelines. |
| GIGW 3.0 web accessibility & design compliance | 🔴 Planned | Public portal meets Government of India Web Guidelines and WCAG accessibility standards. |
| Digital Personal Data Protection (DPDP) Act 2023 compliance | 🔴 Planned | Consent management, purpose-limitation, and data-principal rights (access/correction/erasure) for all citizen PII collected. |
| Field-level encryption for PII (Aadhaar, phone, address) | 🔴 Planned | Beyond transport encryption — encrypts sensitive fields at rest with key rotation and HSM/KMS-backed keys. |
| Immutable audit log of all admin actions (separate from evidence ledger) | 🔴 Planned | Every config change, permission change, and data export by any Admin is separately logged and tamper-evident. |
| Data retention & public-records archival policy engine | 🔴 Planned | Automated enforcement of statutory retention periods before archival/purge, per public-records regulations. |
| Multi-region disaster recovery & backup | 🔴 Planned | RPO/RTO-defined backup and failover strategy beyond the current single-node DB setup. |
| Secrets management & credential rotation | 🔴 Planned | Centralized vault (e.g. HashiCorp Vault) for API keys/DB credentials, replacing static `.env` secrets, with automatic rotation. |
| Role-scoped API tokens with expiry & revocation | 🔴 Planned | Short-lived, scoped tokens for service-to-service and third-party integration calls, independently revocable. |
| Security incident response runbook & bug-bounty program | 🔴 Planned | Documented IR playbook plus a responsible-disclosure/bug-bounty channel for external researchers. |

### B.9 Platform Scale & Multi-Tenancy 🏢
| Feature | Status | Description |
|---|---|---|
| Multi-tenant architecture (State → District → Block → Panchayat) | 🔴 Planned | Today's schema is single-tenant; scaling to multiple states/departments needs tenant isolation with shared infrastructure. |
| Configurable approval hierarchy per state/department | 🔴 Planned | Not every state's org chart matches the current Pradhan → Engineer → Admin chain — make it configurable via workflow builder. |
| White-label/branding per tenant | 🔴 Planned | Each state department can brand the public portal under its own scheme name while sharing the core engine. |
| SSO with government eOffice/NIC directory systems | 🔴 Planned | Officials log in with existing government credentials rather than a separate CivicPulse password. |
| Full i18n across 22 scheduled languages | 🔴 Planned | UI and AI-generated summaries localized, not just the citizen bot. |
| Tenant-level configuration & feature-flag console | 🔴 Planned | Each state/department can toggle modules (e.g. drone ingestion, satellite layer) and set thresholds without a code deploy. |
| Horizontal read-replica scaling & sharding strategy | 🔴 Planned | Documented scale-out path (read replicas, tenant-sharded partitions) for 100k+ concurrent projects nationally. |

### B.10 Analytics, BI & Policy Tools 📊
| Feature | Status | Description |
|---|---|---|
| Embedded BI dashboards for secretaries/ministers | 🔴 Planned | Power BI/Tableau-style drill-down from state → district → project, for leadership review meetings. |
| Predictive maintenance modeling | 🔴 Planned | Uses defect-trend history to forecast when a road/building will next need intervention, feeding future budget cycles. |
| Scheme-wise comparative benchmarking | 🔴 Planned | Compares quality/delay/fraud metrics across schemes (PMGSY vs. state road scheme, etc.) to identify systemic issues. |
| District/contractor leaderboards (quality & timeliness) | 🔴 Planned | Gamifies good performance with a public leaderboard of best-performing contractors/districts. |
| Data export API for CAG / NITI Aayog / RTI requests | 🔴 Planned | Structured, query-able export endpoints for higher-authority audit and policy bodies. |
| Natural-language "ask your data" query assistant | 🔴 Planned | LLM-backed query interface so officials can ask questions like "which blocks have the highest DLP defect recurrence" in plain language. |
| Budget forecasting & multi-year fund-flow planner | 🔴 Planned | Projects future fund requirements per scheme/district based on pipeline and historical burn rate, for budget-cycle planning. |

### B.11 Sustainability & Environmental Compliance 🌱
| Feature | Status | Description |
|---|---|---|
| Green infrastructure / carbon-footprint tracking | 🔴 Planned | Tracks embodied-carbon estimates for major material use, supporting sustainability-linked scheme reporting. |
| Tree/vegetation clearance & compensatory-plantation tracker | 🔴 Planned | Where clearance requires compensatory plantation, tracks the obligation and satellite-verifies plantation survival over time. |
| Waste and debris disposal compliance logging | 🔴 Planned | Confirms construction waste was disposed per municipal solid-waste rules, not dumped on adjacent land. |
| Climate-resilience risk tagging | 🔴 Planned | Flags projects in flood/landslide/heat-risk zones (using climate hazard datasets) for stronger design-review requirements. |

### B.12 AI/ML Platform Engineering & Model Governance 🤖
*Turning the current heuristic/fallback pipeline into a governed, production ML system.*

| Feature | Status | Description |
|---|---|---|
| Model registry & versioning for all CV/vision models | 🔴 Planned | Every deployed model (pothole detector, structural classifier, etc.) is versioned, with rollback and A/B comparison support. |
| Continuous model evaluation & drift monitoring | 🔴 Planned | Tracks precision/recall against a held-out, human-verified sample over time; alerts when field accuracy drifts. |
| Human feedback loop for model retraining | 🔴 Planned | Engineer overrides and confirmed false-positives/negatives feed a labeled dataset for periodic retraining. |
| Bias & fairness audit across regions | 🔴 Planned | Checks that AI quality scores aren't systematically harsher/lighter for certain districts/lighting conditions/camera types. |
| Model card & documentation per deployed model | 🔴 Planned | Publishes intended use, training data description, known limitations, and accuracy metrics for each production model — supports the XAI requirement. |
| Offline/edge inference mode for low-connectivity sites | 🔴 Planned | Lightweight on-device model runs a first-pass check when the field app has no signal, syncing full results once online. |

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
