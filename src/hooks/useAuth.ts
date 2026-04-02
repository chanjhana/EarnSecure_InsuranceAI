import { clearAuthSession, setAuthSession, useAuthStore } from '../store/authStore';

export function useAuth() {
  const { token, riderId } = useAuthStore();

  return {
    token,
    riderId,
    isAuthenticated: Boolean(token),
    setSession: (nextToken: string, nextRiderId: string) => {
      setAuthSession(nextToken, nextRiderId);
    },
    clearSession: () => {
      clearAuthSession();
    },
  };
}
