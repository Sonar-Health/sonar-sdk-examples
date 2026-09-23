import { useCallback, useEffect, useState } from "react";

import {
  backendClient,
  type Credentials,
  type DailySeries,
  type Scores,
  type SleepSession,
} from "./backend";

export type Span = 7 | 30 | 90;
export type DayValue = { date: string; value: number };

export type HealthData = {
  daily: DailySeries;
  scores: Scores;
  lastNight: SleepSession | null;
  heartRate: number[];
};

/** What the charts draw, read from Sonar through the app's backend. Reloads when `version` changes. */
export const useHealthData = (credentials: Credentials, span: Span, version: string) => {
  const [data, setData] = useState<HealthData | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const client = backendClient(credentials);
    try {
      const [daily, scores, nights, heartRate] = await Promise.all([
        client.daily(span),
        client.scores(),
        client.sleep(),
        client.heartRateToday(),
      ]);
      const main = nights.filter((night) => night.is_main_sleep);
      setData({
        daily,
        scores,
        lastNight: main.sort((a, b) => a.end_time.localeCompare(b.end_time)).at(-1) ?? null,
        heartRate: heartRate.values.filter((value): value is number => value !== null),
      });
      setFailure(null);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
  }, [credentials, span]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return { data, failure, refreshing, refresh };
};

export const values = (daily: DailySeries | undefined, metric: string, last?: number): DayValue[] => {
  const all = (daily?.dates ?? []).flatMap((date, index) => {
    const value = daily?.series[metric]?.[index];
    return value === null || value === undefined ? [] : [{ date, value }];
  });
  return last ? all.slice(-last) : all;
};

export const wholeNumber = (value: number) => Math.round(value).toLocaleString();

export const hoursAndMinutes = (minutes: number) => {
  const whole = Math.round(minutes);
  return whole >= 60 ? `${Math.floor(whole / 60)}h ${whole % 60}m` : `${whole}m`;
};
