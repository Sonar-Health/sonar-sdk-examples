import { Alert, Modal, Text, View } from "react-native";

import { account, appleHealth, useAccount } from "../account";
import { theme } from "../theme";
import { Button, Failure, styles } from "../ui";

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
    <Text style={styles.body}>{label}</Text>
    <Text style={[styles.body, { color: theme.ink }]}>{value}</Text>
  </View>
);

const since = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

export const Connection = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { sonar, working, failure } = useAccount();
  const provider = appleHealth(sonar);

  const disconnect = () =>
    Alert.alert("Disconnect Apple Health?", "Disconnecting deletes the Apple Health data Sonar holds for you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          onClose();
          void account.disconnectAppleHealth();
        },
      },
    ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.page, styles.content]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.heading}>Apple Health</Text>
          <Button title="Done" kind="plain" onPress={onClose} />
        </View>
        <View style={[styles.card, { gap: 10 }]}>
          <Row label="Connection" value={provider?.connection ?? "-"} />
          <Row label="Sync" value={provider?.synchronization ?? "-"} />
          <Row label="Last sync" value={since(provider?.lastSuccessfulSyncAt)} />
          {provider && provider.recoveryAction !== "none" && <Row label="Needs" value={provider.recoveryAction} />}
        </View>
        <Failure message={failure} />
        <Button title="Sync now" disabled={working} onPress={() => void account.sync()} />
        <Button title="Disconnect Apple Health" kind="danger" disabled={working} onPress={disconnect} />
        <Button
          title="Sign out"
          kind="danger"
          disabled={working}
          onPress={() => {
            onClose();
            void account.signOut();
          }}
        />
      </View>
    </Modal>
  );
};
