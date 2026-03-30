import { approveClaim, getFraudQueue, rejectClaim } from '../api/adminClient';

export const fraudService = {
  // TODO: Add optimistic update flow for admin queue decisions.
  getFraudQueue,
  approveClaim,
  rejectClaim,
};
