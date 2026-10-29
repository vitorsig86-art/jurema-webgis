import type { GeographicBounds, ProjectConfig, ProjectLayerConfig } from "./types";
import { juremaDroneLayers } from "./juremaDrone";
import { juremaContextLayers } from "./juremaContext";
import { juremaReliefLayers } from "./juremaRelief";

const publicUrl = "https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev";
export const orthoBounds: GeographicBounds = [-44.82421875, -22.10599880, -44.73632812, -22.02454560];
export const thematicBounds: GeographicBounds = [-44.82421875, -22.10599880, -44.64843750, -21.94304553];

function raster(id: string, name: string, kind: ProjectLayerConfig["kind"], bounds: GeographicBounds, minimumLevel: number, maximumLevel: number, directory = id): ProjectLayerConfig {
  return {
    id, name, kind, description: name + " — Jurema, Baependi/MG", group: "raster",
    defaultVisible: id === "orto",
    source: { format: "tms", url: publicUrl + "/" + directory + "/{z}/{x}/{reverseY}.png",
      credit: "Cardeal Map — Jurema", bounds, minimumLevel, maximumLevel, tileWidth: 256, tileHeight: 256 },
  };
}

const orthomosaicCampaigns: ProjectLayerConfig[] = [
  { id: "ortho2022", directory: "2022", label: "2022", description: "Levantamento histórico", comparisonLabel: "2022 — Histórico" },
  { id: "ortho2024", directory: "2024", label: "2024", description: "Antes do incêndio", comparisonLabel: "2024 — Pré-fogo", eventAfter: "Incêndio registrado entre as campanhas de 2024" },
  { id: "ortho2024PostFire", directory: "2024_pos_fogo", label: "2024 pós-fogo", description: "Após o incêndio", comparisonLabel: "2024 — Pós-fogo" },
  { id: "ortho2025", directory: "2025", label: "2025", description: "Registro posterior ao incêndio", comparisonLabel: "2025 — Posterior" },
  { id: "orto", directory: "orto2", label: "2026", description: "Levantamento atual", comparisonLabel: "2026 — Atual" },
].map(({ id, directory, label, description, comparisonLabel, eventAfter }: { id: string; directory: string; label: string; description: string; comparisonLabel: string; eventAfter?: string }) => ({
  ...raster(id, "Ortomosaico " + label, "orthomosaic", orthoBounds, 12, 21, directory),
  description: label + " — " + description,
  exclusiveGroup: "temporal-orthomosaics",
  temporalCampaign: { label, description, comparisonLabel, eventAfter },
}));

export const juremaProject: ProjectConfig = {
  temporalComparison: { left: "ortho2024", right: "ortho2024PostFire" },
  id: "jurema", name: "Jurema", location: "Baependi/MG", bounds: orthoBounds,
  // Approved Cesium capture: degrees and meters; shared by opening and Home.
  initialCamera: {
    longitude: -44.81946869308431,
    latitude: -22.041061381686998,
    height: 1728.2326122817292,
    heading: 119.09952275627943,
    pitch: -27.543725448935206,
    roll: 0.0007023448888433719,
  },
  layers: [
    { id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap", group: "basemap", defaultVisible: true,
      source: { format: "ion-world-imagery", fallback: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>', maximumLevel: 19 } } },
    { id: "modelo-3d", name: "Modelo fotogramétrico 3D", description: "Fotogrametria Jurema via Cesium ion", kind: "3d-tiles", group: "model", defaultVisible: false,
      source: {
        format: "3d-tiles", source: "ion", assetId: 5184061, tokenEnv: "VITE_CESIUM_3D_TOKEN",
        // Cesium 1.146: inverse clips outside, preserving the approved interior.
        // Applied only to this tileset; terrainCutout intentionally remains unset.
        clipping: {
          enabled: true, inverse: true,
          positions: [
            [-44.80146667851748, -22.049566285273563],
            [-44.80167757913808, -22.044234005877687],
            [-44.80287248232578, -22.041559682886813],
            [-44.8036773012523, -22.03908733979841],
            [-44.80692854691501, -22.03943481002895],
            [-44.8112071046167, -22.040393188229807],
            [-44.817141451279895, -22.04132894712852],
            [-44.81684312184903, -22.04729719951911],
            [-44.81347150691682, -22.053810841760303],
            [-44.806707592341816, -22.05158691266945]
          ],
        },
      } },
    ...orthomosaicCampaigns,
    // The legend of these thematic rasters is drawn into the tiles themselves.
    ...[
      raster("mdt", "Modelo Digital do Terreno", "dtm", thematicBounds, 11, 20),
      raster("mds", "Modelo Digital da Superfície", "dsm", thematicBounds, 11, 20),
      raster("decli", "Declividade", "slope", thematicBounds, 11, 20),
      raster("aspect", "Orientação Solar", "solar-orientation", thematicBounds, 11, 20),
      raster("ndvi", "NDVI", "ndvi", thematicBounds, 11, 20),
    ].map((layer): ProjectLayerConfig => ({ ...layer, legendMode: "embedded" })),
    ...juremaDroneLayers,
    ...juremaContextLayers,
    ...juremaReliefLayers,
  ],
  developmentTools: { modelAlignment: false, cropAuthoring: false },
};

// MDT/MDS are imagery only. No elevation, clipping, vertical offset or external legends are inferred.
