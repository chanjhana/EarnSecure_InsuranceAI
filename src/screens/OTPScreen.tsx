import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type OTPScreenProps = {
  phone: string;
  otp: string;
  onChangeOtp: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  verifying?: boolean;
  error?: string | null;
};

const OTP_LENGTH = 6;

export function OTPScreen({ phone, otp, onChangeOtp, onNext, onBack, verifying = false, error }: OTPScreenProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = otp.split('').slice(0, OTP_LENGTH);
    return [...initial, ...Array(Math.max(OTP_LENGTH - initial.length, 0)).fill('')];
  });

  useEffect(() => {
    const next = digits.join('').slice(0, OTP_LENGTH);
    onChangeOtp(next);
  }, [digits, onChangeOtp]);

  const displayPhone = useMemo(() => phone || '98765 43210', [phone]);

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="OTP verification screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>VERIFICATION</Text>
            <Text style={styles.heroTitle}>
              OTP sent to{`\n`}
              <Text style={styles.heroAccent}>+91 {displayPhone}</Text>
            </Text>
            <Text style={styles.heroSub}>Enter the 6-digit code sent via SMS to verify your identity.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>6-digit OTP</Text>
            <View style={styles.otpRow}>
              {digits.map((value, index) => (
                <TextInput
                  key={`otp-${index}`}
                  style={[styles.otpBox, value ? styles.otpFilled : null]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={value}
                  onChangeText={(text) =>
                    setDigits((prev) => {
                      const next = [...prev];
                      next[index] = text.replace(/[^0-9]/g, '');
                      return next;
                    })
                  }
                  accessible
                  accessibilityLabel={`OTP digit ${index + 1}`}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, verifying ? styles.primaryButtonDisabled : null]}
              onPress={onNext}
              disabled={verifying}
              accessible
              accessibilityLabel="Verify and continue"
            >
              <Text style={styles.primaryButtonText}>{verifying ? 'Verifying...' : 'Verify & Continue →'}</Text>
            </TouchableOpacity>
            <Text style={styles.resendText}>
              Resend in <Text style={styles.resendAccent}>28s</Text>
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity onPress={onBack} style={styles.backButton} accessible accessibilityLabel="Back">
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  content: { width: '100%', maxWidth: 420 },
  stepBar: { flexDirection: 'row', paddingTop: spacing.xl },
  stepDot: { flex: 1, height: 3, borderRadius: 99, backgroundColor: colors.border, marginRight: 6 },
  stepDone: { backgroundColor: colors.primary },
  stepActive: { backgroundColor: colors.primary, opacity: 0.5 },
  heroSection: { paddingTop: 28, paddingBottom: spacing.lg },
  heroTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.text, lineHeight: 32, letterSpacing: -0.5 },
  heroAccent: { color: colors.primary },
  heroSub: { fontSize: 13, color: colors.textSubtle, marginTop: spacing.sm, lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  otpRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  otpBox: {
    width: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 4,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  otpFilled: { borderColor: colors.primary, color: colors.primary },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  resendText: { textAlign: 'center', marginTop: spacing.md, fontSize: 12, color: colors.textSubtle },
  resendAccent: { color: colors.primary, fontWeight: '700' },
  errorText: { color: colors.coral, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  backButton: { marginTop: spacing.xl, alignSelf: 'center' },
  backButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
