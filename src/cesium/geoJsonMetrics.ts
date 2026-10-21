import { Cartesian3, Cartographic, EllipsoidGeodesic } from "cesium";
import { geographicArea } from "./measurementUtils";

type Position = number[];
interface MetricGeometry { type: string; coordinates?: unknown }

// Horizontal WGS84 footprint and geodesic perimeter; coordinate heights are ignored.
export function geoJsonGeometryMetrics(geometry: MetricGeometry | null): { areaHa: number; perimeterM: number } | undefined {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return undefined;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons)) return undefined;
  let areaM2 = 0;
  let perimeterM = 0;
  try {
    for (const polygon of polygons) {
      if (!Array.isArray(polygon)) return undefined;
      for (const [index, ring] of (polygon as Position[][]).entries()) {
        if (!Array.isArray(ring) || ring.length < 3 || ring.some(point =>
          !Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])
          || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90)) return undefined;
        const points = ring.map(([longitude, latitude]) => Cartesian3.fromDegrees(longitude, latitude));
        if (points.length > 3 && Cartesian3.equals(points[0], points[points.length - 1])) points.pop();
        const area = geographicArea(points);
        areaM2 += index === 0 ? area : -area;
        for (let i = 0; i < points.length; i++) {
          perimeterM += new EllipsoidGeodesic(
            Cartographic.fromCartesian(points[i]),
            Cartographic.fromCartesian(points[(i + 1) % points.length]),
          ).surfaceDistance;
        }
      }
    }
  } catch {
    return undefined;
  }
  if (!Number.isFinite(areaM2) || !Number.isFinite(perimeterM) || areaM2 <= 0) return undefined;
  return { areaHa: areaM2 / 10000, perimeterM };
}
