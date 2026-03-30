// TODO: Implement policy activation/current-policy endpoints.
// POST /policies/activate
// GET /policies/{rider_id}/current

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
};

export async function activatePolicy(_riderId: string, _upiId: string): Promise<Policy> {
  // TODO: Schedule debit and create policy record.
  return { policy_id: '', rider_id: '', status: 'active', week_start: '', week_end: '' };
}

export async function getCurrentPolicy(_riderId: string): Promise<{ policy: Policy; week_progress: number; next_premium: number; trigger_statuses: TriggerStatus[] }> {
  // TODO: Drive rider dashboard home screen.
  return {
    policy: { policy_id: '', rider_id: '', status: 'active', week_start: '', week_end: '' },
    week_progress: 0,
    next_premium: 0,
    trigger_statuses: [],
  };
}
