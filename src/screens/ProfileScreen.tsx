import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type ProfileScreenProps = {
  firstName: string;
  lastName: string;
  password: string;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export function ProfileScreen({
  firstName,
  lastName,
  password,
  onChangeFirstName,
  onChangeLastName,
  onChangePassword,
  onNext,
  onBack,
}: ProfileScreenProps) {
  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Profile setup screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>YOUR PROFILE</Text>
            <Text style={styles.heroTitle}>
              Quick setup,{`\n`}
              <Text style={styles.heroAccent}>then you're covered.</Text>
            </Text>
            <Text style={styles.heroSub}>Takes under 60 seconds. No paperwork.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.nameRow}>
              <View style={[styles.inputWrap, styles.nameColumn, styles.nameColumnLeft]}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ravi"
                  placeholderTextColor={colors.borderStrong}
                  value={firstName}
                  onChangeText={onChangeFirstName}
                  accessible
                  accessibilityLabel="First name"
                />
              </View>
              <View style={[styles.inputWrap, styles.nameColumn]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kumar"
                  placeholderTextColor={colors.borderStrong}
                  value={lastName}
                  onChangeText={onChangeLastName}
                  accessible
                  accessibilityLabel="Last name"
                />
              </View>
            </View>

            <Text style={styles.label}>Set a password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Create password"
                placeholderTextColor={colors.borderStrong}
                secureTextEntry
                value={password}
                onChangeText={onChangePassword}
                accessible
                accessibilityLabel="Create password"
              />
            </View>

            <View style={styles.kycDisabled} accessible accessibilityLabel="KYC coming soon">
              <Text style={styles.kycIcon}>🪪</Text>
              {/* TODO: replace with Image asset for KYC icon */}
              <View>
                <Text style={styles.kycText}>KYC verification via Aadhaar</Text>
                <Text style={styles.kycTag}>COMING SOON</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onNext} accessible accessibilityLabel="Continue">
              <Text style={styles.primaryButtonText}>Continue →</Text>
            </TouchableOpacity>
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
  nameRow: { flexDirection: 'row' },
  nameColumn: { flex: 1 },
  nameColumnLeft: { marginRight: spacing.sm },
  inputWrap: { flex: 1, marginBottom: spacing.md },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
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
  kycDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.06)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  kycIcon: { fontSize: 24, marginRight: spacing.sm },
  kycText: { fontSize: 12, color: colors.textSubtle, marginBottom: 2 },
  kycTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.amber,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  backButton: { marginTop: spacing.xl, alignSelf: 'center' },
  backButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
