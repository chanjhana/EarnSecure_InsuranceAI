import { apiRequest } from './http';

export type Platform = 'swiggy' | 'zomato';

export type TrafficSnapshot = {
  pin_code: string;
  bbox: string;
  jam_factor: number;
  severe_incidents: number;
  roadblocks: number;
  incidents_total: number;
  observed_at: string;
  source: string;
};

export async function linkPlatform(payload: { platform: Platform; rider_id: string }): Promise<{ valid: boolean; activity_summary: { d30_orders: number; avg_daily: number; zones: string[] } }> {
  return apiRequest<{ valid: boolean; activity_summary: { d30_orders: number; avg_daily: number; zones: string[] } }>('/riders/link-platform', {
    method: 'POST',
    body: payload,
  });
}

export async function updateRiderProfile(payload: { rider_id: string; pin_code: string; zones: string[]; shift_windows: ('morning' | 'afternoon' | 'evening' | 'night')[]; upi_id?: string }): Promise<{ updated: boolean }> {
  return apiRequest<{ updated: boolean }>(`/riders/${payload.rider_id}/profile`, {
    method: 'PUT',
    body: payload,
  });
}

export async function getZones(pincode: string): Promise<{ zones: string[] }> {
  return apiRequest<{ zones: string[] }>(`/riders/zones?pincode=${pincode}`);
}

export async function getTrafficFactor(pincode: string): Promise<TrafficSnapshot> {
  return apiRequest<TrafficSnapshot>(`/riders/traffic?pincode=${pincode}`);
}
