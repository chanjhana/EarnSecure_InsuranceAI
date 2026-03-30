import { useState } from 'react';
import { calculatePremium } from '../api/premiumClient';

export function usePremium() {
  // TODO: Add cancellation to avoid stale updates.
  const [data, setData] = useState<Awaited<ReturnType<typeof calculatePremium>> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (riderId: string) => {
    setLoading(true);
    try {
      const result = await calculatePremium(riderId);
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, run };
}
