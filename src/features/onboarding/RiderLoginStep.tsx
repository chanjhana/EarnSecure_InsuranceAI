import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { authClient } from '../../api/authClient';
import { colors } from '../../theme/colors';

type RiderLoginStepProps = {
  phone: string;
  onLogin: (payload: { jwt: string; riderId: string }) => void;
  onSwitchToSignup: () => void;
};

export function RiderLoginStep({ phone, onLogin, onSwitchToSignup }: RiderLoginStepProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authClient.riderLogin({ phone, password });
      onLogin({
        jwt: result.access_token,
        riderId: result.rider_id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>Enter your password to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />

      <PrimaryButton label="Login" onPress={handleLogin} loading={loading} />

      <Text style={styles.switchText}>
        New user?{' '}
        <Text style={styles.link} onPress={onSwitchToSignup}>
          Complete signup
        </Text>
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  switchText: { textAlign: 'center', fontSize: 14, color: colors.muted },
  link: { color: colors.teal, fontWeight: 'bold' },
  error: { color: colors.coral, textAlign: 'center', fontSize: 14 },
});