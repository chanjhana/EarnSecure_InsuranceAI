import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { PremiumResponse } from '../../api/premiumClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';

type PremiumRevealStepProps = {
  premium: number;
  modelInputs: PremiumResponse; // Bound safely to arbitrary types
  covers: any;
  onAccept: () => void;
};

export function PremiumRevealStep({ premium, modelInputs, onAccept }: PremiumRevealStepProps) {
  const [displayPremium, setDisplayPremium] = useState(0);
  const value = useRef(new Animated.Value(0)).current;

  // Assuming risk reaches bounded 0-1.0
  const riskPct = Math.round((modelInputs?.risk_score || 0) * 100);
  let riskColor = colors.teal;
  if (riskPct > 35) riskColor = colors.amber;
  if (riskPct > 70) riskColor = colors.coral;

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

  const wx = modelInputs?.breakdown?.weather_risk;
  const sh = modelInputs?.breakdown?.shift_risk;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your weekly premium</Text>
      
      <View style={styles.premiumCard}>
        <Text style={styles.premiumLabel}>Monday debit</Text>
        <Text style={styles.premiumValue}>{paiseToInr(displayPremium)}</Text>
      </View>

      <Text style={styles.sectionLabel}>Risk Analysis ({modelInputs?.city_name || 'Forecast'})</Text>
      
      <View style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskTitle}>Risk Score</Text>
          <Text style={[styles.riskValue, { color: riskColor }]}>{riskPct}%</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFg, { width: `${Math.min(riskPct, 100)}%`, backgroundColor: riskColor }]} />
        </View>

        {wx !== undefined && (
          <Text style={styles.factorText}>
            • Weather: {wx.rainy_days} rainy days forecast · max {wx.max_rainfall_mm}mm rainfall
          </Text>
        )}
        
        {sh !== undefined && sh.shifts.length > 0 && (
          <Text style={styles.factorText}>
            • Shifts: {sh.shifts.join(', ')} — {(sh.shifts.includes('morning') || sh.shifts.includes('night')) ? 'higher rain exposure' : 'standard exposure'}
          </Text>
        )}
      </View>

      <Text style={styles.disclaimer}>Premium updates every Sunday based on next week forecast</Text>

      <PrimaryButton label="Activate coverage" onPress={onAccept} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  premiumCard: {
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
  },
  premiumLabel: { color: colors.tealDark, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  premiumValue: { color: colors.tealDark, fontSize: 36, fontWeight: '800' },
  sectionLabel: { marginTop: 8, fontSize: 13, color: colors.muted, fontWeight: '700' },
  riskCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  riskTitle: { fontSize: 13, color: colors.ink2, fontWeight: '700' },
  riskValue: { fontSize: 16, fontWeight: '800' },
  barBg: { height: 8, backgroundColor: '#EFEFEF', borderRadius: 4, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 4 },
  factorText: { fontSize: 12, color: colors.ink, fontWeight: '500', lineHeight: 18 },
  disclaimer: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});
