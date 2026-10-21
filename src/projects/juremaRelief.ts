import type { ProjectLayerConfig, VectorPopupConfig } from "./types";

type GeoStyle = NonNullable<Extract<ProjectLayerConfig["source"], { format: "geojson" }>["style"]>;
const baseUrl = "https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev/geojson/";
const field = (property: string, label: string): VectorPopupConfig["fields"][number] => ({ property, label });

function vector(id: string, name: string, filename: string, style: GeoStyle, fields: VectorPopupConfig["fields"], titleProperty?: string): ProjectLayerConfig {
  return {
    id, name, description: name + " — Jurema, Baependi/MG",
    kind: "vector", group: "macro", subsection: "Relevo e Hidrologia",
    defaultVisible: false, opacityControl: true, legendMode: "none",
    source: {
      format: "geojson", url: baseUrl + filename, autoZoom: false,
      ignoreAltitude: true, uniqueFeatureIds: true, style,
      popup: { title: name, titleProperty, fields },
    },
  };
}

export const juremaReliefLayers: ProjectLayerConfig[] = [
  vector("curvas_10m", "Curvas de nível 10 m — ANADEM", "curvas_10m.geojson", {
    stroke: "#383838", strokeWidth: 0.65, clampToGround: true, zIndex: 9,
  }, [field("ELEVATION", "Cota")]), // ELEVATION already includes meters.
  vector("drenagem_ana", "Drenagem — ANA", "drenagem_ana.geojson", {
    stroke: "#163C80", strokeWidth: 2.3, fill: "#248BCD", fillOpacity: 0.3,
    clampToGround: true, zIndex: 13,
    classification: { property: "nuordemcda", classes: {
      "6": { strokeWidth: 3 },
      "7": { strokeWidth: 3.7 },
      "8": { strokeWidth: 4.4 },
    } },
  }, [
    field("nuordemcda", "Ordem hidrográfica"),
    field("nunivotcda", "Nível Otto"),
    field("cocursodag", "Código do curso d’água"),
    field("cocdadesag", "Código do curso de deságue"),
    field("nuareabacc", "Área da bacia (km²)"),
    field("nucompcda", "Comprimento do trecho (km)"),
    field("dsversao", "Versão/base hidrográfica"),
    // The mixed source keeps polygon-specific attributes on the reservoir.
    // Missing fields are omitted by the existing popup renderer.
    field("nmoriginal", "Nome da massa d’água"),
    field("detipomass", "Tipo de massa d’água"),
    field("detipoapr", "Tipo de aproveitamento"),
    field("usoprinc", "Uso principal"),
    field("dedominio", "Domínio hídrico"),
    field("nuareakm2", "Área da massa d’água (km²)"),
    field("nuperimkm", "Perímetro da massa d’água (km)"),
    field("nuvolumhm3", "Volume (hm³)"),
    field("nmemp", "Empreendedor"),
    field("deversao", "Versão/base da massa d’água"),
  ], "nmoriginal"),
  vector("drenagem_simulada", "Drenagem simulada — ANADEM", "drenagem_simulada.geojson", {
    stroke: "#42C5E8", strokeWidth: 1, clampToGround: true, zIndex: 12,
    classification: { property: "STRAHLER", classes: {
      "1": { stroke: "#58C9E8", strokeWidth: 1 },
      "2": { stroke: "#30B8DF", strokeWidth: 1.5 },
      "3": { stroke: "#159BD5", strokeWidth: 2 },
      "4": { stroke: "#117EC5", strokeWidth: 2.8 },
      "5": { stroke: "#0862AF", strokeWidth: 3.6 },
      "6": { stroke: "#075399", strokeWidth: 4.4 },
    } },
  }, [
    field("STRAHLER", "Ordem de Strahler"),
    field("DRAIN_AREA", "Área drenada"),
    field("STREAM_ID", "STREAM_ID"),
    field("IN_FLOW", "IN_FLOW"),
    field("OUT_FLOW", "OUT_FLOW"),
  ]),
  vector("microbacia_ana", "Microbacia — ANA", "microbacia_ana.geojson", {
    stroke: "#8053BD", strokeWidth: 2.2, fill: "#8053BD", fillOpacity: 0.025,
    clampToGround: true, zIndex: 2,
  }, [
    field("wts_cd_pfafstetterbasin", "Código Pfafstetter"),
    field("wts_cd_pfafstetterbasincodeleve", "Nível Pfafstetter"),
    // These source fields include explicit units; wts_gm_area does not.
    field("ENCLOSED_AREA", "Área"),
    field("PERIMETER", "Perímetro"),
  ]),
  vector("simu_microbacias", "Microbacias simuladas — ANADEM", "simu_microbacias.geojson", {
    stroke: "#67518C", strokeWidth: 1.5, fill: "#67518C", fillOpacity: 0.22,
    clampToGround: true, zIndex: 1,
    palette: { property: "STREAM_ID", colors: ["#2B8CBE", "#7B6BB0", "#D49B36", "#47A887", "#C9697B", "#829C42", "#5C85C4", "#B57948"] },
  }, [
    field("STREAM_ID", "STREAM_ID"),
    field("NEXT_STREAM_ID", "NEXT_STREAM_ID"),
    field("PERIMETER", "Perímetro"),
    field("ENCLOSED_AREA", "Área"),
  ]),
];
