import type { ProjectLayerConfig, VectorPopupConfig } from "./types";

type GeoStyle = NonNullable<Extract<ProjectLayerConfig["source"], { format: "geojson" }>["style"]>;
const baseUrl = "https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev/geojson/";
const field = (property: string, label: string, options: Partial<VectorPopupConfig["fields"][number]> = {}): VectorPopupConfig["fields"][number] => ({ property, label, ...options });

function vector(id: string, name: string, filename: string, style: GeoStyle, fields: VectorPopupConfig["fields"]): ProjectLayerConfig {
  return {
    id, name, description: name + " — levantamento com drone Jurema",
    kind: "vector", group: "vector", defaultVisible: false, opacityControl: true,
    source: {
      format: "geojson", url: baseUrl + filename, autoZoom: false,
      ignoreAltitude: true, uniqueFeatureIds: true, style, popup: { title: name, fields },
    },
  };
}

function contours(interval: 1 | 3 | 5, width: number): ProjectLayerConfig {
  const fields = [field("ELEVATION", "Cota")]; // Source already includes meters.
  if (interval !== 1) fields.push(field("CLOSED_CONTOUR", "Curva fechada"));
  return {
    ...vector("curvas_" + interval + "m", "Curvas de nível " + interval + " m", "curvas_" + interval + "m.geojson",
      { stroke: "#111111", strokeWidth: width, clampToGround: true, zIndex: 10 }, fields),
    kind: "contours", exclusiveGroup: "drone-contours",
  };
}

const propertyArea = vector("peri", "Área do imóvel", "peri.geojson", {
  stroke: "#FF0000", strokeWidth: 4, fill: "#FF0000", fillOpacity: 0, clampToGround: true, zIndex: 20,
}, [
  field("CARDEAL_CALCULATED_AREA_HA", "Área calculada (não registral)", { decimals: 3, suffix: " ha" }),
  field("CARDEAL_CALCULATED_PERIMETER_M", "Perímetro calculado (horizontal)", { decimals: 2, suffix: " m" }),
]);

export const juremaDroneLayers: ProjectLayerConfig[] = [
  {
    ...propertyArea, kind: "property-boundary", defaultVisible: true,
    source: { ...propertyArea.source as Extract<ProjectLayerConfig["source"], { format: "geojson" }>, calculateGeometryMetrics: true },
  },
  contours(1, 0.5),
  contours(3, 0.8),
  contours(5, 1.2),
  {
    ...vector("drenagem", "Rede de drenagem", "drenagem.geojson", {
      stroke: "#42C5E8", strokeWidth: 1, clampToGround: true, zIndex: 12,
      classification: { property: "STRAHLER", classes: {
        "1": { stroke: "#58C9E8", strokeWidth: 1 },
        "2": { stroke: "#30B8DF", strokeWidth: 1.5 },
        "3": { stroke: "#159BD5", strokeWidth: 2 },
        "4": { stroke: "#117EC5", strokeWidth: 2.8 },
        "5": { stroke: "#0862AF", strokeWidth: 3.6 },
      } },
    }, [
      field("STRAHLER", "Ordem Strahler", { format: "integer" }),
      field("DRAIN_AREA", "Área drenada"),
      field("STREAM_ID", "STREAM_ID"),
      field("IN_FLOW", "IN_FLOW"),
      field("OUT_FLOW", "OUT_FLOW"),
    ]), kind: "drainage",
  },
  vector("microbacias", "Microbacias", "microbacias.geojson", {
    stroke: "#67518C", strokeWidth: 1.5, fill: "#67518C", fillOpacity: 0.22, clampToGround: true, zIndex: 1,
    palette: { property: "STREAM_ID", colors: ["#2B8CBE", "#7B6BB0", "#D49B36", "#47A887", "#C9697B", "#829C42", "#5C85C4", "#B57948"] },
  }, [
    field("STREAM_ID", "STREAM_ID"),
    field("NEXT_STREAM_ID", "NEXT_STREAM_ID"),
    field("PERIMETER", "Perímetro"),
    field("ENCLOSED_AREA", "Área"),
  ]),
];
