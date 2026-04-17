import { riderLogin, sendOtp, verifyOtp } from '../api/authClient';

export const authService = {
  sendOtp: async (phone: string) => sendOtp({ phone }),
  verifyOtp: async (phone: string, otp: string) => verifyOtp({ phone, otp }),
  riderLogin: async (phone: string, password: string) => riderLogin({ phone, password }),
};
