import type { ProjectLayerConfig } from "../projects/types";

export interface CampaignEntry {
  id: string;
  label: string;
  description: string;
  year: string;
  period: string;
  eventAfter?: string;
}

// "2024 — Pré-fogo" becomes year "2024" and period "Pré-fogo"; without a
// comparison label the campaign label and description are used as they are.
export function campaignEntries(layers: ProjectLayerConfig[]): CampaignEntry[] {
  return layers.flatMap(layer => {
    const campaign = layer.temporalCampaign;
    if (!campaign) return [];
    const [year, period] = campaign.comparisonLabel?.split(" — ") ?? [];
    return [{
      id: layer.id,
      label: campaign.label,
      description: campaign.description,
      year: period ? year : campaign.label,
      period: period ?? campaign.description,
      eventAfter: campaign.eventAfter,
    }];
  });
}
