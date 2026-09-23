# Sonar SDK examples

Apps that sync Apple Health to Sonar through the Sonar SDK, and the small backend they need. Copy the
architecture: the app holds no Sonar API key, and your backend mints client tokens and reads data.

```text
app ── sign-in ──► your backend ── API key ──► Sonar API
 │                      ▲
 └── Sonar SDK ── Apple Health data ──► Sonar
```

| Folder | What it is |
| --- | --- |
| `backend/` | The customer backend at demo size (Bun, no dependencies): mints SDK client tokens and passes health reads through for its one user |
| `ios/` | SwiftUI app: signs in to the backend, connects Apple Health, charts what the backend reads |
| `react-native/` | Expo app: the same app in React Native |

## What you need

- A Sonar sandbox API key (Atlas → Developers).
- An SDK app ID for the example's bundle ID (Atlas → Developers → Apps).
- A Sonar user for the demo (`POST /v1/users`, keep its `id`).
- An iPhone: Apple Health has no data in the simulator.

## Run the backend

```bash
cd backend
cp .env.example .env   # fill in the key, app ID and user ID
bun server.ts          # prints the backend URL and an access code
```

The phone must reach that URL, so run it on the same network.

## Run the iOS app

1. Open `ios/SonarDemo.xcodeproj`, pick your team and set the bundle ID Sonar registered.
2. Run on an iPhone, then sign in with the backend URL and access code.

## Run the React Native app

Coming soon: `@sonarhealth/react-native-sdk` is not on npm yet, so this app does not install today.

```bash
cd react-native
cp .env.example .env   # the SDK app ID and the bundle ID it is registered for
npm install
npx expo run:ios --device
```

Then sign in with the backend URL and access code, as in the iOS app. The iOS SDK ships inside the
npm package, so there is no separate pod to add.

Docs: https://docs.sonarhealth.co/mobile-sdk/
