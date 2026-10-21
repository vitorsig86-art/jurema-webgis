import { geoJsonGeometryMetrics } from "./geoJsonMetrics";

interface Geometry {
  type: string;
  coordinates?: unknown;
  geometries?: Geometry[];
}
interface Feature {
  type: string;
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: Geometry | null;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

// Transform a private copy, retaining vertices, ring order and all attributes.
export function prepareGeoJson(data: unknown, namespace: string, ignoreAltitude = false, uniqueFeatureIds = false, calculateGeometryMetrics = false): FeatureCollection {
  const copy = structuredClone(data) as FeatureCollection;
  if (copy?.type !== "FeatureCollection" || !Array.isArray(copy.features)) throw new Error("Expected a GeoJSON FeatureCollection.");
  function coordinates(value: unknown): unknown {
    if (!Array.isArray(value)) return value;
    return typeof value[0] === "number" ? value.slice(0, 2) : value.map(coordinates);
  }
  function flatten(geometry: Geometry | null) {
    if (!geometry) return;
    if (geometry.coordinates) geometry.coordinates = coordinates(geometry.coordinates);
    geometry.geometries?.forEach(flatten);
  }
  copy.features.forEach((feature, index) => {
    if (uniqueFeatureIds) feature.id = `${namespace}:${index}`;
    if (ignoreAltitude) flatten(feature.geometry);
    if (calculateGeometryMetrics) {
      const metrics = geoJsonGeometryMetrics(feature.geometry);
      if (metrics) feature.properties = { ...feature.properties, CARDEAL_CALCULATED_AREA_HA: metrics.areaHa, CARDEAL_CALCULATED_PERIMETER_M: metrics.perimeterM };
    }
  });
  return copy;
}
