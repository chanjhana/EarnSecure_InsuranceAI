import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';

type AuthChoiceStepProps = {
  onChooseLogin: () => void;
  onChooseSignup: () => void;
};

export function AuthChoiceStep({ onChooseLogin, onChooseSignup }: AuthChoiceStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Setup</Text>
      <Text style={styles.subtitle}>Choose how you'd like to proceed</Text>

      <View style={styles.buttonContainer}>
        <PrimaryButton
          label="Login to existing account"
          onPress={onChooseLogin}
          style={styles.button}
        />

        <PrimaryButton
          label="Complete new signup"
          onPress={onChooseSignup}
          style={[styles.button, styles.signupButton]}
          textStyle={styles.signupButtonText}
        />
      </View>

      <Text style={styles.helper}>
        If you've already set up your account with vehicle details and password, choose "Login".
        Otherwise, choose "Complete new signup" to finish your registration.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  buttonContainer: { gap: 12 },
  button: { marginHorizontal: 0 },
  signupButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  signupButtonText: { color: colors.primary },
  helper: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});