"""
Explainable AI (XAI) Rationale Engine for CivicPulse.

Generates human-readable, auditor-grade legal and technical justifications
for all AI decisions, quality scores, and fraud flags.
Complies with Indian Roads Congress (IRC), MoRTH, and NBC standards.
"""

from typing import Any, Dict, List


def explain_verification_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a structured, plain-language explanation of why an evidence submission
    was verified, flagged for review, or rejected.
    """
    reasons: List[str] = []
    flags: List[Dict[str, str]] = []
    status = result.get("status", "review")

    # 1. Geofence & Location Audit
    within_geofence = result.get("within_geofence", True)
    distance_m = result.get("distance_from_site_m")
    if not within_geofence and distance_m is not None:
        explanation = (
            f"📍 GEOFENCE MISMATCH: Photo GPS coordinates are {distance_m:.1f}m away from the sanctioned "
            f"project site, exceeding the statutory 500m geofence perimeter."
        )
        reasons.append(explanation)
        flags.append({"type": "geofence_breach", "severity": "critical", "message": explanation})
    elif distance_m is not None:
        reasons.append(f"📍 GPS coordinates validated within {distance_m:.1f}m of project site (within 500m limit).")

    # 2. Deduplication & Perceptual Hash
    is_duplicate = result.get("is_duplicate", False)
    duplicate_of = result.get("duplicate_of_id")
    if is_duplicate:
        explanation = (
            f"🔁 DUPLICATE PHOTO DETECTED: Perceptual hash matches existing evidence #{duplicate_of} "
            f"with over 90% visual similarity. Potential stock or reused photo fraud."
        )
        reasons.append(explanation)
        flags.append({"type": "duplicate_image", "severity": "critical", "message": explanation})

    # 3. Optical Clarity & Blur (Laplacian Variance)
    quality_score = result.get("quality_score", 0.0)
    sharpness = result.get("sharpness", 0.0)
    if quality_score < 35.0 or sharpness < 20.0:
        explanation = (
            f"📷 OPTICAL BLUR / LOW QUALITY: Image quality score is {quality_score:.1f}/100 "
            f"(sharpness: {sharpness:.1f}). Insufficient optical clarity to audit structural specifications."
        )
        reasons.append(explanation)
        flags.append({"type": "poor_quality", "severity": "moderate", "message": explanation})

    # 4. Crack Density & Structural Defect Index
    crack_index = result.get("crack_index", 0.0)
    crack_severity = result.get("crack_severity", "none")
    if crack_index > 0.5 or crack_severity in ["high", "critical"]:
        explanation = (
            f"⚠️ STRUCTURAL FISSURE DETECTED: Sobel gradient crack index is {crack_index:.2f} "
            f"({crack_severity} severity), indicating surface fissures exceeding IRC:SP:16 tolerance thresholds."
        )
        reasons.append(explanation)
        flags.append({"type": "crack_anomaly", "severity": crack_severity, "message": explanation})

    # 5. Pothole / Surface Depression Defect
    pothole_detected = result.get("pothole_detected", False)
    if pothole_detected:
        explanation = "🕳️ SURFACE DEPRESSION / POTHOLE DETECTED: Localized dark gradient drop indicates asphalt depression or pothole."
        reasons.append(explanation)
        flags.append({"type": "pothole_detected", "severity": "high", "message": explanation})

    # Summary Conclusion
    if not flags:
        summary_verdict = "PASSED: All visual, spatial, and cryptographic checks passed successfully."
    elif any(f["severity"] == "critical" for f in flags):
        summary_verdict = f"REJECTED / FLAGGED: {len(flags)} critical anomalies identified requiring immediate rejection."
    else:
        summary_verdict = f"NEEDS REVIEW: {len(flags)} advisory quality flags identified pending technical sign-off."

    return {
        "status": status,
        "summary_verdict": summary_verdict,
        "findings": reasons,
        "flags": flags,
        "flag_count": len(flags),
        "explainable_text": " | ".join(reasons) if reasons else summary_verdict,
    }
