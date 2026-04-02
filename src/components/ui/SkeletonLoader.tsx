import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { colors } from '../../theme/colors';

type SkeletonLoaderProps = {
  lines?: number;
};

export function SkeletonLoader({ lines = 4 }: SkeletonLoaderProps) {
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.95, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={styles.container}>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={String(index)}
          style={[
            styles.line,
            index === 0 ? styles.lineFirst : null,
            index === lines - 1 ? styles.lineLast : null,
            { opacity: shimmer },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 4 },
  line: {
    height: 12,
    borderRadius: 8,
    backgroundColor: colors.paper3,
  },
  lineFirst: { height: 18, width: '70%' },
  lineLast: { width: '50%' },
});
