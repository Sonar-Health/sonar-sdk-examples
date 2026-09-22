import SwiftUI

/// Stands in for the customer app's own sign-in: it signs in to the demo backend, never to Sonar.
struct SignInView: View {
    @State private var account = Account.shared
    @State private var backend = "http://"
    @State private var accessCode = ""

    private var backendURL: URL? {
        URL(string: backend.trimmingCharacters(in: .whitespaces)).flatMap { $0.host() == nil ? nil : $0 }
    }

    var body: some View {
        Hero(
            symbol: "waveform.path.ecg", title: "Sonar Demo",
            message: "Sign in to the demo backend. It prints its URL and access code when it starts."
        ) {
            VStack(spacing: 10) {
                TextField("Backend URL", text: $backend)
                    .keyboardType(.URL)
                    .textContentType(.URL)
                TextField("Access code", text: $accessCode)
            }
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .textFieldStyle(FieldStyle())

            Button(account.working ? "Signing in…" : "Sign in") {
                if let backendURL { account.signIn(backend: backendURL, accessCode: accessCode.trimmingCharacters(in: .whitespaces)) }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(account.working || backendURL == nil || accessCode.isEmpty)
        }
    }
}

struct ConnectView: View {
    @State private var account = Account.shared

    var body: some View {
        Hero(
            symbol: "heart.fill", title: "Bring your health data",
            message: "Connect Apple Health to see your steps, heart and sleep. The last days arrive first, then two years of history."
        ) {
            Button(account.working ? "Connecting…" : "Connect Apple Health", action: account.connectAppleHealth)
                .buttonStyle(PrimaryButtonStyle())
                .disabled(account.working)
            Button("Sign out", action: account.signOut)
                .font(.subheadline)
                .foregroundStyle(Theme.inkMuted)
                .disabled(account.working)
        }
    }
}

private struct Hero<Actions: View>: View {
    let symbol: String
    let title: String
    let message: String
    @ViewBuilder var actions: Actions
    @State private var account = Account.shared

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: symbol)
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(Theme.accent)
                .frame(width: 96, height: 96)
                .background(Theme.accent.opacity(0.14), in: Circle())
            Text(title).font(.system(.largeTitle, design: .rounded, weight: .bold)).foregroundStyle(Theme.ink)
            Text(message).font(.body).foregroundStyle(Theme.inkMuted).multilineTextAlignment(.center)
            Spacer()
            if let failure = account.failure {
                Label(failure, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
            }
            actions
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.page)
    }
}

private struct FieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.hairline))
            .foregroundStyle(Theme.ink)
    }
}
