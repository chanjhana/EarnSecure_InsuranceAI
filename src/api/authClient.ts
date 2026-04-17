import { apiRequest } from './http';

export type SendOtpRequest = { phone: string };
export type VerifyOtpRequest = { phone: string; otp: string };
export type CompleteSignupRequest = { rider_id: string; vehicle_number: string; legal_name: string; password: string };
export type AuthSuccessResponse = { access_token: string; rider_id: string; legal_name?: string | null };

export async function sendOtp(payload: SendOtpRequest): Promise<{ sent: boolean; otp?: string }> {
  return apiRequest<{ sent: boolean; otp?: string }>('/auth/send-otp', {
    method: 'POST',
    body: payload,
  });
}

export async function riderLogin(payload: { phone: string; password: string }): Promise<AuthSuccessResponse> {
  return apiRequest<AuthSuccessResponse>('/auth/rider/login', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyOtp(payload: VerifyOtpRequest): Promise<AuthSuccessResponse> {
  return apiRequest<AuthSuccessResponse>('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  });
}

export async function completeSignup(payload: CompleteSignupRequest): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/auth/complete-signup', {
    method: 'POST',
    body: payload,
  });
}
