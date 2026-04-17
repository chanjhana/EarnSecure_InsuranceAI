import { apiRequest } from './http';
import { AccountStatusCode, PaymentRecord } from './paymentsClient';

export type { AccountStatusCode, PaymentRecord };

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

export type RiderSearchResult = {
  rider_id: string;
  name: string;
  phone: string;
  platform: 'swiggy' | 'zomato' | 'zepto' | 'blinkit' | 'unknown';
  home_zone: string;
  orders_d30: number;
  claims_d30: number;
  paid_claims_d30: number;
  paid_amount_paise_d30: number;
  risk_score: number;
  approval_rate: number;
  last_seen_at: string;
  account_status?: AccountStatusCode;
};

export async function getPortfolioStats(): Promise<PortfolioStats> {
  return apiRequest<PortfolioStats>('/admin/portfolio');
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

export async function searchRiders(query: string): Promise<RiderSearchResult[]> {
  const params = new URLSearchParams({ query });

  return apiRequest<RiderSearchResult[]>(`/admin/riders?${params.toString()}`);
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

export type RiderVerificationInfo = {
  rider_id: string;
  legal_name: string;
  vehicle_number: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  account_status?: AccountStatusCode;
};

export type AccountStatusOption = {
  code: AccountStatusCode;
  label: string;
  description: string;
};

export async function getRidersForVerification(): Promise<RiderVerificationInfo[]> {
  return apiRequest<RiderVerificationInfo[]>('/admin/riders/verification');
}

export async function verifyRider(riderId: string): Promise<{ verified: boolean }> {
  return apiRequest<{ verified: boolean }>(`/admin/riders/${riderId}/verify`, {
    method: 'POST',
  });
}

export async function getPendingPayments(): Promise<PaymentRecord[]> {
  return apiRequest<PaymentRecord[]>('/admin/payments/pending');
}

export async function confirmPayment(
  paymentId: string,
  payload: { approve: boolean; admin_note?: string; account_status?: AccountStatusCode },
): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/admin/payments/${paymentId}/confirm`, {
    method: 'POST',
    body: payload,
  });
}

export async function getAccountStatusOptions(): Promise<AccountStatusOption[]> {
  return apiRequest<AccountStatusOption[]>('/admin/account-status-options');
}

export async function setRiderAccountStatus(
  riderId: string,
  payload: { account_status: AccountStatusCode; note?: string },
): Promise<{ updated: boolean; rider_id: string; account_status: AccountStatusCode }> {
  return apiRequest<{ updated: boolean; rider_id: string; account_status: AccountStatusCode }>(
    `/admin/riders/${riderId}/account-status`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function getOutageStatus(): Promise<Record<string, any>> {
  return apiRequest<Record<string, any>>('/admin/outage-status');
}
