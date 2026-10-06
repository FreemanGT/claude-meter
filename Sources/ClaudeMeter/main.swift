import AppKit
import SwiftUI
import UserNotifications

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let model = UsageModel()
    private let display = DisplayState()
    private var window: NotchWindow?
    private var statusItem: StatusItemController?
    private var lastScreenID: CGDirectDisplayID = 0
    private var lastScreenSize: CGSize = .zero
    private var lastNotchHeight: CGFloat = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = Appearance.stored()  // one-time migration off the old `frosted` bool
        if let index = CommandLine.arguments.firstIndex(of: "--mock"), index + 1 < CommandLine.arguments.count {
            model.startMock(named: CommandLine.arguments[index + 1])
        } else {
            replaceOtherCopies()
            warnIfNotInstalled()
            model.start()
            Notifier.shared.requestAuthorization(atLaunch: true)
        }
        // Nothing else tells a stranger this panel does anything; open it once with a hint.
        if !UserDefaults.standard.bool(forKey: DisplayState.welcomedKey) { display.pinned = true }
        statusItem = StatusItemController(model: model)
        display.hidden = true  // grows out of the camera housing once it's on screen
        rebuildWindow()

        NotificationCenter.default.addObserver(
            self, selector: #selector(screensChanged),
            name: NSApplication.didChangeScreenParametersNotification, object: nil
        )
        let workspace = NSWorkspace.shared.notificationCenter
        workspace.addObserver(
            self, selector: #selector(didWake),
            name: NSWorkspace.didWakeNotification, object: nil
        )
        workspace.addObserver(
            self, selector: #selector(spaceChanged),
            name: NSWorkspace.activeSpaceDidChangeNotification, object: nil
        )
    }

    /// Opening the app again while it runs (Finder, Spotlight, Launchpad) shows the panel
    /// instead of silently doing nothing.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        display.pinned = true
        return false
    }

    /// Newest launch wins, so the copy in /Applications replaces one still running from the
    /// disk image — two islands would overlap and poll a 429-prone endpoint twice as often.
    private func replaceOtherCopies() {
        guard let id = Bundle.main.bundleIdentifier else { return }
        let me = ProcessInfo.processInfo.processIdentifier
        for other in NSRunningApplication.runningApplications(withBundleIdentifier: id)
            where other.processIdentifier != me {
            other.terminate()
        }
    }

    /// Run straight from the disk image (or a translocated Downloads copy) and it vanishes at
    /// the next restart — easy to miss for an app with no Dock icon.
    private func warnIfNotInstalled() {
        let path = Bundle.main.bundlePath
        guard path.hasPrefix("/Volumes/") || path.contains("/AppTranslocation/") else { return }
        NSApp.activate()
        let alert = NSAlert()
        alert.messageText = "Move Claude Meter to Applications"
        alert.informativeText = "It's running from the download right now. Drag it into your Applications folder and open it from there so it keeps working after a restart."
        alert.runModal()
    }

    @objc private func screensChanged() { rebuildWindow() }
    @objc private func didWake() { model.refreshOnWake() }
    @objc private func spaceChanged() { updateVisibility() }

    private var targetScreen: NSScreen? {
        NSScreen.screens.first(where: \.isBuiltin) ?? NSScreen.main ?? NSScreen.screens.first
    }

    private func rebuildWindow() {
        guard let screen = targetScreen else { return }
        if window == nil {
            let host = NSHostingView(
                rootView: IslandView().environmentObject(model).environmentObject(display)
            )
            window = NotchWindow(contentView: host)
        }
        window?.pin(to: screen)
        updateVisibility()
    }

    private func updateVisibility() {
        guard let screen = targetScreen, let window else { return }
        // Moving to a different display (closing the lid into clamshell) invalidates the
        // remembered notch, or the island keeps straddling a cutout that isn't there.
        // So does switching the built-in display to a resolution that hides the notch: the
        // display ID stays the same, but the remembered cutout would keep the island hidden.
        if screen.displayID != lastScreenID || screen.frame.size != lastScreenSize {
            lastScreenID = screen.displayID
            lastScreenSize = screen.frame.size
            lastNotchHeight = 0
        }
        // Re-measure here (not only on screen-param changes): exiting a fullscreen space
        // doesn't post didChangeScreenParametersNotification, but it does change the notch reading.
        if let notch = screen.notchArea {
            lastNotchHeight = notch.height
            display.notchSize = notch
            display.hasNotch = true
        } else if lastNotchHeight == 0 {
            display.notchSize = CGSize(width: 190, height: max(24, screen.menuBarHeight))
            display.hasNotch = false
        }
        // Native fullscreen: the notch cutout reports 0 and the menu bar is auto-hidden.
        // ponytail: users with a permanently hidden menu bar on non-notch screens never see the island; revisit if that setup matters.
        let fullscreen = screen.safeAreaInsets.top == 0 && (lastNotchHeight > 0 || screen.menuBarHeight == 0)
        if fullscreen {
            if window.isVisible { shrink { [weak self] in self?.window?.orderOut(nil) } }
        } else {
            window.orderFrontRegardless()
            grow()
        }
    }

    // MARK: - Shrink into / grow out of the camera housing

    private var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }

    private func grow() {
        guard display.hidden else { return }
        // Next turn of the run loop, so the hidden state is on screen before it animates away.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [self] in
            withAnimation(reduceMotion ? nil : .bouncy(duration: 0.4)) { display.hidden = false }
        }
    }

    private func shrink(then done: @escaping @MainActor () -> Void) {
        withAnimation(reduceMotion ? nil : .smooth(duration: 0.4)) { display.hidden = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + (reduceMotion ? 0 : 0.4)) { [self] in
            guard display.hidden else { return }  // came back mid-animation
            done()
        }
    }

    func quit() {
        guard window?.isVisible == true else { NSApp.terminate(nil); return }
        shrink { NSApp.terminate(nil) }
    }
}

let selftest = CommandLine.arguments.contains("--selftest")
if selftest { runSelfTest() }

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

if selftest {
    runWindowSelfTest(selfTestCheck)  // needs NSApplication for AppKit hit testing
    print("selftest passed")
    exit(0)
}

if let index = CommandLine.arguments.firstIndex(of: "--snapshot") {
    let directory = index + 1 < CommandLine.arguments.count
        ? CommandLine.arguments[index + 1]
        : FileManager.default.currentDirectoryPath + "/snapshots"
    SnapshotRenderer.run(into: directory)
    exit(0)
}

// Live check of the renewal path on this Mac: one real refresh, then re-read Claude Code's store
// to confirm the rotated grant landed there. Prints no secrets.
if CommandLine.arguments.contains("--refresh-check") {
    Task {
        guard case .success(let before) = Credentials.read() else { print("no credentials"); exit(1) }
        switch await Credentials.refresh(before) {
        case .failure(let error):
            print("refresh failed: \(error.message)")
            exit(1)
        case .success(let fresh):
            let after = try? Credentials.read().get()
            let landed = after?.accessToken == fresh.accessToken && after?.refreshToken == fresh.refreshToken
            print(landed ? "refresh ok, written back" : "refresh ok, write-back FAILED")
            exit(landed ? 0 : 1)
        }
    }
    dispatchMain()
}

// Live check of alert delivery, run from the installed app's binary (needs the bundle identity):
// a denied app's alerts vanish without any error, so say what macOS reports, then post one.
if CommandLine.arguments.contains("--notify-test") {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
        let allowed = settings.authorizationStatus == .authorized
        print(allowed ? "notifications allowed" : "notifications NOT allowed (status \(settings.authorizationStatus.rawValue))")
        let content = UNMutableNotificationContent()
        content.title = "Claude Meter"
        content.body = "Test alert"
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: "notify-test", content: content, trigger: nil)
        ) { _ in exit(allowed ? 0 : 1) }
    }
    dispatchMain()
}

// Percentages by default: the tick marks read as decoration until you know what they are.
UserDefaults.standard.register(defaults: Glance.defaults.merging(["showPercent": true]) { $1 })

let delegate = AppDelegate()
app.delegate = delegate
app.run()
