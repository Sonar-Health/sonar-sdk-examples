import Foundation
import Observation
import SonarSDK
import UIKit

/// Everything the app does with the Sonar SDK: configure and authenticate at every launch, connect
/// Apple Health, and mirror the SDK's observed state for the views.
@MainActor
@Observable
final class Account {
    static let shared = Account()

    /// Saved at sign-in so the next launch can configure the SDK before it finishes launching.
    /// A shipped app has its app ID as a constant instead.
    struct Credentials: Codable, Equatable {
        var backend: URL
        var accessCode: String
        var appId: String
        var userId: String
    }

    private(set) var credentials = Account.saved
    private(set) var state: SonarState?
    private(set) var working = false
    private(set) var failure: String?

    var backend: Backend? { credentials.map { Backend(url: $0.backend, accessCode: $0.accessCode) } }
    var appleHealth: ProviderState? { state?.providers.first { $0.provider == .appleHealth } }
    var isConnected: Bool { appleHealth?.connection == .connected }
    var isSyncing: Bool { appleHealth?.synchronization.rawValue.hasPrefix("syncing") == true }

    private static let credentialsKey = "demo.credentials"
    private var observation: SonarObservation?

    /// Called from `didFinishLaunching`: observers and background tasks need the SDK configured by then.
    func launch() {
        guard let credentials, configure(credentials) else { return }
        perform { try await self.authenticate(credentials) }
    }

    func signIn(backend url: URL, accessCode: String) {
        perform {
            let backend = Backend(url: url, accessCode: accessCode)
            let config = try await backend.config()
            let next = Credentials(backend: url, accessCode: accessCode, appId: config.appId, userId: config.userId)
            // The SDK refuses another app while a user is signed in.
            _ = await Sonar.signOut()
            guard self.configure(next) else { return }
            self.save(next)
            try await self.authenticate(next)
        }
    }

    func connectAppleHealth() {
        perform { _ = try await Sonar.connect(.appleHealth) }
    }

    func sync() {
        perform { _ = try await Sonar.sync() }
    }

    /// Disconnecting also deletes the Apple Health data Sonar holds for this user.
    func disconnectAppleHealth() {
        perform { _ = try await Sonar.disconnect(.appleHealth) }
    }

    func signOut() {
        perform {
            _ = await Sonar.signOut()
            self.save(nil)
            self.state = nil
        }
    }

    private func configure(_ credentials: Credentials) -> Bool {
        do {
            try Sonar.configure(appId: credentials.appId)
            observe()
            return true
        } catch {
            failure = describe(error)
            return false
        }
    }

    private func authenticate(_ credentials: Credentials) async throws {
        let backend = Backend(url: credentials.backend, accessCode: credentials.accessCode)
        _ = try await Sonar.authenticate(userId: credentials.userId) { context in
            try await backend.sdkToken(installationId: context.installationId)
        }
    }

    private func observe() {
        guard observation == nil else { return }
        observation = Sonar.observeState { [weak self] state in
            guard let self else { return }
            self.state = state
            // A locked phone hides Health data and suspends the app: stay awake while an import runs.
            UIApplication.shared.isIdleTimerDisabled = self.isSyncing
        }
    }

    private func perform(_ work: @escaping @MainActor () async throws -> Void) {
        guard !working else { return }
        working = true
        failure = nil
        Task {
            do {
                try await work()
            } catch {
                failure = describe(error)
            }
            working = false
        }
    }

    private func describe(_ error: Error) -> String {
        (error as? SonarSdkError)?.message ?? error.localizedDescription
    }

    private static var saved: Credentials? {
        UserDefaults.standard.data(forKey: credentialsKey).flatMap { try? JSONDecoder().decode(Credentials.self, from: $0) }
    }

    private func save(_ credentials: Credentials?) {
        UserDefaults.standard.set(credentials.flatMap { try? JSONEncoder().encode($0) }, forKey: Account.credentialsKey)
        self.credentials = credentials
    }
}
