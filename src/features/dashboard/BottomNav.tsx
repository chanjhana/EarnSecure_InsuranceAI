import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type BottomNavProps = {
  active: 'home' | 'history' | 'policy';
  onNavigate: (tab: 'home' | 'history' | 'policy') => void;
};

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const items: Array<{ key: 'home' | 'history' | 'policy'; label: string; icon: string }> = [
    { key: 'home', label: 'Home', icon: 'H' },
    { key: 'history', label: 'History', icon: 'R' },
    { key: 'policy', label: 'Policy', icon: 'P' },
  ];

  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <Pressable key={item.key} style={styles.item} onPress={() => onNavigate(item.key)}>
          <View style={[styles.icon, active === item.key ? styles.iconActive : null]}>
            <Text style={[styles.iconText, active === item.key ? styles.iconTextActive : null]}>{item.icon}</Text>
          </View>
          <Text style={[styles.label, active === item.key ? styles.labelActive : null]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'space-around',
  },
  item: { alignItems: 'center', gap: 4 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: colors.tealLight },
  iconText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  iconTextActive: { color: colors.tealDark },
  label: { fontSize: 10, color: colors.muted },
  labelActive: { color: colors.tealDark, fontWeight: '700' },
});
