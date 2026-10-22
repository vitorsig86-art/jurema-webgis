// Thematic data and transport format are separate: several themes share a loader.
export type LayerKind =
  | "raster"
  | "vector"
  | "basemap"
  | "orthomosaic"
  | "dtm"
  | "dsm"
  | "slope"
  | "solar-orientation"
  | "ndvi"
  | "multispectral"
  | "property-boundary"
  | "drainage"
  | "contours"
  | "3d-tiles";

// Geographic rectangles use longitude/latitude degrees.
export type GeographicBounds = [west: number, south: number, east: number, north: number];

export type LayerSource =
  | { format: "3d-tiles"; source?: "url"; url: string; clipping?: ModelClippingConfig; heightOffsetMeters?: number; terrainCutout?: boolean }
  | { format: "3d-tiles"; source: "ion"; assetId: number; tokenEnv?: string; clipping?: ModelClippingConfig; heightOffsetMeters?: number; terrainCutout?: boolean }
  | {
    format: "ion-world-imagery";
    fallback: { url: string; credit: string; maximumLevel: number };
  }
  | {
    format: "xyz" | "tms";
    url: string;
    credit: string;
    // Imagery tile zoom levels, independent of camera height/navigation limits.
    minimumLevel?: number;
    maximumLevel?: number;
    bounds?: GeographicBounds;
    tileWidth?: number;
    tileHeight?: number;
    // Compatibility option; confirmed per-tile 404/410 gaps are always recoverable.
    allowMissingTiles?: boolean;
  }
  | {
    format: "geojson";
    url: string;
    autoZoom?: boolean;
    popup?: VectorPopupConfig;
    ignoreAltitude?: boolean;
    uniqueFeatureIds?: boolean;
    calculateGeometryMetrics?: boolean;
    style?: {
      stroke: string;
      strokeWidth: number;
      outline?: { property: string; width: number; colors: string[]; fallbackColor?: string };
      polygonOutline?: boolean;
      palette?: { property: string; colors: string[] };
      classification?: {
        property: string;
        classes: Record<string, { fill?: string; fillOpacity?: number; stroke?: string; strokeWidth?: number; zIndex?: number }>;
      };
      fill?: string;
      fillOpacity?: number;
      clampToGround?: boolean;
      zIndex?: number;
    };
  };

export interface ProjectLayerConfig {
  id: string;
  name: string;
  description: string;
  kind: LayerKind;
  source: LayerSource;
  defaultVisible: boolean;
  opacityControl?: boolean;
  exclusiveGroup?: string;
  temporalCampaign?: { label: string; description: string; comparisonLabel?: string };
  group?: "basemap" | "model" | "raster" | "vector" | "macro";
  subsection?: string;
  optional?: boolean;
  legendMode?: "embedded" | "external" | "none";
  legend?: LegendConfig;
}

export interface VectorPopupConfig {
  title?: string;
  titleProperty?: string;
  titlePrefix?: string;
  titleSuffix?: string;
  fields: {
    property: string;
    label?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    format?: "integer" | "decimal";
    numberFormat?: { locale: string; decimalPlaces: number };
  }[];
}

// Geographic polygon vertices in longitude/latitude degrees, without a repeated closing vertex.
export interface ModelClippingConfig {
  enabled?: boolean;
  inverse: boolean;
  positions: [longitude: number, latitude: number][];
}

// Position and orientation angles are degrees; height is meters above the ellipsoid.
export interface CameraConfig {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
}

export interface TemporalComparisonSelection {
  left: string;
  right: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  location: string;
  bounds: GeographicBounds;
  initialCamera?: CameraConfig;
  layers: ProjectLayerConfig[];
  temporalComparison?: TemporalComparisonSelection;
  developmentTools?: { modelAlignment?: boolean; cropAuthoring?: boolean; cameraCapture?: boolean };
}

export type LayerStatus = "idle" | "loading" | "ready" | "fallback" | "error";

export type LegendConfig = GradientLegendConfig | ImageLegendConfig;

export interface ImageLegendConfig {
  type: "image";
  title: string;
  imageUrl: string;
  imageAlt: string;
}

export interface GradientLegendConfig {
  type?: "gradient";
  title: string;
  min: number;
  max: number;
  tickValues: number[];
  decimalPlaces?: number;
  // Percentage positions run from the minimum (bottom) to maximum (top).
  gradientStops: { position: number; color: string }[];
}
