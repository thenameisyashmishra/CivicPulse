"""
Lightweight computer-vision analysis of uploaded evidence photos.

What this actually computes (real, on the pixels — not mocked):
  - sharpness, via the variance of an edge-detected version of the image
    (a standard blur/focus proxy)
  - brightness / exposure, via mean luminance
  - edge density, used as a rough proxy for "how much built structure /
    detail is visible" -> feeds the completion estimate

What this is NOT: a trained object-detection model. The presentation's
timeline scopes YOLOv8 training for weeks 7-8 of the project; this module is
the pluggable slot that a trained YOLOv8/OpenCV pipeline drops into later.
`analyze_evidence_image()` is the single seam to swap — everything upstream
(routers, schema) only cares about the dict it returns, not how it's made.
"""

from pathlib import Path
from typing import TypedDict

import numpy as np
from PIL import Image, ImageFilter

TARGET_SIZE = (512, 512)
IDEAL_BRIGHTNESS = 130.0  # 0-255 scale; daylight outdoor site photos cluster here


class VisionResult(TypedDict):
    sharpness_score: float
    brightness_score: float
    edge_density: float
    quality_score: float
    completion_estimate: float


def analyze_evidence_image(image_path: str | Path) -> VisionResult:
    with Image.open(image_path) as img:
        img = img.convert("L").resize(TARGET_SIZE)
        arr = np.asarray(img, dtype=np.float32)

        edges = img.filter(ImageFilter.FIND_EDGES)
        edge_arr = np.asarray(edges, dtype=np.float32)

    # Sharpness: variance of the edge map. Blurry photos have low-contrast,
    # muted edges -> low variance. In-focus photos have crisp edges -> high variance.
    sharpness_raw = float(edge_arr.var())
    sharpness_score = float(np.clip(sharpness_raw / 40.0, 0, 100))

    # Brightness: penalize both under- and over-exposed photos.
    brightness_mean = float(arr.mean())
    brightness_score = float(np.clip(100 - abs(brightness_mean - IDEAL_BRIGHTNESS) / 1.3, 0, 100))

    # Edge density: fraction of pixels that are "strong edges" -> rough proxy
    # for structural detail visible in frame (concrete, rebar, tiling, etc.)
    edge_density = float(np.clip((edge_arr > 30).mean(), 0, 1))

    quality_score = round(0.6 * sharpness_score + 0.4 * brightness_score, 1)

    # Completion estimate: more visible structural detail + decent quality
    # correlates (weakly, heuristically) with a more "finished" site photo.
    completion_estimate = round(float(np.clip(edge_density * 260, 0, 100)) * 0.7 + quality_score * 0.3, 1)

    return VisionResult(
        sharpness_score=round(sharpness_score, 1),
        brightness_score=round(brightness_score, 1),
        edge_density=round(edge_density, 3),
        quality_score=quality_score,
        completion_estimate=round(completion_estimate, 1),
    )
