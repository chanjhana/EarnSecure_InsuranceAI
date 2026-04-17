import { calculatePremium } from '../api/premiumClient';

type PremiumPayload = { rider_id: string; pin_code: string; shift_windows: string[]; zones: string[] };

const premiumCache = new Map<string, Awaited<ReturnType<typeof calculatePremium>>>();

export const premiumService = {
  calculatePremium: async (payload: PremiumPayload, forceRefresh = false) => {
    // Generate a unique cache key based on the specific parameters
    const cacheKey = `${payload.rider_id}-${payload.pin_code}-${payload.shift_windows.join(',')}-${payload.zones.join(',')}`;
    
    if (!forceRefresh && premiumCache.has(cacheKey)) {
      return premiumCache.get(cacheKey)!;
    }
    
    const result = await calculatePremium(payload);
    premiumCache.set(cacheKey, result);
    return result;
  },
};
