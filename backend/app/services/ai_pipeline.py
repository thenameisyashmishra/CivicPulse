"""
Orchestrates the full evidence-verification pipeline:

  1. EXIF/GPS extraction + geofence check      (services/exif.py, geo.py)
  2. Perceptual-hash duplicate detection        (services/dedupe.py)
  3. Image quality + completion heuristics      (services/vision.py)

...and turns the combined result into the same shape the frontend already
expects (VerificationStatus: verified | pending | failed | review), plus a
findings list and a human-readable analysis summary, mirroring
`src/lib/data.ts` in the CivicPulse frontend.
"""

from dataclasses import dataclass, field
from pathlib import Path

from app.core.config import get_settings
from app.db.models import EvidenceStatus
from app.services import dedupe, vision
from app.services.exif import extract_exif
from app.services.geo import haversine_distance_m

settings = get_settings()

QUALITY_PASS_THRESHOLD = 45.0


@dataclass
class PipelineResult:
    gps_lat: float | None
    gps_lng: float | None
    captured_at: str | None
    distance_from_site_m: float | None
    within_geofence: bool | None
    phash: str
    is_duplicate: bool
    duplicate_of_id: int | None
    quality_score: float
    completion_estimate: float
    ai_confidence: float
    status: EvidenceStatus
    findings: list[str] = field(default_factory=list)
    analysis: str = ""


def run_pipeline(
    image_path: str | Path,
    project_lat: float,
    project_lng: float,
    existing_hashes: list[tuple[int, str]],
) -> PipelineResult:
    findings: list[str] = []

    # 1. GPS / EXIF check
    exif = extract_exif(image_path)
    distance = None
    within_geofence = None
    if exif.has_gps:
        distance = haversine_distance_m(exif.lat, exif.lng, project_lat, project_lng)
        within_geofence = distance <= settings.geofence_radius_meters
        if within_geofence:
            findings.append(f"GPS location confirmed {distance:.0f}m from project site (within boundary)")
        else:
            findings.append(f"GPS location is {distance:.0f}m from project site — outside the {settings.geofence_radius_meters:.0f}m boundary")
    else:
        findings.append("No GPS/EXIF metadata found in image — location could not be verified")

    # 2. Duplicate detection
    phash = dedupe.compute_phash(image_path)
    duplicate_of_id, hamming_distance = dedupe.find_duplicate(phash, existing_hashes)
    is_duplicate = duplicate_of_id is not None
    if is_duplicate:
        findings.append(f"Perceptual hash matches evidence #{duplicate_of_id} (Hamming distance {hamming_distance}) — likely duplicate/reused photo")

    # 3. Quality + completion heuristics
    vis = vision.analyze_evidence_image(image_path)
    if vis["quality_score"] < QUALITY_PASS_THRESHOLD:
        findings.append(f"Image quality below acceptable threshold (score {vis['quality_score']:.0f}/100) — blurry or poorly lit")
    else:
        findings.append(f"Image quality acceptable (score {vis['quality_score']:.0f}/100)")
    findings.append(f"Estimated visual completion: {vis['completion_estimate']:.0f}%")

    # --- Decide overall status ---
    if is_duplicate:
        status = EvidenceStatus.failed
        confidence = 100 - (hamming_distance or 0) * 5  # closer match = more confident it's a duplicate
        analysis = (
            f"REJECTED: This image is a near-duplicate of previously submitted evidence #{duplicate_of_id} "
            f"(perceptual hash distance {hamming_distance}). Duplicate or reused photos cannot be counted as "
            "new proof of progress."
        )
    elif exif.has_gps and not within_geofence:
        status = EvidenceStatus.review
        confidence = 40.0
        analysis = (
            f"FLAGGED FOR REVIEW: Photo GPS coordinates are {distance:.0f}m from the registered project site, "
            f"exceeding the {settings.geofence_radius_meters:.0f}m geofence. This may indicate the photo was "
            "taken elsewhere. A human reviewer should confirm the site location manually."
        )
    elif not exif.has_gps:
        status = EvidenceStatus.review
        confidence = 35.0
        analysis = (
            "FLAGGED FOR REVIEW: No embedded GPS/EXIF data was found in this image, so the capture location "
            "cannot be automatically verified. Common causes: screenshots, messaging-app compression, or "
            "manual metadata stripping. Manual site confirmation is recommended."
        )
    elif vis["quality_score"] < QUALITY_PASS_THRESHOLD:
        status = EvidenceStatus.review
        confidence = round(45 + vis["quality_score"] * 0.3, 1)
        analysis = (
            f"FLAGGED FOR REVIEW: Location verified, but image quality score ({vis['quality_score']:.0f}/100) "
            "is low (blur/exposure). Estimated completion may be unreliable; consider requesting a clearer photo."
        )
    else:
        status = EvidenceStatus.verified
        confidence = round(70 + vis["quality_score"] * 0.25 + (5 if within_geofence else 0), 1)
        confidence = min(confidence, 99.0)
        analysis = (
            f"VERIFIED: GPS location confirmed within project boundary. Image quality score "
            f"{vis['quality_score']:.0f}/100. Estimated visual completion {vis['completion_estimate']:.0f}%. "
            "No duplicate or location issues detected."
        )

    return PipelineResult(
        gps_lat=exif.lat,
        gps_lng=exif.lng,
        captured_at=exif.captured_at,
        distance_from_site_m=round(distance, 1) if distance is not None else None,
        within_geofence=within_geofence,
        phash=phash,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        quality_score=vis["quality_score"],
        completion_estimate=vis["completion_estimate"],
        ai_confidence=round(max(min(confidence, 100.0), 0.0), 1),
        status=status,
        findings=findings,
        analysis=analysis,
    )
