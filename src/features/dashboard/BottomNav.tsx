import { Text, View } from 'react-native';

type BottomNavProps = {
  active: 'home' | 'history' | 'policy';
  onNavigate: (tab: 'home' | 'history' | 'policy') => void;
};

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  // TODO: Replace with icon-based nav preserving active state.
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
      <Text onPress={() => onNavigate('home')}>{active === 'home' ? '[Home]' : 'Home'}</Text>
      <Text onPress={() => onNavigate('history')}>{active === 'history' ? '[History]' : 'History'}</Text>
      <Text onPress={() => onNavigate('policy')}>{active === 'policy' ? '[Policy]' : 'Policy'}</Text>
    </View>
  );
}
