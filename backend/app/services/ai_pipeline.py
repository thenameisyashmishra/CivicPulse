"""
Orchestrates the full evidence-verification pipeline:

  1. EXIF/GPS extraction + geofence check      (services/exif.py, geo.py)
  2. Perceptual-hash duplicate detection        (services/dedupe.py)
  3. Deep Vision AI quality + defect heuristics (services/vision_ai.py, vision.py)

...and turns the combined result into the standard CivicPulse verification structure.
"""

from dataclasses import dataclass, field
from pathlib import Path

from app.core.config import get_settings
from app.db.models import EvidenceStatus
from app.services import dedupe, vision
from app.services.exif import extract_exif
from app.services.geo import haversine_distance_m
from app.services.vision_ai import analyze_vision_deep
from app.services.defect_detector import detect_surface_defects
from app.services.xai import explain_verification_result

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
    project_type: str = "Infrastructure",
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

    # 2. Duplicate detection (Perceptual Hash)
    phash = dedupe.compute_phash(image_path)
    duplicate_of_id, hamming_distance = dedupe.find_duplicate(phash, existing_hashes)
    is_duplicate = duplicate_of_id is not None
    if is_duplicate:
        findings.append(f"Perceptual hash matches evidence #{duplicate_of_id} (Hamming distance {hamming_distance}) — likely duplicate/reused photo")

    # 3. Deep Vision AI Inspection
    deep_vis = analyze_vision_deep(image_path, project_type=project_type, project_lat=project_lat, project_lng=project_lng)
    quality_score = float(deep_vis["quality_score"])
    completion_estimate = float(deep_vis["completion_estimate"])
    findings.extend(deep_vis.get("findings", []))

    # --- Decide overall status ---
    if is_duplicate:
        status = EvidenceStatus.failed
        confidence = 100 - (hamming_distance or 0) * 5
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
    elif quality_score < QUALITY_PASS_THRESHOLD:
        status = EvidenceStatus.review
        confidence = round(45 + quality_score * 0.3, 1)
        analysis = (
            f"FLAGGED FOR REVIEW: Location verified, but image quality score ({quality_score:.0f}/100) "
            "is low (blur/exposure). Estimated completion may be unreliable; consider requesting a clearer photo."
        )
    else:
        status = EvidenceStatus.verified
        vis_conf = float(deep_vis.get("ai_confidence", 85.0))
        confidence = round(0.5 * vis_conf + 0.3 * quality_score + (15.0 if within_geofence else 0.0), 1)
        confidence = min(confidence, 99.0)

        surface_mat = deep_vis.get("surface_material", "Structural Surface")
        crack_sev = deep_vis.get("crack_severity", "none")
        pothole_note = "Pothole detected; " if deep_vis.get("pothole_detected") else ""
        analysis = (
            f"VERIFIED: GPS location confirmed within project boundary. Deep Vision AI quality score "
            f"{quality_score:.0f}/100. Estimated visual completion {completion_estimate:.0f}%. "
            f"Material: {surface_mat}. {pothole_note}Surface condition: {crack_sev} fissures. "
            f"{deep_vis.get('summary', 'Visual evidence verified against project baseline.')}"
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
        quality_score=quality_score,
        completion_estimate=completion_estimate,
        ai_confidence=round(max(min(confidence, 100.0), 0.0), 1),
        status=status,
        findings=findings,
        analysis=analysis,
    )
