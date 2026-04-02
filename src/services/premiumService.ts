import { calculatePremium } from '../api/premiumClient';

const premiumCache = new Map<string, Awaited<ReturnType<typeof calculatePremium>>>();

export const premiumService = {
  calculatePremium: async (riderId: string, forceRefresh = false) => {
    if (!forceRefresh && premiumCache.has(riderId)) {
      return premiumCache.get(riderId)!;
    }
    const result = await calculatePremium(riderId);
    premiumCache.set(riderId, result);
    return result;
  },
};
