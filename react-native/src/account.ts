import Sonar, { type SonarState, SonarSdkError } from "@sonarhealth/react-native-sdk";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

import { backendClient, type Credentials } from "./backend";

/**
 * Everything the app does with the Sonar SDK: authenticate at every launch, connect Apple Health, and
 * mirror the SDK's observed state for the screens. The config plugin configures the SDK at launch.
 */
type AccountState = {
  credentials: Credentials | null;
  loaded: boolean;
  sonar: SonarState;
  working: boolean;
  failure: string | null;
};

const credentialsKey = "demo.credentials";
let state: AccountState = {
  credentials: null,
  loaded: false,
  sonar: Sonar.getState(),
  working: false,
  failure: null,
};
const listeners = new Set<() => void>();

const update = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

export const useAccount = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const appleHealth = (sonar: SonarState) =>
  sonar.providers.find((provider) => provider.provider === "apple_health") ?? null;

export const isSyncing = (sonar: SonarState) =>
  appleHealth(sonar)?.synchronization.startsWith("syncing") ?? false;

const describe = (error: unknown) =>
  error instanceof SonarSdkError || error instanceof Error ? error.message : String(error);

const perform = async (work: () => Promise<unknown>) => {
  if (state.working) return;
  update({ working: true, failure: null });
  try {
    await work();
  } catch (error) {
    update({ failure: describe(error) });
  } finally {
    update({ working: false });
  }
};

const authenticate = (credentials: Credentials) =>
  Sonar.authenticate({
    clientTokenProvider: ({ installationId }) => backendClient(credentials).sdkToken(installationId),
  });

export const account = {
  async launch() {
    Sonar.observeState((sonar) => {
      update({ sonar });
      // A locked phone hides Health data and suspends the app: stay awake while an import runs.
      if (isSyncing(sonar)) void activateKeepAwakeAsync("sonar-import");
      else void deactivateKeepAwake("sonar-import");
    });
    const saved = await SecureStore.getItemAsync(credentialsKey);
    const credentials = saved ? (JSON.parse(saved) as Credentials) : null;
    update({ credentials, loaded: true });
    if (credentials) await perform(() => authenticate(credentials));
  },

  signIn: (credentials: Credentials) =>
    perform(async () => {
      await backendClient(credentials).config();
      // Another user may have been signed in on this phone: their Sonar session ends first.
      await Sonar.signOut();
      await authenticate(credentials);
      await SecureStore.setItemAsync(credentialsKey, JSON.stringify(credentials));
      update({ credentials });
    }),

  connectAppleHealth: () => perform(() => Sonar.connect("apple_health")),

  sync: () => perform(() => Sonar.sync()),

  /** Disconnecting also deletes the Apple Health data Sonar holds for this user. */
  disconnectAppleHealth: () => perform(() => Sonar.disconnect("apple_health")),

  signOut: () =>
    perform(async () => {
      await Sonar.signOut();
      await SecureStore.deleteItemAsync(credentialsKey);
      update({ credentials: null });
    }),
};
