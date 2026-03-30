# Getting Started — Run & Development

This file contains steps to set up and run the project locally (web and Expo).

## Prerequisites

- Node.js (LTS recommended; Node 18–20 tested)
- npm (or yarn)
- Git
- Optional: Expo CLI (`npm install -g expo-cli`) — not required for `npm run web` but useful for native runs

## Quick setup

1. Clone the repo (if not already):

```bash
git clone <https://github.com/chanjhana/EarnSecure_InsuranceAI>
cd EarnSecure_InsuranceAI
```

2. Install dependencies:

```bash
npm install
```

3. If you plan to run the web build and Expo complains about missing web support, install the web adapters (common error shown below):

```bash
npx expo install react-dom react-native-web
```

## Run (Web)

Start the Expo dev server for web:

```bash
npm run web
```

This runs `expo start --web` and opens the Metro/Expo dev tools. If the browser does not open automatically, visit the URL shown in the terminal.

## Run (Mobile)

Open the project in Expo Go (recommended for quick native testing):

```bash
npm start
# then scan the QR code with Expo Go on your device
```

To run on iOS Simulator or Android emulator (if configured):

```bash
npm run ios   # macOS only, if you have Xcode
npm run android # if Android SDK + emulator available
```

## Useful commands

- `npm run web` — start Expo for web
- `npm start` — start Expo dev tools (mobile + web options)
- `npm test` — run tests (if provided)

## Troubleshooting

- Error: "It looks like you're trying to use web support but don't have the required dependencies installed." — fix by running:

```bash
npx expo install react-dom react-native-web
```

- If you see dependency or build errors, ensure Node and npm versions are compatible (try Node LTS). Removing `node_modules` and reinstalling can help:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Notes

- Keep the Expo CLI and `expo` SDK reasonably aligned; this repo was tested with Expo SDK compatible packages (see `package.json`).
- Add project-specific environment variables or API keys as needed (not committed to the repo).
