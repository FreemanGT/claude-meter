import SwiftUI

// Single source of truth for colour, type, spacing and material. A literal in a view is a
// bug unless it's genuinely a one-off.
enum Theme {
    // MARK: - Colour

    // Metric identity: session / weekly / per-model. Red overrides near the limit.
    static let teal = Color(red: 0.36, green: 0.79, blue: 0.65)
    static let purple = Color(red: 0.69, green: 0.66, blue: 0.93)
    static let amber = Color(red: 0.98, green: 0.78, blue: 0.46)
    static let red = Color(red: 0.95, green: 0.42, blue: 0.42)
    // Translucent, not an opaque grey: on a frosted or glass panel an opaque dark track
    // would sit *darker* than its surface and stop reading as a recessed channel.
    static let track = Color.white.opacity(0.13)

    static let text = Color.white          // values
    static let text2 = Color(white: 0.66)  // labels, reset times, ambient state
    static let text3 = Color(white: 0.60)  // neutral notes

    static let warn: Double = 85

    static func tint(_ pct: Double, _ base: Color) -> Color { pct > warn ? red : base }

    // Non-colour signal for the same threshold, so it survives colour blindness.
    static func weight(_ pct: Double, _ base: Font.Weight) -> Font.Weight {
        pct > warn ? .bold : base
    }

    // MARK: - Type

    // Four steps. 10pt is the floor — smaller is not legible at notch size.
    enum Step: CGFloat {
        case caption = 10, label = 11, value = 13, ring = 15
    }

    // Digits are always monospaced so trailing-aligned percent columns never jitter.
    static func font(_ step: Step, _ weight: Font.Weight = .regular) -> Font {
        .system(size: step.rawValue, weight: weight).monospacedDigit()
    }

    // MARK: - Spacing (4pt grid, named by role)

    static let hair: CGFloat = 2      // inside a single glyph group
    static let tight: CGFloat = 4     // within one label stack
    static let row: CGFloat = 8       // between table rows
    static let column: CGFloat = 12   // between columns in a row
    static let edge: CGFloat = 12     // panel top/bottom inset
    static let group: CGFloat = 16    // between distinct groups
    static let gutter: CGFloat = 20   // panel side inset

    // MARK: - Components

    static let ringSize: CGFloat = 54
    static let ringStroke: CGFloat = 5
    static let barHeight: CGFloat = 6
    static let tick = CGSize(width: 26, height: 4)
    static let spark = CGSize(width: 44, height: 14)

    // Collapsed island: the strip either side of the physical cutout. Each metric is
    // centred in its own wing, so the margins stay symmetric.
    static func wing(percent: Bool) -> CGFloat { percent ? 46 : 40 }

    // NotchShape's side wall sits `topRadius` inside the frame — only the very top flares
    // out to the full width. Content has to be inset from the wall, not from the frame, or
    // the gutter silently collapses to nothing.
    static let expandedTopRadius: CGFloat = 19
    static let expandedBottomRadius: CGFloat = 24
    static let collapsedTopRadius: CGFloat = 6
    static let collapsedBottomRadius: CGFloat = 14

    // Frame widths, so the panel body is wall-to-wall content plus two gutters.
    static let peekWidth: CGFloat = 500
    static let pinnedWidth: CGFloat = 560

    // MARK: - Material

    /// A lit lip along the panel edge. Without it a black island on a dark desktop has no
    /// silhouette at all — only the drop shadow separates it from the wallpaper. Brightest
    /// along the bottom curve, which is the edge that actually catches light from the
    /// screen below; the top runs under the display bezel where nothing would.
    static let rim = LinearGradient(
        colors: [Color.white.opacity(0.04), Color.white.opacity(0.20)],
        startPoint: .top,
        endPoint: .bottom
    )
}

// MARK: - Appearance

enum Appearance: String, CaseIterable, Identifiable {
    case black, frosted, glass

    var id: String { rawValue }

    var label: String {
        switch self {
        case .black: "Solid"
        case .frosted: "Frosted"
        case .glass: "Liquid Glass"
        }
    }

    /// Black laid over the translucent material, top edge to bottom edge.
    ///
    /// Solid is fused to the camera housing: pure black, the notch just grows. The other two
    /// are meant to look like materials, so they let the desktop through — but always darker
    /// at the top, so the panel still reads as coming out of the black cutout rather than
    /// the cutout reading as a hole punched in a grey panel. Frosted is a heavy, even blur;
    /// Liquid Glass is thinner and lensing, with a lit rim that follows the pointer.
    /// (At the old uniform 0.84 all three modes looked the same, which was the complaint.)
    var scrim: (top: Double, bottom: Double) {
        switch self {
        case .black: (1, 1)
        case .frosted: (0.80, 0.56)
        case .glass: (0.70, 0.52)
        }
    }

    static let key = "appearance"

    // One-time migration off the old `frosted` Bool.
    static func stored(_ defaults: UserDefaults = .standard) -> Appearance {
        if let raw = defaults.string(forKey: key), let mode = Appearance(rawValue: raw) { return mode }
        let migrated: Appearance = defaults.bool(forKey: "frosted") ? .frosted : .black
        defaults.set(migrated.rawValue, forKey: key)
        return migrated
    }
}

// MARK: - Formatting

// Shared by the island, the menu, the status item and notifications, so the same reading
// never shows up worded two ways.
enum Format {
    static func percent(_ win: UsageModel.Window?) -> String {
        win.map { "\(Int($0.pct.rounded()))%" } ?? "—"
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds))
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }

    /// " " (not "") for a missing date, so table rows keep their height.
    static func reset(_ date: Date?) -> String {
        guard let date else { return " " }
        let seconds = date.timeIntervalSinceNow
        if seconds <= 0 { return "resetting…" }
        if seconds < 48 * 3600 { return "resets in \(duration(seconds))" }
        // FormatStyle, not a hardcoded pattern: 12h locales must not see "Thu 14:30".
        return "resets \(date.formatted(.dateTime.weekday(.abbreviated).hour().minute()))"
    }

    static func ago(_ date: Date?) -> String {
        guard let date else { return "never" }
        let seconds = -date.timeIntervalSinceNow
        if seconds < 90 { return "just now" }
        if seconds < 24 * 3600 { return "\(duration(seconds)) ago" }
        return date.formatted(.dateTime.weekday(.abbreviated).hour().minute())
    }

    static func clock(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }
}

extension UsageModel.Status {
    /// What's wrong, in one line; nil when there's nothing to report.
    var problem: String? {
        switch self {
        case .ok, .loading: nil
        case .stale(let reason): "stale · \(reason)"
        case .unauthorized: "session expired — open Claude Code to refresh"
        case .noCredentials(let message): message
        case .rateLimited(let until): "rate limited · retrying \(Format.clock(until))"
        case .throttled(let seconds): "just refreshed · updating in \(seconds)s"
        }
    }

    var healthy: Bool {
        switch self {
        case .ok, .loading, .throttled: true
        default: false
        }
    }
}
