# CivicPulse System Walkthrough 🚀

A complete walkthrough of the reorganised, fully functional, API-wired **CivicPulse** project workspace, featuring premium UI/UX enhancements, password controls, and simulated email MFA reset wizards.

---

## 🔒 Key Directory & File Links

### 📁 Project Root
- [CivicPulse Root Folder](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API)

### 📄 Configuration & Infrastructure Files
- [docker-compose.yml](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/docker-compose.yml) — Local multi-container development configuration (with Redis container).
- [docker-compose.prod.yml](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/docker-compose.prod.yml) — Production container orchestration (PostgreSQL database + Redis container integration).
- [Makefile](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/Makefile) — CONCURRENT server startup, dependencies install, and database seeding shortcuts.
- [.gitignore](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/.gitignore) — Multi-environment ignores.
- [.env.example](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/.env.example) — Local environment keys mapping template.

### 📄 High-Level System Documentation
- [README.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/README.md) — Comprehensive root instructions (badges, tech stack, architecture flow, quick start).
- [CONTRIBUTING.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/CONTRIBUTING.md) — Branch policies, conventional commits, pull requests validation.
- [CHANGELOG.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/CHANGELOG.md) — Keep-a-Changelog stable v1.0.0 release.
- [SECURITY.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/SECURITY.md) — Security levels, private reporting protocols, and JWT/EXIF location validation details.
- [CODE_OF_CONDUCT.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/CODE_OF_CONDUCT.md) — Contributor Covenant 2.1 specification.

### ⚙ Backend Service (FastAPI)
- [backend/ README.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/README.md) — Endpoints details, seed rules, and local setup commands.
- [backend/Dockerfile](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/Dockerfile) — Multi-stage cached building instructions.
- [backend/app/main.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/main.py) — Restructured root application script.
- [backend/app/db/database.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/db/database.py) — Restructured SQLAlchemy session creation engine.
- [backend/app/db/models.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/db/models.py) — Database schema models.
- [backend/app/services/ai_pipeline.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/services/ai_pipeline.py) — GPS EXIF extraction and perceptual hash duplicate analysis.
- [backend/app/api/auth.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/api/auth.py) — Simulates Gov DigiLocker OAuth + OTP sync identity check, profile password changes, and simulated MFA email verification password resets.
- [backend/app/core/ratelimit.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/core/ratelimit.py) — Distributed Redis sliding-window rate limit middleware (with local fallback).
- [backend/app/core/logging.py](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/backend/app/core/logging.py) — Structured JSON logging formatter for production cloud observability.

### 🖥 Frontend Client (React)
- [frontend/ README.md](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/README.md) — Directory specifications, build processes, and page layouts.
- [frontend/Dockerfile](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/Dockerfile) — Serves statically built index pages via Nginx proxies.
- [frontend/src/lib/data.ts](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/src/lib/data.ts) — Extracted fetch mapping layers (evidence uploads, citizen votes, review decisions, Aadhaar sync, password edits, simulated MFA code verify).
- [frontend/src/pages/Verifications.tsx](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/src/pages/Verifications.tsx) — Interactive uploads form, citizen auditing panels, and official review chains (integrated with TanStack Query mutations/caching).
- [frontend/src/pages/Settings.tsx](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/src/pages/Settings.tsx) — DigiLocker Aadhaar Verification UI, Consent Pop-up flow, Password view/edit form cards, and Forgot Password MFA modal dialogs.
- [frontend/src/index.css](file:///C:/Users/Yash%20Mishra/OneDrive/Desktop/CivicPulse-API/CivicPulse-API/frontend/src/index.css) — Refactored visual styles containing modern Google Font families, ambient background gradients, and premium cyber-card glassmorphic classes.

---

## 🏃 Running URLs

- **Local SPA Client:** [http://localhost:3000/](http://localhost:3000/)
- **FastAPI OpenAPI Document (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
