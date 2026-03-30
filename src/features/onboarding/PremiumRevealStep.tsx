import { Text, View } from 'react-native';
import { TriggerCoverage } from '../../api/premiumClient';

type PremiumRevealStepProps = {
  premium: number;
  modelInputs: Record<string, number | string>;
  covers: TriggerCoverage[];
  onAccept: () => void;
};

export function PremiumRevealStep(_props: PremiumRevealStepProps) {
  // TODO: Show premium animation and coverage checklist from wireframe.
  return (
    <View>
      <Text>Premium Reveal Step</Text>
    </View>
  );
}
