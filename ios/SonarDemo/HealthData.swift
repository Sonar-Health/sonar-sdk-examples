import Foundation
import Observation

/// What the charts draw, read from Sonar through the app's backend.
@MainActor
@Observable
final class HealthData {
    enum Span: Int, CaseIterable, Identifiable {
        case week = 7
        case month = 30
        case quarter = 90

        var id: Int { rawValue }
        var label: String { "\(rawValue)D" }
    }

    var span = Span.month
    private(set) var daily: DailySeries?
    private(set) var scores: Scores?
    private(set) var lastNight: SleepSession?
    private(set) var heartRate: [Timeseries.Sample] = []
    private(set) var failure: String?
    private(set) var loadedAt: Date?

    func load(from backend: Backend) async {
        do {
            async let daily = backend.daily(Metric.allCases, days: span.rawValue)
            async let scores = backend.scores(days: Span.week.rawValue)
            async let nights = backend.sleep(days: 3)
            async let heartRate = backend.heartRateToday()
            self.daily = try await daily
            self.scores = try await scores
            self.lastNight = try await nights.filter(\.isMainSleep).max { $0.endTime < $1.endTime }
            self.heartRate = try await heartRate.samples
            failure = nil
            loadedAt = .now
        } catch is CancellationError {
        } catch let error as URLError where error.code == .cancelled {
        } catch {
            failure = error.localizedDescription
        }
    }

    func values(_ metric: Metric, last days: Int? = nil) -> [DayValue] {
        let values = daily?.values(metric) ?? []
        return days.map { Array(values.suffix($0)) } ?? values
    }
}
