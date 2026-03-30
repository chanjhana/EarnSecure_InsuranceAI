// TODO: Implement admin endpoints.
// GET /admin/portfolio
// GET /admin/fraud-queue
// POST /admin/claims/{claim_id}/approve
// POST /admin/claims/{claim_id}/reject

export async function getPortfolioStats(): Promise<{ active_policies: number; loss_ratio: number; weekly_payouts_paise: number; fraud_queue_size: number }> {
  // TODO: Feed admin stat cards.
  return { active_policies: 0, loss_ratio: 0, weekly_payouts_paise: 0, fraud_queue_size: 0 };
}

export async function getFraudQueue(): Promise<Array<{ id: string; rider_id: string; fraud_score: number; flag_reason: string; trigger_type: string }>> {
  // TODO: Feed fraud queue table.
  return [];
}

export async function approveClaim(_claimId: string, _reviewerNote: string): Promise<void> {
  // TODO: Mark approved and release payout.
}

export async function rejectClaim(_claimId: string, _reason: string): Promise<void> {
  // TODO: Mark rejected and notify rider.
}
