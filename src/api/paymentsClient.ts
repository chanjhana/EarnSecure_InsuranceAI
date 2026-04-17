import { apiRequest } from './http';

export type AccountStatusCode =
  | 'O1_OTP_SENT_NOT_VERIFIED'
  | 'O2_OTP_VERIFIED_PROFILE_PENDING'
  | 'O3_PROFILE_COMPLETED'
  | 'O4_PLATFORM_LINKED'
  | 'O5_POLICY_ACTIVE_PAYMENT_PENDING'
  | 'O6_PAYMENT_SUBMITTED_ADMIN_REVIEW'
  | 'O7_PAYMENT_CONFIRMED_WEEK_ACTIVE'
  | 'O8_PAYMENT_REJECTED_ACTION_REQUIRED'
  | 'O9_ACCOUNT_SUSPENDED';

export type PaymentRecord = {
  payment_id: string;
  rider_id: string;
  provider: 'upi_qr' | 'razorpay';
  status: 'initiated' | 'pending_admin_confirmation' | 'confirmed' | 'rejected' | 'failed';
  amount_paise: number;
  created_at: string;
  updated_at: string;
  upi_uri?: string;
  qr_image_url?: string;
  upi_transaction_id?: string;
  payer_upi_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  checkout_key?: string;
  checkout_url?: string;
  account_status?: AccountStatusCode;
  admin_note?: string;
};

export async function createUpiQrPayment(payload: {
  rider_id: string;
  upi_id: string;
  amount_paise: number;
  note?: string;
}): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>('/payments/upi-qr/create', {
    method: 'POST',
    body: payload,
  });
}

export async function submitUpiQrTransaction(payload: {
  payment_id: string;
  rider_id: string;
  upi_transaction_id: string;
  payer_upi_id: string;
}): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>('/payments/upi-qr/submit', {
    method: 'POST',
    body: payload,
  });
}

export async function createRazorpayOrder(payload: {
  rider_id: string;
  amount_paise: number;
  upi_id?: string;
}): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>('/payments/razorpay/create-order', {
    method: 'POST',
    body: payload,
  });
}

export async function getPayment(paymentId: string): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/payments/id/${paymentId}`);
}

export async function getRiderPayments(riderId: string): Promise<PaymentRecord[]> {
  return apiRequest<PaymentRecord[]>(`/payments/rider/${riderId}`);
}
