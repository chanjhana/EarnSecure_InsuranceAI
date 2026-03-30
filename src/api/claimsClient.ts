// TODO: Implement claims endpoints.
// GET /claims/{rider_id}
// GET /claims/{claim_id}/detail

export type Claim = {
  id: string;
  trigger_type: string;
  amount_paise: number;
  status: 'approved' | 'held' | 'rejected' | 'paid';
  created_at: string;
};

export async function getClaims(_riderId: string): Promise<Claim[]> {
  // TODO: Return payout history sorted desc.
  return [];
}

export async function getClaimDetail(_claimId: string): Promise<{ claim: Claim; fraud_score: number; fraud_checks: Record<string, boolean>; trigger_event: Record<string, string | number> }> {
  // TODO: Return deep details for "View details".
  return {
    claim: { id: '', trigger_type: '', amount_paise: 0, status: 'approved', created_at: '' },
    fraud_score: 0,
    fraud_checks: {},
    trigger_event: {},
  };
}
