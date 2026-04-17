import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type RiderLoginScreenProps = {
  phone: string;
  password: string;
  onChangePhone: (value: string) => void;
  onChangePassword: (value: string) => void;
  onLogin: () => void;
  onBack: () => void;
  loggingIn?: boolean;
  error?: string | null;
};

export function RiderLoginScreen({
  phone,
  password,
  onChangePhone,
  onChangePassword,
  onLogin,
  onBack,
  loggingIn = false,
  error,
}: RiderLoginScreenProps) {
  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Returning rider login screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>RETURNING RIDER</Text>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSub}>Login with your phone and password to continue to the dashboard.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.borderStrong}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={onChangePhone}
                accessible
                accessibilityLabel="Login phone number"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={colors.borderStrong}
                secureTextEntry
                value={password}
                onChangeText={onChangePassword}
                accessible
                accessibilityLabel="Login password"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loggingIn ? styles.primaryButtonDisabled : null]}
              onPress={onLogin}
              disabled={loggingIn}
              accessible
              accessibilityLabel="Login"
            >
              <Text style={styles.primaryButtonText}>{loggingIn ? 'Logging in...' : 'Login →'}</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity onPress={onBack} style={styles.backButton} accessible accessibilityLabel="Back to phone entry">
            <Text style={styles.backButtonText}>← Back to OTP flow</Text>
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
  heroSection: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
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
  heroSub: { fontSize: 14, color: colors.textSubtle, marginTop: spacing.sm, lineHeight: 20 },
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
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  errorText: { color: colors.coral, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  backButton: { marginTop: spacing.xl, alignSelf: 'center' },
  backButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
