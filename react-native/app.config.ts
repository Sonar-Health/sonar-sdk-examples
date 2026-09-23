import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Sonar RN Demo",
  slug: "sonar-react-native-demo",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_ID ?? "com.example.sonarrn",
    infoPlist: {
      // The demo backend runs on a computer on the local network, over plain HTTP.
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription: "Signs in to the demo backend running on your local network.",
    },
  },
  android: { package: "com.example.sonarrn" },
  plugins: [
    [
      "@sonarhealth/react-native-sdk",
      {
        appId: process.env.SONAR_APP_ID,
        healthShareUsageDescription: "Reads your health data to chart your steps, heart and sleep.",
        privacyPolicyUrl: "https://example.com/privacy",
      },
    ],
  ],
};

export default config;
