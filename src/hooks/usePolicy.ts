import { useEffect, useState } from 'react';
import { getCurrentPolicy } from '../api/policiesClient';

export function usePolicy(riderId?: string) {
  // TODO: Move to event-driven refresh when backend emits updates.
  const [data, setData] = useState<Awaited<ReturnType<typeof getCurrentPolicy>> | null>(null);

  useEffect(() => {
    if (!riderId) return;
    getCurrentPolicy(riderId).then(setData).catch(() => {
      // TODO: Add centralized error handling.
    });
  }, [riderId]);

  return { data };
}
