// Onboarding validators.

export function isValidIndianPhone(phone: string): boolean {
  return /^\+?91[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export function isValidUpiId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);
}
