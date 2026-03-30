// TODO: Implement OTP auth endpoints.
// POST /auth/send-otp
// POST /auth/verify-otp

export type SendOtpRequest = { phone: string };
export type VerifyOtpRequest = { phone: string; otp: string };

export async function sendOtp(_payload: SendOtpRequest): Promise<void> {
  // TODO: Call backend and handle cooldown/rate-limit errors.
}

export async function verifyOtp(_payload: VerifyOtpRequest): Promise<{ access_token: string; rider_id: string }> {
  // TODO: Return JWT + rider id and persist in auth store.
  return { access_token: '', rider_id: '' };
}
