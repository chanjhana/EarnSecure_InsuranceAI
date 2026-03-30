// TODO: Implement premium model endpoint.
// POST /premium/calculate

export type TriggerCoverage = {
  type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog';
  min_paise: number;
  max_paise: number;
};

export async function calculatePremium(_riderId: string): Promise<{ premium_paise: number; gbr_score: number; cohort_adj: number; model_inputs: Record<string, number | string>; covers: TriggerCoverage[] }> {
  // TODO: Trigger backend GBR model and return explainability inputs.
  return { premium_paise: 0, gbr_score: 0, cohort_adj: 0, model_inputs: {}, covers: [] };
}
