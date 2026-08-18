# Security Policy 🔒

## Supported Versions

Security updates are actively applied to the following versions of CivicPulse:

| Version | Supported | Notes |
| --- | --- | --- |
| 1.0.x | ✅ Yes | Current Stable Release |
| < 1.0.0 | ❌ No | Legacy Development Builds |

---

## Reporting a Vulnerability

If you discover a security vulnerability within CivicPulse, please report it privately to our team. 

Please **do not** open a public GitHub issue for security disclosures.

### Reporting Procedure:
1. Send an email to **security@civicpulse.gov.in** with the subject: `Vulnerability Report - [Brief Title]`.
2. Include a detailed description of the vulnerability, including:
   - Affected endpoints or components.
   - Step-by-step instructions to reproduce the issue (PoC).
   - Potential impact of exploitation.
3. We will acknowledge receipt of your report within 48 hours and work with you to coordinate a security patch before public disclosure.

---

## Known Security Heuristics in CivicPulse

### 1. Token Rotation & Management
The FastAPI backend uses OAuth2 with Password Flow and JWT bearer tokens. Ensure the `JWT_SECRET_KEY` env variable is rotated regularly in production. Default tokens expire after 24 hours.

### 2. EXIF Location Verification
Geofence verification relies on image metadata (`GPS latitude/longitude`). Keep in mind that EXIF metadata can be stripped (e.g. via chat app optimization) or spoofed. If metadata is missing, the system flags the evidence status as `review`, locking the project from auto-completion until manual technical sign-off by a VDO/Engineer is recorded.

### 3. File Upload Safety
File uploads at `POST /api/projects/{id}/evidence` are restricted to valid image mime-types (JPEG, PNG). All files are hashed and renamed prior to filesystem storage under `backend/uploads/` to prevent directory traversal and arbitrary script execution.
