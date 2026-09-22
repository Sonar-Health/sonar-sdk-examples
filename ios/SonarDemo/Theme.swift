import SwiftUI

enum Theme {
    static let page = Color(hex: 0x0B0D12)
    static let card = Color(hex: 0x16181F)
    static let hairline = Color.white.opacity(0.08)
    static let grid = Color.white.opacity(0.10)
    static let ink = Color.white
    static let inkMuted = Color(hex: 0xB6B9C0)
    static let inkFaint = Color(hex: 0x84878F)
    static let accent = Color(hex: 0x30D158)
    static let danger = Color(hex: 0xFF5F5F)
}

extension Metric {
    var tint: Color {
        switch self {
        case .steps: Theme.accent
        case .activeCalories: Color(hex: 0xD95926)
        case .restingHeartRate: Color(hex: 0xE66767)
        case .heartRateVariability: Color(hex: 0x9085E9)
        case .deepSleep: SleepStage.deep.tint
        case .lightSleep: SleepStage.light.tint
        case .remSleep: SleepStage.rem.tint
        case .timeAwake: SleepStage.awake.tint
        }
    }
}

extension SleepStage {
    // Checked as adjacent stack neighbours on the card surface for colour-blind separation.
    var tint: Color {
        switch self {
        case .deep: Color(hex: 0x3987E5)
        case .light: Color(hex: 0x199E70)
        case .rem: Color(hex: 0x9085E9)
        case .awake: Color(hex: 0xD95926)
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255)
    }
}

struct Card<Content: View>: View {
    var title: String?
    var symbol: String?
    var tint = Theme.inkMuted
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                HStack(spacing: 6) {
                    if let symbol { Image(systemName: symbol).foregroundStyle(tint) }
                    Text(title).foregroundStyle(Theme.inkMuted)
                }
                .font(.subheadline.weight(.semibold))
            }
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.hairline))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Color.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.ink.opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.4), in: Capsule())
    }
}

struct Page<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(spacing: 14) { content }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
        }
        .background(Theme.page)
        .scrollContentBackground(.hidden)
    }
}
