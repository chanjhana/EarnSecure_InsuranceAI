import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Image } from 'react-native';
import { colors, spacing } from '../theme/theme';

type PhoneEntryScreenProps = {
  phone: string;
  onChangePhone: (value: string) => void;
  onNext: () => void;
  onLogin?: () => void;
  sending?: boolean;
  error?: string | null;
};

interface RotatingTextProps {
  items: string[];
  style?: any;
  slideDistance?: number;
  duration?: number;
  stayDuration?: number;
}

const RotatingText: React.FC<RotatingTextProps> = ({
  items,
  style,
  slideDistance = 8,
  duration = 800,
  stayDuration = 2000,
}) => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    let mounted = true;

    const run = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration, useNativeDriver: true }),
        ]),
        Animated.delay(stayDuration),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -slideDistance, duration, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (!mounted) return;
        fadeAnim.setValue(0);
        slideAnim.setValue(slideDistance);
        setIndex((prev) => (prev + 1) % items.length);
      });
    };

    run();
    return () => {
      mounted = false;
    };
  }, [index, items.length, duration, stayDuration, slideDistance]);

  return (
    <Animated.Text style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {items[index]}
    </Animated.Text>
  );
};

export function PhoneEntryScreen({ phone, onChangePhone, onNext, onLogin, sending = false, error }: PhoneEntryScreenProps) {
  const displayPhone = useMemo(() => phone.replace('+91 ', '') || '98765 43210', [phone]);
  const protectionItems = [
    'against traffic.',
    'against weather.',
    'against fuel surges.',
    'against app downtime.',
  ];

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Phone entry screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoRow} accessible accessibilityLabel="EarnSecure logo">
            <View style={styles.logoMark}>
              <Image
                source={require('../../assets/earnsecure_logo.png')}
                style={styles.logoImage}
                accessible
                accessibilityLabel="EarnSecure logo mark"
              />
            </View>
            <Text style={styles.logoText}>EarnSecure</Text>
            <Text style={styles.logoSub}>PARAMETRIC</Text>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>INCOME PROTECTION FOR RIDERS</Text>
            <Text style={styles.heroTitle}>
              Stay Protected{`\n`}
              <RotatingText items={protectionItems} style={styles.heroAccent} />
            </Text>
            <Text style={styles.heroSub}>
              Auto-pays when traffic, weather, fuel surges, or platform outages cut your earnings. No claims — automated payouts.
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
                maxLength={11}
                value={phone.replace('+91 ', '')}
                onChangeText={(text) => onChangePhone('+91 ' + text)}
                accessible
                accessibilityLabel="Mobile number"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, sending ? styles.primaryButtonDisabled : null]}
              onPress={onNext}
              disabled={sending}
              accessible
              accessibilityLabel="Send OTP"
            >
              <Text style={styles.primaryButtonText}>{sending ? 'Sending...' : 'Send OTP →'}</Text>
            </TouchableOpacity>

            {onLogin ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onLogin}
                accessible
                accessibilityLabel="Returning user login"
              >
                <Text style={styles.secondaryButtonText}>Returning user? Login with password</Text>
              </TouchableOpacity>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
  logoImage: { width: 20, height: 20, resizeMode: 'contain' },
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
  heroAccent: { color: colors.primary, fontWeight: '700' },
  heroSub: { fontSize: 16, color: colors.textSubtle, marginTop: spacing.sm, lineHeight: 35 },
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
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  secondaryButton: {
    marginTop: spacing.sm,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.coral, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
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
