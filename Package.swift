// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ClaudeMeter",
    // 14.4 is the floor for NSHostingMenu (one menu definition shared by the island's
    // context menu and the status item).
    platforms: [.macOS("14.4")],
    targets: [
        .executableTarget(name: "ClaudeMeter")
    ]
)
