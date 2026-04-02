import { apiRequest } from './http';
import { mockFraudQueue, mockPortfolioStats, mockSearchRiders, mockTriggerEvents, RiderSearchResult } from '../services/adminMockService';

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

export type PortfolioStats = {
  active_policies: number;
  loss_ratio: number;
  weekly_payouts_paise: number;
  fraud_queue_size: number;
};

export type RiderSearchResponse = {
  riders: RiderSearchResult[];
};

export async function getPortfolioStats(): Promise<PortfolioStats> {
  try {
    return await apiRequest<PortfolioStats>('/admin/portfolio');
  } catch {
    const queue = mockFraudQueue();
    const events = mockTriggerEvents();
    return mockPortfolioStats(queue, events);
  }
}

export async function getFraudQueue(): Promise<FraudQueueItem[]> {
  try {
    return await apiRequest<FraudQueueItem[]>('/admin/fraud-queue');
  } catch {
    return mockFraudQueue();
  }
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
  try {
    return await apiRequest<TriggerEvent[]>('/admin/trigger-events');
  } catch {
    return mockTriggerEvents();
  }
}

export async function searchRiders(query: string): Promise<RiderSearchResult[]> {
  const params = new URLSearchParams({ query });

  try {
    const response = await apiRequest<RiderSearchResponse>(`/admin/riders?${params.toString()}`);
    return response.riders;
  } catch {
    return mockSearchRiders(query);
  }
}

export async function fireDemoTrigger(payload: { pin_code: string; trigger_type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog' }): Promise<{ fired: boolean; event_id: string }> {
  return apiRequest<{ fired: boolean; event_id: string }>('/admin/demo/fire-trigger', {
    method: 'POST',
    body: payload,
  });
}

export async function login(password: string): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>('/auth/admin/login', {
    method: 'POST',
    body: { password },
  });
}
