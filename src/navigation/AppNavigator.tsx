import { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DashboardScreen } from '../screens/DashboardScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { PhoneEntryScreen } from '../screens/PhoneEntryScreen';
import { PlatformScreen } from '../screens/PlatformScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

type StackParamList = {
  PhoneEntry: undefined;
  OTP: undefined;
  Profile: undefined;
  Platform: undefined;
  Premium: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>();

type ShiftKey = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export function AppNavigator() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', password: '' });
  const [platform, setPlatform] = useState<'SWIGGY' | 'ZOMATO'>('SWIGGY');
  const [riderId, setRiderId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [shifts, setShifts] = useState<ShiftKey[]>(['AFTERNOON']);
  const [upiId, setUpiId] = useState('');
  const [premium, setPremium] = useState(74);

  const shiftLabel = useMemo(() => shifts.join(', ') || 'AFTERNOON', [shifts]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="PhoneEntry">
        <Stack.Screen name="PhoneEntry">
          {(props) => (
            <PhoneEntryScreen
              phone={phone}
              onChangePhone={setPhone}
              onNext={() => props.navigation.navigate('OTP')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="OTP">
          {(props) => (
            <OTPScreen
              phone={phone}
              otp={otp}
              onChangeOtp={setOtp}
              onNext={() => props.navigation.navigate('Profile')}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Profile">
          {(props) => (
            <ProfileScreen
              firstName={profile.firstName}
              lastName={profile.lastName}
              password={profile.password}
              onChangeFirstName={(value) => setProfile((prev) => ({ ...prev, firstName: value }))}
              onChangeLastName={(value) => setProfile((prev) => ({ ...prev, lastName: value }))}
              onChangePassword={(value) => setProfile((prev) => ({ ...prev, password: value }))}
              onNext={() => props.navigation.navigate('Platform')}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Platform">
          {(props) => (
            <PlatformScreen
              platform={platform}
              riderId={riderId}
              pinCode={pinCode}
              shifts={shifts}
              onSelectPlatform={setPlatform}
              onChangeRiderId={setRiderId}
              onChangePinCode={setPinCode}
              onToggleShift={(value) =>
                setShifts((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
              }
              onNext={() => {
                setPremium(platform === 'SWIGGY' ? 74 : 79);
                props.navigation.navigate('Premium');
              }}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Premium">
          {(props) => (
            <PremiumScreen
              premium={premium}
              upiId={upiId}
              onChangeUpiId={setUpiId}
              onActivate={() => props.navigation.navigate('Dashboard')}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Dashboard">
          {(props) => (
            <DashboardScreen
              riderName={profile.firstName || 'Rider'}
              shiftLabel={shiftLabel}
              premium={premium}
              onNavigateHome={() => props.navigation.navigate('Dashboard')}
              onNavigateHistory={() => null}
              onNavigatePolicy={() => null}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
