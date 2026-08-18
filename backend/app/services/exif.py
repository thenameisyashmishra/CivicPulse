"""
EXIF metadata extraction — pulls GPS coordinates and capture timestamp out of
an uploaded photo, the same way a phone camera embeds them. This is the real
implementation behind the "GPS/EXIF verification" feature from the spec: it
reads actual EXIF tags with Pillow, it doesn't fake the result.
"""

from dataclasses import dataclass
from pathlib import Path

from PIL import ExifTags, Image

_GPS_TAG_ID = next((tag for tag, name in ExifTags.TAGS.items() if name == "GPSInfo"), None)
_DATETIME_TAG_ID = next((tag for tag, name in ExifTags.TAGS.items() if name == "DateTimeOriginal"), None)


@dataclass
class ExifResult:
    lat: float | None
    lng: float | None
    captured_at: str | None
    has_gps: bool


def _dms_to_decimal(dms, ref: str) -> float:
    degrees, minutes, seconds = (float(x) for x in dms)
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in ("S", "W"):
        decimal = -decimal
    return decimal


def extract_exif(image_path: str | Path) -> ExifResult:
    """Best-effort EXIF read. Returns Nones (not an error) when a photo has
    no EXIF block at all — very common for screenshots, WhatsApp-compressed
    images, or web-sourced photos, which is itself useful signal upstream."""
    try:
        img = Image.open(image_path)
        exif = img.getexif()
    except Exception:
        return ExifResult(lat=None, lng=None, captured_at=None, has_gps=False)

    if not exif:
        return ExifResult(lat=None, lng=None, captured_at=None, has_gps=False)

    captured_at = None
    if _DATETIME_TAG_ID is not None:
        captured_at = exif.get(_DATETIME_TAG_ID)

    lat = lng = None
    if _GPS_TAG_ID is not None:
        gps_info = exif.get_ifd(_GPS_TAG_ID) if hasattr(exif, "get_ifd") else exif.get(_GPS_TAG_ID)
        if gps_info:
            gps = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps_info.items()}
            try:
                if "GPSLatitude" in gps and "GPSLongitude" in gps:
                    lat = _dms_to_decimal(gps["GPSLatitude"], gps.get("GPSLatitudeRef", "N"))
                    lng = _dms_to_decimal(gps["GPSLongitude"], gps.get("GPSLongitudeRef", "E"))
            except (TypeError, ValueError, ZeroDivisionError):
                lat = lng = None

    return ExifResult(lat=lat, lng=lng, captured_at=captured_at, has_gps=lat is not None and lng is not None)
