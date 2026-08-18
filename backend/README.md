# CivicPulse Backend ⚙

FastAPI service handling identity, core domain logic (projects, evidence, votes, approvals), database state (SQLAlchemy), and the Intelligent AI Verification Pipeline.

---

## 🚀 Development Setup

### 1. Requirements
Ensure you have Python 3.10+ installed.

### 2. Setup Virtual Environment
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Database Initialization & Seeding
Create the SQLite database and seed initial schemas and core accounts:
```bash
python -m app.db.seed
```

### 4. Start Server
Run the local dev reload server (runs on port `8000`):
```bash
python -m uvicorn app.main:app --reload --port 8000
```
Interactive Swagger documentation will be available at **http://localhost:8000/docs**.

---

## 🔗 Key API Endpoints

All data routes require a JWT token via the `Authorization: Bearer <token>` header except where noted.

### 🔑 Authentication
- `POST /api/auth/login` (Public) - Authenticate using username (email) and password. Returns token & user object. Form URL encoded.
- `GET /api/auth/me` - Retrieve current user details and permissions.

### 🏗 Projects
- `GET /api/projects` - List all projects.
- `POST /api/projects` (Admin Only) - Create a new public-works project.
- `GET /api/projects/{id}` - Get a single project.

### 📸 Evidence & Verification
- `POST /api/projects/{id}/evidence` (Citizen/Contractor) - Upload progress photo. Triggers the AI pipeline.
- `GET /api/evidence` - List all uploaded evidence records.

### 🗳 Voting & Review
- `POST /api/evidence/{id}/vote` (Citizen Only) - Cast a vote on evidence ("completed" / "incomplete").
- `POST /api/evidence/{id}/review` (Pradhan/Engineer/Admin) - Submit an official approval step.

### 📊 Dashboard & Reports
- `GET /api/dashboard/stats` - Summary KPI stats.
- `GET /api/reports/budget-summary` - Budget vs spend summaries.
- `GET /api/reports/budget-summary.csv` - Export budget data as CSV file.

---

## 🤖 Intelligent AI Pipeline

The pipeline runs on every evidence submission at `POST /api/projects/{id}/evidence`:
1. **EXIF GPS Match:** Validates if the photo's GPS coordinates fall within `GEOFENCE_RADIUS_METERS` of the project location.
2. **Duplicate/pHash Checker:** Rejects image submissions that share matching perceptual hashes with previously uploaded files.
3. **Quality & Completion Heuristics (OpenCV):** Evaluates overall brightness/blurriness, and calculates completion ratios to determine the initial evidence state (`verified` / `pending` / `failed` / `review`).
