import { Text, View } from "react-native";

import { appleHealth, useAccount } from "../account";
import { metrics, scoreKinds, sleepStages } from "../backend";
import { Bars, LineChart, Ring } from "../charts";
import { type HealthData, hoursAndMinutes, values, wholeNumber } from "../health";
import { theme } from "../theme";
import { Card, styles } from "../ui";

/** The SDK reports how far the first import has come; the recent days are chartable long before it ends. */
export const ImportBanner = () => {
  const { sonar } = useAccount();
  const backfill = appleHealth(sonar)?.backfill;
  if (!backfill || backfill.phase === "complete") return null;
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.heading}>{backfill.phase === "recent" ? "Importing your last days" : "Importing your history"}</Text>
        <Text style={styles.caption}>
          {backfill.daysDone} of {backfill.daysTotal} days
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.grid }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.accent,
            width: `${Math.round(backfill.fraction * 100)}%`,
          }}
        />
      </View>
    </Card>
  );
};

export const Summary = ({ data }: { data: HealthData | null }) => {
  const scored = scoreKinds.flatMap((kind) => {
    const latest = data?.scores.latest[kind.id];
    return latest ? [{ ...kind, latest }] : [];
  });
  const night = data?.lastNight;

  return (
    <>
      <ImportBanner />
      {scored.length > 0 && (
        <Card title="Sonar scores">
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {scored.map((score) => (
              <View key={score.id} style={{ alignItems: "center", gap: 6 }}>
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <Ring fraction={score.latest.value / 100} tint={theme.accent} />
                  <Text style={[styles.heading, { position: "absolute" }]}>{Math.round(score.latest.value)}</Text>
                </View>
                <Text style={styles.caption}>{score.title}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {metrics.map((metric) => {
          const week = values(data?.daily, metric.id, 7);
          const latest = week.at(-1);
          return (
            <View key={metric.id} style={[styles.card, { width: "47.5%" }]}>
              <Text style={[styles.caption, { color: metric.tint }]}>{metric.short}</Text>
              <Text style={styles.value}>
                {latest ? wholeNumber(latest.value) : "–"} <Text style={styles.caption}>{metric.unit}</Text>
              </Text>
              {week.length > 0 &&
                (metric.total ? (
                  <Bars values={week} tint={metric.tint} height={44} />
                ) : (
                  <LineChart values={week.map((day) => day.value)} tint={metric.tint} height={44} />
                ))}
            </View>
          );
        })}
      </View>
      {night && (
        <Card title="Last night">
          <Text style={styles.value}>{hoursAndMinutes(night.duration_minutes)}</Text>
          <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden" }}>
            {sleepStages.map((stage) => (
              <View
                key={stage.id}
                style={{ flex: night[`${stage.id}_minutes` as const] ?? 0, backgroundColor: stage.tint }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {sleepStages.map((stage) => (
              <Text key={stage.id} style={styles.caption}>
                <Text style={{ color: stage.tint }}>● </Text>
                {stage.title} {hoursAndMinutes(night[`${stage.id}_minutes` as const] ?? 0)}
              </Text>
            ))}
          </View>
        </Card>
      )}
      <Card title="Heart rate today">
        {data && data.heartRate.length > 1 ? (
          <>
            <LineChart values={data.heartRate} tint="#E66767" height={100} />
            <Text style={styles.caption}>
              {Math.round(Math.min(...data.heartRate))}–{Math.round(Math.max(...data.heartRate))} bpm
            </Text>
          </>
        ) : (
          <Text style={styles.caption}>No readings yet today.</Text>
        )}
      </Card>
    </>
  );
};
