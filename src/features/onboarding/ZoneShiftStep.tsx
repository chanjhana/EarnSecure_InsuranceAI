import { Text, View } from 'react-native';

type ZoneShiftStepProps = {
  onSelected: (pinCode: string, shift: 'morning' | 'afternoon' | 'evening' | 'night') => void;
  suggestedZones?: string[];
};

export function ZoneShiftStep(_props: ZoneShiftStepProps) {
  // TODO: Capture pin code and usual shift; these feed premium model inputs.
  return (
    <View>
      <Text>Zone + Shift Step</Text>
    </View>
  );
}
