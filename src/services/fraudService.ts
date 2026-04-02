import { approveClaim, getFraudQueue, rejectClaim } from '../api/adminClient';

export const fraudService = {
  getFraudQueue,
  approveClaim,
  rejectClaim,
  removeFromQueueLocal: <T extends { id: string }>(queue: T[], claimId: string) => queue.filter((item) => item.id !== claimId),
};
