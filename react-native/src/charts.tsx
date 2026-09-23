import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import type { DayValue } from "./health";
import { theme } from "./theme";

/** Charts draw at the width their container gets. */
const Measured = ({ height, children }: { height: number; children: (width: number) => React.ReactNode }) => {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && children(width)}
    </View>
  );
};

export const Bars = ({ values, tint, height = 120 }: { values: DayValue[]; tint: string; height?: number }) => {
  const max = Math.max(1, ...values.map((day) => day.value));
  return (
    <Measured height={height}>
      {(width) => {
        const slot = width / Math.max(values.length, 1);
        return (
          <Svg width={width} height={height}>
            {values.map((day, index) => {
              const barHeight = (day.value / max) * (height - 4);
              return (
                <Rect
                  key={day.date}
                  x={index * slot + slot * 0.2}
                  y={height - barHeight}
                  width={slot * 0.6}
                  height={barHeight}
                  rx={Math.min(3, slot * 0.3)}
                  fill={tint}
                />
              );
            })}
          </Svg>
        );
      }}
    </Measured>
  );
};

/** A rate drawn around its own range, so small changes stay visible. */
export const LineChart = ({ values, tint, height = 120 }: { values: number[]; tint: string; height?: number }) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = Math.max(high - low, 1);
  return (
    <Measured height={height}>
      {(width) => {
        const x = (index: number) => (values.length < 2 ? width / 2 : (index / (values.length - 1)) * (width - 8) + 4);
        const y = (value: number) => height - 6 - ((value - low) / range) * (height - 12);
        const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join(" ");
        return (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke={theme.grid} />
            <Path d={path} stroke={tint} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {values.length <= 31 &&
              values.map((value, index) => <Circle key={index} cx={x(index)} cy={y(value)} r={2.5} fill={tint} />)}
          </Svg>
        );
      }}
    </Measured>
  );
};

export type StackedDay = { date: string; parts: { value: number; tint: string }[] };

export const StackedBars = ({ days, height = 140 }: { days: StackedDay[]; height?: number }) => {
  const max = Math.max(1, ...days.map((day) => day.parts.reduce((sum, part) => sum + part.value, 0)));
  return (
    <Measured height={height}>
      {(width) => {
        const slot = width / Math.max(days.length, 1);
        return (
          <Svg width={width} height={height}>
            {days.flatMap((day, index) => {
              let top = height;
              return day.parts.map((part, partIndex) => {
                const partHeight = (part.value / max) * (height - 4);
                top -= partHeight;
                return (
                  <Rect
                    key={`${day.date}-${partIndex}`}
                    x={index * slot + slot * 0.2}
                    y={top}
                    width={slot * 0.6}
                    height={partHeight}
                    fill={part.tint}
                  />
                );
              });
            })}
          </Svg>
        );
      }}
    </Measured>
  );
};

export const Ring = ({ fraction, tint, size = 64 }: { fraction: number; tint: string; size?: number }) => {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.grid} strokeWidth={6} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={tint}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference * Math.min(Math.max(fraction, 0), 1)} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};
