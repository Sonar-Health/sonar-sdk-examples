import Sonar, { type SonarState, SonarSdkError } from "@sonarhealth/react-native-sdk";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

// The app's own sign-in stands in here: the demo backend knows one user, reached with an access code.
const backendUrl = process.env.EXPO_PUBLIC_DEMO_BACKEND_URL!;
const accessCode = process.env.EXPO_PUBLIC_DEMO_ACCESS_CODE!;

const backend = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${accessCode}`, "content-type": "application/json" },
  });
  if (!response.ok) throw new Error(`The backend answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
};

/** The SDK asks for a client token when it needs a Sonar session; the app's backend mints it. */
const clientTokenProvider = async ({ installationId }: { installationId: string }) => {
  const minted = await backend<{ client_token: string }>("/sdk-token", {
    method: "POST",
    body: JSON.stringify({ installation_id: installationId }),
  });
  return minted.client_token;
};

type DailySeries = { dates: string[]; series: Record<string, (number | null)[]> };

const localDate = (daysAgo: number) => {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const describe = (error: unknown) =>
  error instanceof SonarSdkError ? `${error.code}: ${error.message}` : String(error);

export default function App() {
  const [state, setState] = useState<SonarState>(Sonar.getState());
  const [steps, setSteps] = useState<DailySeries | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = (call: () => Promise<unknown>) => () => {
    setMessage(null);
    call().catch((error: unknown) => setMessage(describe(error)));
  };

  // On every launch: an ended session is renewed silently only while a token provider is registered.
  useEffect(() => {
    const unsubscribe = Sonar.observeState(setState);
    run(() => Sonar.authenticate({ clientTokenProvider }))();
    return unsubscribe;
  }, []);

  const health = state.providers.find((provider) => provider.provider === "apple_health");
  const syncedAt = health?.lastSuccessfulSyncAt;

  // What Sonar holds is read through the app's backend, never from the app.
  useEffect(() => {
    if (health?.connection !== "connected") return;
    run(async () => setSteps(await backend<DailySeries>(`/health/daily?types=steps&from_date=${localDate(6)}`)))();
  }, [health?.connection, syncedAt]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Sonar React Native</Text>
      <Text>Session: {state.session}</Text>
      {health && (
        <View style={styles.block}>
          <Text>Apple Health: {health.connection}</Text>
          <Text>Sync: {health.synchronization}</Text>
          <Text>Last sync: {syncedAt ?? "never"}</Text>
          {health.backfill && (
            <Text>
              History: {health.backfill.daysDone} of {health.backfill.daysTotal} days
            </Text>
          )}
        </View>
      )}
      {health?.connection === "connected" ? (
        <>
          <Button title="Sync now" onPress={run(() => Sonar.sync())} />
          <Button title="Disconnect" color="#c0392b" onPress={run(() => Sonar.disconnect("apple_health"))} />
        </>
      ) : (
        <Button title="Connect Apple Health" onPress={run(() => Sonar.connect("apple_health"))} />
      )}
      <Button title="Sign out" color="#c0392b" onPress={run(() => Sonar.signOut())} />
      {message && <Text style={styles.error}>{message}</Text>}
      {steps && (
        <View style={styles.block}>
          <Text style={styles.subtitle}>Steps</Text>
          {steps.dates.map((date, index) => (
            <Text key={date}>
              {date}: {steps.series.steps?.[index]?.toLocaleString() ?? "-"}
            </Text>
          ))}
        </View>
      )}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 24, paddingTop: 72, gap: 8 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 17, fontWeight: "600" },
  block: { marginVertical: 12, gap: 4 },
  error: { color: "#c0392b" },
});
