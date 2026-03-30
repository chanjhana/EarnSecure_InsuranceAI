import { useState } from 'react';

export function useAuth() {
  // TODO: Wire to authStore with persistence.
  const [token, setToken] = useState<string | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);

  return {
    token,
    riderId,
    isAuthenticated: Boolean(token),
    setSession: (nextToken: string, nextRiderId: string) => {
      setToken(nextToken);
      setRiderId(nextRiderId);
    },
    clearSession: () => {
      setToken(null);
      setRiderId(null);
    },
  };
}
