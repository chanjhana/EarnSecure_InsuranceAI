import { useSyncExternalStore } from 'react';

import { Policy } from '../api/policiesClient';

export type PolicyState = {
  activePolicyId: string | null;
  lastRefreshAt: string | null;
  policy: Policy | null;
  nextPremium: number;
  weekProgress: number;
};

const initialPolicyState: PolicyState = {
  activePolicyId: null,
  lastRefreshAt: null,
  policy: null,
  nextPremium: 0,
  weekProgress: 0,
};

let state: PolicyState = initialPolicyState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPolicyState(): PolicyState {
  return state;
}

export function setPolicySnapshot(payload: { policy: Policy; nextPremium: number; weekProgress: number }) {
  state = {
    ...state,
    activePolicyId: payload.policy.policy_id,
    policy: payload.policy,
    nextPremium: payload.nextPremium,
    weekProgress: payload.weekProgress,
    lastRefreshAt: new Date().toISOString(),
  };
  emit();
}

export function clearPolicySnapshot() {
  state = { ...initialPolicyState };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePolicyStore(): PolicyState {
  return useSyncExternalStore(subscribe, getPolicyState, getPolicyState);
}
