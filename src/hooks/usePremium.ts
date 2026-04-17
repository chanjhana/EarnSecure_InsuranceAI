import { useRef, useState } from 'react';
import { calculatePremium } from '../api/premiumClient';

type PremiumPayload = { rider_id: string; pin_code: string; shift_windows: string[]; zones: string[] };

export function usePremium() {
  const [data, setData] = useState<Awaited<ReturnType<typeof calculatePremium>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const run = async (payload: PremiumPayload) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setLoading(true);
    try {
      // Pass the full payload object here instead of just riderId
      const result = await calculatePremium(payload);
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
