// TODO: Track active policy and refresh metadata.

export type PolicyState = {
  activePolicyId: string | null;
  lastRefreshAt: string | null;
};

export const initialPolicyState: PolicyState = {
  activePolicyId: null,
  lastRefreshAt: null,
};
