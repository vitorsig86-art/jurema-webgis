import type { GeographicBounds, ProjectConfig, ProjectLayerConfig } from "./types";

// EDIT: illustrative W/S/E/N extent in degrees, not a property boundary.
const bounds: GeographicBounds = [-1, -1, 1, 1];
const basemap: ProjectLayerConfig = {
  id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap",
  source: {
    format: "ion-world-imagery",
    fallback: {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
      maximumLevel: 19,
    },
  },
  defaultVisible: true,
};

// EDIT URLs, bounds, zoom levels, labels and legends, then add the configured
// entries to templateProject.layers. example.invalid is reserved for examples.
// Confirmed edge tile 404/410 errors are recoverable automatically.
export const exampleLayers: ProjectLayerConfig[] = [{
  id: "raster-example-a", name: "Raster A", description: "Descrição do seu raster", kind: "raster",
  source: {
    format: "tms", url: "https://example.invalid/raster-a/{z}/{x}/{reverseY}.png",
    credit: "Seu projeto", bounds, minimumLevel: 0, maximumLevel: 8,
    tileWidth: 256, tileHeight: 256, allowMissingTiles: false,
  },
  defaultVisible: false,
  legend: { type: "image", title: "Raster A", imageUrl: "/legends/example.png", imageAlt: "Legenda ilustrativa; substitua pelos valores do seu raster" },
}, {
  id: "raster-example-b", name: "Raster B", description: "Segundo raster independente", kind: "raster",
  source: {
    format: "tms", url: "https://example.invalid/raster-b/{z}/{x}/{reverseY}.png",
    credit: "Seu projeto", bounds, minimumLevel: 0, maximumLevel: 8,
    tileWidth: 256, tileHeight: 256, allowMissingTiles: false,
  },
  defaultVisible: false,
  legend: { type: "image", title: "Raster B", imageUrl: "/legends/example.png", imageAlt: "Legenda ilustrativa do segundo raster" },
}, {
  id: "vector-example", name: "Vetor", description: "Descrição do seu vetor", kind: "vector",
  source: {
    format: "geojson", url: "https://example.invalid/vector.geojson", autoZoom: false,
    style: { stroke: "#ff0000", strokeWidth: 3, fill: "#00000000", clampToGround: true, zIndex: 1 },
  },
  defaultVisible: false,
}, {
  id: "model-example", name: "Modelo 3D", description: "Descrição do seu modelo", kind: "3d-tiles",
  source: { format: "3d-tiles", source: "url", url: "https://example.invalid/tileset.json" },
  defaultVisible: false,
}];

export const templateProject: ProjectConfig = {
  id: "seu-projeto", name: "Nome do projeto", location: "Município, UF", bounds,
  // EDIT: neutral globe view. Capture your final opening/Home view.
  // Angles in degrees, height in meters above the ellipsoid.
  initialCamera: { longitude: 0, latitude: 0, height: 20000000, heading: 0, pitch: -90, roll: 0 },
  // Examples are excluded: the stable loader eagerly loads rasters/vectors,
  // even when defaultVisible is false. A fresh clone never requests placeholders.
  layers: [basemap],
  developmentTools: { modelAlignment: false, cropAuthoring: false, cameraCapture: false },
};

// Additional v2 examples are deliberately inactive. Replace all placeholders
// before adding them to templateProject.layers. These are synthetic categories.
export const thematicExamples: ProjectLayerConfig[] = [
  {
    id: "areas-example", name: "Áreas temáticas", description: "Classes ilustrativas", kind: "vector", defaultVisible: false, opacityControl: true,
    source: {
      format: "geojson", url: "https://example.invalid/areas.geojson", autoZoom: false, uniqueFeatureIds: true,
      style: {
        stroke: "#32404A", strokeWidth: 3, fill: "#B6C3CF", fillOpacity: 0.35, clampToGround: true, zIndex: 1,
        classification: { property: "class_code", classes: { A: { fill: "#285F9E" }, B: { fill: "#C68524" } } },
        outline: { property: "color_index", colors: ["#285F9E", "#C68524", "#6B4E99"], width: 3, fallbackColor: "#32404A" },
      },
      popup: { title: "Área temática", titleProperty: "label", fields: [
        { property: "size", label: "Área", decimals: 2, suffix: " ha" },
        { property: "value_count", label: "Quantidade", format: "integer" },
        { property: "class_code", label: "Classe", prefix: "Código " },
      ] },
    },
  },
  {
    id: "lines-example", name: "Linhas classificadas", description: "Hierarquia ilustrativa", kind: "vector", defaultVisible: false,
    source: {
      format: "geojson", url: "https://example.invalid/lines.geojson", autoZoom: false, ignoreAltitude: true, uniqueFeatureIds: true,
      style: {
        stroke: "#32404A", strokeWidth: 1, clampToGround: true, zIndex: 10,
        classification: { property: "level_code", classes: {
          minor: { stroke: "#34B3C8", strokeWidth: 1, zIndex: 10 },
          major: { stroke: "#2457B2", strokeWidth: 3.5, zIndex: 11 },
        } },
      },
      popup: { title: "Linha", titleProperty: "label", titlePrefix: "Trecho ", fields: [{ property: "level_code", label: "Classe" }] },
    },
  },
  {
    id: "ion-model-example", name: "Modelo ion", description: "Substitua o assetId ilustrativo", kind: "3d-tiles", defaultVisible: false,
    source: { format: "3d-tiles", source: "ion", assetId: 0, tokenEnv: "VITE_CESIUM_3D_TOKEN", heightOffsetMeters: 0 },
  },
];

// Synthetic polygon near 0°; never use this boundary for a real property.
// Attach to a configured model source only after replacing all coordinates.
export const exampleClipping = {
  enabled: true, inverse: true,
  positions: [[-0.01, -0.01], [0.01, -0.01], [0.01, 0.01], [-0.01, 0.01]] as [number, number][],
};
