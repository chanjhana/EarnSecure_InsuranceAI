import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type StatusBadgeProps = {
  status: 'active' | 'paid' | 'hold' | 'rejected';
  label?: string;
  dot?: boolean;
};

export function StatusBadge({ status, label, dot = false }: StatusBadgeProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isTestEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV === 'test';
    if (!dot || isTestEnv) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.3,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dot, pulse]);

  return (
    <View style={[styles.base, statusStyles[status]]}>
      {dot ? <Animated.View style={[styles.dot, { transform: [{ scale: pulse }] }]} /> : null}
      <Text style={[styles.text, textStyles[status]]}>{label ?? status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 6 },
  text: { fontSize: 11, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: colors.teal },
});

const statusStyles = StyleSheet.create({
  active: { backgroundColor: colors.tealLight },
  paid: { backgroundColor: colors.infoLight },
  hold: { backgroundColor: colors.amberLight },
  rejected: { backgroundColor: colors.dangerLight },
});

const textStyles = StyleSheet.create({
  active: { color: colors.tealDark },
  paid: { color: '#1A6FBD' },
  hold: { color: colors.amber },
  rejected: { color: '#C0392B' },
});
