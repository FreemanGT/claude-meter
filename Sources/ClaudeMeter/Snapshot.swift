import AppKit
import SwiftUI

// `ClaudeMeter --snapshot <dir>` renders every UI state to PNG.
//
// Screen Recording isn't always available to whoever is iterating on the layout, and a
// running app only ever shows one state at a time. This dumps all of them at once and
// doubles as a visual regression check before a release.
/// Set while rendering to PNG, so views can substitute anything the offscreen renderer
/// can't draw (window-server blur, most notably).
@MainActor
enum Render {
    static var offscreen = false
}

@MainActor
enum SnapshotRenderer {
    private struct Scene {
        let name: String
        let mock: String
        let mode: IslandView.Mode
        var notch = true
        var percent = true
        var appearance = Appearance.black
        var desk = Desk.neutral
        var welcome = false
    }

    /// What sits behind the island. Translucent modes have to survive the bright one —
    /// that's where a material lighter than the camera housing gives itself away.
    private enum Desk {
        case neutral, bright, dark

        var colors: [Color] {
            switch self {
            case .neutral: [Color(white: 0.34), Color(white: 0.14)]
            case .bright: [Color(red: 0.99, green: 0.95, blue: 0.88), Color(red: 0.72, green: 0.83, blue: 0.95)]
            case .dark: [Color(white: 0.10), Color(white: 0.03)]
            }
        }
    }

    private static let scenes: [Scene] = [
        Scene(name: "collapsed-ticks", mock: "ok30", mode: .collapsed, percent: false),
        Scene(name: "collapsed-percent", mock: "ok30", mode: .collapsed),
        Scene(name: "collapsed-warn", mock: "ok90", mode: .collapsed),
        Scene(name: "collapsed-attention", mock: "nocreds", mode: .collapsed),
        Scene(name: "collapsed-nonotch", mock: "ok30", mode: .collapsed, notch: false),
        Scene(name: "collapsed-nonotch-ticks", mock: "ok30", mode: .collapsed, notch: false, percent: false),
        Scene(name: "peek", mock: "ok30", mode: .peek),
        Scene(name: "peek-burning", mock: "ok90", mode: .peek),
        Scene(name: "peek-idle", mock: "idle", mode: .peek),
        Scene(name: "pinned", mock: "ok70", mode: .pinned),
        Scene(name: "pinned-warn", mock: "ok90", mode: .pinned),
        Scene(name: "pinned-6models", mock: "models", mode: .pinned),
        Scene(name: "pinned-nocreds", mock: "nocreds", mode: .pinned),
        Scene(name: "pinned-unauthorized", mock: "unauthorized", mode: .pinned),
        Scene(name: "pinned-ratelimited", mock: "ratelimited", mode: .pinned),
        Scene(name: "pinned-throttled", mock: "throttled", mode: .pinned),
        Scene(name: "pinned-welcome", mock: "ok30", mode: .pinned, welcome: true),
        Scene(name: "pinned-welcome-nocreds", mock: "nocreds", mode: .pinned, welcome: true),
        Scene(name: "peek-limit", mock: "limit", mode: .peek),
        Scene(name: "pinned-limit", mock: "limit", mode: .pinned),
        Scene(name: "collapsed-limit", mock: "limit", mode: .collapsed),
        // Materials, worst case first. NSVisualEffectView draws nothing offscreen, so a
        // frosted frame here shows the scrim alone — the real panel is strictly darker
        // than this, which makes it a conservative legibility test.
        Scene(name: "material-frosted-bright", mock: "ok70", mode: .pinned, appearance: .frosted, desk: .bright),
        Scene(name: "material-glass-bright", mock: "ok70", mode: .pinned, appearance: .glass, desk: .bright),
        Scene(name: "material-black-bright", mock: "ok70", mode: .pinned, appearance: .black, desk: .bright),
        Scene(name: "material-frosted-dark", mock: "ok70", mode: .pinned, appearance: .frosted, desk: .dark),
        Scene(name: "material-glass-dark", mock: "ok70", mode: .pinned, appearance: .glass, desk: .dark),
        Scene(name: "material-collapsed-frosted", mock: "ok70", mode: .collapsed, appearance: .frosted, desk: .bright),
    ]

    private static let canvas = CGSize(width: 620, height: 380)

    // A throwaway domain so rendering never touches the user's real settings.
    private static let suite = "com.freeman.claudemeter.snapshot"

    static func run(into directory: String) {
        Render.offscreen = true
        let folder = URL(fileURLWithPath: directory)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        guard let store = UserDefaults(suiteName: suite) else {
            print("snapshot: could not open the scratch defaults domain")
            exit(1)
        }
        defer { UserDefaults.standard.removePersistentDomain(forName: suite) }

        let realNotch = NSScreen.screens.first(where: \.isBuiltin)?.notchArea
        var written = 0

        for scene in scenes {
            store.set(scene.percent, forKey: "showPercent")
            store.set(true, forKey: "burnRate")
            store.set(scene.appearance.rawValue, forKey: Appearance.key)
            store.set(!scene.welcome, forKey: DisplayState.welcomedKey)

            let model = UsageModel()
            model.startMock(named: scene.mock)
            let display = DisplayState()
            display.hasNotch = scene.notch
            display.pinned = scene.mode == .pinned
            display.notchSize = scene.notch
                ? (realNotch ?? CGSize(width: 200, height: 32))
                : CGSize(width: 190, height: 24)

            let view = stage(scene, model: model, display: display, store: store)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            guard let image = renderer.cgImage,
                  let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
            else {
                print("snapshot: failed to render \(scene.name)")
                continue
            }
            do {
                try png.write(to: folder.appendingPathComponent("\(scene.name).png"))
                written += 1
            } catch {
                print("snapshot: failed to write \(scene.name): \(error)")
            }
        }
        print("wrote \(written)/\(scenes.count) snapshots to \(folder.path)")
    }

    private static func stage(
        _ scene: Scene, model: UsageModel, display: DisplayState, store: UserDefaults
    ) -> some View {
        ZStack(alignment: .top) {
            // Stand-in desktop, so a black island has an edge you can actually see.
            LinearGradient(colors: scene.desk.colors, startPoint: .top, endPoint: .bottom)
            IslandView(mode: scene.mode)
                .environmentObject(model)
                .environmentObject(display)
                .defaultAppStorage(store)
        }
        .overlay(alignment: .top) {
            // The camera housing occludes the island on real hardware; draw it so the
            // collapsed wings and the expanded top padding can be judged honestly.
            if scene.notch {
                let housing = UnevenRoundedRectangle(bottomLeadingRadius: 9, bottomTrailingRadius: 9)
                housing
                    .fill(.black)
                    // Magenta hairline: not part of the UI, just so the cutout's edges are
                    // findable against a black island.
                    .overlay(housing.strokeBorder(Color(red: 1, green: 0.2, blue: 0.55), lineWidth: 0.75))
                    .frame(width: display.notchSize.width - 4, height: display.notchSize.height)
            }
        }
        .frame(width: canvas.width, height: canvas.height)
        .environment(\.colorScheme, .dark)
    }
}
