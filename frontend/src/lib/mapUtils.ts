/*
 * Map Utilities — CivicPulse
 * Web Mercator projection mathematics, slippy tile coordinate calculations,
 * 500m geofence radius projection, bounding-box auto-fit, and tile layer providers.
 */

export type MapTileLayer = "dark" | "osm" | "satellite" | "voyager";

export interface TileProviderConfig {
  id: MapTileLayer;
  name: string;
  subname: string;
  attribution: string;
  badge: string;
  maxZoom: number;
  getUrl: (z: number, x: number, y: number) => string;
}

export const TILE_PROVIDERS: Record<MapTileLayer, TileProviderConfig> = {
  dark: {
    id: "dark",
    name: "Cyber Dark",
    subname: "ESRI Dark Canvas",
    attribution: "© Esri, HERE, Garmin, © OpenStreetMap",
    badge: "DARK MODE",
    maxZoom: 19,
    getUrl: (z, x, y) =>
      `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
  },
  satellite: {
    id: "satellite",
    name: "Satellite Grid",
    subname: "ESRI World Imagery",
    attribution: "© Esri, DigitalGlobe, Earthstar Geographics",
    badge: "HIGH-RES",
    maxZoom: 19,
    getUrl: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    subname: "Standard Slippy Tiles",
    attribution: "© OpenStreetMap contributors",
    badge: "GLOBAL",
    maxZoom: 19,
    getUrl: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
  voyager: {
    id: "voyager",
    name: "Tactical Light",
    subname: "ESRI World Street",
    attribution: "© Esri, HERE, Garmin, USGS, © OpenStreetMap",
    badge: "DAYLIGHT",
    maxZoom: 19,
    getUrl: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
  },
};

/**
 * Converts Latitude/Longitude to normalized Mercator coordinates [0..1]
 */
export function latLngToWorldNorm(lat: number, lng: number): { x: number; y: number } {
  const x = (lng + 180) / 360;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.999999, Math.min(0.999999, sinLat));
  const y = 0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI);
  return { x, y };
}

/**
 * Converts normalized Mercator coordinates [0..1] back to Latitude/Longitude
 */
export function worldNormToLatLng(x: number, y: number): { lat: number; lng: number } {
  const lng = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/**
 * Converts Latitude/Longitude to world pixel coordinates at a given zoom level
 */
export function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const norm = latLngToWorldNorm(lat, lng);
  const worldSize = 256 * Math.pow(2, zoom);
  return {
    x: norm.x * worldSize,
    y: norm.y * worldSize,
  };
}

/**
 * Converts world pixel coordinates at a given zoom level back to Latitude/Longitude
 */
export function pixelToLatLng(pixelX: number, pixelY: number, zoom: number): { lat: number; lng: number } {
  const worldSize = 256 * Math.pow(2, zoom);
  return worldNormToLatLng(pixelX / worldSize, pixelY / worldSize);
}

/**
 * Converts Latitude/Longitude to viewport screen coordinates
 */
export function latLngToScreen(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewW: number,
  viewH: number
): { x: number; y: number } {
  const p = latLngToPixel(lat, lng, zoom);
  const centerP = latLngToPixel(centerLat, centerLng, zoom);
  return {
    x: p.x - centerP.x + viewW / 2,
    y: p.y - centerP.y + viewH / 2,
  };
}

/**
 * Converts viewport screen coordinates back to Latitude/Longitude
 */
export function screenToLatLng(
  screenX: number,
  screenY: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewW: number,
  viewH: number
): { lat: number; lng: number } {
  const centerP = latLngToPixel(centerLat, centerLng, zoom);
  const targetPixelX = screenX - viewW / 2 + centerP.x;
  const targetPixelY = screenY - viewH / 2 + centerP.y;
  return pixelToLatLng(targetPixelX, targetPixelY, zoom);
}

/**
 * Earth ground resolution (meters per pixel) at a specific latitude and zoom level
 */
export function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Calculates 500m geofence radius in screen pixels
 */
export function getGeofenceRadiusPixels(lat: number, zoom: number, radiusMeters = 500): number {
  const mpp = getMetersPerPixel(lat, zoom);
  return mpp > 0 ? radiusMeters / mpp : 24;
}

/**
 * Calculate standard dynamic distance scale bar parameters
 */
export function calculateScaleBar(
  lat: number,
  zoom: number,
  maxBarWidthPx = 110
): { widthPx: number; label: string } {
  const mpp = getMetersPerPixel(lat, zoom);
  const maxMeters = maxBarWidthPx * mpp;

  const standardDistances = [
    50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000,
    500000, 1000000, 2000000,
  ];

  let chosenDistance = standardDistances[0];
  for (const d of standardDistances) {
    if (d <= maxMeters) {
      chosenDistance = d;
    } else {
      break;
    }
  }

  const widthPx = Math.max(20, Math.round(chosenDistance / mpp));
  const label =
    chosenDistance >= 1000 ? `${chosenDistance / 1000} km` : `${chosenDistance} m`;

  return { widthPx, label };
}

export interface VisibleTile {
  key: string;
  x: number;
  y: number;
  z: number;
  screenLeft: number;
  screenTop: number;
  size: number;
}

/**
 * Computes the visible tiles required to fill the viewport
 */
export function getVisibleTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewW: number,
  viewH: number
): VisibleTile[] {
  if (viewW <= 0 || viewH <= 0) return [];

  const baseZ = Math.max(1, Math.min(19, Math.floor(zoom)));
  const scaleFactor = Math.pow(2, zoom - baseZ);
  const centerBasePixels = latLngToPixel(centerLat, centerLng, baseZ);

  const minX = centerBasePixels.x - (viewW / 2) / scaleFactor;
  const maxX = centerBasePixels.x + (viewW / 2) / scaleFactor;
  const minY = centerBasePixels.y - (viewH / 2) / scaleFactor;
  const maxY = centerBasePixels.y + (viewH / 2) / scaleFactor;

  const minTileX = Math.floor(minX / 256) - 1;
  const maxTileX = Math.floor(maxX / 256) + 1;
  const minTileY = Math.floor(minY / 256) - 1;
  const maxTileY = Math.floor(maxY / 256) + 1;

  const numTiles = Math.pow(2, baseZ);
  const tiles: VisibleTile[] = [];

  const clampedMinY = Math.max(0, minTileY);
  const clampedMaxY = Math.min(numTiles - 1, maxTileY);

  for (let ty = clampedMinY; ty <= clampedMaxY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
      const tileWorldX = tx * 256;
      const tileWorldY = ty * 256;

      const screenLeft = (tileWorldX - centerBasePixels.x) * scaleFactor + viewW / 2;
      const screenTop = (tileWorldY - centerBasePixels.y) * scaleFactor + viewH / 2;
      const size = 256 * scaleFactor;

      tiles.push({
        key: `${baseZ}-${wrappedX}-${ty}-${tx}`,
        x: wrappedX,
        y: ty,
        z: baseZ,
        screenLeft,
        screenTop,
        size,
      });
    }
  }

  return tiles;
}

/**
 * Calculates center and zoom to fit a bounding box of points
 */
export function fitBoundsToPoints(
  points: Array<{ lat: number; lng: number }>,
  viewW: number,
  viewH: number,
  padding = 80
): { centerLat: number; centerLng: number; zoom: number } {
  if (!points || points.length === 0) {
    return { centerLat: 28.6139, centerLng: 77.209, zoom: 11.5 };
  }

  if (points.length === 1) {
    return { centerLat: points[0].lat, centerLng: points[0].lng, zoom: 14.5 };
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const usableW = Math.max(100, viewW - padding * 2);
  const usableH = Math.max(100, viewH - padding * 2);

  const pTopLeft = latLngToWorldNorm(maxLat, minLng);
  const pBottomRight = latLngToWorldNorm(minLat, maxLng);

  const spanNormX = Math.max(0.00005, pBottomRight.x - pTopLeft.x);
  const spanNormY = Math.max(0.00005, pBottomRight.y - pTopLeft.y);

  const zoomX = Math.log2(usableW / (spanNormX * 256));
  const zoomY = Math.log2(usableH / (spanNormY * 256));

  const optimalZoom = Math.max(3.5, Math.min(16.5, Math.min(zoomX, zoomY)));

  return { centerLat, centerLng, zoom: optimalZoom };
}
