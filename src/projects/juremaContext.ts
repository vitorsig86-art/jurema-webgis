import type { ProjectLayerConfig, VectorPopupConfig } from "./types";

const baseUrl = "https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev/geojson/";
const territorial = "CONTEXTO TERRITORIAL";
const physical = "MEIO FÍSICO";
const field = (property: string, label: string, options: Partial<VectorPopupConfig["fields"][number]> = {}): VectorPopupConfig["fields"][number] => ({ property, label, ...options });

function polygon(id: string, name: string, filename: string, subsection: string, color: string, fillOpacity: number, fields: VectorPopupConfig["fields"], strokeWidth = 2): ProjectLayerConfig {
  return {
    id, name, description: name + " — contexto regional de Jurema, Baependi/MG",
    kind: "vector", group: "macro", subsection,
    defaultVisible: false, opacityControl: true, legendMode: "none",
    source: {
      format: "geojson", url: baseUrl + filename, autoZoom: false,
      ignoreAltitude: true, uniqueFeatureIds: true,
      style: { stroke: color, strokeWidth, fill: color, fillOpacity, clampToGround: true, zIndex: 0 },
      popup: { title: name, fields },
    },
  };
}

export const juremaContextLayers: ProjectLayerConfig[] = [
  polygon("info_municipio", "Contexto Municipal — IBGE", "info_municipio.geojson", territorial, "#4F9B58", 0.25, [
    field("BaseRurU_2", "Município"),
    field("BaseRurUrb", "Estado"),
    field("Pop_Tot_Mu", "População total", { format: "integer", suffix: " habitantes" }),
    field("Pop_Urb_Mu", "População urbana", { format: "integer", suffix: " habitantes" }),
    field("Pop_Rur_Mu", "População rural", { format: "integer", suffix: " habitantes" }),
    field("Tipologia_", "Tipologia territorial"),
    field("Loc_BR", "Localização na classificação nacional"),
    field("Loc_UF", "Localização na classificação estadual"),
    field("BaseRurU_4", "Unidade populacional de referência"),
    field("Classes_Po", "Classe populacional da unidade de referência"),
    field("Classes_Pe", "Grau de urbanização da unidade de referência"),
  ], 2.4),
  polygon("clima", "Clima — IBGE", "clima.geojson", territorial, "#64BCE3", 0.22, [
    field("ZONA", "Zona climática"),
    field("TP_UMIDADE", "Umidade"),
    field("DISTR_UMID", "Distribuição da umidade / meses secos"),
    field("TEMPERATUR", "Classificação térmica"),
    field("DESC_COMPL", "Descrição completa"),
  ]),
  polygon("ucfed", "Unidades de Conservação Federais", "ucfed.geojson", territorial, "#18A875", 0.24, [
    field("NomeUC", "Nome da unidade de conservação"),
    field("SiglaCateg", "Categoria"),
    field("GrupoUC", "Grupo de manejo (sigla da fonte)"),
    field("AreaHaAlb", "Área (ha)"),
    field("PerimM", "Perímetro (m)"),
    field("CriacaoAto", "Ato de criação"),
    field("CriacaoAno", "Ano de criação", { format: "integer" }),
    field("NGI", "Núcleo de gestão integrada"),
    field("EsferaAdm", "Esfera administrativa"),
    field("UFAbrang", "Estados abrangidos"),
    field("BiomaIBGE", "Bioma — IBGE"),
  ], 2.6),
  polygon("geologia", "Geologia — IBGE", "geologia.geojson", physical, "#A176C9", 0.34, [
    field("nm_unidade", "Unidade geológica"),
    field("letra_simb", "Sigla"),
    field("nm_tempo_g", "Tempo geológico"),
    field("nm_provinc", "Província"),
    field("nm_sub_pro", "Subprovíncia"),
  ]),
  polygon("geomorfologia", "Geomorfologia — IBGE", "geomorfologia.geojson", physical, "#CB923C", 0.3, [
    field("nm_unidade", "Unidade geomorfológica"),
    field("nm_dominio", "Domínio"),
    field("nm_regiao", "Região geomorfológica"),
    field("compartime", "Compartimento do relevo"),
    field("categoria", "Categoria"),
    field("natureza", "Natureza"),
    field("caract", "Característica da dissecação"),
    field("forma", "Forma de topo"),
    field("letra_simb", "Símbolo geomorfológico"),
    field("leg_sup", "Descrição da unidade"),
  ]),
  polygon("pedologia", "Pedologia — IBGE", "pedologia.geojson", physical, "#B48357", 0.32, [
    field("nom_unidad", "Unidade de mapeamento"),
    field("legenda", "Classificação do solo"),
    field("ordem", "Ordem"),
    field("subordem", "Subordem"),
    field("grande_gru", "Grande grupo"),
    field("subgrupos", "Subgrupo"),
    field("textura", "Textura"),
    field("horizonte", "Horizonte"),
    field("relevo", "Relevo"),
    field("val_ncompo", "Número de componentes"),
    field("componente", "Associação de solos — componentes"),
    field("component1", "Associação de solos — continuação"),
    field("inclu_p1", "Associação de solos — inclusão"),
  ]),
  polygon("vegetacao", "Vegetação — IBGE", "vegetacao.geojson", physical, "#398D57", 0.3, [
    field("nm_uantr", "Uso e cobertura antrópica"),
    field("legenda_2", "Classe de uso e cobertura"),
    field("leg_sup", "Cobertura dominante"),
    field("nm_pretet", "Vegetação pretérita"),
    field("nm_contat", "Contato entre formações vegetais"),
    field("nm_sec1", "Vegetação associada"),
    field("nm_sec2", "Formação associada"),
    field("legenda_1", "Descrição do contato"),
    field("legenda", "Descrição da classe"),
  ]),
];
