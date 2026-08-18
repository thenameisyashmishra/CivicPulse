# Changelog 📜

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-18

First production-grade release of the CivicPulse Public Works Monitoring Platform.

### Added
- **Intelligent Verification Engine:** Geofenced GPS/EXIF metadata verification, duplicate detection (perceptual hashing), image quality verification, and structural completion estimation.
- **FastAPI Backend Services:** Comprehensive endpoints for user authorization (JWT OAuth2), project management, evidence uploads, citizen voting, review logs, and dashboard metrics.
- **React Frontend Application:** Modern dashboard using Vite, tailwind-styled components, site map overlay with dynamically scaled project coordinates, project search filters, and analytics trends via Recharts.
- **Robust Role-Based Control:** Dedicated user views and actions for Citizens, Gram Pradhans, VDO/Engineers, and Admins.
- **Production Architecture:** Complete separation of `backend/` and `frontend/` directories with structured internal packages (`api`, `core`, `db`, `services`).
- **Container Infrastructure:** Single-command workspace spin-up using Docker, Docker Compose, and developer-centric Makefile.
