import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Viewer } from "cesium";
import type { LayerStatus, ProjectLayerConfig, TemporalComparisonSelection } from "../projects/types";
import "./TemporalComparison.css";

interface Props {
  viewer: Viewer;
  layers: ProjectLayerConfig[];
  selection: TemporalComparisonSelection;
  visible: Set<string>;
  statuses: Record<string, LayerStatus>;
  rasterOpacities: Record<string, number>;
  drawerOpen: boolean;
  onChange: (selection: TemporalComparisonSelection) => void;
  onExit: () => void;
}

function campaignLabel(layer: ProjectLayerConfig): string {
  const campaign = layer.temporalCampaign;
  return campaign ? campaign.comparisonLabel ?? `${campaign.label} — ${campaign.description}` : layer.name;
}

export function TemporalComparison({ viewer, layers, selection, visible, statuses, rasterOpacities, drawerOpen, onChange, onExit }: Props) {
  const [position, setPosition] = useState(0.5);
  const drag = useRef<{ pointerId: number; enableInputs: boolean } | null>(null);
  const campaigns = layers.filter(layer => layer.temporalCampaign);
  const leftCampaign = campaigns.find(layer => layer.id === selection.left);
  const rightCampaign = campaigns.find(layer => layer.id === selection.right);
  const selected = [selection.left, selection.right];
  const lastCampaignIndex = Math.max(...campaigns.map(layer => layers.indexOf(layer)));
  const coveringRasters = layers.filter((layer, index) => index > lastCampaignIndex
    && !layer.temporalCampaign && visible.has(layer.id) && (rasterOpacities[layer.id] ?? 100) > 0
    && (layer.source.format === "tms" || layer.source.format === "xyz"));

  useEffect(() => {
    if (viewer.isDestroyed()) return;
    const previousSplitPosition = viewer.scene.splitPosition;
    viewer.scene.splitPosition = 0.5;
    viewer.scene.requestRender();
    return () => {
      if (viewer.isDestroyed()) return;
      if (drag.current) viewer.scene.screenSpaceCameraController.enableInputs = drag.current.enableInputs;
      drag.current = null;
      viewer.scene.splitPosition = previousSplitPosition;
      viewer.scene.requestRender();
    };
  }, [viewer]);

  function moveTo(value: number) {
    if (viewer.isDestroyed()) return;
    const next = Math.min(0.98, Math.max(0.02, value));
    viewer.scene.splitPosition = next;
    viewer.scene.requestRender();
    setPosition(next);
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = viewer.canvas.getBoundingClientRect();
    if (bounds.width > 0) moveTo((event.clientX - bounds.left) / bounds.width);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (!viewer.isDestroyed()) viewer.scene.screenSpaceCameraController.enableInputs = drag.current.enableInputs;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className={`temporal-comparison ${drawerOpen ? "drawer-open" : ""}`}>
      <div className="temporal-divider" style={{ left: `${position * 100}%` }} role="slider" tabIndex={0}
        aria-label="Divisor da comparação temporal" aria-orientation="horizontal"
        aria-valuemin={2} aria-valuemax={98} aria-valuenow={Math.round(position * 100)}
        aria-valuetext={`${Math.round(position * 100)}% à esquerda`}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || drag.current || viewer.isDestroyed()) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, enableInputs: viewer.scene.screenSpaceCameraController.enableInputs };
          viewer.scene.screenSpaceCameraController.enableInputs = false;
          movePointer(event);
        }}
        onPointerMove={event => {
          if (drag.current?.pointerId !== event.pointerId) return;
          event.preventDefault();
          event.stopPropagation();
          movePointer(event);
        }}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        onKeyDown={event => {
          const value = event.key === "ArrowLeft" ? position - 0.02 : event.key === "ArrowRight" ? position + 0.02
            : event.key === "Home" ? 0.02 : event.key === "End" ? 0.98 : null;
          if (value === null) return;
          event.preventDefault();
          event.stopPropagation();
          moveTo(value);
        }}>
        <span className="temporal-divider-grip" aria-hidden="true">‹ ›</span>
      </div>
      <div className="temporal-side-labels" aria-hidden="true">
        <span style={{ maxWidth: `max(0px, calc(${position * 100}% - 24px))` }}>Esquerda: {leftCampaign && campaignLabel(leftCampaign)}</span>
        <span style={{ maxWidth: `max(0px, calc(${(1 - position) * 100}% - 24px))` }}>Direita: {rightCampaign && campaignLabel(rightCampaign)}</span>
      </div>
      <section className="temporal-comparison-controls" aria-label="Comparação Temporal">
        <h3>Comparação Temporal</h3>
        <div className="temporal-comparison-selects">
          {(["left", "right"] as const).map(side => <label key={side}>
            {side === "left" ? "Esquerda" : "Direita"}
            <select value={selection[side]} onChange={event => onChange({ ...selection, [side]: event.currentTarget.value })}>
              {campaigns.map(layer => <option key={layer.id} value={layer.id}>{campaignLabel(layer)}</option>)}
            </select>
          </label>)}
        </div>
        <div className="temporal-comparison-status" role="status" aria-live="polite">
          {selected.some(id => statuses[id] === "loading" || !statuses[id]) && <p>Carregando campanha…</p>}
          {selected.some(id => statuses[id] === "error") && <p>Campanha indisponível. Selecione outro período ou verifique a conexão.</p>}
          {selection.left === selection.right && <p>Mesmo período nos dois lados.</p>}
          {coveringRasters.length > 0 && <p>Rasters sobre a comparação: {coveringRasters.map(layer => layer.name).join(", ")}. Ajuste a visibilidade ou opacidade em Camadas.</p>}
        </div>
        <button type="button" className="temporal-compare-button" onClick={onExit}>Sair da comparação</button>
      </section>
    </div>
  );
}
