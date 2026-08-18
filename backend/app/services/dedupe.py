"""
Duplicate-evidence detection via perceptual hashing.

Real implementation using the `imagehash` library (pHash / DCT-based), not a
stub — two photos of the same physical scene (even re-compressed, resized,
or lightly cropped) hash to a small Hamming distance apart, which is exactly
the "reused/duplicate photo submitted as new evidence" check from the spec.
"""

from pathlib import Path

import imagehash
from PIL import Image

# Hamming distance below this = treated as a duplicate. 0-4 is "same image
# resized/recompressed", 5-10 is "very similar", 10+ is "different scene".
DUPLICATE_HAMMING_THRESHOLD = 8


def compute_phash(image_path: str | Path) -> str:
    with Image.open(image_path) as img:
        return str(imagehash.phash(img))


def find_duplicate(new_hash: str, existing: list[tuple[int, str]]) -> tuple[int | None, int | None]:
    """
    existing: list of (evidence_id, phash) for prior evidence on the same project.
    Returns (duplicate_of_id, hamming_distance) for the closest match under the
    threshold, or (None, None) if nothing matches closely enough.
    """
    new = imagehash.hex_to_hash(new_hash)
    best_id, best_distance = None, None

    for evidence_id, existing_hash_str in existing:
        try:
            existing_hash = imagehash.hex_to_hash(existing_hash_str)
        except ValueError:
            continue
        distance = new - existing_hash  # Hamming distance
        if distance <= DUPLICATE_HAMMING_THRESHOLD and (best_distance is None or distance < best_distance):
            best_id, best_distance = evidence_id, distance

    return best_id, best_distance
