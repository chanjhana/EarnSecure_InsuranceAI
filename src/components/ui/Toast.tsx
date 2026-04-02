import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type ToastProps = {
  message: string;
  variant?: 'info' | 'success' | 'error';
  onClose?: () => void;
  durationMs?: number;
};

export function Toast({ message, variant = 'info', onClose, durationMs = 2800 }: ToastProps) {
  useEffect(() => {
    if (!onClose) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <View style={[styles.container, variant === 'success' ? styles.success : null, variant === 'error' ? styles.error : null]}>
      <Text style={styles.message}>{message}</Text>
      {onClose ? (
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#9EC2E6',
    backgroundColor: colors.infoLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  success: {
    backgroundColor: colors.tealLight,
    borderColor: '#84D7B8',
  },
  error: {
    backgroundColor: colors.dangerLight,
    borderColor: '#E9A39A',
  },
  message: { color: colors.ink2, fontSize: 12, fontWeight: '600', flex: 1 },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  closeText: { color: colors.ink2, fontSize: 11, fontWeight: '700' },
});
