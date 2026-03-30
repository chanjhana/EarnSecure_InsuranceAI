import { Text, View } from 'react-native';
import { OnboardingState } from './types';

type OnboardingShellProps = {
  step: 1 | 2 | 3 | 4 | 5;
  onStepChange: (step: 1 | 2 | 3 | 4 | 5) => void;
  state: OnboardingState;
};

export function OnboardingShell({ step, onStepChange, state }: OnboardingShellProps) {
  // TODO: Render 5-step wireframe flow with single-primary-action screens.
  return (
    <View>
      <Text>Onboarding step {step}</Text>
      <Text>{JSON.stringify(state)}</Text>
      <Text onPress={() => onStepChange(step)}>Step action placeholder</Text>
    </View>
  );
}
