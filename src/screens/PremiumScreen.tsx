import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type PremiumScreenProps = {
  premium: number;
  upiId: string;
  onChangeUpiId: (value: string) => void;
  qrImageUrl?: string | null;
  paymentMode: 'idle' | 'qr_generated' | 'submitted';
  transactionUpiId: string;
  loading?: boolean;
  onChangeTransactionUpiId: (value: string) => void;
  onGenerateQr: () => void;
  onSubmitQr: () => void;
  onPayWithRazorpay: () => void;
  onBack: () => void;
};

export function PremiumScreen({
  premium,
  upiId,
  onChangeUpiId,
  qrImageUrl,
  paymentMode,
  transactionUpiId,
  loading = false,
  onChangeTransactionUpiId,
  onGenerateQr,
  onSubmitQr,
  onPayWithRazorpay,
  onBack,
}: PremiumScreenProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value }) => setDisplayValue(Math.round(value)));
    Animated.timing(animatedValue, {
      toValue: premium,
      duration: 900,
      useNativeDriver: false,
    }).start();
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue, premium]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );

    pulseLoop.start();
    return () => {
      pulseLoop.stop();
    };
  }, [pulse]);

  const premiumLabel = useMemo(() => `₹${displayValue}`, [displayValue]);

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Premium reveal screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionOverline}>LIVE RISK ASSESSMENT · Coimbatore</Text>
          </View>

          <View style={styles.weatherLive}>
            <View style={styles.weatherHeader}>
              <Text style={styles.weatherTitle}>Real-time weather feed</Text>
              <View style={styles.liveWrap}>
                <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                <Text style={styles.liveText}>LIVE · OWM API</Text>
              </View>
            </View>
            <View style={styles.weatherGrid}>{/* CSS grid mapped to flex row layout for RN */}
              <View style={styles.weatherMetric}>
                <Text style={styles.weatherValue}>32°C</Text>
                <Text style={styles.weatherLabel}>Feels like</Text>
                <Text style={styles.weatherTrend}>↑ Heat index</Text>
              </View>
              <View style={styles.weatherMetric}>
                <Text style={styles.weatherValue}>68%</Text>
                <Text style={styles.weatherLabel}>Humidity</Text>
                <Text style={styles.weatherTrend}>↑ Rain likely</Text>
              </View>
              <View style={styles.weatherMetric}>
                <Text style={styles.weatherValue}>AQI 87</Text>
                <Text style={styles.weatherLabel}>Air quality</Text>
                <Text style={styles.weatherTrend}>Moderate</Text>
              </View>
            </View>
            <View style={styles.riskWrap}>
              <View style={styles.riskLabelRow}>
                <Text style={styles.riskLabel}>Weather risk this week</Text>
                <Text style={styles.riskAccent}>Moderate — 3 rainy days forecast</Text>
              </View>
              <View style={styles.riskBar}>
                <View style={[styles.riskFill, { width: '42%' }]} />
              </View>
            </View>
          </View>

          <View style={styles.premiumReveal}>
            <Text style={styles.premiumLabel}>Your weekly premium</Text>
            <Animated.Text style={styles.premiumAmount}>{premiumLabel}</Animated.Text>
            <Text style={styles.premiumSub}>Auto-debit every Monday · UPI</Text>
            <Text style={styles.premiumModel}>GBR-weather-v2 · Live forecast signals</Text>
          </View>

          <Text style={styles.sectionLabel}>What's covered</Text>
          <View style={styles.coverWrap}>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🌧️</Text>
              <Text style={styles.coverText}>Rain </Text>
              <Text style={styles.coverPayout}>₹300–600</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🔥</Text>
              <Text style={styles.coverText}>Heat </Text>
              <Text style={styles.coverPayout}>₹400–700</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>📡</Text>
              <Text style={styles.coverText}>Outage </Text>
              <Text style={styles.coverPayout}>₹300–500</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>😷</Text>
              <Text style={styles.coverText}>AQI </Text>
              <Text style={styles.coverPayout}>₹300–400</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🌫️</Text>
              <Text style={styles.coverText}>Fog </Text>
              <Text style={styles.coverPayout}>₹300</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🏪</Text>
              <Text style={styles.coverText}>Closure </Text>
              <Text style={styles.coverPayout}>₹300–400</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🚦</Text>
              <Text style={styles.coverText}>Traffic </Text>
              <Text style={styles.coverPayout}>₹300–450</Text>
            </View>
            <View style={styles.coverPill}>
              <Text style={styles.coverIcon}>🚧</Text>
              <Text style={styles.coverText}>Roadblock </Text>
              <Text style={styles.coverPayout}>₹350–500</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Trigger monitors armed</Text>
          <View style={styles.triggerList}>
            <View style={styles.triggerRow}>
              <View>
                <Text style={styles.triggerName}>🌧 RAINFALL</Text>
                <Text style={styles.triggerThresh}>≥ 64.5mm daily</Text>
              </View>
              <Text style={[styles.triggerState, styles.triggerArmed]}>ARMED</Text>
            </View>
            <View style={styles.triggerRow}>
              <View>
                <Text style={styles.triggerName}>🔥 HEAT INDEX</Text>
                <Text style={styles.triggerThresh}>≥ 42°C feels-like</Text>
              </View>
              <Text style={[styles.triggerState, styles.triggerArmed]}>ARMED</Text>
            </View>
            <View style={styles.triggerRow}>
              <View>
                <Text style={styles.triggerName}>📡 PLATFORM DOWN</Text>
                <Text style={styles.triggerThresh}>Downdetector RSS</Text>
              </View>
              <Text style={[styles.triggerState, styles.triggerArmed]}>ARMED</Text>
            </View>
            <View style={styles.triggerRow}>
              <View>
                <Text style={styles.triggerName}>😷 AQI SPIKE</Text>
                <Text style={styles.triggerThresh}>≥ 300 CPCB</Text>
              </View>
              <Text style={[styles.triggerState, styles.triggerIdle]}>IDLE</Text>
            </View>
            <View style={styles.triggerRow}>
              <View>
                <Text style={styles.triggerName}>🚦 TRAFFIC / ROADBLOCK</Text>
                <Text style={styles.triggerThresh}>TomTom bbox polling every 15m · 6h treatment</Text>
              </View>
              <Text style={[styles.triggerState, styles.triggerArmed]}>ARMED</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>UPI for payouts and payment confirmation</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="ravi.kumar@upi"
              placeholderTextColor={colors.borderStrong}
              value={upiId}
              onChangeText={onChangeUpiId}
              autoCapitalize="none"
              accessible
              accessibilityLabel="UPI ID"
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
            onPress={onGenerateQr}
            disabled={loading}
            accessible
            accessibilityLabel="Generate UPI QR"
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Working...' : `Scan & Pay UPI QR - ₹${premium}`}</Text>
          </TouchableOpacity>

          {qrImageUrl ? (
            <View style={styles.qrWrap}>
              <Image source={{ uri: qrImageUrl }} style={styles.qrImage} accessibilityLabel="UPI QR code" />
              <Text style={styles.qrHint}>After paying, enter the UPI transaction reference for admin confirmation.</Text>
              <TextInput
                style={styles.input}
                placeholder="UPI transaction/reference ID"
                placeholderTextColor={colors.borderStrong}
                value={transactionUpiId}
                onChangeText={onChangeTransactionUpiId}
                autoCapitalize="none"
                accessibilityLabel="UPI transaction ID"
              />
              <TouchableOpacity
                style={[styles.secondaryButton, loading ? styles.buttonDisabled : null]}
                onPress={onSubmitQr}
                disabled={loading}
                accessible
                accessibilityLabel="Submit UPI transaction"
              >
                <Text style={styles.secondaryButtonText}>
                  {loading ? 'Submitting...' : paymentMode === 'submitted' ? 'Submitted for Admin Confirmation' : 'Submit Transaction ID'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.outlineButton, loading ? styles.buttonDisabled : null]}
            onPress={onPayWithRazorpay}
            disabled={loading}
            accessible
            accessibilityLabel="Pay using Razorpay"
          >
            <Text style={styles.outlineButtonText}>Continue with Razorpay</Text>
          </TouchableOpacity>
          <Text style={styles.paymentNote}>Payments via Razorpay or UPI QR fallback · Transaction IDs are admin-verified.</Text>

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
  content: { width: '100%', maxWidth: 520 },
  stepBar: { flexDirection: 'row', paddingTop: spacing.xl },
  stepDot: { flex: 1, height: 3, borderRadius: 99, backgroundColor: colors.border, marginRight: 6 },
  stepDone: { backgroundColor: colors.primary },
  stepActive: { backgroundColor: colors.primary, opacity: 0.5 },
  sectionHeader: { paddingTop: spacing.lg },
  sectionOverline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.primary, marginBottom: spacing.sm },
  weatherLive: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weatherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  weatherTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.info, textTransform: 'uppercase' },
  liveWrap: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 },
  liveText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  weatherGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  weatherMetric: { flex: 1, alignItems: 'center' },
  weatherValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  weatherLabel: { fontSize: 10, color: colors.textSubtle, marginTop: 2 },
  weatherTrend: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  riskWrap: { marginTop: spacing.sm },
  riskLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  riskLabel: { fontSize: 10, color: colors.textSubtle },
  riskAccent: { fontSize: 10, color: colors.amber, fontWeight: '700' },
  riskBar: { height: 6, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  riskFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 99 },
  premiumReveal: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.2)',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  premiumLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary, textTransform: 'uppercase' },
  premiumAmount: { fontSize: 44, fontWeight: '900', color: colors.primary, letterSpacing: -1, marginTop: spacing.sm },
  premiumSub: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  premiumModel: { fontSize: 10, color: colors.primary, opacity: 0.7, marginTop: spacing.sm, fontStyle: 'italic' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  coverWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  coverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  coverIcon: { fontSize: 14, marginRight: 4 },
  coverText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  coverPayout: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  triggerList: { marginBottom: spacing.md },
  triggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  triggerName: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  triggerThresh: { fontSize: 10, color: colors.textSubtle, marginTop: 2 },
  triggerState: { fontSize: 10, fontWeight: '700', paddingVertical: 3, paddingHorizontal: spacing.md, borderRadius: 20 },
  triggerArmed: { backgroundColor: colors.primarySoft, color: colors.primary, borderWidth: 1, borderColor: 'rgba(20, 241, 149, 0.2)' },
  triggerIdle: { backgroundColor: 'rgba(100, 116, 139, 0.1)', color: colors.textSubtle, borderWidth: 1, borderColor: 'rgba(100, 116, 139, 0.2)' },
  inputWrap: { marginBottom: spacing.md },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  secondaryButton: {
    backgroundColor: 'rgba(20, 241, 149, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.35)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  outlineButtonText: { color: colors.info, fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  qrWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    gap: spacing.sm,
  },
  qrImage: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  qrHint: { color: colors.textSubtle, fontSize: 11, textAlign: 'center' },
  paymentNote: { fontSize: 10, color: colors.borderStrong, textAlign: 'center', marginTop: spacing.sm },
  backButton: { marginTop: spacing.xl, alignSelf: 'center' },
  backButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
