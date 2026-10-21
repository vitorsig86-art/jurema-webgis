import { useEffect, useId, useState } from "react";
import type { LayerStatus, ProjectConfig, ProjectLayerConfig } from "../projects/types";
import "./LayerPanel.css";

interface Props {
  project: ProjectConfig;
  statuses: Record<string, LayerStatus>;
  visible: Set<string>;
  rasterOpacities: Record<string, number>;
  onOpacityChange: (id: string, percent: number) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
  // Quick scenes are optional so the panel keeps rendering without them.
  scenes?: { id: string; label: string; description?: string; layerIds: string[] }[];
  onApplyScene?: (scene: { id: string; label: string; description?: string; layerIds: string[] }) => void;
}

export function getWorkspaceSections(layers: ProjectLayerConfig[]) {
  const group = (layer: ProjectLayerConfig) => layer.group ?? (layer.kind === "basemap" ? "basemap" : layer.source.format === "3d-tiles" ? "model" : layer.source.format === "geojson" ? "vector" : "raster");
  return [
    { id: "basemap", title: "Mapa base", layers: layers.filter(layer => group(layer) === "basemap") },
    { id: "model", title: "Modelo 3D", layers: layers.filter(layer => group(layer) === "model") },
    { id: "raster", title: "Rasters", layers: layers.filter(layer => group(layer) === "raster") },
    { id: "vector", title: "Vetores", layers: layers.filter(layer => group(layer) === "vector") },
    { id: "macro", title: "Análise Macro", layers: layers.filter(layer => group(layer) === "macro") },
  ];
}

// Searching and collapsing are presentation only: neither one toggles a layer,
// changes opacity or reaches the Cesium lifecycle.
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function sameLayerSet(current: Set<string>, expected: string[]) {
  return current.size === expected.length && expected.every((id) => current.has(id));
}

export function LayerPanel({ project, statuses, visible, rasterOpacities, onOpacityChange, onToggle, onClose, scenes, onApplyScene }: Props) {
  const [modelHint, setModelHint] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Sections without an active layer start collapsed. Later layer toggles must
  // not reopen or close a section behind the user's back, so this initializes once.
  const [openSections, setOpenSections] = useState(() => new Set(
    getWorkspaceSections(project.layers)
      .filter(section => section.layers.some(layer => visible.has(layer.id)))
      .map(section => section.id),
  ));
  const searchId = useId();

  useEffect(() => {
    if (modelHint === null) return;
    const timer = window.setTimeout(() => setModelHint(null), 6000);
    return () => window.clearTimeout(timer);
  }, [modelHint]);

  const query = normalize(search);
  const entries = getWorkspaceSections(project.layers)
    .map(section => ({ section, layers: query ? section.layers.filter(layer => normalize(layer.name).includes(query)) : section.layers }))
    .filter(entry => !query || entry.layers.length > 0);

  function toggleSection(id: string) {
    setOpenSections(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="panel-heading workspace-project">
        <div>
          <h2>Camadas</h2>
          <p className="workspace-context">{project.name} — {project.location}</p>
        </div>
        <button type="button" className="icon-button mobile-only" onClick={onClose} aria-label="Fechar painel de camadas">×</button>
      </div>
      {scenes && scenes.length > 0 &&
        <section className="workspace-scenes" aria-label="Cenas rápidas">
          <h3 className="workspace-scenes-title">Cenas rápidas</h3>
          <div className="workspace-scene-list">
            {scenes.map(scene => (
              <button
                key={scene.id}
                type="button"
                className="workspace-scene"
                aria-pressed={sameLayerSet(visible, scene.layerIds)}
                title={scene.description}
                onClick={() => onApplyScene?.(scene)}
              >{scene.label}</button>
            ))}
          </div>
        </section>}
      <div className="workspace-search">
        <label className="workspace-search-label" htmlFor={searchId}>Buscar camada</label>
        <input
          id={searchId}
          type="search"
          className="workspace-search-input"
          placeholder="Buscar camada..."
          value={search}
          onChange={event => setSearch(event.currentTarget.value)}
        />
      </div>
      {entries.length === 0 && <p className="workspace-empty" role="status">Nenhuma camada encontrada.</p>}
      {entries.map(({ section, layers }) => {
        const activeCount = section.layers.filter(layer => visible.has(layer.id)).length;
        const open = openSections.has(section.id);
        return (
          <section key={section.id} className="workspace-section" aria-labelledby={`workspace-${section.id}`}>
            <h3 id={`workspace-${section.id}`}>
              <button
                type="button"
                className="workspace-section-toggle"
                aria-expanded={open}
                aria-controls={`workspace-list-${section.id}`}
                onClick={() => toggleSection(section.id)}
              >
                <span className="workspace-section-title">{section.title}</span>
                <span className="workspace-section-count">{activeCount}/{section.layers.length}</span>
                <svg className="workspace-section-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
              </button>
            </h3>
            <div className="layer-list" id={`workspace-list-${section.id}`} hidden={!open}>
              {layers.length === 0 && <p className="workspace-section-empty">Sem camadas nesta fase.</p>}
              {layers.map((layer, index) => {
                const enabled = visible.has(layer.id);
                const opacity = rasterOpacities[layer.id] ?? 100;
                const isModel = section.id === "model";
                const embeddedLegend = layer.legendMode === "embedded";
                return (
                  <div key={layer.id}>
                    {layer.subsection && layer.subsection !== layers[index - 1]?.subsection && <h4 className="layer-subsection">{layer.subsection}</h4>}
                    <div className={`layer-card ${enabled ? "is-active" : ""} ${isModel ? "model-layer-card" : ""}`}>
                      <label className="layer-toggle">
                        <input type="checkbox" checked={enabled} onChange={() => {
                          if (isModel) setModelHint(enabled ? null : layer.id);
                          onToggle(layer.id);
                        }} />
                        {isModel && <span className="model-layer-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                            <path d="m12 2 9 5v10l-9 5-9-5V7Z M3 7l9 5 9-5 M12 12v10" />
                          </svg>
                        </span>}
                        <span className="layer-copy">
                          <strong title={embeddedLegend ? "Legenda incorporada ao mapa" : undefined}>{layer.name}</strong>
                          {isModel && <small>Visualização tridimensional</small>}
                          {embeddedLegend && enabled && <small className="embedded-legend-note">Legenda incorporada ao mapa</small>}
                        </span>
                      </label>
                      {enabled && isModel && modelHint === layer.id && <p className="model-navigation-hint" role="status">Use o mouse ou gestos de toque para girar, inclinar e aproximar a vista.</p>}
                      {enabled && statuses[layer.id] === "loading" && <p className="layer-status" role="status">Carregando…</p>}
                      {enabled && statuses[layer.id] === "error" && <p className="layer-status" role="status">{layer.optional ? "Arquivo regional pendente ou indisponível." : layer.source.format === "3d-tiles" ? "Modelo indisponível. Verifique o token 3D e o acesso ao asset." : "Camada indisponível. Verifique a fonte e a conexão."} Desative e ative para tentar novamente.</p>}
                      {(layer.source.format === "tms" || layer.source.format === "xyz" || layer.opacityControl) && enabled && <div className="layer-opacity">
                        <div className="layer-opacity-heading">
                          <label htmlFor={`opacity-${layer.id}`}>Opacidade</label>
                          <output htmlFor={`opacity-${layer.id}`}>{opacity}%</output>
                        </div>
                        <input
                          id={`opacity-${layer.id}`}
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={opacity}
                          aria-label={`Opacidade de ${layer.name}`}
                          aria-valuetext={`${opacity}%`}
                          onChange={(event) => onOpacityChange(layer.id, Number(event.currentTarget.value))}
                        />
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
