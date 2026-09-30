import AppKit
import UserNotifications

// Threshold alerts for every usage window: the 5-hour session at 50/80/95, weekly and
// per-model limits at 80/95. Opt-in: authorization is requested the first time the user
// enables it, never at launch.
@MainActor
final class Notifier {
    static let shared = Notifier()
    nonisolated static let enabledKey = "notifications"

    private var trackers: [String: ThresholdTracker] = [:]

    private var enabled: Bool { UserDefaults.standard.bool(forKey: Self.enabledKey) }

    // UNUserNotificationCenter traps when the process isn't a real bundle, which is the
    // case for --selftest / --snapshot runs straight out of .build.
    private var available: Bool { Bundle.main.bundleIdentifier != nil }

    func requestAuthorization() {
        guard available else { return }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
            if let error { NSLog("ClaudeMeter notification auth failed: %@", String(describing: error)) }
            guard !granted else { return }
            // Denied earlier: macOS won't ask again, so don't leave a toggle on that does nothing.
            DispatchQueue.main.async {
                UserDefaults.standard.set(false, forKey: Notifier.enabledKey)
                let id = Bundle.main.bundleIdentifier ?? ""
                if let url = URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=\(id)") {
                    NSWorkspace.shared.open(url)
                }
            }
        }
    }

    /// Called after every successful fetch. Arming happens even while disabled, so
    /// switching notifications on mid-session doesn't fire a backlog.
    func usageChanged(_ metrics: [UsageModel.Metric], resets: Set<String>) {
        for metric in metrics {
            let session = metric.key == UsageHistory.sessionKey
            var tracker = trackers[metric.key]
                ?? ThresholdTracker(levels: session ? ThresholdTracker.sessionLevels : ThresholdTracker.weeklyLevels)
            let events = tracker.update(pct: metric.win.pct, didReset: resets.contains(metric.key))
            trackers[metric.key] = tracker

            let name = session ? "Session" : metric.key == UsageHistory.weeklyKey ? "Weekly limit" : "\(metric.name) limit"
            for event in events {
                switch event {
                case .reset:
                    post("\(name) reset", session ? "Your 5-hour window is back to full." : "Back to full.")
                case .crossed(let level):
                    var body = "\(Int(metric.win.pct.rounded()))% used"
                    if let reset = metric.win.resetsAt, reset > Date() { body += " · \(Format.reset(reset))" }
                    post("\(name) at \(Int(level))%", body)
                }
            }
        }
    }

    private func post(_ title: String, _ body: String) {
        guard enabled, available else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        )
    }
}
