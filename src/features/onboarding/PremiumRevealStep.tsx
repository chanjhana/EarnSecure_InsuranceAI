import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { TriggerCoverage } from '../../api/premiumClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';

type PremiumRevealStepProps = {
  premium: number;
  modelInputs: Record<string, number | string>;
  covers: TriggerCoverage[];
  onAccept: () => void;
};

export function PremiumRevealStep(_props: PremiumRevealStepProps) {
  const { premium, modelInputs, covers, onAccept } = _props;
  const [displayPremium, setDisplayPremium] = useState(0);
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isTestEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV === 'test';
    if (isTestEnv) {
      setDisplayPremium(premium);
      return;
    }

    const listenerId = value.addListener(({ value: next }) => {
      setDisplayPremium(Math.round(next));
    });

    Animated.timing(value, {
      toValue: premium,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => value.removeListener(listenerId);
  }, [premium, value]);

  const orderedInputs = useMemo(
    () => Object.entries(modelInputs).map(([key, inputValue]) => ({ key: key.replace(/_/g, ' '), value: String(inputValue) })),
    [modelInputs],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your weekly premium</Text>
      <View style={styles.premiumCard}>
        <Text style={styles.premiumLabel}>Monday debit</Text>
        <Text style={styles.premiumValue}>{paiseToInr(displayPremium)}</Text>
      </View>

      <Text style={styles.sectionLabel}>What this covers</Text>
      {covers.map((cover) => (
        <View key={cover.type} style={styles.coverRow}>
          <Text style={styles.coverName}>{cover.type.toUpperCase()}</Text>
          <Text style={styles.coverValue}>
            {paiseToInr(cover.min_paise)} - {paiseToInr(cover.max_paise)}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>How we priced this</Text>
      {orderedInputs.map((input) => (
        <View key={input.key} style={styles.inputRow}>
          <Text style={styles.inputKey}>{input.key}</Text>
          <Text style={styles.inputValue}>{input.value}</Text>
        </View>
      ))}

      <PrimaryButton label="Activate coverage" onPress={onAccept} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  premiumCard: {
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.tealLight,
  },
  premiumLabel: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  premiumValue: { color: colors.tealDark, fontSize: 30, fontWeight: '800' },
  sectionLabel: { marginTop: 6, fontSize: 12, color: colors.muted, fontWeight: '700' },
  coverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  coverName: { fontSize: 11, color: colors.ink2, fontWeight: '700' },
  coverValue: { fontSize: 11, color: colors.tealDark, fontWeight: '700' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputKey: { fontSize: 11, color: colors.muted },
  inputValue: { fontSize: 11, color: colors.ink2, fontWeight: '600' },
});
