import Charts
import SwiftUI

struct Reading: View {
    let value: String
    let unit: String
    var caption: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value).font(.system(.title, design: .rounded, weight: .semibold)).foregroundStyle(Theme.ink)
                Text(unit).font(.subheadline).foregroundStyle(Theme.inkMuted)
            }
            if let caption { Text(caption).font(.caption).foregroundStyle(Theme.inkFaint) }
        }
    }
}

struct MetricTile: View {
    let metric: Metric
    let week: [DayValue]

    var body: some View {
        Card(title: metric.shortTitle, symbol: metric.symbol, tint: metric.tint) {
            if let latest = week.last {
                Reading(
                    value: latest.value.wholeNumber, unit: metric.unit,
                    caption: latest.date.dayLabel)
                Chart(week) { day in
                    if metric.isTotal {
                        BarMark(x: .value("Day", day.date, unit: .day), y: .value(metric.title, day.value), width: .ratio(0.6))
                            .clipShape(.rect(topLeadingRadius: 3, topTrailingRadius: 3))
                    } else {
                        LineMark(x: .value("Day", day.date, unit: .day), y: .value(metric.title, day.value))
                            .interpolationMethod(.monotone)
                            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                    }
                }
                .foregroundStyle(metric.tint)
                .chartYScale(domain: .automatic(includesZero: metric.isTotal))
                .chartXAxis(.hidden)
                .chartYAxis(.hidden)
                .frame(height: 44)
                .accessibilityLabel("\(metric.title), last 7 days")
            } else {
                NoData()
            }
        }
    }
}

struct TrendCard: View {
    let metric: Metric
    let values: [DayValue]
    @State private var selectedDay: Date?

    private var selected: DayValue? {
        selectedDay.flatMap { day in values.first { Calendar.current.isDate($0.date, inSameDayAs: day) } }
    }

    private var average: Double {
        values.map(\.value).reduce(0, +) / Double(max(values.count, 1))
    }

    var body: some View {
        Card(title: metric.title, symbol: metric.symbol, tint: metric.tint) {
            if values.isEmpty {
                NoData()
            } else {
                Reading(
                    value: (selected?.value ?? average).wholeNumber, unit: metric.unit,
                    caption: selected?.date.formatted(.dateTime.weekday(.wide).day().month()) ?? "Daily average")
                Chart {
                    ForEach(values) { day in
                        if metric.isTotal {
                            BarMark(x: .value("Day", day.date, unit: .day), y: .value(metric.title, day.value), width: .ratio(0.65))
                                .clipShape(.rect(topLeadingRadius: 4, topTrailingRadius: 4))
                                .opacity(selected == nil || selected == day ? 1 : 0.4)
                        } else {
                            LineMark(x: .value("Day", day.date, unit: .day), y: .value(metric.title, day.value))
                                .interpolationMethod(.monotone)
                                .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                        }
                    }
                    if let selected, !metric.isTotal {
                        RuleMark(x: .value("Day", selected.date, unit: .day)).foregroundStyle(Theme.grid)
                        PointMark(x: .value("Day", selected.date, unit: .day), y: .value(metric.title, selected.value))
                            .symbolSize(90)
                    }
                }
                .foregroundStyle(metric.tint)
                .chartYScale(domain: .automatic(includesZero: metric.isTotal))
                .chartXSelection(value: $selectedDay)
                .quietAxes()
                .frame(height: 160)
            }
        }
    }
}

struct SleepStagesCard: View {
    struct Segment: Identifiable {
        let stage: SleepStage
        let day: DayValue
        var id: String { "\(stage.rawValue)-\(day.date.timeIntervalSince1970)" }
    }

    let data: HealthData
    @State private var selectedDay: Date?

    private var segments: [Segment] {
        SleepStage.allCases.flatMap { stage in data.values(stage.metric).map { Segment(stage: stage, day: $0) } }
    }

    private func night(_ day: Date) -> [Segment] {
        segments.filter { Calendar.current.isDate($0.day.date, inSameDayAs: day) }
    }

    var body: some View {
        let segments = segments
        let nights = Set(segments.map(\.day.date)).count
        let asleep = segments.filter { $0.stage != .awake }.map(\.day.value).reduce(0, +)
        let selected = selectedDay.map(night) ?? []

        Card(title: "Sleep stages", symbol: "bed.double.fill", tint: SleepStage.deep.tint) {
            if segments.isEmpty {
                NoData()
            } else {
                if let first = selected.first {
                    Reading(
                        value: selected.filter { $0.stage != .awake }.map(\.day.value).reduce(0, +).hoursAndMinutes,
                        unit: "asleep", caption: first.day.date.formatted(.dateTime.weekday(.wide).day().month()))
                } else {
                    Reading(value: (asleep / Double(max(nights, 1))).hoursAndMinutes, unit: "asleep", caption: "Nightly average")
                }
                Chart(segments) { segment in
                    BarMark(
                        x: .value("Night", segment.day.date, unit: .day),
                        y: .value("Hours", segment.day.value / 60), width: .ratio(0.65)
                    )
                    .foregroundStyle(by: .value("Stage", segment.stage.title))
                    .opacity(selected.isEmpty || selected.contains { $0.id == segment.id } ? 1 : 0.4)
                }
                .chartForegroundStyleScale(domain: SleepStage.allCases.map(\.title), range: SleepStage.allCases.map(\.tint))
                .chartXSelection(value: $selectedDay)
                .chartLegend(position: .bottom, alignment: .leading, spacing: 12)
                .quietAxes(yUnit: "h")
                .frame(height: 200)
            }
        }
    }
}

struct HeartRateCard: View {
    let samples: [Timeseries.Sample]
    @State private var selectedTime: Date?

    private static let tint = Metric.restingHeartRate.tint

    private var selected: Timeseries.Sample? {
        selectedTime.flatMap { time in samples.min { abs($0.at.timeIntervalSince(time)) < abs($1.at.timeIntervalSince(time)) } }
    }

    var body: some View {
        Card(title: "Heart rate today", symbol: "heart.fill", tint: Self.tint) {
            if let latest = samples.last, let low = samples.map(\.value).min(), let high = samples.map(\.value).max() {
                let shown = selected ?? latest
                Reading(
                    value: shown.value.wholeNumber, unit: "bpm",
                    caption: "\(shown.at.formatted(date: .omitted, time: .shortened)) · range \(low.wholeNumber)–\(high.wholeNumber)")
                let day = Calendar.current.startOfDay(for: latest.at)
                Chart {
                    ForEach(samples) { sample in
                        AreaMark(x: .value("Time", sample.at), yStart: .value("Low", low - 5), yEnd: .value("bpm", sample.value))
                            .interpolationMethod(.monotone)
                            .foregroundStyle(.linearGradient(colors: [Self.tint.opacity(0.35), Self.tint.opacity(0)], startPoint: .top, endPoint: .bottom))
                        LineMark(x: .value("Time", sample.at), y: .value("bpm", sample.value))
                            .interpolationMethod(.monotone)
                            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                            .foregroundStyle(Self.tint)
                    }
                    if let selected {
                        RuleMark(x: .value("Time", selected.at)).foregroundStyle(Theme.grid)
                        PointMark(x: .value("Time", selected.at), y: .value("bpm", selected.value))
                            .symbolSize(90)
                            .foregroundStyle(Self.tint)
                    }
                }
                .chartXScale(domain: day...day.addingTimeInterval(86_400))
                .chartYScale(domain: (low - 5)...(high + 5))
                .chartXSelection(value: $selectedTime)
                .chartXAxis {
                    AxisMarks(values: .stride(by: .hour, count: 6)) { _ in
                        AxisGridLine().foregroundStyle(Theme.grid)
                        AxisValueLabel(format: .dateTime.hour()).foregroundStyle(Theme.inkFaint)
                    }
                }
                .quietYAxis()
                .frame(height: 160)
            } else {
                NoData()
            }
        }
    }
}

struct LastNightCard: View {
    let night: SleepSession

    var body: some View {
        Card(title: "Last night", symbol: "moon.stars.fill", tint: SleepStage.rem.tint) {
            Reading(value: (night.asleepMinutes ?? night.durationMinutes).hoursAndMinutes, unit: "asleep", caption: window)
            let stages = SleepStage.allCases.filter { night.minutes($0) > 0 }
            if !stages.isEmpty {
                GeometryReader { bar in
                    let total = stages.map(night.minutes).reduce(0, +)
                    let width = bar.size.width - CGFloat(stages.count - 1) * 2
                    HStack(spacing: 2) {
                        ForEach(stages) { stage in
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill(stage.tint)
                                .frame(width: width * night.minutes(stage) / total)
                        }
                    }
                }
                .frame(height: 14)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 8) {
                    ForEach(stages) { stage in
                        HStack(spacing: 6) {
                            Circle().fill(stage.tint).frame(width: 8, height: 8)
                            Text(stage.title).foregroundStyle(Theme.inkMuted)
                            Spacer()
                            Text(night.minutes(stage).hoursAndMinutes).foregroundStyle(Theme.ink)
                        }
                        .font(.footnote)
                    }
                }
            }
        }
    }

    private var window: String? {
        guard let start = Day.clock(night.startTime), let end = Day.clock(night.endTime) else { return nil }
        let clock = Date.FormatStyle(date: .omitted, time: .shortened)
        let efficiency = night.efficiencyPct.map { " · \($0.wholeNumber)% efficiency" } ?? ""
        return "\(start.formatted(clock)) – \(end.formatted(clock))\(efficiency)"
    }
}

struct ScoreRing: View {
    let score: Score
    let latest: Scores.Latest

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().stroke(Theme.grid, lineWidth: 7)
                Circle()
                    .trim(from: 0, to: min(latest.value, 100) / 100)
                    .stroke(Theme.accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(latest.value.wholeNumber).font(.system(.title3, design: .rounded, weight: .semibold)).foregroundStyle(Theme.ink)
            }
            .frame(width: 68, height: 68)
            Text(score.title).font(.footnote).foregroundStyle(Theme.inkMuted)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(score.title) score \(latest.value.wholeNumber) of 100")
    }
}

struct NoData: View {
    var body: some View {
        Text("No data yet").font(.subheadline).foregroundStyle(Theme.inkFaint).padding(.vertical, 8)
    }
}

extension View {
    func quietAxes(yUnit: String = "") -> some View {
        chartXAxis {
            AxisMarks(preset: .aligned, values: .automatic(desiredCount: 4)) { _ in
                AxisValueLabel(format: .dateTime.day().month(.abbreviated)).foregroundStyle(Theme.inkFaint)
            }
        }
        .quietYAxis(unit: yUnit)
    }

    func quietYAxis(unit: String = "") -> some View {
        chartYAxis {
            AxisMarks(values: .automatic(desiredCount: 3)) { value in
                AxisGridLine().foregroundStyle(Theme.grid)
                AxisValueLabel {
                    if let number = value.as(Double.self) {
                        Text(number.formatted(.number.notation(.compactName)) + unit).foregroundStyle(Theme.inkFaint)
                    }
                }
            }
        }
    }
}
