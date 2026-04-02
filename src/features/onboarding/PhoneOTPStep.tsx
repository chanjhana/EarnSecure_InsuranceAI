import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OTPInput } from '../../components/forms/OTPInput';
import { PhoneInput } from '../../components/forms/PhoneInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { authService } from '../../services/authService';
import { colors } from '../../theme/colors';
import { isValidIndianPhone, isValidOtp } from '../../utils/validators';

type PhoneOTPStepProps = {
  onVerified: (payload: { phone: string; jwt: string; riderId: string }) => void;
  resendCooldown?: number;
};

export function PhoneOTPStep({ onVerified, resendCooldown = 30 }: PhoneOTPStepProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isTestEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV === 'test';
    if (isTestEnv) {
      return;
    }
    if (!countdown) return;
    const timer = setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!isValidIndianPhone(phone)) {
      setError('Enter a valid phone number to continue.');
      return;
    }

    setLoadingSend(true);
    setError(null);
    try {
      await authService.sendOtp(phone);
      setOtpSent(true);
      setCountdown(resendCooldown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.');
    } finally {
      setLoadingSend(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isValidOtp(otp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }

    setLoadingVerify(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(phone, otp);
      onVerified({
        phone,
        jwt: result.access_token,
        riderId: result.rider_id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EarnSecure</Text>
      <Text style={styles.subtitle}>Income protection for delivery riders</Text>

      <PhoneInput value={phone} onChangeText={setPhone} />
      <PrimaryButton label={otpSent ? 'Resend OTP' : 'Send OTP'} onPress={handleSendOtp} loading={loadingSend} disabled={countdown > 0} />

      {otpSent ? (
        <View style={styles.otpBlock}>
          <OTPInput value={otp} onChangeText={setOtp} onComplete={handleVerifyOtp} />
          <PrimaryButton label="Verify" onPress={handleVerifyOtp} loading={loadingVerify} />
          <Text style={styles.helper}>OTP sent via SMS. {countdown > 0 ? `Resend in ${countdown}s` : 'You can resend now.'}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  otpBlock: { gap: 10 },
  helper: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  error: { color: colors.coral, fontSize: 12 },
});
