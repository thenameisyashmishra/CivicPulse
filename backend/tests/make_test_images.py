"""Generates test JPEGs with (or without) embedded GPS EXIF for smoke testing."""
import random
import piexif
from PIL import Image

def _deg_to_dms_rational(deg_float):
    deg_float = abs(deg_float)
    degrees = int(deg_float)
    minutes_float = (deg_float - degrees) * 60
    minutes = int(minutes_float)
    seconds = round((minutes_float - minutes) * 60 * 100)
    return [(degrees, 1), (minutes, 1), (seconds, 100)]

def make_photo(path, lat=None, lng=None, seed=1, noisy=True):
    random.seed(seed)
    img = Image.new('RGB', (900, 700), color=(90 + seed % 50, 120, 140))
    if noisy:
        px = img.load()
        for _ in range(30000):
            x = random.randint(0, 899); y = random.randint(0, 699)
            px[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))

    exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    if lat is not None and lng is not None:
        exif_dict["GPS"] = {
            piexif.GPSIFD.GPSLatitudeRef: 'N' if lat >= 0 else 'S',
            piexif.GPSIFD.GPSLatitude: _deg_to_dms_rational(lat),
            piexif.GPSIFD.GPSLongitudeRef: 'E' if lng >= 0 else 'W',
            piexif.GPSIFD.GPSLongitude: _deg_to_dms_rational(lng),
        }
        exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = "2025:01:28 10:30:00"
        exif_bytes = piexif.dump(exif_dict)
        img.save(path, exif=exif_bytes, quality=92)
    else:
        img.save(path, quality=92)

import os
import tempfile

if __name__ == "__main__":
    temp_dir = tempfile.gettempdir()
    # NH-44 project is at lat=28.4211, lng=76.999
    make_photo(os.path.join(temp_dir, "evidence_near.jpg"), lat=28.4213, lng=76.9992, seed=1)      # ~30m away -> within geofence
    make_photo(os.path.join(temp_dir, "evidence_far.jpg"), lat=28.7041, lng=77.1025, seed=2)      # far away (central Delhi) -> outside geofence
    make_photo(os.path.join(temp_dir, "evidence_nogps.jpg"), lat=None, lng=None, seed=3)          # no EXIF at all
    print(f"test images created in {temp_dir}")
