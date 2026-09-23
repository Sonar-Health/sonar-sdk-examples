import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";

import { account, appleHealth, isSyncing, useAccount } from "./src/account";
import type { Credentials } from "./src/backend";
import { type Span, useHealthData } from "./src/health";
import { Connection } from "./src/screens/Connection";
import { Connect, SignIn } from "./src/screens/Onboarding";
import { Summary } from "./src/screens/Summary";
import { Trends } from "./src/screens/Trends";
import { theme } from "./src/theme";
import { Failure, styles } from "./src/ui";

export default function App() {
  const { credentials, loaded, sonar } = useAccount();

  useEffect(() => {
    void account.launch();
  }, []);

  const health = appleHealth(sonar);
  return (
    <>
      <StatusBar style="light" />
      {!loaded ? (
        <View style={[styles.page, { justifyContent: "center" }]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : !credentials ? (
        <SignIn />
      ) : health?.connection === "connected" ? (
        <Dashboard credentials={credentials} />
      ) : (
        <Connect />
      )}
    </>
  );
}

const Dashboard = ({ credentials }: { credentials: Credentials }) => {
  const { sonar } = useAccount();
  const [tab, setTab] = useState<"summary" | "trends">("summary");
  const [span, setSpan] = useState<Span>(30);
  const [showingConnection, setShowingConnection] = useState(false);
  const health = appleHealth(sonar);
  // Charts reload whenever the SDK reports new data in Sonar.
  const { data, failure, refreshing, refresh } = useHealthData(
    credentials,
    span,
    `${health?.lastSuccessfulSyncAt}:${health?.backfill?.phase}`,
  );

  return (
    <SafeAreaView style={styles.page}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
        {(["summary", "trends"] as const).map((option) => (
          <Pressable key={option} onPress={() => setTab(option)}>
            <Text style={[styles.title, { fontSize: 28, color: option === tab ? theme.ink : theme.inkFaint }]}>
              {option === "summary" ? "Summary" : "Trends"}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setShowingConnection(true)} accessibilityLabel="Apple Health connection">
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: "600" }}>{isSyncing(sonar) ? "Syncing…" : "Synced"}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <Failure message={failure} />
        {tab === "summary" ? <Summary data={data} /> : <Trends data={data} span={span} onSpan={setSpan} />}
      </ScrollView>
      <Connection visible={showingConnection} onClose={() => setShowingConnection(false)} />
    </SafeAreaView>
  );
};
