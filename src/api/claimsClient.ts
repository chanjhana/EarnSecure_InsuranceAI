import { apiRequest } from './http';

export type Claim = {
  id: string;
  rider_id?: string;
  trigger_type: string;
  amount_paise: number;
  status: 'approved' | 'held' | 'rejected' | 'paid';
  created_at: string;
};

export async function getClaims(riderId: string): Promise<Claim[]> {
  return apiRequest<Claim[]>(`/claims/${riderId}`);
}

export async function getClaimDetail(claimId: string): Promise<{ claim: Claim; fraud_score: number; fraud_checks: Record<string, boolean | string>; trigger_event: Record<string, string | number> }> {
  return apiRequest<{ claim: Claim; fraud_score: number; fraud_checks: Record<string, boolean | string>; trigger_event: Record<string, string | number> }>(`/claims/${claimId}/detail`);
}
