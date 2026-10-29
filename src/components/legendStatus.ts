import type { LayerKind, ProjectLayerConfig } from "../projects/types";

// Thematic rasters whose colors only make sense with a scale. A layer with neither
// legend nor legendMode is an incomplete configuration, and the interface says so.
// "embedded" (drawn into the raster) and "none" show nothing.
const thematicKinds = new Set<LayerKind>(["dtm", "dsm", "slope", "solar-orientation", "ndvi", "multispectral"]);

export function legendMissing(layer: ProjectLayerConfig) {
  return !layer.legend && !layer.legendMode && thematicKinds.has(layer.kind);
}

export const legendMissingText = "Legenda não fornecida para esta camada";
