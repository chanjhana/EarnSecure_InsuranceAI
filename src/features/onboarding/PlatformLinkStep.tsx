import { Text, View } from 'react-native';

type PlatformLinkStepProps = { onLinked: (platform: 'swiggy' | 'zomato', riderId: string) => void; platforms?: Array<'swiggy' | 'zomato'> };

export function PlatformLinkStep(_props: PlatformLinkStepProps) {
  // TODO: Render platform selection cards and rider ID verification.
  return (
    <View>
      <Text>Platform Link Step</Text>
    </View>
  );
}
