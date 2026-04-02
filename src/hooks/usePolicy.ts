import { useEffect, useState } from 'react';
import { getCurrentPolicy } from '../api/policiesClient';
import { setPolicySnapshot, usePolicyStore } from '../store/policyStore';

export function usePolicy(riderId?: string) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getCurrentPolicy>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const policyState = usePolicyStore();

  useEffect(() => {
    if (!riderId) return;

    let mounted = true;

    const run = async () => {
      setLoading(true);
      try {
        const result = await getCurrentPolicy(riderId);
        if (!mounted) return;
        setData(result);
        setError(null);
        setPolicySnapshot({
          policy: result.policy,
          nextPremium: result.next_premium,
          weekProgress: result.week_progress,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load policy.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();
    const intervalId = setInterval(run, 15 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [riderId]);

  return { data, loading, error, policyState };
}
