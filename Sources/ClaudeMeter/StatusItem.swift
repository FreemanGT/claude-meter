import AppKit
import Combine
import SwiftUI

// Menu bar fallback for the island: external monitors, clamshell, or anyone who'd rather
// not have the notch light up. Off by default, toggled from the shared menu.
@MainActor
final class StatusItemController {
    nonisolated static let enabledKey = "menuBarItem"

    private let model: UsageModel
    private var item: NSStatusItem?
    private var cancellables: Set<AnyCancellable> = []

    init(model: UsageModel) {
        self.model = model

        // The menu writes the toggles; watch defaults rather than plumbing a callback.
        NotificationCenter.default.publisher(for: UserDefaults.didChangeNotification)
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.sync() }
            .store(in: &cancellables)

        // Both, and from the emitted values: @Published fires on willSet, so reading
        // model.status inside a $snapshot sink would see the previous one.
        model.$snapshot.combineLatest(model.$status)
            .sink { [weak self] snapshot, status in self?.render(snapshot, status) }
            .store(in: &cancellables)

        sync()
    }

    private var enabled: Bool { UserDefaults.standard.bool(forKey: Self.enabledKey) }

    private func sync() {
        if enabled, item == nil {
            let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
            item.menu = NSHostingMenu(rootView: MenuContent().environmentObject(model))
            self.item = item
            render(model.snapshot, model.status)
            NSLog("ClaudeMeter status item shown")
        } else if !enabled, let item {
            NSStatusBar.system.removeStatusItem(item)
            self.item = nil
            NSLog("ClaudeMeter status item hidden")
        } else if item != nil {
            render(model.snapshot, model.status)
        }
    }

    private func render(_ snapshot: UsageModel.Snapshot?, _ status: UsageModel.Status) {
        guard let button = item?.button else { return }
        let showPercent = UserDefaults.standard.bool(forKey: "showPercent")

        func part(_ win: UsageModel.Window?, _ base: NSColor) -> NSAttributedString {
            guard let win else {
                return NSAttributedString(string: "—", attributes: [.foregroundColor: NSColor.secondaryLabelColor])
            }
            // Greyed while the numbers can't be trusted, so stale readings don't pass for live.
            let tint = !status.healthy ? NSColor.secondaryLabelColor
                : win.pct > Theme.warn ? NSColor(Theme.red) : base
            return NSAttributedString(
                string: showPercent ? "\(Int(win.pct.rounded()))%" : String(repeating: "▮", count: blocks(win.pct)),
                attributes: [
                    .foregroundColor: tint,
                    .font: NSFont.monospacedDigitSystemFont(ofSize: 11, weight: win.pct > Theme.warn ? .bold : .medium),
                ]
            )
        }

        let title = NSMutableAttributedString()
        title.append(part(snapshot?.session, NSColor(Theme.teal)))
        title.append(NSAttributedString(
            string: "  ",
            attributes: [.foregroundColor: NSColor.tertiaryLabelColor]
        ))
        title.append(part(snapshot?.weeklyAll, NSColor(Theme.purple)))
        button.attributedTitle = title
        let tip = [status.problem, tooltip(snapshot)].compactMap { $0 }.joined(separator: " — ")
        button.toolTip = tip
        button.setAccessibilityLabel(tip)
    }

    // 1-5 filled blocks, so the glyph form carries the same reading as the percentage.
    private func blocks(_ pct: Double) -> Int {
        max(1, min(5, Int((pct / 20).rounded(.up))))
    }

    private func tooltip(_ snapshot: UsageModel.Snapshot?) -> String {
        guard let snapshot else { return "Claude Meter — no data yet" }
        return snapshot.metrics.map { "\($0.name) \(Format.percent($0.win))" }.joined(separator: " · ")
    }
}
