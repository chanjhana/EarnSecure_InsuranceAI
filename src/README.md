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

## Admin access

To use the admin interfaces from the Expo app or via API calls you need to point the frontend at the backend and provide an admin password.

- Set the API base URL used by the app (web/native) via `EXPO_PUBLIC_API_BASE_URL`.

	Example (bash):
	```bash
	export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
	npx expo start
	```

- Open the app (web or device). The project contains admin UI components (`src/features/admin/AdminLogin.tsx` and `AdminDashboard.tsx`). If the Admin entry point is exposed in the UI (Rider dashboard may show an "Admin" button in some builds), use it to open the Admin Login screen.

- Alternatively, call the admin login endpoint directly and use the returned token for subsequent admin API requests:

	```bash
	API=http://127.0.0.1:8000
	curl -s -X POST "$API/auth/admin/login" -H 'Content-Type: application/json' -d '{"password":"my-secret-password"}' | jq .
	TOKEN=$(curl -s -X POST "$API/auth/admin/login" -H 'Content-Type: application/json' -d '{"password":"my-secret-password"}' | jq -r .access_token)
	curl -H "Authorization: Bearer $TOKEN" "$API/admin/portfolio"
	```

See `backend/README.md` for details on computing `ADMIN_SECRET_HASH` and configuring `backend/.env.local`.

## TODOs

- Implement OTP input and UPI linking components.
- Wire onboarding steps to API clients.
- Add dashboard data visualization (charts for payouts).
- Integrate real-time trigger notifications.
- Optimize for PWA offline capabilities.