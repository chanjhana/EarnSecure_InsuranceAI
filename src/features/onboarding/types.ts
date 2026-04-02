import { Platform } from '../../api/ridersClient';
import { TriggerCoverage } from '../../api/premiumClient';

export type ShiftWindow = 'morning' | 'afternoon' | 'evening' | 'night';

export type OnboardingState = {
  phone?: string;
  token?: string;
  riderId?: string;
  platform?: Platform;
  platformRiderId?: string;
  activitySummary?: { d30_orders: number; avg_daily: number; zones: string[] };
  pinCode?: string;
  zones?: string[];
  shiftWindows?: ShiftWindow[];
  premiumPaise?: number;
  premiumModelInputs?: Record<string, string | number>;
  covers?: TriggerCoverage[];
  upiId?: string;
  policyId?: string;
};
