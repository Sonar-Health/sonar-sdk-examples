import { theme } from "./theme";

/** The app's own sign-in: the demo backend in ../backend holds the Sonar API key, never the app. */
export type Credentials = { backend: string; accessCode: string };

export type DailySeries = { dates: string[]; series: Record<string, (number | null)[]> };
export type Scores = {
  latest: Record<string, { date: string; value: number; previous_value: number | null } | null>;
};
export type SleepSession = {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_main_sleep: boolean;
  deep_minutes: number | null;
  light_minutes: number | null;
  rem_minutes: number | null;
  awake_minutes: number | null;
};
export type Timeseries = { start: string; step_seconds: number; values: (number | null)[] };

export type Metric = {
  id: string;
  title: string;
  short: string;
  unit: string;
  tint: string;
  /** Totals read as bars from zero; rates read as a line around their own range. */
  total: boolean;
};

export const metrics: Metric[] = [
  { id: "steps", title: "Steps", short: "Steps", unit: "steps", tint: theme.accent, total: true },
  { id: "active_calories", title: "Active energy", short: "Active energy", unit: "kcal", tint: "#D95926", total: true },
  { id: "resting_heart_rate", title: "Resting heart rate", short: "Resting HR", unit: "bpm", tint: "#E66767", total: false },
  { id: "heart_rate_variability", title: "Heart rate variability", short: "HRV", unit: "ms", tint: "#9085E9", total: false },
];

export const sleepStages = [
  { id: "deep", metric: "deep_sleep", title: "Deep", tint: "#3987E5" },
  { id: "light", metric: "light_sleep", title: "Light", tint: "#199E70" },
  { id: "rem", metric: "rem_sleep", title: "REM", tint: "#9085E9" },
  { id: "awake", metric: "time_awake", title: "Awake", tint: "#D95926" },
] as const;

export const scoreKinds = [
  { id: "sleep_score", title: "Sleep" },
  { id: "recovery_score", title: "Recovery" },
  { id: "strain_score", title: "Strain" },
  { id: "stress_score", title: "Stress" },
];

/** Sonar dates carry no offset: they are the user's wall clock. */
export const localDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const backendClient = ({ backend, accessCode }: Credentials) => {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${backend.replace(/\/+$/, "")}/${path}`, {
      ...init,
      headers: { authorization: `Bearer ${accessCode}`, "content-type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "The backend refused the access code."
          : `The backend answered ${response.status}: ${(await response.text()).slice(0, 200)}`,
      );
    }
    return (await response.json()) as T;
  };

  return {
    config: () => request<{ app_id: string }>("config"),
    sdkToken: async (installationId: string) =>
      (
        await request<{ client_token: string }>("sdk-token", {
          method: "POST",
          body: JSON.stringify({ installation_id: installationId }),
        })
      ).client_token,
    daily: (days: number) => {
      const types = [...metrics.map((metric) => metric.id), ...sleepStages.map((stage) => stage.metric)];
      return request<DailySeries>(`health/daily?types=${types.join(",")}&from_date=${localDate(days - 1)}`);
    },
    scores: () => request<Scores>(`health/scores?from_date=${localDate(6)}`),
    sleep: async () => (await request<{ data: SleepSession[] }>(`health/sleep?from_date=${localDate(2)}`)).data,
    heartRateToday: () => request<Timeseries>("health/timeseries?metric=heart_rate&resolution=15m"),
  };
};
