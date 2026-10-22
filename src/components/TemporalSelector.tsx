import { useId } from "react";
import type { LayerStatus, ProjectLayerConfig } from "../projects/types";
import "./TemporalSelector.css";

interface Props {
  layers: ProjectLayerConfig[];
  visible: Set<string>;
  statuses: Record<string, LayerStatus>;
  onToggle: (id: string) => void;
}

export function TemporalSelector({ layers, visible, statuses, onToggle }: Props) {
  const headingId = useId();
  const campaigns = layers.flatMap(layer => layer.temporalCampaign ? [{ id: layer.id, ...layer.temporalCampaign }] : []);
  if (campaigns.length === 0) return null;
  const active = campaigns.find(campaign => visible.has(campaign.id));
  const status = active ? statuses[active.id] : undefined;

  return (
    <section className="temporal-selector" aria-labelledby={headingId}>
      <h4 id={headingId}>Evolução Temporal</h4>
      <div className="temporal-options" role="group" aria-label="Campanhas de ortomosaicos">
        {campaigns.map(campaign => (
          <button
            key={campaign.id}
            type="button"
            aria-label={campaign.label + " — " + campaign.description}
            aria-pressed={visible.has(campaign.id)}
            title={campaign.description}
            onClick={() => {
              // Selecting the active campaign keeps it on; manual checkboxes
              // may turn all campaigns off. Both use the same visibility state.
              if (!visible.has(campaign.id)) onToggle(campaign.id);
            }}
          >{campaign.label}</button>
        ))}
      </div>
      <p className="temporal-active" role="status" aria-live="polite" aria-atomic="true">
        {active ? <><strong>{active.label}</strong> — {active.description}</> : "Nenhum ortomosaico ativo"}
        {status === "loading" && <span>Carregando campanha…</span>}
        {status === "error" && <span>Campanha indisponível. Verifique a fonte e a conexão.</span>}
      </p>
    </section>
  );
}
