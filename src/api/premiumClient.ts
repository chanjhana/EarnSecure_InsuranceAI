import { apiRequest } from './http';

export type PremiumBreakdown = {
  weather_risk: {
    rain_probability: number;
    max_rainfall_mm: number;
    max_heat_index: number;
    min_visibility_m: number;
    rainy_days: number;
    contribution: number;
  };
  shift_risk: {
    shifts: string[];
    contribution: number;
  };
  zone_risk: {
    zone_count: number;
    contribution: number;
  };
};

export type TriggerCoverage = {
  type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog' | 'traffic' | 'roadblock';
  min_paise: number;
  max_paise: number;
};

export type PremiumResponse = {
  weekly_premium_paise: number;
  weekly_premium_inr: number;
  risk_score: number;
  breakdown: PremiumBreakdown;
  city_name: string;
  forecast_source: string;
  model: string;
};

export async function calculatePremium(payload: { rider_id: string; pin_code: string; shift_windows: string[]; zones: string[] }): Promise<PremiumResponse> {
  return apiRequest<PremiumResponse>('/premium/calculate', {
    method: 'POST',
    body: payload,
  });
}
