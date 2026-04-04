import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type PhoneEntryScreenProps = {
  phone: string;
  onChangePhone: (value: string) => void;
  onNext: () => void;
};

export function PhoneEntryScreen({ phone, onChangePhone, onNext }: PhoneEntryScreenProps) {
  const displayPhone = useMemo(() => phone || '98765 43210', [phone]);

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Phone entry screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoRow} accessible accessibilityLabel="EarnSecure logo">
            <View style={styles.logoMark}>
              <Text style={styles.logoShield}>{'✓'}</Text>
              {/* TODO: replace with Image asset for logo mark */}
            </View>
            <Text style={styles.logoText}>EarnSecure</Text>
            <Text style={styles.logoSub}>PARAMETRIC</Text>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>INCOME PROTECTION FOR RIDERS</Text>
            <Text style={styles.heroTitle}>
              Earn through{`\n`}
              <Text style={styles.heroAccent}>any weather.</Text>
            </Text>
            <Text style={styles.heroSub}>
              Auto-pays when rain, heat, or platform outages cut your earnings. No claims. Just coverage.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your mobile number</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefix]}
                placeholder="98765 43210"
                placeholderTextColor={colors.borderStrong}
                keyboardType="phone-pad"
                maxLength={12}
                value={phone}
                onChangeText={onChangePhone}
                accessible
                accessibilityLabel="Mobile number"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onNext} accessible accessibilityLabel="Send OTP">
              <Text style={styles.primaryButtonText}>Send OTP →</Text>
            </TouchableOpacity>

            <View style={styles.poweredWrap}>
              <Text style={styles.poweredLabel}>POWERED BY</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.techBadge}>OpenWeatherMap live</Text>
                <Text style={[styles.techBadge, styles.badgeGreen]}>GBR risk model</Text>
                <Text style={[styles.techBadge, styles.badgeAmber]}>AQI · CPCB</Text>
                <Text style={[styles.techBadge, styles.badgeCoral]}>Downdetector</Text>
              </View>
            </View>
          </View>

          <Text style={styles.previewPhone} accessible accessibilityLabel="Preview phone number">
            OTP will be sent to +91 {displayPhone}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  content: { width: '100%', maxWidth: 420 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  logoMark: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoShield: { color: colors.background, fontWeight: '900', fontSize: 16 },
  logoText: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  logoSub: {
    marginLeft: 'auto',
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
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
  inputWrap: { position: 'relative', marginBottom: spacing.md },
  prefix: {
    position: 'absolute',
    left: 14,
    top: 16,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
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
  inputWithPrefix: { paddingLeft: 50 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  poweredWrap: { marginTop: spacing.lg },
  poweredLabel: { fontSize: 10, color: colors.borderStrong, textAlign: 'center', marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  techBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '700',
    color: colors.info,
    margin: 3,
    letterSpacing: 0.5,
  },
  badgeGreen: { backgroundColor: colors.primarySoft, borderColor: 'rgba(20, 241, 149, 0.2)', color: colors.primary },
  badgeAmber: { backgroundColor: 'rgba(250, 204, 21, 0.08)', borderColor: 'rgba(250, 204, 21, 0.2)', color: colors.amber },
  badgeCoral: { backgroundColor: 'rgba(255, 66, 107, 0.08)', borderColor: 'rgba(255, 66, 107, 0.2)', color: colors.coral },
  previewPhone: { color: colors.textSubtle, fontSize: 11, textAlign: 'center', marginTop: spacing.lg },
});
