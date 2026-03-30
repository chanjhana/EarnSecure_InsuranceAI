import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
};

export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  // TODO: Keep high contrast and easy one-hand tap size.
  return (
    <Pressable style={[styles.base, variant === 'primary' ? styles.primary : styles.outline]} disabled={disabled || loading} onPress={onPress}>
      <Text style={variant === 'primary' ? styles.primaryText : styles.outlineText}>{loading ? 'Please wait...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  primary: { backgroundColor: '#0D9E74' },
  outline: { borderWidth: 1, borderColor: '#D8D5CE' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  outlineText: { color: '#1C1E24', fontWeight: '700' },
});
