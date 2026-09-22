import SonarSDK
import SwiftUI
import UIKit

@main
struct SonarDemoApp: App {
    @UIApplicationDelegateAdaptor private var delegate: AppDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}

/// Background tasks and HealthKit observers only work when the SDK is configured before launch finishes.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Account.shared.launch()
        return true
    }
}

/// Charts reload when the span changes and whenever the SDK reports new data in Sonar.
private struct Reload: Equatable {
    let span: HealthData.Span
    let syncedAt: Date?
    let backfill: BackfillProgress.Phase?
}

struct RootView: View {
    @State private var account = Account.shared
    @State private var data = HealthData()

    var body: some View {
        Group {
            if account.credentials == nil {
                SignInView()
            } else if account.isConnected {
                TabView {
                    SummaryView(data: data).tabItem { Label("Summary", systemImage: "heart.text.square.fill") }
                    TrendsView(data: data).tabItem { Label("Trends", systemImage: "chart.xyaxis.line") }
                }
                .task(id: Reload(span: data.span, syncedAt: account.appleHealth?.lastSuccessfulSyncAt, backfill: account.appleHealth?.backfill?.phase)) {
                    if let backend = account.backend { await data.load(from: backend) }
                }
            } else if account.state == nil && account.failure == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.page)
            } else {
                ConnectView()
            }
        }
        .animation(.default, value: account.isConnected)
    }
}
