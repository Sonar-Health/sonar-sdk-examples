import SonarSDK
import SwiftUI

struct SummaryView: View {
    let data: HealthData
    @State private var account = Account.shared
    @State private var showingConnection = false

    var body: some View {
        NavigationStack {
            Page {
                ImportBanner()
                LoadFailure(data: data)
                scores
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible())], spacing: 14) {
                    ForEach(Metric.headline) { metric in
                        MetricTile(metric: metric, week: data.values(metric, last: 7))
                    }
                }
                if let night = data.lastNight { LastNightCard(night: night) }
                HeartRateCard(samples: data.heartRate)
            }
            .refreshable { await reload() }
            .navigationTitle("Summary")
            .toolbar {
                Button { showingConnection = true } label: {
                    Image(systemName: account.isSyncing ? "arrow.triangle.2.circlepath" : "checkmark.icloud")
                        .symbolEffect(.pulse, isActive: account.isSyncing)
                }
                .accessibilityLabel("Apple Health connection")
            }
            .sheet(isPresented: $showingConnection) { ConnectionView() }
        }
    }

    @ViewBuilder
    private var scores: some View {
        let scored = Score.allCases.compactMap { score in data.scores?.latest(score).map { (score, $0) } }
        if !scored.isEmpty {
            Card(title: "Sonar scores", symbol: "sparkles", tint: Theme.accent) {
                HStack(alignment: .top) {
                    ForEach(scored, id: \.0) { score, latest in ScoreRing(score: score, latest: latest) }
                }
            }
        }
    }

    private func reload() async {
        if let backend = account.backend { await data.load(from: backend) }
    }
}

struct TrendsView: View {
    @Bindable var data: HealthData
    @State private var account = Account.shared

    var body: some View {
        NavigationStack {
            Page {
                Picker("Span", selection: $data.span) {
                    ForEach(HealthData.Span.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                LoadFailure(data: data)
                ForEach(Metric.headline) { metric in
                    TrendCard(metric: metric, values: data.values(metric))
                }
                SleepStagesCard(data: data)
            }
            .refreshable { if let backend = account.backend { await data.load(from: backend) } }
            .navigationTitle("Trends")
        }
    }
}

/// The SDK reports how far the first import has come; the recent days are chartable long before it ends.
private struct ImportBanner: View {
    @State private var account = Account.shared

    var body: some View {
        if let backfill = account.appleHealth?.backfill, backfill.phase != .complete {
            Card {
                HStack {
                    Text(backfill.phase == .recent ? "Importing your last days" : "Importing your history")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Text("\(backfill.daysDone) of \(backfill.daysTotal) days").font(.footnote).foregroundStyle(Theme.inkMuted)
                }
                ProgressView(value: backfill.fraction).tint(Theme.accent)
            }
        }
    }
}

private struct LoadFailure: View {
    let data: HealthData

    var body: some View {
        if let failure = data.failure {
            Label(failure, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote)
                .foregroundStyle(Theme.danger)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct ConnectionView: View {
    @State private var account = Account.shared
    @State private var confirmingDisconnect = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("Apple Health") {
                    let provider = account.appleHealth
                    LabeledContent("Connection", value: provider?.connection.rawValue ?? "-")
                    LabeledContent("Sync", value: provider?.synchronization.rawValue ?? "-")
                    LabeledContent("Last sync") {
                        if let at = provider?.lastSuccessfulSyncAt { Text(at, style: .relative) + Text(" ago") } else { Text("never") }
                    }
                    if let action = provider?.recoveryAction, action != .none {
                        LabeledContent("Needs", value: action.rawValue)
                    }
                }
                Section {
                    Button("Sync now", action: account.sync)
                    Button("Disconnect Apple Health", role: .destructive) { confirmingDisconnect = true }
                    Button("Sign out", role: .destructive) {
                        account.signOut()
                        dismiss()
                    }
                } footer: {
                    if let failure = account.failure { Text(failure).foregroundStyle(Theme.danger) }
                }
                .disabled(account.working)
            }
            .navigationTitle("Connection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
            .confirmationDialog(
                "Disconnecting deletes the Apple Health data Sonar holds for you.",
                isPresented: $confirmingDisconnect, titleVisibility: .visible
            ) {
                Button("Disconnect", role: .destructive) {
                    account.disconnectAppleHealth()
                    dismiss()
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
