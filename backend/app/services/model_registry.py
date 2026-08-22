"""
ML Model Registry & Governance Tracker for CivicPulse.

Manages deployed computer vision and multimodal models:
- Model Cards and intended operational domains
- Version tracking, accuracy metrics (mAP50, mAP50-95), and training datasets
- Known operational limitations and fallback procedures
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "yolov11_defect_detector": {
        "model_name": "CivicPulse Defect Detector",
        "version": "1.0.0",
        "architecture": "YOLOv11n",
        "task": "Object Detection & Instance Segmentation",
        "classes": [
            "pothole",
            "longitudinal_crack",
            "transverse_crack",
            "alligator_crack",
            "raveling",
            "patching",
            "debris",
        ],
        "training_dataset": "Indian PWD Road & Drainage Defect Dataset (14,250 annotated geotagged frames)",
        "metrics": {
            "mAP50": 0.792,
            "mAP50_95": 0.534,
            "inference_latency_ms": 42.0,
        },
        "standards_alignment": ["IRC:SP:16", "MoRTH Section 3000", "IS 456"],
        "fallback": "local_opencv_heuristics",
        "deployed_at": "2026-08-20T00:00:00Z",
    },
    "gemini_multimodal_vision": {
        "model_name": "Gemini 1.5 Flash Vision Multimodal",
        "version": "1.5.0",
        "architecture": "Multimodal Transformer",
        "task": "Semantic Progress Estimation & Architectural Quality Verification",
        "metrics": {
            "json_schema_compliance": 0.994,
            "semantic_progress_correlation": 0.912,
        },
        "fallback": "local_cv_heuristic_pipeline",
        "deployed_at": "2026-08-20T00:00:00Z",
    },
    "glcm_texture_classifier": {
        "model_name": "GLCM Surface Texture & Material Analyzer",
        "version": "1.0.0",
        "architecture": "Statistical Gray-Level Co-occurrence Matrix (GLCM) Texture Entropy",
        "task": "Material Identification (Asphalt, Concrete, Dirt/Unpaved, Paver Blocks)",
        "metrics": {
            "material_classification_accuracy": 0.885,
        },
        "fallback": "basic_luminance_classifier",
        "deployed_at": "2026-08-20T00:00:00Z",
    },
}


def list_registered_models() -> List[Dict[str, Any]]:
    """Returns a list of all active registered models."""
    return [
        {"model_id": k, **v}
        for k, v in MODEL_REGISTRY.items()
    ]


def get_model_card(model_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full model card and documentation for a specific model."""
    return MODEL_REGISTRY.get(model_id)
