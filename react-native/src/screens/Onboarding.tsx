import { type ReactNode, useState } from "react";
import { KeyboardAvoidingView, SafeAreaView, Text, TextInput, View } from "react-native";

import { account, useAccount } from "../account";
import { theme } from "../theme";
import { Button, Failure, styles } from "../ui";

const Hero = ({ symbol, title, message, children }: { symbol: string; title: string; message: string; children: ReactNode }) => {
  const { failure } = useAccount();
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, padding: 24, paddingBottom: 16, gap: 16 }}>
        <View style={{ alignItems: "center", gap: 14, flex: 1, justifyContent: "center" }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "rgba(48,209,88,0.14)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 44, color: theme.accent }}>{symbol}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.body, { textAlign: "center" }]}>{message}</Text>
        </View>
        <Failure message={failure} />
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/** Stands in for the customer app's own sign-in: it signs in to the demo backend, never to Sonar. */
export const SignIn = () => {
  const { working } = useAccount();
  const [backend, setBackend] = useState("http://");
  const [accessCode, setAccessCode] = useState("");
  const valid = /^https?:\/\/[^/]+/.test(backend.trim()) && accessCode.trim().length > 0;

  return (
    <Hero
      symbol="♥︎"
      title="Sonar Demo"
      message="Sign in to the demo backend. It prints its URL and access code when it starts."
    >
      <TextInput
        style={styles.field}
        value={backend}
        onChangeText={setBackend}
        placeholder="Backend URL"
        placeholderTextColor={theme.inkFaint}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.field}
        value={accessCode}
        onChangeText={setAccessCode}
        placeholder="Access code"
        placeholderTextColor={theme.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        title={working ? "Signing in…" : "Sign in"}
        disabled={working || !valid}
        onPress={() => void account.signIn({ backend: backend.trim(), accessCode: accessCode.trim() })}
      />
    </Hero>
  );
};

export const Connect = () => {
  const { working } = useAccount();
  return (
    <Hero
      symbol="♥︎"
      title="Bring your health data"
      message="Connect Apple Health to see your steps, heart and sleep. The last days arrive first, then two years of history."
    >
      <Button
        title={working ? "Connecting…" : "Connect Apple Health"}
        disabled={working}
        onPress={() => void account.connectAppleHealth()}
      />
      <Button title="Sign out" kind="plain" disabled={working} onPress={() => void account.signOut()} />
    </Hero>
  );
};
