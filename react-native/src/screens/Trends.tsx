import { Pressable, Text, View } from "react-native";

import { metrics, sleepStages } from "../backend";
import { Bars, LineChart, StackedBars } from "../charts";
import { type HealthData, type Span, values, wholeNumber } from "../health";
import { theme } from "../theme";
import { Card, styles } from "../ui";

const spans: Span[] = [7, 30, 90];

export const Trends = ({ data, span, onSpan }: { data: HealthData | null; span: Span; onSpan: (span: Span) => void }) => {
  const nights = (data?.daily.dates ?? []).map((date, index) => ({
    date,
    parts: sleepStages.map((stage) => ({ value: data?.daily.series[stage.metric]?.[index] ?? 0, tint: stage.tint })),
  }));
  const sleptNights = nights.filter((night) => night.parts.some((part) => part.value > 0));

  return (
    <>
      <View style={{ flexDirection: "row", backgroundColor: theme.card, borderRadius: 10, padding: 3 }}>
        {spans.map((option) => (
          <Pressable
            key={option}
            onPress={() => onSpan(option)}
            style={{ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: option === span ? theme.grid : "transparent" }}
          >
            <Text style={{ color: theme.ink, textAlign: "center", fontWeight: "600" }}>{option}D</Text>
          </Pressable>
        ))}
      </View>
      {metrics.map((metric) => {
        const days = values(data?.daily, metric.id);
        const average = days.length ? days.reduce((sum, day) => sum + day.value, 0) / days.length : null;
        return (
          <Card key={metric.id} title={metric.title}>
            <Text style={styles.value}>
              {average === null ? "–" : wholeNumber(average)} <Text style={styles.caption}>{metric.unit} a day on average</Text>
            </Text>
            {days.length === 0 ? (
              <Text style={styles.caption}>No data in this span.</Text>
            ) : metric.total ? (
              <Bars values={days} tint={metric.tint} />
            ) : (
              <LineChart values={days.map((day) => day.value)} tint={metric.tint} />
            )}
          </Card>
        );
      })}
      <Card title="Sleep stages">
        {sleptNights.length === 0 ? (
          <Text style={styles.caption}>No sleep in this span.</Text>
        ) : (
          <>
            <StackedBars days={nights} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {sleepStages.map((stage) => (
                <Text key={stage.id} style={styles.caption}>
                  <Text style={{ color: stage.tint }}>● </Text>
                  {stage.title}
                </Text>
              ))}
            </View>
          </>
        )}
      </Card>
    </>
  );
};
