import AppKit
import ServiceManagement
import SwiftUI

struct IslandView: View {
    /// Presets so --snapshot can render an expanded state without a mouse.
    enum Mode { case collapsed, peek, pinned }

    @EnvironmentObject private var model: UsageModel
    @EnvironmentObject private var display: DisplayState
    @AppStorage(Appearance.key) private var appearanceRaw = Appearance.stored().rawValue
    @AppStorage("showPercent") private var showPercent = false
    @AppStorage(Glance.session.key) private var showSession = true
    @AppStorage(Glance.weekly.key) private var showWeekly = true
    @AppStorage(Glance.model.key) private var showModel = false
    @AppStorage("burnRate") private var burnRate = true
    @AppStorage(DisplayState.welcomedKey) private var welcomed = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var hovering = false
    /// Pointer position over the island: the key light on Liquid Glass's rim.
    @State private var keyLight: CGPoint?
    @State private var open: Bool
    @State private var hoverTask: Task<Void, Never>?
    /// Rings and bars draw in from zero each time the panel opens.
    @State private var drawn: Bool

    /// `.pinned` is set on DisplayState by whoever builds the view (it outlives the view).
    init(mode: Mode = .collapsed) {
        _open = State(initialValue: mode == .peek)
        // Offscreen renders have no appear pass to animate in, so they start drawn.
        _drawn = State(initialValue: Render.offscreen || mode != .collapsed)
    }

    private var pinned: Bool { display.pinned }
    private var expanded: Bool { (open || pinned) && !display.hidden }
    private var draw: Double { drawn ? 1 : 0 }
    private var paneTransition: AnyTransition { reduceMotion ? .opacity : .squeeze }
    private var appearance: Appearance {
        reduceTransparency ? .black : Appearance(rawValue: appearanceRaw) ?? .black
    }

    // Over a translucent panel the desktop shows through, so the quiet greys that work on
    // black go muddy; lift them and give the text a hairline shadow instead.
    private var translucent: Bool { appearance != .black }
    private var secondary: Color { translucent ? .white.opacity(0.84) : Theme.text2 }
    private var tertiary: Color { translucent ? .white.opacity(0.74) : Theme.text3 }
    private var track: Color { translucent ? .white.opacity(0.22) : Theme.track }

    var body: some View {
        island
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Shell

    // Height is never computed: `fixedSize` asks the content how tall it wants to be, so
    // adding model rows can't clip. Only width is a designed value.
    private var island: some View {
        content
            .compositingGroup()
            .shadow(color: .black.opacity(translucent ? 0.5 : 0), radius: 1.5, y: 0.5)
            .frame(width: width, height: expanded ? nil : display.notchSize.height)
            .fixedSize(horizontal: false, vertical: true)
            .background(backdrop)
            .clipShape(shape)
            .overlay { rim }
            .onContinuousHover { phase in
                guard appearance == .glass else { return }
                if case .active(let point) = phase { keyLight = point } else { keyLight = nil }
            }
            // Not while pinned: the window server routes clicks on any non-zero alpha to us,
            // so a resting shadow would swallow clicks in a band around the panel.
            .shadow(color: .black.opacity(open && !pinned ? 0.5 : 0), radius: 16, y: 8)
            // A small lean toward the pointer before it opens: the island is alive, not a sticker.
            .scaleEffect(hovering && !expanded && !reduceMotion ? 1.03 : 1, anchor: .top)
            .animation(motion(.bouncy(duration: 0.45)), value: hovering)
            .contentShape(shape)
            .onHover(perform: hoverChanged)
            .onTapGesture { togglePin() }
            .contextMenu { MenuContent() }
            .animation(motion(.smooth(duration: 0.25)), value: showPercent)
            .animation(motion(.smooth(duration: 0.25)), value: glances)
            // Rows and notes coming and going resize the panel smoothly instead of snapping.
            .animation(motion(.smooth(duration: 0.4)), value: burnRate)
            .animation(motion(.smooth(duration: 0.4)), value: noteText)
    }

    private var width: CGFloat {
        // Hidden (launch, full screen, quit): shrink back into the camera housing.
        if display.hidden { return display.notchSize.width }
        if pinned { return Theme.pinnedWidth }
        if open { return max(Theme.peekWidth, display.notchSize.width + 240) }
        guard display.hasNotch else {
            // No cutout to straddle, so the metrics sit together instead of at the edges:
            // the metrics + a divider and its gaps between each + 14pt margins.
            let count = CGFloat(glances.count)
            return (showPercent ? 34 : Theme.tick.width) * count + 21 * (count - 1) + 28
        }
        return display.notchSize.width + 2 * wing
    }

    /// One metric per wing; a third doubles the right lane, and the left grows with it so
    /// the island stays centred on the cutout.
    private var wing: CGFloat {
        let one = Theme.wing(percent: showPercent)
        return one + CGFloat(max(0, glances.count - 2)) * (one - Theme.collapsedTopRadius)
    }

    private var glances: [Glance] {
        Glance.pick(session: showSession, weekly: showWeekly, model: showModel)
    }

    private var shape: NotchShape {
        NotchShape(
            topCornerRadius: expanded ? Theme.expandedTopRadius : Theme.collapsedTopRadius,
            bottomCornerRadius: expanded ? Theme.expandedBottomRadius : Theme.collapsedBottomRadius
        )
    }

    /// Where the panel's side wall actually is, relative to the frame.
    private var wall: CGFloat { expanded ? Theme.expandedTopRadius : Theme.collapsedTopRadius }

    // MARK: - Material
    //
    // Three genuinely different surfaces (see Appearance.scrim): Solid is the hardware,
    // Frosted a heavy even blur, Liquid Glass a thin lensing sheet with a lit rim.

    @ViewBuilder private var backdrop: some View {
        if appearance == .black {
            Color.black
        } else {
            ZStack {
                if appearance == .glass { glassBase } else { blur }
                LinearGradient(
                    colors: [.black.opacity(appearance.scrim.top), .black.opacity(appearance.scrim.bottom)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
    }

    @ViewBuilder private var glassBase: some View {
        if #available(macOS 26, *) {
            Color.clear.glassEffect(.regular.tint(.black.opacity(0.2)), in: shape)
        } else {
            blur
        }
    }

    @ViewBuilder private var rim: some View {
        if display.hidden {
            EmptyView()
        } else {
            materialRim
        }
    }

    @ViewBuilder private var materialRim: some View {
        switch appearance {
        case .black:
            if expanded { shape.stroke(Theme.rim, lineWidth: 1) }
        case .frosted:
            // Frost catches light evenly: a soft, uniform edge, collapsed too.
            shape.stroke(Color.white.opacity(0.16), lineWidth: 1)
        case .glass:
            // A specular edge lit from wherever the pointer is (top-left when it's away).
            GeometryReader { geo in
                let size = geo.size
                let light = keyLight.map { UnitPoint(x: $0.x / max(1, size.width), y: $0.y / max(1, size.height)) }
                shape.stroke(
                    RadialGradient(
                        colors: [.white.opacity(0.8), .white.opacity(0.22), .white.opacity(0.06)],
                        center: light ?? UnitPoint(x: 0.2, y: 0),
                        startRadius: 0,
                        endRadius: max(size.width, size.height) * 0.7
                    ),
                    lineWidth: 1.25
                )
            }
            .animation(motion(.smooth(duration: 0.35)), value: keyLight)
        }
    }

    // Offscreen there is no window server to blur behind, and NSViewRepresentable draws a
    // placeholder glyph instead. Dropping to clear models the worst case honestly: the
    // real material only ever darkens what the scrim already covers.
    @ViewBuilder private var blur: some View {
        if Render.offscreen { Color.clear } else { VisualEffect() }
    }

    @ViewBuilder private var content: some View {
        if expanded {
            TimelineView(.everyMinute) { _ in
                VStack(spacing: 0) {
                    if showsEmptyState {
                        emptyState
                    } else {
                        header
                        expandedBody
                            .id(pinned)  // peek and pinned are different panes, so swap them
                            .transition(paneTransition)
                            .padding(.top, Theme.edge)
                        if let note = noteText { noteRow(note) }
                    }
                    if pinned && !welcomed { hintRow }
                }
                .padding(.horizontal, wall + Theme.gutter)
                // The bottom corners curve back in; 16 keeps the last row clear of them.
                .padding(.bottom, Theme.group)
            }
            .transition(paneTransition)
            .onAppear { withAnimation(motion(.smooth(duration: 0.5))) { drawn = true } }
        } else if display.hidden {
            Color.clear
        } else {
            collapsedView
                .transition(paneTransition)
                .onAppear { drawn = false }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(collapsedLabel)
                .accessibilityAddTraits(.isButton)
                .accessibilityAction { togglePin() }
        }
    }

    @ViewBuilder private var expandedBody: some View {
        if pinned { pinnedView } else { peekView }
    }

    // MARK: - Header
    //
    // The band beside the camera housing is the only real estate the hardware gives away
    // for free. Parking the ambient state there costs no height and lets the panel end
    // right after its content.

    private var header: some View {
        HStack(spacing: 0) {
            Text(model.snapshot?.plan ?? "")
                .frame(maxWidth: .infinity, alignment: .leading)
            if display.hasNotch {
                // The cutout, plus 8pt of air so the tags never touch its edges.
                Color.clear.frame(width: display.notchSize.width + 12, height: 1)
            }
            HStack(spacing: Theme.tight) {
                Text(Format.ago(model.snapshot?.fetchedAt))
                if pinned {
                    Image(systemName: "pin.fill").font(.system(size: 8))
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .font(Theme.font(.caption))
        .foregroundStyle(secondary)
        .lineLimit(1)
        .truncationMode(.tail)
        .frame(height: display.hasNotch ? display.notchSize.height : nil)
        .padding(.top, display.hasNotch ? 0 : Theme.edge)
    }

    private func noteRow(_ text: String) -> some View {
        HStack(spacing: Theme.row) {
            Circle()
                .fill(noteTint)
                .frame(width: 5, height: 5)
            Text(text)
                .font(Theme.font(.caption, .medium))
                .foregroundStyle(noteTint)
                .lineLimit(1)
                .truncationMode(.tail)
            Spacer(minLength: 0)
        }
        .padding(.top, Theme.group)  // its own group: more air above than below
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
    }

    /// First launch only: nothing else tells a stranger this panel does anything.
    private var hintRow: some View {
        Text("Hover to peek · click to pin · right-click for settings & Quit")
            .font(Theme.font(.caption))
            .foregroundStyle(secondary)
            .frame(maxWidth: .infinity)
            .padding(.top, Theme.row)
    }

    private var emptyState: some View {
        Text(statusLine)
            .font(Theme.font(.label))
            .foregroundStyle(secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 40)
            .padding(.top, display.notchSize.height + Theme.row)
    }

    // MARK: - Collapsed

    @ViewBuilder private var collapsedView: some View {
        let shown = glances
        if display.hasNotch {
            // The first metric left of the cutout, the rest right of it.
            HStack(spacing: 0) {
                lane(shown.prefix(1)).overlay(alignment: .bottom) { attentionDot }
                Spacer(minLength: 0)
                lane(shown.dropFirst())
            }
            .padding(.horizontal, wall)
        } else {
            HStack(spacing: 10) {
                ForEach(Array(shown.enumerated()), id: \.element) { index, glance in
                    // Without a cutout between them the readings run together.
                    if index > 0 { Capsule().fill(track).frame(width: 1, height: 10) }
                    collapsedMetric(glance)
                        .overlay(alignment: .bottom) { if index == 0 { attentionDot } }
                }
            }
        }
    }

    // Each lane is centred between the panel wall and the cutout, not inside the nominal
    // wing — otherwise it sits 6pt from one edge and 12pt from the other.
    private func lane(_ glances: ArraySlice<Glance>) -> some View {
        HStack(spacing: 0) {
            ForEach(glances, id: \.self) { collapsedMetric($0).frame(maxWidth: .infinity) }
        }
        .frame(width: wing - wall)
    }

    private func collapsedMetric(_ glance: Glance) -> some View {
        collapsedMetric(glance.reading(model.snapshot).win, glance.color)
    }

    @ViewBuilder private func collapsedMetric(_ win: UsageModel.Window?, _ base: Color) -> some View {
        if showPercent {
            Text(Format.percent(win))
                .font(Theme.font(.caption, Theme.weight(win?.pct ?? 0, .semibold)))
                .contentTransition(.numericText(value: win?.pct ?? 0))
                .animation(motion(.smooth(duration: 0.5)), value: win?.pct)
                .foregroundStyle(win.map { Theme.tint($0.pct, base) } ?? tertiary)
        } else {
            tick(win, base)
        }
    }

    @ViewBuilder private var attentionDot: some View {
        if showsAttentionDot {
            Circle()
                .fill(Theme.amber)
                .frame(width: 4, height: 4)
                .offset(y: Theme.tight)
        }
    }

    private var showsAttentionDot: Bool { !model.status.healthy }

    private func tick(_ win: UsageModel.Window?, _ base: Color) -> some View {
        Capsule()
            .fill(track)
            .frame(width: Theme.tick.width, height: Theme.tick.height)
            .overlay(alignment: .leading) {
                if let win {
                    Capsule()
                        .fill(Theme.tint(win.pct, base))
                        .frame(width: max(4, Theme.tick.width * win.pct / 100))
                        .animation(motion(.smooth(duration: 0.5)), value: win.pct)
                }
            }
    }

    // MARK: - Peek (hover)

    private var peekView: some View {
        HStack(spacing: 0) {
            ring("Session", model.snapshot?.session, UsageHistory.sessionKey, Theme.teal)
            ring("Weekly", model.snapshot?.weeklyAll, UsageHistory.weeklyKey, Theme.purple)
            ring(
                model.snapshot?.topScoped?.name ?? "Model",
                model.snapshot?.topScoped?.win,
                model.snapshot?.topScoped.map { UsageHistory.modelKey($0.name) } ?? "",
                Theme.amber
            )
        }
        .frame(maxWidth: .infinity)
    }

    private func ring(_ label: String, _ win: UsageModel.Window?, _ key: String, _ base: Color) -> some View {
        // Tight under the label, generous above it: the two lines belong to the label,
        // the label belongs to the ring.
        VStack(spacing: Theme.hair) {
            ZStack {
                Circle().stroke(track, lineWidth: Theme.ringStroke)
                if let win, let projected = projectedPct(key, win) {
                    // Where this window lands by reset time at the current pace.
                    Circle()
                        .trim(from: win.pct / 100 * draw, to: projected / 100 * draw)
                        .stroke(
                            Theme.tint(win.pct, base).opacity(0.3),
                            style: StrokeStyle(lineWidth: Theme.ringStroke)
                        )
                        .rotationEffect(.degrees(-90))
                }
                if let win {
                    Circle()
                        .trim(from: 0, to: win.pct / 100 * draw)
                        .stroke(
                            Theme.tint(win.pct, base),
                            style: StrokeStyle(lineWidth: Theme.ringStroke, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .animation(motion(.smooth(duration: 0.5)), value: win.pct)
                }
                Text(Format.percent(win))
                    .font(Theme.font(.ring, Theme.weight(win?.pct ?? 0, .medium)))
                    .contentTransition(.numericText(value: win?.pct ?? 0))
                    .animation(motion(.smooth(duration: 0.5)), value: win?.pct)
                    .foregroundStyle(Theme.text)
            }
            .frame(width: Theme.ringSize, height: Theme.ringSize)
            .padding(.bottom, Theme.row - Theme.hair)
            Text(label)
                .font(Theme.font(.label, .medium))
                .foregroundStyle(Theme.text)
                .lineLimit(1)
            Text(Format.reset(win?.resetsAt))
                .font(Theme.font(.caption))
                .foregroundStyle(secondary)
                .lineLimit(1)
            // Reserved for all three columns as soon as any of them has a projection, so
            // the rings stay level without leaving a dead band when nothing is burning.
            if anyProjection {
                Text(projectionText(key, win) ?? " ")
                    .font(Theme.font(.caption, .medium))
                    .foregroundStyle(projectionTint(key, win))
                    .lineLimit(1)
            }
        }
        // The projection lines are the widest thing in a column; 8 keeps neighbours apart.
        .padding(.horizontal, Theme.row)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(metricLabel(label, win, key))
    }

    // MARK: - Pinned

    private struct Row: Identifiable {
        let label: String
        let win: UsageModel.Window?
        let key: String
        let color: Color
        var id: String { "\(key)|\(label)" }
    }

    private func rows(_ snap: UsageModel.Snapshot) -> [Row] {
        var rows = [
            Row(label: "Session", win: snap.session, key: UsageHistory.sessionKey, color: Theme.teal),
            Row(label: "Weekly", win: snap.weeklyAll, key: UsageHistory.weeklyKey, color: Theme.purple),
        ]
        if snap.scoped.isEmpty {
            rows.append(Row(label: "Model", win: nil, key: "", color: Theme.amber))
        } else {
            rows += snap.scoped.map {
                Row(label: $0.name, win: $0.win, key: UsageHistory.modelKey($0.name), color: Theme.amber)
            }
        }
        return rows
    }

    @ViewBuilder private var pinnedView: some View {
        if let snap = model.snapshot { table(rows(snap)) }
    }

    private func table(_ rows: [Row]) -> some View {
        VStack(spacing: Theme.row) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                // Every weekly-scoped model resets with the weekly window, so printing the
                // same time on seven rows is noise. Show it only when it changes.
                bar(row, showReset: index == 0
                    || Format.reset(row.win?.resetsAt) != Format.reset(rows[index - 1].win?.resetsAt))
            }
        }
    }

    private func bar(_ row: Row, showReset: Bool) -> some View {
        HStack(spacing: Theme.column) {
            Text(row.label)
                .font(Theme.font(.label))
                .foregroundStyle(Theme.text)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 84, alignment: .leading)
            if burnRate {
                Sparkline(points: model.history.spark(row.key), color: row.color)
                    .frame(width: Theme.spark.width, height: Theme.spark.height)
            }
            Capsule()
                .fill(track)
                .frame(height: Theme.barHeight)
                .overlay(alignment: .leading) { fill(row) }
            Text(Format.percent(row.win))
                .font(Theme.font(.label, Theme.weight(row.win?.pct ?? 0, .medium)))
                .contentTransition(.numericText(value: row.win?.pct ?? 0))
                .animation(motion(.smooth(duration: 0.5)), value: row.win?.pct)
                .foregroundStyle(Theme.text)
                .frame(width: 38, alignment: .trailing)
            Text(showReset ? Format.reset(row.win?.resetsAt) : " ")
                .font(Theme.font(.caption))
                .foregroundStyle(secondary)
                .frame(width: 96, alignment: .trailing)
                .lineLimit(1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(metricLabel(row.label, row.win, row.key))
    }

    @ViewBuilder private func fill(_ row: Row) -> some View {
        if let win = row.win {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Theme.tint(win.pct, row.color))
                        .frame(width: max(6, geo.size.width * win.pct / 100 * draw))
                    // Where the window lands by reset time, as a mark rather than a
                    // translucent tail: any warm fill at low alpha on near-black turns
                    // olive, and a muddy bar reads as a defect, not a forecast.
                    if let projected = projectedPct(row.key, win) {
                        Capsule()
                            .fill(Theme.tint(win.pct, row.color))
                            .frame(width: 2)
                            .offset(x: min(geo.size.width - 2, geo.size.width * projected / 100 * draw - 1))
                    }
                }
                .animation(motion(.smooth(duration: 0.5)), value: win.pct)
            }
        }
    }

    // MARK: - Status

    /// The one thing worth saying at the bottom of the panel: a problem, or — when pinned
    /// and healthy — where the session is heading. Nil means the panel ends after its data.
    private var noteText: String? {
        if let problem = model.status.problem { return problem }
        // A hit limit is the one thing worth saying even while peeking: it's why Claude stopped.
        if let hit = limitReached {
            return "\(hit.name) limit reached" + (hit.win.resetsAt.map { " · " + Format.reset($0) } ?? "")
        }
        guard pinned else { return nil }
        return projectionText(UsageHistory.sessionKey, model.snapshot?.session).map { "Session \($0)" }
    }

    private var limitReached: UsageModel.Metric? {
        model.snapshot?.metrics.first { $0.win.pct >= 100 }
    }

    private var noteTint: Color {
        switch model.status {
        case .ok, .loading:
            limitReached != nil ? Theme.red : projectionTint(UsageHistory.sessionKey, model.snapshot?.session)
        case .stale, .throttled: tertiary
        case .rateLimited: Theme.amber
        case .unauthorized, .noCredentials: Theme.red
        }
    }

    private var statusLine: String {
        if let note = noteText { return note }
        guard let snapshot = model.snapshot else { return "Reading your Claude Code sign-in…" }
        let plan = snapshot.plan.map { "Claude \($0), " } ?? ""
        return plan + "refreshed \(Format.ago(snapshot.fetchedAt))"
    }

    private var showsEmptyState: Bool { model.snapshot == nil }

    // MARK: - Interaction

    private func hoverChanged(_ isHovering: Bool) {
        hovering = isHovering
        hoverTask?.cancel()
        if isHovering {
            guard !expanded else { return }
            hoverTask = Task {
                try? await Task.sleep(for: .milliseconds(200))
                guard !Task.isCancelled, hovering else { return }
                NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .default)
                withAnimation(motion(.bouncy(duration: 0.4))) { open = true }
                // Opening is the one moment the numbers are being read closely.
                model.refreshNow(manual: false)
            }
        } else {
            hoverTask = Task {
                try? await Task.sleep(for: .milliseconds(250))
                guard !Task.isCancelled, !hovering else { return }
                withAnimation(motion(.smooth(duration: 0.4))) { open = false }
            }
        }
    }

    private func togglePin() {
        // Bouncy only on the way out to a bigger panel; shrinking back is smooth.
        withAnimation(motion(display.pinned ? .smooth(duration: 0.4) : .bouncy(duration: 0.4))) {
            display.pinned.toggle()
            // Unpinning under the cursor drops back to the hover peek, not to collapsed
            // (no new onHover fires while the mouse stays inside).
            if !display.pinned {
                open = hovering
                welcomed = true  // they found the gesture; the hint has done its job
            }
        }
    }

    private func motion(_ animation: Animation) -> Animation? {
        reduceMotion ? nil : animation
    }

    // MARK: - Burn rate

    // Session only: a 30-minute slope stretched across a week's remaining days nearly always
    // "hits the cap", which trains people to ignore the forecast.
    private func projection(_ key: String, _ win: UsageModel.Window?) -> UsageHistory.Projection? {
        guard burnRate, let win, key == UsageHistory.sessionKey else { return nil }
        return model.history.projection(key, pct: win.pct, resetsAt: win.resetsAt)
    }

    private func projectionText(_ key: String, _ win: UsageModel.Window?) -> String? {
        switch projection(key, win) {
        case .exhausts(let at): "hits the cap in \(Format.duration(at.timeIntervalSinceNow))"
        case .clears: "on track — resets first"
        case .idle, .none: nil
        }
    }

    private func projectionTint(_ key: String, _ win: UsageModel.Window?) -> Color {
        switch projection(key, win) {
        case .exhausts(let at): at.timeIntervalSinceNow < 3600 ? Theme.red : Theme.amber
        default: secondary
        }
    }

    private var anyProjection: Bool {
        guard let snap = model.snapshot else { return false }
        return projectionText(UsageHistory.sessionKey, snap.session) != nil
            || projectionText(UsageHistory.weeklyKey, snap.weeklyAll) != nil
            || snap.topScoped.map { projectionText(UsageHistory.modelKey($0.name), $0.win) != nil } == true
    }

    private func projectedPct(_ key: String, _ win: UsageModel.Window) -> Double? {
        guard burnRate, key == UsageHistory.sessionKey else { return nil }
        return model.history.projectedPct(key, pct: win.pct, resetsAt: win.resetsAt)
    }

    // MARK: - Accessibility

    private var collapsedLabel: String {
        let metrics = glances.compactMap { glance in
            let reading = glance.reading(model.snapshot)
            return reading.win.map { "\(reading.name) \(Int($0.pct.rounded())) percent" }
        }
        guard !metrics.isEmpty else { return "Claude usage, \(statusLine)" }
        return "Claude usage, " + metrics.joined(separator: ", ")
    }

    private func metricLabel(_ label: String, _ win: UsageModel.Window?, _ key: String) -> String {
        guard let win else { return "\(label), no data" }
        var parts = ["\(label), \(Int(win.pct.rounded())) percent"]
        if let resets = win.resetsAt, resets > Date() {
            parts.append("resets in \(Format.duration(resets.timeIntervalSinceNow))")
        }
        if let text = projectionText(key, win) { parts.append(text) }
        return parts.joined(separator: ", ")
    }
}

// MARK: - Sparkline

// A bare polyline reads as a stray scratch at this size, but boxing it makes a slab that
// out-weighs the bar beside it. The filled silhouette is the shape — its own flat bottom
// edge does the job a baseline rule would.
private struct Sparkline: View {
    let points: [CGPoint]  // normalised into the unit square
    let color: Color

    private static let inset: CGFloat = 2

    var body: some View {
        GeometryReader { geo in
            ZStack {
                area(geo.size).fill(color.opacity(0.28))
                line(geo.size).stroke(
                    color.opacity(0.85),
                    style: StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round)
                )
            }
        }
        .opacity(points.count >= 2 ? 1 : 0)
    }

    private func place(_ point: CGPoint, _ size: CGSize) -> CGPoint {
        CGPoint(
            x: Self.inset + point.x * (size.width - 2 * Self.inset),
            y: Self.inset + point.y * (size.height - 2 * Self.inset)
        )
    }

    private func line(_ size: CGSize) -> Path {
        Path { path in
            guard let first = points.first else { return }
            path.move(to: place(first, size))
            for point in points.dropFirst() { path.addLine(to: place(point, size)) }
        }
    }

    private func area(_ size: CGSize) -> Path {
        Path { path in
            guard let first = points.first, let last = points.last else { return }
            path.move(to: CGPoint(x: place(first, size).x, y: size.height))
            path.addLine(to: place(first, size))
            for point in points.dropFirst() { path.addLine(to: place(point, size)) }
            path.addLine(to: CGPoint(x: place(last, size).x, y: size.height))
            path.closeSubpath()
        }
    }
}

// MARK: - Glances

/// The limits the collapsed island and the menu bar item show: any mix, always in this order.
enum Glance: String, CaseIterable {
    case session, weekly, model

    var key: String { "show" + rawValue.capitalized }

    static let defaults: [String: Bool] = [session.key: true, weekly.key: true, model.key: false]

    static func pick(session: Bool, weekly: Bool, model: Bool) -> [Glance] {
        let on = [Glance.session: session, .weekly: weekly, .model: model]
        let picked = allCases.filter { on[$0] == true }
        return picked.isEmpty ? [.session] : picked
    }

    static func stored(_ defaults: UserDefaults = .standard) -> [Glance] {
        pick(
            session: defaults.bool(forKey: session.key),
            weekly: defaults.bool(forKey: weekly.key),
            model: defaults.bool(forKey: model.key)
        )
    }

    var color: Color {
        switch self {
        case .session: Theme.teal
        case .weekly: Theme.purple
        case .model: Theme.amber
        }
    }

    /// The model glance follows whichever per-model weekly limit is highest (today, Fable).
    func reading(_ snapshot: UsageModel.Snapshot?) -> (name: String, win: UsageModel.Window?) {
        switch self {
        case .session: ("session", snapshot?.session)
        case .weekly: ("weekly", snapshot?.weeklyAll)
        case .model: (snapshot?.topScoped?.name ?? "model", snapshot?.topScoped?.win)
        }
    }
}

// MARK: - Menu

// One definition, two surfaces: the island's context menu and the status item's
// NSHostingMenu. Keeps them from drifting as the menu grows.
struct MenuContent: View {
    @EnvironmentObject private var model: UsageModel
    @AppStorage(Appearance.key) private var appearanceRaw = Appearance.stored().rawValue
    @AppStorage("showPercent") private var showPercent = false
    @AppStorage(Glance.session.key) private var showSession = true
    @AppStorage(Glance.weekly.key) private var showWeekly = true
    @AppStorage(Glance.model.key) private var showModel = false
    @AppStorage("burnRate") private var burnRate = true
    @AppStorage(Notifier.enabledKey) private var notifications = false
    @AppStorage(StatusItemController.enabledKey) private var menuBarItem = false

    var body: some View {
        // The numbers themselves, so the menu-bar item is useful without the island.
        if let snapshot = model.snapshot {
            ForEach(snapshot.metrics) { metric in
                Text("\(metric.name)  \(Format.percent(metric.win))"
                    + (metric.win.resetsAt.map { " · " + Format.reset($0) } ?? ""))
            }
            Divider()
        }
        if let version = model.updateAvailable {
            Button("Update available — v\(version)…") { NSWorkspace.shared.open(UsageModel.siteURL) }
        }
        if case .noCredentials = model.status {
            Button("Get Claude Code…") { NSWorkspace.shared.open(Self.claudeCodeURL) }
        }
        Button("Refresh now") { model.refreshNow() }
        Button("Open usage on claude.ai") { NSWorkspace.shared.open(Self.usageURL) }
        Divider()
        Picker("Appearance", selection: $appearanceRaw) {
            ForEach(Appearance.allCases) { Text($0.label).tag($0.rawValue) }
        }
        Menu("Show limits") {
            // The last one on stays on: an island with nothing in it reads as broken.
            let last = [showSession, showWeekly, showModel].filter { $0 }.count == 1
            Toggle("Session", isOn: $showSession).disabled(last && showSession)
            Toggle("Weekly", isOn: $showWeekly).disabled(last && showWeekly)
            Toggle(model.snapshot?.topScoped?.name ?? "Model", isOn: $showModel).disabled(last && showModel)
        }
        Toggle("Show percentages", isOn: $showPercent)
        Toggle("Burn-rate estimates", isOn: $burnRate)
        Toggle("Usage notifications", isOn: notificationsBinding)
        Toggle("Menu bar item", isOn: $menuBarItem)
        Toggle("Launch at login", isOn: launchAtLogin)
        Divider()
        Button("About Claude Meter") {
            NSApp.activate()
            NSApp.orderFrontStandardAboutPanel(nil)
        }
        Button("Quit Claude Meter") {
            if let app = NSApp.delegate as? AppDelegate { app.quit() } else { NSApp.terminate(nil) }
        }
    }

    private static let usageURL = URL(string: "https://claude.ai/settings/usage")!
    private static let claudeCodeURL = URL(string: "https://claude.com/product/claude-code")!

    // Ask for permission when the user opts in, never at launch.
    private var notificationsBinding: Binding<Bool> {
        Binding(
            get: { notifications },
            set: { enable in
                notifications = enable
                if enable { Notifier.shared.requestAuthorization() }
            }
        )
    }

    private var launchAtLogin: Binding<Bool> {
        Binding(
            get: { SMAppService.mainApp.status == .enabled },
            set: { enable in
                do {
                    if enable { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
                } catch {
                    NSLog("Launch at login failed (needs the bundled app): \(error)")
                }
                // Switched off in System Settings (or blocked by a profile): only the user can
                // flip it back, and only there. Say so instead of a toggle that does nothing.
                if enable, SMAppService.mainApp.status != .enabled {
                    SMAppService.openSystemSettingsLoginItems()
                }
            }
        )
    }
}

// MARK: - Materials

private struct VisualEffect: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.blendingMode = .behindWindow
        view.state = .active
        return view
    }

    func updateNSView(_ view: NSVisualEffectView, context: Context) {}
}

// MARK: - Transitions

/// Panes squeeze in and out horizontally through a blur, anchored to the notch, instead of
/// cross-fading — the content looks like it's being poured out of the cutout.
private struct Squeeze: ViewModifier {
    let x: CGFloat
    let blur: CGFloat

    func body(content: Content) -> some View {
        content.scaleEffect(x: x, y: 1, anchor: .top).blur(radius: blur)
    }
}

extension AnyTransition {
    static var squeeze: AnyTransition { .asymmetric(
        insertion: .modifier(active: Squeeze(x: 0.6, blur: 8), identity: Squeeze(x: 1, blur: 0))
            .combined(with: .opacity)
            .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.3).delay(0.06)),
        removal: .modifier(active: Squeeze(x: 0.3, blur: 4), identity: Squeeze(x: 1, blur: 0))
            .combined(with: .opacity)
            .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.18))
    ) }
}
