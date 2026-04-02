import { getClaimDetail, getClaims } from '../api/claimsClient';

export const payoutService = {
  getClaims,
  getClaimDetail,
  getWeeklyTotal: async (riderId: string) => {
    const claims = await getClaims(riderId);
    return claims
      .filter((claim) => claim.status === 'paid' || claim.status === 'approved')
      .reduce((total, claim) => total + claim.amount_paise, 0);
  },
};
