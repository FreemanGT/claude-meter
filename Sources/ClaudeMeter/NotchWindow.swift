import AppKit
import SwiftUI

@MainActor
final class DisplayState: ObservableObject {
    @Published var notchSize = CGSize(width: 190, height: 32)
    /// False on screens with no physical cutout, where the island lays itself out as a
    /// compact pill instead of straddling a void.
    @Published var hasNotch = true
    /// Click-to-pin. Here rather than in the view so the app can open the panel itself:
    /// on first launch, and when the app is opened again while already running.
    @Published var pinned = false
    /// Shrunk back into the camera housing: at launch, in full-screen apps, on quit.
    @Published var hidden = false

    nonisolated static let welcomedKey = "welcomed"
}

final class NotchWindow: NSPanel {
    // Roomy enough for the tallest panel (six model rows) plus the drop shadow. The
    // island sizes itself; this only has to avoid clipping it.
    private static let canvas = CGSize(width: 640, height: 480)

    init(contentView: NSView) {
        super.init(
            contentRect: NSRect(origin: .zero, size: Self.canvas),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        isMovable = false
        isFloatingPanel = true
        isReleasedWhenClosed = false
        level = NSWindow.Level(rawValue: NSWindow.Level.statusBar.rawValue + 8)
        collectionBehavior = [.fullScreenAuxiliary, .stationary, .canJoinAllSpaces, .ignoresCycle]
        appearance = NSAppearance(named: .darkAqua)
        self.contentView = contentView
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    func pin(to screen: NSScreen) {
        setFrameOrigin(NSPoint(
            x: screen.frame.midX - frame.width / 2,
            y: screen.frame.maxY - frame.height
        ))
    }
}

// The panel is far larger than the island so the shadow and a six-row table always fit.
// That only works because SwiftUI declines hits outside the island's contentShape — if it
// ever stopped, the app would silently plant a 640x480 dead zone over the top of the
// screen. Cheap to check, invisible when it breaks.
@MainActor
func runWindowSelfTest(_ check: (Bool, String) -> Void) {
    let model = UsageModel()
    model.startMock(named: "ok70")
    let display = DisplayState()
    display.notchSize = CGSize(width: 200, height: 32)
    let host = NSHostingView(
        rootView: IslandView().environmentObject(model).environmentObject(display)
    )
    let window = NotchWindow(contentView: host)
    window.orderFrontRegardless()
    host.layoutSubtreeIfNeeded()

    let size = host.frame.size
    let top = size.height - 8  // AppKit origin is bottom-left; the island hangs from the top
    check(host.hitTest(NSPoint(x: size.width / 2, y: top)) != nil, "island itself is clickable")
    check(host.hitTest(NSPoint(x: size.width / 2, y: 40)) == nil, "clicks pass through below the island")
    check(host.hitTest(NSPoint(x: 12, y: top)) == nil, "clicks pass through beside the island")
    window.orderOut(nil)
}

extension NSScreen {
    var displayID: CGDirectDisplayID {
        (deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value ?? 0
    }

    var isBuiltin: Bool { CGDisplayIsBuiltin(displayID) == 1 }

    // Physical camera-housing cutout, nil when absent (or hidden by native fullscreen).
    // +4pt overdraw so the black shape fully covers the cutout edges.
    var notchArea: CGSize? {
        guard safeAreaInsets.top > 0,
              let left = auxiliaryTopLeftArea, let right = auxiliaryTopRightArea
        else { return nil }
        return CGSize(width: frame.width - left.width - right.width + 4, height: safeAreaInsets.top)
    }

    var menuBarHeight: CGFloat { frame.maxY - visibleFrame.maxY }
}
