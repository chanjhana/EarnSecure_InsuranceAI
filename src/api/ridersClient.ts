import { apiRequest } from './http';

export type Platform = 'swiggy' | 'zomato';

export async function linkPlatform(payload: { platform: Platform; rider_id: string }): Promise<{ valid: boolean; activity_summary: { d30_orders: number; avg_daily: number; zones: string[] } }> {
  return apiRequest<{ valid: boolean; activity_summary: { d30_orders: number; avg_daily: number; zones: string[] } }>('/riders/link-platform', {
    method: 'POST',
    body: payload,
  });
}

export async function updateRiderProfile(payload: { rider_id: string; pin_code: string; shift_window: 'morning' | 'afternoon' | 'evening' | 'night'; upi_id?: string }): Promise<{ updated: boolean }> {
  return apiRequest<{ updated: boolean }>(`/riders/${payload.rider_id}/profile`, {
    method: 'PUT',
    body: payload,
  });
}
