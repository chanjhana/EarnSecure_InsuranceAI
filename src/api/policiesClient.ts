import { apiRequest } from './http';

export type Policy = {
  policy_id: string;
  rider_id: string;
  status: 'active' | 'hold' | 'expired';
  week_start: string;
  week_end: string;
};

export type TriggerStatus = {
  trigger_type: string;
  threshold_label: string;
  is_armed: boolean;
  last_checked_at?: string;
  state?: 'idle' | 'watch' | 'fired';
};

export async function activatePolicy(riderId: string, upiId: string): Promise<Policy> {
  return apiRequest<Policy>('/policies/activate', {
    method: 'POST',
    body: { rider_id: riderId, upi_id: upiId },
  });
}

export async function getCurrentPolicy(riderId: string): Promise<{ policy: Policy; week_progress: number; next_premium: number; trigger_statuses: TriggerStatus[] }> {
  return apiRequest<{ policy: Policy; week_progress: number; next_premium: number; trigger_statuses: TriggerStatus[] }>(`/policies/${riderId}/current`);
}
