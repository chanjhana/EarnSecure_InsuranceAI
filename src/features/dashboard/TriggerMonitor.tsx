import { Text, View } from 'react-native';
import { TriggerStatus } from '../../api/policiesClient';

type TriggerMonitorProps = { triggers: TriggerStatus[]; refreshInterval?: number };

export function TriggerMonitor(_props: TriggerMonitorProps) {
  // TODO: Poll trigger states every 15 min and show last check timestamps.
  return (
    <View>
      <Text>Trigger Monitor</Text>
    </View>
  );
}
