import { sendOtp, verifyOtp } from '../api/authClient';

export const authService = {
  // TODO: Add telemetry/error mapping around auth requests.
  sendOtp,
  verifyOtp,
};
