import { apiRequest } from './http';

export type SendOtpRequest = { phone: string };
export type VerifyOtpRequest = { phone: string; otp: string };

export async function sendOtp(payload: SendOtpRequest): Promise<{ sent: boolean; otp?: string }> {
  return apiRequest<{ sent: boolean; otp?: string }>('/auth/send-otp', {
    method: 'POST',
    body: payload,
  });
}

export async function riderLogin(payload: { phone: string; password: string }): Promise<{ access_token: string; rider_id: string }> {
  return apiRequest<{ access_token: string; rider_id: string }>('/auth/rider/login', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyOtp(payload: VerifyOtpRequest): Promise<{ access_token: string; rider_id: string }> {
  return apiRequest<{ access_token: string; rider_id: string }>('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  });
}
