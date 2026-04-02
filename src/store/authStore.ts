import { useSyncExternalStore } from 'react';

export type AuthState = {
  token: string | null;
  riderId: string | null;
};

const initialAuthState: AuthState = {
  token: null,
  riderId: null,
};

let state: AuthState = initialAuthState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getAuthState(): AuthState {
  return state;
}

export function setAuthSession(token: string, riderId: string) {
  state = { token, riderId };
  emit();
}

export function clearAuthSession() {
  state = { ...initialAuthState };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthStore(): AuthState {
  return useSyncExternalStore(subscribe, getAuthState, getAuthState);
}
