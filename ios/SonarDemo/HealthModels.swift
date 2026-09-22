import Foundation

/// Sonar dates and clock times carry no offset: they are the user's wall clock, and are shown as such.
enum Day {
    private static let dateStyle = Date.ISO8601FormatStyle(timeZone: .current).year().month().day()
    private static let clockStyle = Date.ISO8601FormatStyle(timeZone: .current)
        .year().month().day().dateTimeSeparator(.standard).time(includingFractionalSeconds: false)

    static func ago(_ days: Int) -> String {
        Calendar.current.date(byAdding: .day, value: -days, to: .now)!.formatted(dateStyle)
    }

    static func date(_ text: String) -> Date? {
        try? dateStyle.parse(String(text.prefix(10)))
    }

    static func clock(_ text: String) -> Date? {
        try? clockStyle.parse(String(text.prefix(19)))
    }
}

struct DayValue: Identifiable, Equatable {
    let date: Date
    let value: Double
    var id: Date { date }
}

struct DailySeries: Decodable, Sendable {
    let dates: [String]
    let series: [String: [Double?]]

    func values(_ metric: Metric) -> [DayValue] {
        zip(dates, series[metric.rawValue] ?? []).compactMap { day, value in
            guard let value, let date = Day.date(day) else { return nil }
            return DayValue(date: date, value: value)
        }
    }
}

struct Scores: Decodable, Sendable {
    struct Latest: Decodable, Sendable {
        let date: String
        let value: Double
        let previousValue: Double?

        enum CodingKeys: String, CodingKey {
            case date, value
            case previousValue = "previous_value"
        }
    }

    let latest: [String: Latest?]

    func latest(_ score: Score) -> Latest? {
        latest[score.rawValue] ?? nil
    }
}

struct SleepPage: Decodable, Sendable {
    let data: [SleepSession]
}

struct SleepSession: Decodable, Sendable, Identifiable {
    let id: String
    let startTime: String
    let endTime: String
    let durationMinutes: Double
    let isMainSleep: Bool
    let asleepMinutes: Double?
    let deepMinutes: Double?
    let lightMinutes: Double?
    let remMinutes: Double?
    let awakeMinutes: Double?
    let efficiencyPct: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case startTime = "start_time"
        case endTime = "end_time"
        case durationMinutes = "duration_minutes"
        case isMainSleep = "is_main_sleep"
        case asleepMinutes = "asleep_minutes"
        case deepMinutes = "deep_minutes"
        case lightMinutes = "light_minutes"
        case remMinutes = "rem_minutes"
        case awakeMinutes = "awake_minutes"
        case efficiencyPct = "efficiency_pct"
    }

    func minutes(_ stage: SleepStage) -> Double {
        switch stage {
        case .deep: deepMinutes ?? 0
        case .light: lightMinutes ?? 0
        case .rem: remMinutes ?? 0
        case .awake: awakeMinutes ?? 0
        }
    }
}

struct Timeseries: Decodable, Sendable {
    struct Sample: Identifiable, Equatable {
        let at: Date
        let value: Double
        var id: Date { at }
    }

    let start: String
    let stepSeconds: Double
    let values: [Double?]

    enum CodingKeys: String, CodingKey {
        case start, values
        case stepSeconds = "step_seconds"
    }

    var samples: [Sample] {
        guard let start = Day.clock(start) else { return [] }
        return values.enumerated().compactMap { index, value in
            value.map { Sample(at: start.addingTimeInterval(Double(index) * stepSeconds), value: $0) }
        }
    }
}

enum Metric: String, CaseIterable, Identifiable, Sendable {
    case steps
    case activeCalories = "active_calories"
    case restingHeartRate = "resting_heart_rate"
    case heartRateVariability = "heart_rate_variability"
    case deepSleep = "deep_sleep"
    case lightSleep = "light_sleep"
    case remSleep = "rem_sleep"
    case timeAwake = "time_awake"

    static let headline: [Metric] = [.steps, .activeCalories, .restingHeartRate, .heartRateVariability]

    var id: String { rawValue }

    var title: String {
        switch self {
        case .steps: "Steps"
        case .activeCalories: "Active energy"
        case .restingHeartRate: "Resting heart rate"
        case .heartRateVariability: "Heart rate variability"
        case .deepSleep: "Deep"
        case .lightSleep: "Light"
        case .remSleep: "REM"
        case .timeAwake: "Awake"
        }
    }

    var shortTitle: String {
        switch self {
        case .restingHeartRate: "Resting HR"
        case .heartRateVariability: "HRV"
        default: title
        }
    }

    var unit: String {
        switch self {
        case .steps: "steps"
        case .activeCalories: "kcal"
        case .restingHeartRate: "bpm"
        case .heartRateVariability: "ms"
        case .deepSleep, .lightSleep, .remSleep, .timeAwake: "min"
        }
    }

    var symbol: String {
        switch self {
        case .steps: "figure.walk"
        case .activeCalories: "flame.fill"
        case .restingHeartRate: "heart.fill"
        case .heartRateVariability: "waveform.path.ecg"
        case .deepSleep, .lightSleep, .remSleep, .timeAwake: "bed.double.fill"
        }
    }

    /// Totals read as bars from zero; rates read as a line around their own range.
    var isTotal: Bool {
        self == .steps || self == .activeCalories
    }
}

enum SleepStage: String, CaseIterable, Identifiable, Sendable {
    case deep, light, rem, awake

    var id: String { rawValue }

    var metric: Metric {
        switch self {
        case .deep: .deepSleep
        case .light: .lightSleep
        case .rem: .remSleep
        case .awake: .timeAwake
        }
    }

    var title: String { metric.title }
}

enum Score: String, CaseIterable, Identifiable, Sendable {
    case sleep = "sleep_score"
    case recovery = "recovery_score"
    case strain = "strain_score"
    case stress = "stress_score"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sleep: "Sleep"
        case .recovery: "Recovery"
        case .strain: "Strain"
        case .stress: "Stress"
        }
    }
}

extension Date {
    var dayLabel: String {
        if Calendar.current.isDateInToday(self) { return "Today" }
        if Calendar.current.isDateInYesterday(self) { return "Yesterday" }
        return formatted(.dateTime.weekday(.wide).day().month())
    }
}

extension Double {
    var wholeNumber: String { formatted(.number.precision(.fractionLength(0))) }

    var hoursAndMinutes: String {
        let minutes = Int(self.rounded())
        return minutes >= 60 ? "\(minutes / 60)h \(minutes % 60)m" : "\(minutes)m"
    }
}
