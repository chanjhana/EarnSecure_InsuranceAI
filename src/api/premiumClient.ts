import { apiRequest } from './http';

export type TriggerCoverage = {
  type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog';
  min_paise: number;
  max_paise: number;
};

export async function calculatePremium(riderId: string): Promise<{ premium_paise: number; gbr_score: number; cohort_adj: number; model_inputs: Record<string, number | string>; covers: TriggerCoverage[] }> {
  return apiRequest<{ premium_paise: number; gbr_score: number; cohort_adj: number; model_inputs: Record<string, number | string>; covers: TriggerCoverage[] }>('/premium/calculate', {
    method: 'POST',
    body: { rider_id: riderId },
  });
}
