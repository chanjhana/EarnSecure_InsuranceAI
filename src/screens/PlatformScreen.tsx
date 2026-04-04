import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type ShiftKey = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

type PlatformScreenProps = {
  platform: 'SWIGGY' | 'ZOMATO';
  riderId: string;
  pinCode: string;
  shifts: ShiftKey[];
  onSelectPlatform: (value: 'SWIGGY' | 'ZOMATO') => void;
  onChangeRiderId: (value: string) => void;
  onChangePinCode: (value: string) => void;
  onToggleShift: (value: ShiftKey) => void;
  onNext: () => void;
  onBack: () => void;
};

const SHIFT_OPTIONS: ShiftKey[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];

export function PlatformScreen({
  platform,
  riderId,
  pinCode,
  shifts,
  onSelectPlatform,
  onChangeRiderId,
  onChangePinCode,
  onToggleShift,
  onNext,
  onBack,
}: PlatformScreenProps) {
  const shiftSubtitle = useMemo(() => (shifts.length ? shifts.join(', ') : 'Select shift'), [shifts]);

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Platform selection screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>PLATFORM & ZONE</Text>
            <Text style={styles.heroTitle}>
              Where do you{`\n`}
              <Text style={styles.heroAccent}>deliver?</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your platform</Text>
            <View style={styles.platformRow}>
              <TouchableOpacity
                style={[styles.platformCard, styles.platformCardLeft, platform === 'SWIGGY' ? styles.platformSelected : null]}
                onPress={() => onSelectPlatform('SWIGGY')}
                accessible
                accessibilityLabel="Select Swiggy"
              >
                <Text style={styles.platformIcon}>🛵</Text>
                {/* TODO: replace with Image asset for Swiggy icon */}
                <Text style={[styles.platformName, platform === 'SWIGGY' ? styles.platformNameActive : null]}>SWIGGY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.platformCard, platform === 'ZOMATO' ? styles.platformSelected : null]}
                onPress={() => onSelectPlatform('ZOMATO')}
                accessible
                accessibilityLabel="Select Zomato"
              >
                <Text style={styles.platformIcon}>🍕</Text>
                {/* TODO: replace with Image asset for Zomato icon */}
                <Text style={[styles.platformName, platform === 'ZOMATO' ? styles.platformNameActive : null]}>ZOMATO</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Rider ID</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="SWG-CHN-291847"
                placeholderTextColor={colors.borderStrong}
                value={riderId}
                onChangeText={onChangeRiderId}
                accessible
                accessibilityLabel="Rider ID"
              />
            </View>

            <Text style={styles.label}>Pin code</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="600042 — zones auto-load"
                placeholderTextColor={colors.borderStrong}
                keyboardType="number-pad"
                value={pinCode}
                onChangeText={onChangePinCode}
                accessible
                accessibilityLabel="Pin code"
              />
            </View>

            <Text style={styles.label}>Usual shift</Text>
            <View style={styles.shiftWrap}>
              {SHIFT_OPTIONS.map((shift) => {
                const active = shifts.includes(shift);
                return (
                  <TouchableOpacity
                    key={shift}
                    onPress={() => onToggleShift(shift)}
                    style={[styles.shiftPill, active ? styles.shiftActive : null]}
                    accessible
                    accessibilityLabel={`${shift} shift`}
                  >
                    <Text style={[styles.shiftText, active ? styles.shiftTextActive : null]}>{shift}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.shiftHint}>{shiftSubtitle}</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={onNext} accessible accessibilityLabel="Calculate premium">
              <Text style={styles.primaryButtonText}>Calculate My Premium →</Text>
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
  platformRow: { flexDirection: 'row', marginBottom: spacing.md },
  platformCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  platformCardLeft: { marginRight: spacing.sm },
  platformSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  platformIcon: { fontSize: 22, marginBottom: 4 },
  platformName: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  platformNameActive: { color: colors.primary },
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
  shiftWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  shiftPill: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  shiftActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  shiftText: { fontSize: 11, fontWeight: '700', color: colors.textSubtle },
  shiftTextActive: { color: colors.primary },
  shiftHint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.md },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  backButton: { marginTop: spacing.xl, alignSelf: 'center' },
  backButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
});
