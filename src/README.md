# EarnSecure Frontend

React Native (Expo) PWA frontend for the EarnSecure parametric insurance app. Handles rider onboarding, dashboard, and admin interfaces, connecting to the FastAPI backend via typed API clients.

## Setup

1. Install dependencies: `npm install` or `yarn install`
2. Start Expo: `npx expo start`
3. Run on device/simulator or web (PWA mode).

## Architecture

- **API Clients**: Typed clients in `src/api/` for backend integration (auth, riders, premium, policies, claims, admin).
- **Components**: Reusable UI in `src/components/ui/` (buttons, inputs, badges) and forms.
- **Features**: Feature-specific modules in `src/features/` (onboarding, dashboard).
- **Navigation**: App navigation in `src/navigation/`.
- **Store**: Zustand stores in `src/store/` for state management (auth, policies).
- **Theme**: Colors, typography, spacing in `src/theme/`.
- **Utils**: Helpers in `src/utils/` (currency, date, validators).
- **Hooks**: Custom hooks in `src/hooks/` for data fetching and logic.

## Key Flows

- **Onboarding**: 5-step process (phone/OTP, platform link, GPS zone, premium display, UPI activation).
- **Dashboard**: Policy status, earnings protected, trigger alerts, payout history.
- **Admin**: Portfolio stats, fraud queue, claim approvals.

## TODOs

- Implement OTP input and UPI linking components.
- Wire onboarding steps to API clients.
- Add dashboard data visualization (charts for payouts).
- Integrate real-time trigger notifications.
- Optimize for PWA offline capabilities.