import { useRef, useState } from 'react';
import { calculatePremium } from '../api/premiumClient';

export function usePremium() {
  const [data, setData] = useState<Awaited<ReturnType<typeof calculatePremium>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const run = async (riderId: string) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setLoading(true);
    try {
      const result = await calculatePremium(riderId);
      if (requestId === requestIdRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Unable to calculate premium.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  return { data, loading, error, run };
}
