import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "./theme";

export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <View style={styles.card}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

export const Button = ({
  title,
  onPress,
  disabled,
  kind = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  kind?: "primary" | "plain" | "danger";
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      kind === "primary" ? styles.primary : styles.plain,
      (pressed || disabled) && { opacity: 0.5 },
    ]}
  >
    <Text style={[styles.buttonText, kind !== "primary" && { color: kind === "danger" ? theme.danger : theme.inkMuted }]}>
      {title}
    </Text>
  </Pressable>
);

export const Failure = ({ message }: { message: string | null }) =>
  message ? <Text style={styles.failure}>⚠︎ {message}</Text> : null;

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.page },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  card: { backgroundColor: theme.card, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.hairline },
  cardTitle: { color: theme.inkMuted, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  title: { color: theme.ink, fontSize: 32, fontWeight: "700" },
  heading: { color: theme.ink, fontSize: 17, fontWeight: "600" },
  body: { color: theme.inkMuted, fontSize: 16, lineHeight: 22 },
  caption: { color: theme.inkFaint, fontSize: 13 },
  value: { color: theme.ink, fontSize: 24, fontWeight: "700" },
  primary: { backgroundColor: theme.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", alignSelf: "stretch" },
  plain: { paddingVertical: 12, alignItems: "center", alignSelf: "stretch" },
  buttonText: { color: "#04110A", fontSize: 17, fontWeight: "600" },
  failure: { color: theme.danger, fontSize: 14 },
  field: {
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 14,
    color: theme.ink,
    fontSize: 16,
    alignSelf: "stretch",
  },
});
