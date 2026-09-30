import CoreGraphics
import Foundation

// Usage sampled over time, keyed per window ("session", "weekly", "model:Opus").
// Drives the burn-rate projection and the sparklines, and is persisted so a relaunch
// keeps the trend instead of starting blind.
//
// ponytail: flat dictionary + linear scans. 288 samples per key makes O(n) free; swap for
// a ring buffer only if the sample cap ever grows past a few thousand.
struct UsageHistory: Codable, Equatable, Sendable {
    struct Sample: Codable, Equatable, Sendable {
        let at: Date
        let pct: Double
    }

    private(set) var series: [String: [Sample]] = [:]

    static let sessionKey = "session"
    static let weeklyKey = "weekly"
    static func modelKey(_ name: String) -> String { "model:\(name)" }

    static let capacity = 288              // 24h at the 5-minute poll cadence
    static let resetDrop: Double = 5       // a fall this big means the window rolled over
    static let fitWindow: TimeInterval = 30 * 60
    static let minSpan: TimeInterval = 300 // need at least this much time to fit a slope

    /// Records a reading per window. Returns the keys whose window reset since last time.
    @discardableResult
    mutating func record(_ readings: [String: Double], at now: Date = Date()) -> Set<String> {
        var reset: Set<String> = []
        for (key, pct) in readings {
            var samples = series[key] ?? []
            if let last = samples.last {
                if last.pct - pct > Self.resetDrop {
                    samples.removeAll()
                    reset.insert(key)
                } else if now.timeIntervalSince(last.at) < 30 {
                    continue  // coalesce bursts (a manual refresh right after a poll)
                }
            }
            samples.append(Sample(at: now, pct: pct))
            if samples.count > Self.capacity { samples.removeFirst(samples.count - Self.capacity) }
            series[key] = samples
        }
        // Forget windows the API stopped reporting (a model that fell out of the plan).
        series = series.filter { readings[$0.key] != nil }
        return reset
    }

    // MARK: - Burn rate

    /// Percentage points per hour over the last half hour, nil when there isn't enough signal.
    func rate(_ key: String, now: Date = Date()) -> Double? {
        let samples = (series[key] ?? []).filter { now.timeIntervalSince($0.at) <= Self.fitWindow }
        guard samples.count >= 3, let first = samples.first, let last = samples.last,
              last.at.timeIntervalSince(first.at) >= Self.minSpan
        else { return nil }

        // Least squares over (hours since first sample, percent).
        let xs = samples.map { $0.at.timeIntervalSince(first.at) / 3600 }
        let ys = samples.map(\.pct)
        let n = Double(samples.count)
        let sumX = xs.reduce(0, +)
        let sumY = ys.reduce(0, +)
        let sumXX = xs.reduce(0) { $0 + $1 * $1 }
        let sumXY = zip(xs, ys).reduce(0) { $0 + $1.0 * $1.1 }
        let denominator = n * sumXX - sumX * sumX
        guard abs(denominator) > 1e-9 else { return nil }
        return (n * sumXY - sumX * sumY) / denominator
    }

    enum Projection: Equatable, Sendable {
        case idle                // not burning fast enough to matter
        case clears              // the window resets before the cap is reached
        case exhausts(Date)      // hits 100% at this time
    }

    func projection(_ key: String, pct: Double, resetsAt: Date?, now: Date = Date()) -> Projection? {
        guard let rate = rate(key, now: now) else { return nil }
        guard rate > 0.5 else { return .idle }   // under 0.5 %/h is sampling noise
        let hours = (100 - pct) / rate
        guard hours > 0 else { return nil }      // already at the cap; the bar says so
        let at = now.addingTimeInterval(hours * 3600)
        if let resetsAt, at >= resetsAt { return .clears }
        return .exhausts(at)
    }

    /// Where this window lands by its own reset time at the current burn rate. Drawn as a
    /// translucent overhang on the bar, which says more than a sentence would.
    func projectedPct(_ key: String, pct: Double, resetsAt: Date?, now: Date = Date()) -> Double? {
        guard let resetsAt, let rate = rate(key, now: now), rate > 0.5 else { return nil }
        let hours = resetsAt.timeIntervalSince(now) / 3600
        guard hours > 0 else { return nil }
        let projected = min(100, pct + rate * hours)
        return projected > pct + 1 ? projected : nil
    }

    // MARK: - Sparkline

    /// Points normalised into the unit square (y already flipped for screen coords).
    /// Scaled to the series peak with a 10% floor, so a low-usage week still shows shape.
    func spark(_ key: String, now: Date = Date(), span: TimeInterval = 6 * 3600) -> [CGPoint] {
        let samples = (series[key] ?? []).filter { now.timeIntervalSince($0.at) <= span }
        guard samples.count >= 2, let first = samples.first, let last = samples.last else { return [] }
        let width = max(1, last.at.timeIntervalSince(first.at))
        let peak = max(10, samples.map(\.pct).max() ?? 10)
        return samples.map {
            CGPoint(x: $0.at.timeIntervalSince(first.at) / width, y: 1 - $0.pct / peak)
        }
    }

    // MARK: - Persistence

    private static let storeKey = "usageHistory"

    static func load(_ defaults: UserDefaults = .standard) -> UsageHistory {
        guard let data = defaults.data(forKey: storeKey),
              let decoded = try? JSONDecoder().decode(UsageHistory.self, from: data)
        else { return UsageHistory() }
        return decoded
    }

    func save(_ defaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.storeKey)
    }
}

// MARK: - Threshold crossings

/// Pure crossing logic for one usage window — kept separate from the notification centre
/// so it can be tested without a bundle.
struct ThresholdTracker: Equatable, Sendable {
    static let sessionLevels: [Double] = [50, 80, 95]
    // A week moves slowly; seven "half used" alerts across every model would be noise.
    static let weeklyLevels: [Double] = [80, 95]

    let levels: [Double]

    init(levels: [Double] = sessionLevels) {
        self.levels = levels
    }

    enum Event: Equatable, Sendable {
        case reset
        case crossed(Double)
    }

    private var armed: Set<Double> = []
    private var seeded = false

    mutating func update(pct: Double, didReset: Bool) -> [Event] {
        var events: [Event] = []
        if didReset {
            // Only worth saying if the window had actually got tight; a rollover from 20% isn't news.
            if seeded, armed.contains(80) { events.append(.reset) }
            armed.removeAll()
        }
        // The first reading after launch only arms: relaunching at 90% must not re-alert.
        guard seeded else {
            armed = Set(levels.filter { pct >= $0 })
            seeded = true
            return events
        }
        for level in levels where pct >= level && !armed.contains(level) {
            armed.insert(level)
            events.append(.crossed(level))
        }
        armed = armed.filter { pct >= $0 }
        return events
    }
}
