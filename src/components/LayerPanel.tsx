import { useId, useRef, useState } from "react";
import type { LayerStatus, ProjectConfig, ProjectLayerConfig } from "../projects/types";
import { Icon } from "./icons";
import { legendMissing, legendMissingText } from "./legendStatus";
import "./LayerPanel.css";

interface Props {
  project: ProjectConfig;
  statuses: Record<string, LayerStatus>;
  visible: Set<string>;
  rasterOpacities: Record<string, number>;
  onOpacityChange: (id: string, percent: number) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
  // Desktop: collapse the panel to free the map. Mobile: switch sheet height.
  onCollapse?: () => void;
  sheetHigh?: boolean;
  onToggleSheetHeight?: () => void;
  comparing?: boolean;
  // Quick scenes are optional so the panel keeps rendering without them.
  scenes?: { id: string; label: string; description?: string; layerIds: string[] }[];
  onApplyScene?: (scene: { id: string; label: string; description?: string; layerIds: string[] }) => void;
}

// Section ids are stable; only the visible titles describe what each one holds.
// Orthomosaic campaigns sit with the basemap as "Paisagem" and are chosen on the timeline.
export function getWorkspaceSections(layers: ProjectLayerConfig[]) {
  const group = (layer: ProjectLayerConfig) => layer.temporalCampaign ? "basemap" : layer.group ?? (layer.kind === "basemap" ? "basemap" : layer.source.format === "3d-tiles" ? "model" : layer.source.format === "geojson" ? "vector" : "raster");
  return [
    { id: "basemap", title: "Paisagem", layers: layers.filter(layer => group(layer) === "basemap") },
    { id: "model", title: "Modelo 3D", layers: layers.filter(layer => group(layer) === "model") },
    { id: "raster", title: "Relevo derivado", layers: layers.filter(layer => group(layer) === "raster") },
    { id: "vector", title: "Levantamento drone", layers: layers.filter(layer => group(layer) === "vector") },
    { id: "macro", title: "Contexto regional", layers: layers.filter(layer => group(layer) === "macro") },
  ];
}

// Searching and collapsing are presentation only: neither one toggles a layer,
// changes opacity or reaches the Cesium lifecycle.
function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function sameLayerSet(current: Set<string>, expected: string[]) {
  return current.size === expected.length && expected.every((id) => current.has(id));
}

function errorMessage(layer: ProjectLayerConfig) {
  return (layer.optional ? "Arquivo regional pendente ou indisponível." : layer.source.format === "3d-tiles" ? "Modelo indisponível. Verifique o token 3D e o acesso ao asset." : "Camada indisponível. Verifique a fonte e a conexão.") + " Desative e ative para tentar novamente.";
}

function hasOpacity(layer: ProjectLayerConfig) {
  return layer.source.format === "tms" || layer.source.format === "xyz" || Boolean(layer.opacityControl);
}

export function LayerPanel({ project, statuses, visible, rasterOpacities, onOpacityChange, onToggle, onClose, onCollapse, sheetHigh, onToggleSheetHeight, scenes, onApplyScene, comparing }: Props) {
  const [search, setSearch] = useState("");
  // Sections without an active layer start collapsed. Later layer toggles must
  // not reopen or close a section behind the user's back, so this initializes once.
  const [openSections, setOpenSections] = useState(() => new Set(
    getWorkspaceSections(project.layers)
      .filter(section => section.layers.some(layer => visible.has(layer.id)))
      .map(section => section.id),
  ));
  const searchId = useId();
  const campaigns = project.layers.filter(layer => layer.temporalCampaign);
  const activeCampaign = campaigns.find(layer => visible.has(layer.id));
  // Remember the last period so switching the orthomosaic back on restores it.
  const lastCampaign = useRef<string | undefined>(undefined);
  if (activeCampaign) lastCampaign.current = activeCampaign.id;

  const query = normalize(search);
  const matches = (layer: ProjectLayerConfig) => !query || normalize(layer.name).includes(query);
  const entries = getWorkspaceSections(project.layers)
    .map(section => ({ section, layers: section.layers.filter(matches) }))
    .filter(entry => !query || entry.layers.length > 0);

  function toggleSection(id: string) {
    setOpenSections(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCampaigns() {
    if (activeCampaign) return onToggle(activeCampaign.id);
    const id = lastCampaign.current ?? campaigns.find(layer => layer.defaultVisible)?.id ?? campaigns[campaigns.length - 1]?.id;
    if (id) onToggle(id);
  }

  function opacityControl(layer: ProjectLayerConfig) {
    const opacity = rasterOpacities[layer.id] ?? 100;
    return (
      <div className="layer-opacity">
        <div className="layer-opacity-heading">
          <label htmlFor={`opacity-${layer.id}`}>Opacidade</label>
          <output htmlFor={`opacity-${layer.id}`}>{opacity}%</output>
        </div>
        <input id={`opacity-${layer.id}`} type="range" min={0} max={100} step={1} value={opacity}
          aria-label={`Opacidade de ${layer.name}`} aria-valuetext={`${opacity}%`}
          onChange={(event) => onOpacityChange(layer.id, Number(event.currentTarget.value))} />
      </div>
    );
  }

  function statusLine(layer: ProjectLayerConfig) {
    const status = statuses[layer.id];
    if (status === "loading") return <p className="layer-status" data-tone="loading" role="status">Carregando…</p>;
    if (status === "error") return <p className="layer-status" data-tone="error" role="status">{errorMessage(layer)}</p>;
    return null;
  }

  function campaignCard() {
    const enabled = Boolean(activeCampaign);
    const campaign = activeCampaign?.temporalCampaign;
    return (
      <div className={`layer-card ${enabled && !comparing ? "is-active" : ""}`}>
        <label className="layer-toggle">
          <span className="layer-copy">
            <strong>Ortomosaico</strong>
            <small>{comparing ? "Períodos definidos na comparação" : "Período definido na régua do tempo"}</small>
          </span>
          {campaign && !comparing && <span className="layer-period-tag">{campaign.label}</span>}
          <input type="checkbox" className="layer-switch" checked={enabled} disabled={comparing} onChange={toggleCampaigns}
            aria-label={enabled ? `Ortomosaico ${campaign?.label ?? ""} ligado` : "Ortomosaico desligado"} />
        </label>
        {activeCampaign && !comparing && statusLine(activeCampaign)}
        {activeCampaign && !comparing && opacityControl(activeCampaign)}
      </div>
    );
  }

  return (
    <>
      {onToggleSheetHeight && <button type="button" className="sheet-handle" onClick={onToggleSheetHeight}
        aria-label={sheetHigh ? "Reduzir painel de camadas" : "Ampliar painel de camadas"}><span aria-hidden="true" /></button>}
      <div className="panel-heading workspace-project">
        <div>
          <h2>Camadas</h2>
          <p className="workspace-context">{project.name} — {project.location}</p>
        </div>
        {onCollapse && <button type="button" className="panel-icon-button desktop-only" onClick={onCollapse} aria-label="Recolher painel de camadas" title="Recolher painel">
          <Icon name="chevronLeft" />
        </button>}
        <button type="button" className="panel-icon-button mobile-only" onClick={onClose} aria-label="Fechar painel de camadas"><Icon name="close" /></button>
      </div>
      {scenes && scenes.length > 0 &&
        <section className="workspace-scenes" aria-label="Cenas rápidas">
          <h3 className="workspace-scenes-title">Cenas rápidas</h3>
          <div className="workspace-scene-list">
            {scenes.map(scene => (
              <button key={scene.id} type="button" className="workspace-scene" aria-pressed={sameLayerSet(visible, scene.layerIds)}
                title={scene.description} onClick={() => onApplyScene?.(scene)}>{scene.label}</button>
            ))}
          </div>
        </section>}
      <div className="workspace-search">
        <label className="visually-hidden" htmlFor={searchId}>Buscar camada</label>
        <Icon name="search" size={16} className="workspace-search-icon" />
        <input id={searchId} type="search" className="workspace-search-input" placeholder="Buscar camada"
          value={search} onChange={event => setSearch(event.currentTarget.value)} />
      </div>
      {entries.length === 0 && <p className="workspace-empty" role="status">Nenhuma camada encontrada.</p>}
      {entries.map(({ section, layers }) => {
        const regular = section.layers.filter(layer => !layer.temporalCampaign);
        const hasCampaigns = regular.length !== section.layers.length;
        const total = regular.length + (hasCampaigns ? 1 : 0);
        const activeCount = regular.filter(layer => visible.has(layer.id)).length + (hasCampaigns && activeCampaign ? 1 : 0);
        const open = Boolean(query) || openSections.has(section.id);
        const shownRegular = layers.filter(layer => !layer.temporalCampaign);
        const showCampaigns = shownRegular.length !== layers.length;
        return (
          <section key={section.id} className="workspace-section" aria-labelledby={`workspace-${section.id}`}>
            <h3 id={`workspace-${section.id}`}>
              <button type="button" className="workspace-section-toggle" aria-expanded={open}
                aria-controls={`workspace-list-${section.id}`} onClick={() => toggleSection(section.id)}>
                <span className="workspace-section-title">{section.title}</span>
                <span className="workspace-section-count">{activeCount}/{total}</span>
                <Icon name="chevronDown" size={16} className="workspace-section-chevron" />
              </button>
            </h3>
            <div className="layer-list" id={`workspace-list-${section.id}`} hidden={!open}>
              {total === 0 && <p className="workspace-section-empty">Sem camadas nesta fase.</p>}
              {shownRegular.map((layer, index) => {
                const enabled = visible.has(layer.id);
                const isModel = section.id === "model";
                return (
                  <div key={layer.id}>
                    {layer.subsection && layer.subsection !== shownRegular[index - 1]?.subsection && <h4 className="layer-subsection">{layer.subsection}</h4>}
                    <div className={`layer-card ${enabled ? "is-active" : ""}`}>
                      <label className="layer-toggle">
                        {isModel && <span className="model-layer-icon"><Icon name="box" size={20} /></span>}
                        <span className="layer-copy">
                          <strong>{layer.name}</strong>
                          {isModel && <small>Visualização tridimensional</small>}
                          {legendMissing(layer) && enabled && <small>{legendMissingText}</small>}
                        </span>
                        <input type="checkbox" className="layer-switch" checked={enabled} onChange={() => onToggle(layer.id)} />
                      </label>
                      {enabled && statusLine(layer)}
                      {enabled && hasOpacity(layer) && opacityControl(layer)}
                    </div>
                  </div>
                );
              })}
              {showCampaigns && campaignCard()}
            </div>
          </section>
        );
      })}
    </>
  );
}
