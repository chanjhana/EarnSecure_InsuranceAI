import { useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { completeSignup } from '../api/authClient';
import { createRazorpayOrder, createUpiQrPayment, submitUpiQrTransaction } from '../api/paymentsClient';
import { calculatePremium } from '../api/premiumClient';
import { activatePolicy } from '../api/policiesClient';
import { getZones, linkPlatform, updateRiderProfile } from '../api/ridersClient';
import { DashboardScreen } from '../screens/DashboardScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { PhoneEntryScreen } from '../screens/PhoneEntryScreen';
import { PlatformScreen } from '../screens/PlatformScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { authService } from '../services/authService';
import { setAuthSession, useAuthStore } from '../store/authStore';
import { isValidIndianPhone, isValidOtp, isValidUpiId } from '../utils/validators';

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
  const { riderId } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', vehicleNumber: '', password: '' });
  const [platform, setPlatform] = useState<'SWIGGY' | 'ZOMATO'>('SWIGGY');
  const [platformRiderId, setPlatformRiderId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [shifts, setShifts] = useState<ShiftKey[]>(['AFTERNOON']);
  const [upiId, setUpiId] = useState('');
  const [premium, setPremium] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [transactionUpiId, setTransactionUpiId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'idle' | 'qr_generated' | 'submitted'>('idle');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const shiftLabel = useMemo(() => shifts.join(', ') || 'AFTERNOON', [shifts]);

  const normalizedPhone = useMemo(() => {
    const trimmed = phone.replace(/\s+/g, '');
    if (trimmed.startsWith('+91')) {
      return trimmed;
    }
    if (/^[6-9]\d{9}$/.test(trimmed)) {
      return `+91${trimmed}`;
    }
    return trimmed;
  }, [phone]);

  const handleSendOtp = async (navigate: () => void) => {
    if (!isValidIndianPhone(normalizedPhone)) {
      Alert.alert('Invalid phone number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setSendingOtp(true);
      setOtpError(null);
      await authService.sendOtp(normalizedPhone);
      navigate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send OTP.';
      setOtpError(message);
      Alert.alert('OTP failed', message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (navigate: () => void) => {
    if (!isValidOtp(otp)) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP sent to your phone.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setVerifyError(null);
      const result = await authService.verifyOtp(normalizedPhone, otp);
      setAuthSession(result.access_token, result.rider_id);
      navigate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed.';
      setVerifyError(message);
      Alert.alert('Verification failed', message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteProfile = async (navigate: () => void) => {
    if (!riderId) {
      Alert.alert('Missing rider session', 'Please verify OTP again.');
      return;
    }

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      Alert.alert('Missing details', 'Enter your first and last name.');
      return;
    }

    if (!profile.password.trim()) {
      Alert.alert('Missing password', 'Please create a password.');
      return;
    }

    const vehicleNumber = profile.vehicleNumber.trim() || 'N/A';
    const legalName = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();

    try {
      await completeSignup({
        rider_id: riderId,
        vehicle_number: vehicleNumber,
        legal_name: legalName,
        password: profile.password,
      });
      navigate();
    } catch (err) {
      Alert.alert('Profile setup failed', err instanceof Error ? err.message : 'Unable to save profile.');
    }
  };

  const handlePlatformNext = async (navigate: () => void) => {
    if (!riderId) {
      Alert.alert('Missing rider session', 'Please verify OTP again.');
      return;
    }

    if (!/^\d{6}$/.test(pinCode)) {
      Alert.alert('Invalid pin code', 'Enter a valid 6-digit pin code.');
      return;
    }

    if (shifts.length === 0) {
      Alert.alert('Select a shift', 'Choose at least one shift to continue.');
      return;
    }

    const shiftWindows = shifts.map((shift) => shift.toLowerCase() as 'morning' | 'afternoon' | 'evening' | 'night');

    try {
      await linkPlatform({ platform: platform.toLowerCase() as 'swiggy' | 'zomato', rider_id: riderId });
      const zoneResponse = await getZones(pinCode);
      const zones = zoneResponse.zones.slice(0, 3);
      if (zones.length === 0) {
        Alert.alert('No zones found', 'Please try another pin code.');
        return;
      }

      await updateRiderProfile({
        rider_id: riderId,
        pin_code: pinCode,
        zones,
        shift_windows: shiftWindows,
      });

      const premiumResult = await calculatePremium({
        rider_id: riderId,
        pin_code: pinCode,
        shift_windows: shiftWindows,
        zones,
      });

      setPremium(Math.round(premiumResult.weekly_premium_inr));
      navigate();
    } catch (err) {
      Alert.alert('Premium calculation failed', err instanceof Error ? err.message : 'Unable to calculate premium.');
    }
  };

  const validatePayoutUpi = () => {
    if (!isValidUpiId(upiId)) {
      Alert.alert('Invalid UPI ID', 'Enter a valid UPI ID to continue.');
      return false;
    }
    return true;
  };

  const handleGenerateQrPayment = async () => {
    if (!riderId) {
      Alert.alert('Missing rider session', 'Please verify OTP again.');
      return;
    }

    if (!validatePayoutUpi()) {
      return;
    }

    try {
      setPaymentLoading(true);
      const payment = await createUpiQrPayment({
        rider_id: riderId,
        upi_id: upiId.trim(),
        amount_paise: Math.max(100, premium * 100),
        note: 'EarnSecure weekly premium',
      });
      setPaymentId(payment.payment_id);
      setQrImageUrl(payment.qr_image_url ?? null);
      setPaymentMode('qr_generated');
    } catch (err) {
      Alert.alert('QR payment failed', err instanceof Error ? err.message : 'Unable to generate QR payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmitQrPayment = async (navigate: () => void) => {
    if (!riderId || !paymentId) {
      Alert.alert('Payment not initialized', 'Please generate the UPI QR first.');
      return;
    }

    if (!transactionUpiId.trim()) {
      Alert.alert('Missing transaction ID', 'Enter your UPI transaction/reference ID to continue.');
      return;
    }

    try {
      setPaymentLoading(true);
      await submitUpiQrTransaction({
        payment_id: paymentId,
        rider_id: riderId,
        upi_transaction_id: transactionUpiId.trim(),
        payer_upi_id: upiId.trim(),
      });
      await activatePolicy(riderId, upiId.trim());
      setPaymentMode('submitted');
      navigate();
    } catch (err) {
      Alert.alert('Payment submission failed', err instanceof Error ? err.message : 'Unable to submit payment details.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRazorpayPayment = async (navigate: () => void) => {
    if (!riderId) {
      Alert.alert('Missing rider session', 'Please verify OTP again.');
      return;
    }

    if (!validatePayoutUpi()) {
      return;
    }

    try {
      setPaymentLoading(true);
      const payment = await createRazorpayOrder({
        rider_id: riderId,
        amount_paise: Math.max(100, premium * 100),
        upi_id: upiId.trim(),
      });

      if (payment.checkout_url) {
        await Linking.openURL(payment.checkout_url);
      }

      await activatePolicy(riderId, upiId.trim());
      navigate();
    } catch (err) {
      Alert.alert('Razorpay flow failed', err instanceof Error ? err.message : 'Unable to initialize Razorpay payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="PhoneEntry">
        <Stack.Screen name="PhoneEntry">
          {(props) => (
            <PhoneEntryScreen
              phone={phone}
              onChangePhone={setPhone}
              onNext={() => handleSendOtp(() => props.navigation.navigate('OTP'))}
              sending={sendingOtp}
              error={otpError}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="OTP">
          {(props) => (
            <OTPScreen
              phone={phone}
              otp={otp}
              onChangeOtp={setOtp}
              onNext={() => handleVerifyOtp(() => props.navigation.navigate('Profile'))}
              onBack={() => props.navigation.goBack()}
              verifying={verifyingOtp}
              error={verifyError}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Profile">
          {(props) => (
            <ProfileScreen
              firstName={profile.firstName}
              lastName={profile.lastName}
              vehicleNumber={profile.vehicleNumber}
              password={profile.password}
              onChangeFirstName={(value) => setProfile((prev) => ({ ...prev, firstName: value }))}
              onChangeLastName={(value) => setProfile((prev) => ({ ...prev, lastName: value }))}
              onChangeVehicleNumber={(value) => setProfile((prev) => ({ ...prev, vehicleNumber: value }))}
              onChangePassword={(value) => setProfile((prev) => ({ ...prev, password: value }))}
              onNext={() => handleCompleteProfile(() => props.navigation.navigate('Platform'))}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Platform">
          {(props) => (
            <PlatformScreen
              platform={platform}
              riderId={platformRiderId}
              pinCode={pinCode}
              shifts={shifts}
              onSelectPlatform={setPlatform}
              onChangeRiderId={setPlatformRiderId}
              onChangePinCode={setPinCode}
              onToggleShift={(value) =>
                setShifts((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
              }
              onNext={() => handlePlatformNext(() => props.navigation.navigate('Premium'))}
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
              qrImageUrl={qrImageUrl}
              paymentMode={paymentMode}
              transactionUpiId={transactionUpiId}
              loading={paymentLoading}
              onChangeTransactionUpiId={setTransactionUpiId}
              onGenerateQr={handleGenerateQrPayment}
              onSubmitQr={() => handleSubmitQrPayment(() => props.navigation.navigate('Dashboard'))}
              onPayWithRazorpay={() => handleRazorpayPayment(() => props.navigation.navigate('Dashboard'))}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Dashboard">
          {(props) => (
            <DashboardScreen
              riderId={riderId ?? ''}
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
