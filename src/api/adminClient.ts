import { apiRequest } from './http';

export type FraudQueueItem = {
  id: string;
  rider_id: string;
  fraud_score: number;
  flag_reason: string;
  trigger_type: string;
};

export type TriggerEvent = {
  event_id: string;
  trigger_type: string;
  zone: string;
  metric: number;
  threshold: string;
  observed_at: string;
  status: 'pending' | 'processing' | 'approved' | 'held' | 'paid' | 'rejected';
  affected_riders: number;
};

export async function getPortfolioStats(): Promise<{ active_policies: number; loss_ratio: number; weekly_payouts_paise: number; fraud_queue_size: number }> {
  return apiRequest<{ active_policies: number; loss_ratio: number; weekly_payouts_paise: number; fraud_queue_size: number }>('/admin/portfolio');
}

export async function getFraudQueue(): Promise<FraudQueueItem[]> {
  return apiRequest<FraudQueueItem[]>('/admin/fraud-queue');
}

export async function approveClaim(claimId: string, reviewerNote: string): Promise<{ approved: boolean }> {
  return apiRequest<{ approved: boolean }>(`/admin/claims/${claimId}/approve`, {
    method: 'POST',
    body: { reviewer_note: reviewerNote },
  });
}

export async function rejectClaim(claimId: string, reason: string): Promise<{ rejected: boolean }> {
  return apiRequest<{ rejected: boolean }>(`/admin/claims/${claimId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export async function getTriggerEvents(): Promise<TriggerEvent[]> {
  return apiRequest<TriggerEvent[]>('/admin/trigger-events');
}

export async function fireDemoTrigger(payload: { pin_code: string; trigger_type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog' }): Promise<{ fired: boolean; event_id: string }> {
  return apiRequest<{ fired: boolean; event_id: string }>('/admin/demo/fire-trigger', {
    method: 'POST',
    body: payload,
  });
}
