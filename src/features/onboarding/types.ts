import { Platform } from '../../api/ridersClient';

export type ShiftWindow = 'morning' | 'afternoon' | 'evening' | 'night';

export type OnboardingState = {
  phone?: string;
  token?: string;
  riderId?: string;
  platform?: Platform;
  pinCode?: string;
  shiftWindow?: ShiftWindow;
  premiumPaise?: number;
  upiId?: string;
};
