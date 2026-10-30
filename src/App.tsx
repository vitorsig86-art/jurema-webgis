import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { projects } from "./projects";
import { LayerPanel } from "./components/LayerPanel";
import { Legend, MissingLegend } from "./components/Legend";
import { NavigationControls } from "./components/NavigationControls";
import { MeasurementToolbar } from "./components/MeasurementToolbar";
import { VectorPopup } from "./components/VectorPopup";
import { TemporalComparison } from "./components/TemporalComparison";
import { TemporalSelector } from "./components/TemporalSelector";
import { PeriodBadge } from "./components/PeriodBadge";
import { AboutDialog } from "./components/AboutDialog";
import { Icon, type IconName } from "./components/icons";
import { legendMissing, legendMissingText } from "./components/legendStatus";

import { HeadingPitchRange, Math as CesiumMath, type Entity } from "cesium";
import type { VectorPopupActionLink } from "./cesium/vectorPopup";
import { flyToProjectHome } from "./cesium/projectCamera";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useProjectLayers } from "./hooks/useProjectLayers";
import type { ProjectConfig, TemporalComparisonSelection } from "./projects/types";

const ModelDevelopmentTools = import.meta.env.DEV ? lazy(() => import("./components/ModelDevelopmentTools")) : null;
const EmbeddedPageOverlay = lazy(() => import("./components/EmbeddedPageOverlay"));

// Mobile bottom bar: "Camadas" opens the sheet; the other three choose what sits over the map.
type MobileView = "time" | "measure" | "legend";
const mobileTabs: { id: MobileView; label: string; icon: IconName }[] = [
  { id: "time", label: "Tempo", icon: "history" },
  { id: "measure", label: "Medir", icon: "ruler" },
  { id: "legend", label: "Legenda", icon: "legend" },
];

function defaultVisibility(project: ProjectConfig) {
  return new Set(project.layers.filter((layer) => layer.defaultVisible).map((layer) => layer.id));
}

export function App() {
  const project = projects[0];
  const [visible, setVisible] = useState(() => defaultVisibility(projects[0]));
  // Mobile sheet (open/high) and desktop panel (collapsed) are UI state only.
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetHigh, setSheetHigh] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("time");
  const [legendOpen, setLegendOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [modelHint, setModelHint] = useState(false);
  const modelHintShown = useRef(false);
  const [comparison, setComparison] = useState<TemporalComparisonSelection | null>(null);
  const [page, setPage] = useState<{ url: string; title: string } | null>(null);
  // Keep simple-mode visibility untouched for the entire comparison session.
  const displayVisible = useMemo(() => {
    if (!comparison) return visible;
    const next = new Set(visible);
    for (const layer of project.layers) if (layer.temporalCampaign) next.delete(layer.id);
    next.add(comparison.left);
    next.add(comparison.right);
    return next;
  }, [visible, comparison, project]);
  const { containerRef, viewer, error } = useCesiumViewer();
  const { statuses, mapWarning, rasterOpacities, setRasterOpacity, getModel } = useProjectLayers(viewer, project, displayVisible, comparison);
  const legendLayers = project.layers.filter((layer) => layer.legend && visible.has(layer.id));
  const missingLegendLayers = project.layers.filter((layer) => visible.has(layer.id) && legendMissing(layer));
  const legendCount = legendLayers.length + missingLegendLayers.length;
  // Without legends the mobile "Legenda" tab disappears, so its view falls back to the timeline.
  const activeMobileView: MobileView = mobileView === "legend" && legendCount === 0 ? "time" : mobileView;
  const modelVisible = project.layers.some(layer => layer.source.format === "3d-tiles" && visible.has(layer.id));
  const canCompare = Boolean(project.temporalComparison && viewer && !error);

  function toggleLayer(id: string) {
    if (comparison && project.layers.some(layer => layer.id === id && layer.temporalCampaign)) return;
    const layer = project.layers.find(item => item.id === id);
    // First model activation of the session explains navigation on the map itself.
    if (layer?.source.format === "3d-tiles" && !visible.has(id) && !modelHintShown.current) {
      modelHintShown.current = true;
      setModelHint(true);
    }
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else {
        const group = project.layers.find(layer => layer.id === id)?.exclusiveGroup;
        if (group) for (const layer of project.layers) {
          if (layer.exclusiveGroup === group) next.delete(layer.id);
        }
        next.add(id);
      }
      return next;
    });
  }

  function showMobileView(view: MobileView) {
    setPanelOpen(false);
    setMobileView(view);
  }

  // Popup action: fly to the feature (its polygon when the click hit an outline helper), then open the page.
  async function openPage({ action, title, entity }: { action: VectorPopupActionLink; title: string; entity: Entity }) {
    if (action.target === "tab") { window.open(action.url, "_blank", "noopener"); return; }
    if (viewer && !viewer.isDestroyed()) {
      viewer.selectedEntity = undefined;
      if (action.flyTo === "home") {
        await flyToProjectHome(viewer, project, 1.6);
      } else if (action.flyTo) {
        const target = entity.parent?.polygon ? entity.parent : entity;
        await viewer.flyTo(target, { duration: 1.6, offset: new HeadingPitchRange(viewer.camera.heading, CesiumMath.toRadians(-45), 0) });
      }
    }
    setPage({ url: action.url, title });
  }

  return (
    <main className="app-shell" data-panel={panelCollapsed ? "collapsed" : undefined} data-mobile-view={activeMobileView}>
      <div ref={containerRef} className="map-container" aria-label="Mapa 3D interativo do projeto" />
      {comparison && viewer && <TemporalComparison viewer={viewer} layers={project.layers} selection={comparison}
        visible={displayVisible} statuses={statuses} rasterOpacities={rasterOpacities} drawerOpen={panelOpen} modelVisible={modelVisible} />}
      <header className="app-header">
        <a className="brand" href="/" aria-label="Página inicial do Cardeal Map">
          <img src="/logo-cardeal.png" alt="" />
          <strong className="brand-company">Cardeal Map</strong>
        </a>
        <span className="brand-project">{project.name} · {project.location}</span>
        <div className="header-actions">
          <button type="button" className="header-button header-panel-toggle" aria-controls="layer-panel" aria-expanded={!panelCollapsed}
            onClick={() => setPanelCollapsed(!panelCollapsed)} title={panelCollapsed ? "Mostrar painel de camadas" : "Recolher painel de camadas"}>
            <Icon name="panelLeft" /><span>Camadas</span>
          </button>
          <button type="button" className="header-button" aria-haspopup="dialog" onClick={() => setAboutOpen(true)} aria-label="Sobre os dados">
            <Icon name="info" /><span>Sobre os dados</span>
          </button>
        </div>
      </header>
      {panelOpen && <button type="button" className="sheet-backdrop" aria-label="Fechar painel de camadas" onClick={() => setPanelOpen(false)} />}
      <aside id="layer-panel" aria-label="Camadas do projeto" className={`layer-panel ${panelOpen ? "is-open" : ""} ${sheetHigh ? "is-high" : ""}`}>
        <LayerPanel project={project} statuses={statuses} visible={displayVisible} rasterOpacities={rasterOpacities} onOpacityChange={setRasterOpacity} onToggle={toggleLayer}
          onClose={() => setPanelOpen(false)} onCollapse={() => setPanelCollapsed(true)}
          sheetHigh={sheetHigh} onToggleSheetHeight={() => setSheetHigh(!sheetHigh)} comparing={Boolean(comparison)} />
      </aside>
      {/* While comparing, the "Antes | Depois" labels take the badge's place. */}
      {!comparison && <PeriodBadge layers={project.layers} visible={displayVisible} statuses={statuses} />}
      <TemporalSelector layers={project.layers} visible={displayVisible} statuses={statuses} onToggle={toggleLayer}
        comparison={comparison} onComparisonChange={setComparison}
        onCompare={canCompare ? () => {
          setComparison(project.temporalComparison ?? null);
          showMobileView("time");
        } : undefined} onExitComparison={() => setComparison(null)} />
      <div className="map-tools">
        <NavigationControls viewer={viewer} project={project} disabled={Boolean(error)} />
        <MeasurementToolbar viewer={viewer} disabled={Boolean(error)} />
      </div>
      <VectorPopup viewer={viewer} allowedOrigins={project.embeddedPages?.allowedOrigins} onOpenPage={openPage} />
      {page && <Suspense fallback={null}><EmbeddedPageOverlay url={page.url} title={page.title} onClose={() => setPage(null)} /></Suspense>}
      {ModelDevelopmentTools && (project.developmentTools?.modelAlignment || project.developmentTools?.cropAuthoring) &&
        <Suspense fallback={null}>
          {project.layers.filter(layer => layer.source.format === "3d-tiles" && visible.has(layer.id)).map(layer =>
            <ModelDevelopmentTools key={layer.id} viewer={viewer} tileset={getModel(layer.id)} alignment={Boolean(project.developmentTools?.modelAlignment)} crop={Boolean(project.developmentTools?.cropAuthoring)} />)}
        </Suspense>}
      {modelHint && modelVisible && <div className="map-hint" role="status">
        <Icon name="box" />
        <p>
          <span className="desktop-only">Arraste para girar · Ctrl + arrastar inclina · role para aproximar</span>
          <span className="mobile-only">Use gestos de toque para girar, inclinar e aproximar a vista.</span>
        </p>
        <button type="button" aria-label="Fechar dica de navegação" onClick={() => setModelHint(false)}><Icon name="close" size={16} /></button>
      </div>}
      {(error || mapWarning) && <div role="alert" className="map-alert">{error || mapWarning}</div>}
      {!viewer && !error && <div role="status" className="map-alert">Iniciando o visualizador 3D…</div>}
      {/* Nothing to show (no legends, or only legends drawn into the rasters): no stack and no button. */}
      {legendCount > 0 && <div className="raster-legend-stack" role="group" aria-label="Legendas das camadas visíveis">
        <div className="raster-legend-stack-items" id="legend-items" hidden={!legendOpen}>
          {legendLayers.map((layer) => layer.legend && <Legend key={layer.id} {...layer.legend} visibility={visible.has(layer.id)} />)}
          {missingLegendLayers.map((layer) => <MissingLegend key={layer.id} title={layer.name} message={legendMissingText} />)}
        </div>
        <button type="button" className="legend-toggle" aria-controls="legend-items" aria-expanded={legendOpen} onClick={() => setLegendOpen(!legendOpen)}>
          Legenda · {legendCount}
          <Icon name="chevronDown" size={14} />
        </button>
      </div>}
      <nav className="mobile-bar" aria-label="Ferramentas do mapa">
        <button type="button" aria-pressed={panelOpen} aria-controls="layer-panel" onClick={() => setPanelOpen(!panelOpen)}>
          <span><Icon name="layers" size={20} /></span>Camadas
        </button>
        {mobileTabs.filter(tab => tab.id !== "legend" || legendCount > 0).map(tab => <button key={tab.id} type="button" aria-pressed={!panelOpen && activeMobileView === tab.id} onClick={() => showMobileView(tab.id)}>
          <span><Icon name={tab.icon} size={20} /></span>{tab.label}
        </button>)}
      </nav>
      <AboutDialog project={project} open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
