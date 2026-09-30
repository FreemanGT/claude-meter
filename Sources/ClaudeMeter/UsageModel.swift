import Foundation
import Network

@MainActor
final class UsageModel: ObservableObject {
    struct Window: Equatable, Sendable {
        var pct: Double
        var resetsAt: Date?
    }

    struct Scoped: Equatable, Identifiable, Sendable {
        let name: String
        let win: Window
        var id: String { name }
    }

    /// One reported window with its history key and display name.
    struct Metric: Identifiable, Sendable {
        let key: String
        let name: String
        let win: Window
        var id: String { key }
    }

    struct Snapshot: Equatable, Sendable {
        var session: Window?
        var weeklyAll: Window?
        var scoped: [Scoped]
        var plan: String?
        var fetchedAt: Date
        var topScoped: Scoped? { scoped.max { $0.win.pct < $1.win.pct } }

        /// Every reported window in display order: session, weekly, then per-model.
        var metrics: [Metric] {
            var out: [Metric] = []
            if let session { out.append(Metric(key: UsageHistory.sessionKey, name: "Session", win: session)) }
            if let weeklyAll { out.append(Metric(key: UsageHistory.weeklyKey, name: "Weekly", win: weeklyAll)) }
            out += scoped.map { Metric(key: UsageHistory.modelKey($0.name), name: $0.name, win: $0.win) }
            return out
        }

        var readings: [String: Double] {
            Dictionary(metrics.map { ($0.key, $0.win.pct) }, uniquingKeysWith: { _, last in last })
        }

        var soonestReset: Date? {
            ([session?.resetsAt, weeklyAll?.resetsAt] + scoped.map(\.win.resetsAt))
                .compactMap { $0 }
                .filter { $0 > Date() }
                .min()
        }
    }

    enum Status: Equatable {
        case loading, ok, stale(String), unauthorized, noCredentials(String)
        case rateLimited(until: Date), throttled(seconds: Int)
    }

    @Published private(set) var snapshot: Snapshot?
    @Published private(set) var status: Status = .loading
    @Published private(set) var history = UsageHistory.load()
    /// Newer version published on the website, if any.
    @Published private(set) var updateAvailable: String?

    static let siteURL = URL(string: "https://claudemeter.vercel.app")!

    // The usage endpoint 429s aggressively; never poll faster than this.
    private static let floor: TimeInterval = 180
    private static let interval: TimeInterval = 300
    private static let baseBackoff: TimeInterval = 600

    // Ephemeral so a token-authorized response is never written to the shared disk cache.
    private static let http: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.waitsForConnectivity = false
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.timeoutIntervalForRequest = 15
        return URLSession(configuration: config)
    }()

    private var pollTask: Task<Void, Never>?
    private var pendingRefresh: Task<Void, Never>?
    private let pathMonitor = NWPathMonitor()
    private var online = true
    private var lastAttempt = Date.distantPast
    private var backoff = UsageModel.baseBackoff
    private var rateLimitedUntil: Date?
    private var credentialsFailedAt: Date?
    private var mocking = false

    func start() {
        watchNetwork()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.fetch()
                await self?.checkForUpdate()
                guard let delay = self?.nextPollDelay() else { return }
                try? await Task.sleep(for: .seconds(delay))
            }
        }
    }

    func refreshOnWake() {
        Task { await fetch() }
    }

    /// Manual refresh from the menu or from opening the panel. Respects the same floor;
    /// says so in the status line rather than silently doing nothing.
    func refreshNow(manual: Bool = true) {
        Task { await fetch(manual: manual) }
    }

    // MARK: - Scheduling

    /// Sleep until an attempt can actually accomplish something: the normal cadence, or
    /// sooner if a window is about to reset, or later if we're rate limited. Keeps the
    /// "retrying HH:MM" in the footer true.
    private func nextPollDelay() -> TimeInterval {
        var delay = Self.interval
        if let reset = snapshot?.soonestReset {
            let afterReset = reset.timeIntervalSinceNow + 20
            if afterReset > 0 { delay = min(delay, afterReset) }
        }
        if let until = rateLimitedUntil {
            delay = max(delay, until.timeIntervalSinceNow + 1)
        }
        return max(Self.floor, delay)
    }

    // Coming back online shouldn't cost up to five minutes of stale numbers.
    private func watchNetwork() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            let satisfied = path.status == .satisfied
            Task { @MainActor in
                guard let self else { return }
                let wasOffline = !self.online
                self.online = satisfied
                if satisfied, wasOffline { await self.fetch() }
            }
        }
        pathMonitor.start(queue: DispatchQueue(label: "com.freeman.claudemeter.path"))
    }

    /// Claude Code's keychain token is the freshest and costs nothing, so it wins whenever it is
    /// valid. Two things make it unusable: it expires within hours of Claude Code last running, and
    /// the shared blob has been seen truncated mid-write when an MCP server re-authorizes. So keep
    /// the last good credentials in memory and mint our own access token from them when needed.
    private var held: Credentials.Creds?

    private func usableCredentials() async -> Result<Credentials.Creds, Credentials.CredError> {
        var keychain: Credentials.Creds?
        var readError: Credentials.CredError?
        switch await Task.detached(operation: { Credentials.read() }).value {
        case .success(let creds):
            keychain = creds
            if !creds.expired { held = creds }
        case .failure(let error):
            readError = error
        }
        let choice = Self.pick(keychain: keychain, held: held)
        if let usable = choice.use { return .success(usable) }
        guard let grant = choice.refreshFrom else {
            return .failure(readError ?? Credentials.CredError(message: Credentials.signInHint))
        }
        switch await Credentials.refresh(grant) {
        case .success(let creds):
            held = creds
            return .success(creds)
        case .failure(let error):
            return .failure(error)
        }
    }

    /// Pure half of `usableCredentials`, so --selftest can walk the branches with no keychain
    /// and no network. An unexpired token is used as-is; otherwise we mint one from a grant,
    /// preferring the keychain's because a fresh sign-in lands there and never in ours.
    nonisolated static func pick(keychain: Credentials.Creds?, held: Credentials.Creds?)
        -> (use: Credentials.Creds?, refreshFrom: Credentials.Creds?) {
        if let keychain, !keychain.expired { return (keychain, nil) }
        if let held, !held.expired { return (held, nil) }
        return (nil, keychain ?? held)
    }

    // MARK: - Fetch

    private func fetch(manual: Bool = false) async {
        guard !mocking else { return }
        let now = Date()
        // A click usually means "I just fixed it" (signed in, allowed the keychain), so it
        // must never be answered from the negative cache.
        if manual { credentialsFailedAt = nil }
        // Before the floor check, so a deferred click reports the rate limit instead of
        // leaving a frozen "updating in Ns" on screen.
        if let until = rateLimitedUntil, now < until {
            if manual { status = .rateLimited(until: until) }
            return
        }
        let sinceLast = now.timeIntervalSince(lastAttempt)
        guard sinceLast >= Self.floor else {
            if manual {
                let wait = Self.floor - sinceLast
                status = .throttled(seconds: Int(wait.rounded(.up)))
                // A click is a promise: fetch the moment the floor allows instead of
                // dropping it and hoping the user comes back.
                pendingRefresh?.cancel()
                pendingRefresh = Task { [weak self] in
                    try? await Task.sleep(for: .seconds(wait + 1))
                    guard !Task.isCancelled, let self else { return }
                    self.pendingRefresh = nil  // before fetch, so it can't cancel itself mid-flight
                    await self.fetch(manual: true)
                }
            }
            return
        }
        let previousAttempt = lastAttempt
        lastAttempt = now
        pendingRefresh?.cancel()
        pendingRefresh = nil

        if let failedAt = credentialsFailedAt, now.timeIntervalSince(failedAt) < 1800 { return }
        let creds: Credentials.Creds
        switch await usableCredentials() {
        case .failure(let error):
            if error.unauthorized {
                status = .unauthorized
            } else if error.transient {
                // With numbers on screen this is a footnote; with nothing, it's the whole story,
                // so say what to do about it — but never negative-cache it for half an hour.
                status = snapshot == nil ? .noCredentials(error.message) : .stale(error.message)
                // Don't burn the whole floor on a consent prompt still being on screen.
                if error.retrySoon { lastAttempt = now.addingTimeInterval(20 - Self.floor) }
            } else {
                credentialsFailedAt = now
                status = .noCredentials(error.message)
            }
            return
        case .success(let value):
            credentialsFailedAt = nil
            creds = value
        }

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/api/oauth/usage")!)
        request.timeoutInterval = 15
        request.setValue("Bearer \(creds.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("oauth-2025-04-20", forHTTPHeaderField: "anthropic-beta")
        // Wrong UA lands in an aggressively rate-limited bucket with persistent 429s.
        request.setValue("claude-cli/2.1.175 (external, cli)", forHTTPHeaderField: "User-Agent")

        do {
            let (data, response) = try await Self.http.data(for: request)
            let http = response as? HTTPURLResponse
            switch http?.statusCode ?? 0 {
            case 200:
                if let snap = Self.decode(data, plan: creds.planName) {
                    snapshot = snap
                    status = .ok
                    backoff = Self.baseBackoff
                    rateLimitedUntil = nil
                    record(snap)
                } else {
                    status = .stale("bad response")
                }
            case 401:
                held = nil
                status = .unauthorized
            case 429:
                let advised = http?.value(forHTTPHeaderField: "Retry-After").flatMap(Self.parseRetryAfter)
                let wait = min(3600, max(Self.floor, advised ?? backoff))
                let until = Date().addingTimeInterval(wait)
                rateLimitedUntil = until
                status = .rateLimited(until: until)
                if advised == nil { backoff = min(backoff * 2, 3600) }
            case let code:
                status = .stale("HTTP \(code)")
            }
        } catch {
            status = .stale("offline")
            // Never reached the server, so it mustn't cost the floor — otherwise the fetch
            // fired on reconnect or wake is swallowed and stale numbers linger for minutes.
            if let code = (error as? URLError)?.code, Self.unreached.contains(code) {
                lastAttempt = previousAttempt
            }
        }
        NSLog("ClaudeMeter fetch -> %@", String(describing: status))
    }

    private static let unreached: Set<URLError.Code> = [
        .notConnectedToInternet, .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed,
    ]

    private func record(_ snap: Snapshot) {
        let resets = history.record(snap.readings)
        history.save()
        Notifier.shared.usageChanged(snap.metrics, resets: resets)
    }

    // MARK: - Updates

    private static let updateCheckedKey = "updateCheckedAt"
    private static let latestVersionKey = "latestVersion"

    /// At most once a day. A different host from the usage API with a plain session, so the
    /// UA and poll-floor rules don't apply. The endpoint and response shape are undocumented,
    /// so users need some way to learn a fixed build exists.
    private func checkForUpdate() async {
        let defaults = UserDefaults.standard
        if let checked = defaults.object(forKey: Self.updateCheckedKey) as? Date,
           Date().timeIntervalSince(checked) < 86_400 {
            publishUpdate(defaults.string(forKey: Self.latestVersionKey))
            return
        }
        let url = Self.siteURL.appendingPathComponent("version.json")
        guard let result = try? await URLSession(configuration: .ephemeral).data(from: url),
              (result.1 as? HTTPURLResponse)?.statusCode == 200,
              let json = (try? JSONSerialization.jsonObject(with: result.0)) as? [String: Any],
              let latest = json["version"] as? String
        else { return }
        defaults.set(Date(), forKey: Self.updateCheckedKey)
        defaults.set(latest, forKey: Self.latestVersionKey)
        publishUpdate(latest)
    }

    private func publishUpdate(_ latest: String?) {
        updateAvailable = latest.flatMap { Self.isNewer($0, than: Self.currentVersion) ? $0 : nil }
    }

    nonisolated static var currentVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
    }

    nonisolated static func isNewer(_ candidate: String, than current: String) -> Bool {
        candidate.compare(current, options: .numeric) == .orderedDescending
    }

    // MARK: - Decoding

    /// `Retry-After` is either a delay in seconds or an HTTP date.
    nonisolated static func parseRetryAfter(_ value: String) -> TimeInterval? {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        if let seconds = Double(trimmed) { return seconds > 0 ? seconds : nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "GMT")
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        guard let date = formatter.date(from: trimmed) else { return nil }
        let delta = date.timeIntervalSinceNow
        return delta > 0 ? delta : nil
    }

    // Tolerant of both response shapes: legacy top-level windows ({utilization, resets_at})
    // and the newer limits[] array ({kind, percent, resets_at, scope.model.display_name}).
    nonisolated static func decode(_ data: Data, plan: String?) -> Snapshot? {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }

        // Both observed shapes report 0-100. No fractional rescale: it would turn a
        // genuine 0.4% into an alarming 40%.
        func window(_ any: Any?) -> Window? {
            guard let dict = any as? [String: Any],
                  let number = (dict["utilization"] ?? dict["percent"]) as? NSNumber
            else { return nil }
            return Window(
                pct: min(100, max(0, number.doubleValue)),
                resetsAt: (dict["resets_at"] as? String).flatMap(parseISO)
            )
        }

        var session = window(json["five_hour"])
        var weeklyAll = window(json["seven_day"])
        var scoped: [Scoped] = []

        for limit in json["limits"] as? [[String: Any]] ?? [] {
            guard let win = window(limit) else { continue }
            switch limit["kind"] as? String {
            case "session":
                if session == nil { session = win }
            case "weekly_all":
                if weeklyAll == nil { weeklyAll = win }
            case "weekly_scoped":
                // is_active marks the currently *binding* limit (whichever window is
                // highest), not availability — filtering on it emptied the model ring
                // whenever session or weekly_all happened to be higher.
                let scope = limit["scope"] as? [String: Any]
                func scopeName(_ key: String) -> String? {
                    let entry = scope?[key] as? [String: Any]
                    return (entry?["display_name"] as? String) ?? (entry?["id"] as? String)
                }
                guard let name = scopeName("model") ?? scopeName("surface") else { continue }
                scoped.append(Scoped(name: name, win: win))
            default:
                break
            }
        }
        if scoped.isEmpty {
            if let win = window(json["seven_day_opus"]) { scoped.append(Scoped(name: "Opus", win: win)) }
            if let win = window(json["seven_day_sonnet"]) { scoped.append(Scoped(name: "Sonnet", win: win)) }
        }
        return Snapshot(session: session, weeklyAll: weeklyAll, scoped: scoped, plan: plan, fetchedAt: Date())
    }

    nonisolated private static func parseISO(_ string: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: string) { return date }
        return ISO8601DateFormatter().date(from: string)
    }

    // MARK: - Mock states for visual QA (--mock / --snapshot)

    func startMock(named name: String) {
        mocking = true  // hovering or "Refresh now" must not pull real data into a mock
        let mock = Self.mock(named: name)
        snapshot = mock.snapshot
        status = mock.status
        history = mock.history
    }

    /// Built without touching UserDefaults so snapshots never clobber real history.
    nonisolated static func mock(named name: String) -> (snapshot: Snapshot?, status: Status, history: UsageHistory) {
        func snap(_ base: Double, models: [String] = ["Opus"]) -> Snapshot {
            Snapshot(
                session: Window(pct: base, resetsAt: Date().addingTimeInterval(2 * 3600 + 14 * 60)),
                weeklyAll: Window(pct: min(100, base + 19), resetsAt: Date().addingTimeInterval(3.6 * 24 * 3600)),
                scoped: models.enumerated().map { index, model in
                    Scoped(
                        name: model,
                        win: Window(
                            pct: min(100, base + 36 - Double(index) * 11),
                            resetsAt: Date().addingTimeInterval(3.6 * 24 * 3600)
                        )
                    )
                },
                plan: "Max 20x",
                fetchedAt: Date().addingTimeInterval(-12)
            )
        }

        // A rising session series so the ETA and sparklines have something to draw.
        func trend(_ snapshot: Snapshot?, ratePerHour: Double) -> UsageHistory {
            guard let snapshot else { return UsageHistory() }
            var history = UsageHistory()
            let now = Date()
            for step in stride(from: 12, through: 0, by: -1) {
                let ago = now.addingTimeInterval(-Double(step) * 300)
                let drop = ratePerHour * Double(step) * 300 / 3600
                let readings = snapshot.readings.mapValues { max(0, $0 - drop) }
                history.record(readings, at: ago)
            }
            return history
        }

        switch name {
        case "ok30": let s = snap(30); return (s, .ok, trend(s, ratePerHour: 6))
        case "ok70": let s = snap(70); return (s, .ok, trend(s, ratePerHour: 14))
        case "ok90": let s = snap(88); return (s, .ok, trend(s, ratePerHour: 20))
        case "idle": let s = snap(42); return (s, .ok, trend(s, ratePerHour: 0))
        case "models": let s = snap(42, models: ["Opus", "Sonnet", "Haiku", "Fable", "Opus mini", "Sonnet 4.5"])
            return (s, .ok, trend(s, ratePerHour: 9))
        case "stale": let s = snap(42); return (s, .stale("offline"), trend(s, ratePerHour: 9))
        case "unauthorized": let s = snap(42); return (s, .unauthorized, trend(s, ratePerHour: 9))
        case "nocreds":
            return (nil, .noCredentials(Credentials.signInHint), UsageHistory())
        case "ratelimited":
            let s = snap(42)
            return (s, .rateLimited(until: Date().addingTimeInterval(600)), trend(s, ratePerHour: 9))
        case "throttled": let s = snap(42); return (s, .throttled(seconds: 47), trend(s, ratePerHour: 9))
        case "limit": let s = snap(64); return (s, .ok, trend(s, ratePerHour: 9))
        default: let s = snap(42); return (s, .ok, trend(s, ratePerHour: 9))
        }
    }
}

// MARK: - Self test (--selftest)

func selfTestCheck(_ condition: Bool, _ message: String) {
    if !condition {
        print("SELFTEST FAIL: \(message)")
        exit(1)
    }
}

func runSelfTest() {
    let check = selfTestCheck

    // MARK: decoding

    let legacy = """
    {"five_hour":{"utilization":33.0,"resets_at":"2026-04-11T07:00:00.528743+00:00"},
     "seven_day":{"utilization":13.0,"resets_at":"2026-04-17T00:59:59.951713+00:00"},
     "seven_day_opus":null,
     "seven_day_sonnet":{"utilization":1.0,"resets_at":"2026-04-16T03:00:00.951719+00:00"},
     "extra_usage":{"is_enabled":false}}
    """
    let s1 = UsageModel.decode(Data(legacy.utf8), plan: "Max 20x")
    check(s1?.session?.pct == 33, "legacy session pct")
    check(s1?.session?.resetsAt != nil, "legacy resets_at parsed")
    check(s1?.weeklyAll?.pct == 13, "legacy weekly pct")
    check(s1?.scoped.map(\.name) == ["Sonnet"], "legacy null opus skipped, sonnet kept")

    // is_active:false on every row below the binding one is the shape observed live
    // 2026-08-13; those rows are real readings, not disabled limits.
    let limits = """
    {"five_hour":{"utilization":20,"resets_at":"2026-07-03T18:19:59.000Z"},
     "seven_day":{"utilization":13,"resets_at":"2026-07-08T16:59:59.000Z"},
     "limits":[
       {"kind":"session","group":"session","percent":20,"scope":null,"is_active":false},
       {"kind":"weekly_all","group":"weekly","percent":13,"scope":null,"is_active":true},
       {"kind":"weekly_scoped","group":"weekly","percent":21,"resets_at":"2026-07-08T16:59:59.000Z",
        "scope":{"model":{"id":null,"display_name":"Fable"},"surface":null},"is_active":false},
       {"kind":"weekly_scoped","group":"weekly","percent":4,
        "scope":{"model":{"id":"claude-opus-5","display_name":null},"surface":null},"is_active":false},
       {"kind":"weekly_scoped","group":"weekly","percent":2,
        "scope":{"model":null,"surface":{"id":null,"display_name":"Cowork"}},"is_active":false},
       {"kind":"weekly_scoped","group":"weekly","percent":9,"scope":null,"is_active":false}]}
    """
    let s2 = UsageModel.decode(Data(limits.utf8), plan: nil)
    check(s2?.session?.pct == 20, "limits session pct")
    check(s2?.weeklyAll?.pct == 13, "limits weekly pct")
    check(s2?.scoped.map(\.name) == ["Fable", "claude-opus-5", "Cowork"],
          "inactive rows kept, names fall back display_name -> id -> surface, nameless skipped")
    check(s2?.scoped.first?.win.pct == 21, "limits scoped pct")
    check(s2?.topScoped?.name == "Fable", "topScoped")
    check(s2?.metrics.map(\.name) == ["Session", "Weekly", "Fable", "claude-opus-5", "Cowork"], "metrics order")

    // MARK: credential parsing

    // The exact shape seen 2026-09-01: the keychain copy cut off mid-string inside mcpOAuth,
    // losing claudeAiOauth entirely. Must stay transient so the file copy gets its turn and a
    // held token keeps serving.
    let truncated = #"{"mcpOAuth":{"slack":{"serverUrl":"https://mcp.slack.com/mcp","token":"htt"#
    check(Credentials.parseForTests(Data(truncated.utf8)) == .transient,
          "truncated credentials blob is transient, not a missing sign-in")
    let mcpOnly = #"{"mcpOAuth":{"slack":{"serverUrl":"https://mcp.slack.com/mcp"}}}"#
    check(Credentials.parseForTests(Data(mcpOnly.utf8)) == .noSignIn,
          "valid blob with no claudeAiOauth really is a missing sign-in")
    let good = #"{"claudeAiOauth":{"accessToken":"t","refreshToken":"r","scopes":["user:profile"],"expiresAt":4102444800000,"rateLimitTier":"default_claude_max_20x"}}"#
    check(Credentials.parseForTests(Data(good.utf8)) == .ok, "well-formed blob parses")

    // MARK: credential selection

    func cred(_ id: String, ttl: TimeInterval) -> Credentials.Creds {
        Credentials.Creds(accessToken: id, refreshToken: "grant-" + id, scopes: [],
                          expiresAt: Date().addingTimeInterval(ttl), planName: nil)
    }
    let liveKC = cred("kc", ttl: 600), deadKC = cred("kc", ttl: -600)
    let liveHeld = cred("held", ttl: 600), deadHeld = cred("held", ttl: -600)

    check(UsageModel.pick(keychain: liveKC, held: nil).use?.accessToken == "kc",
          "valid keychain token wins — it costs nothing and Claude Code keeps it freshest")
    check(UsageModel.pick(keychain: liveKC, held: deadHeld).use?.accessToken == "kc",
          "valid keychain token beats a token of ours that has since expired")
    check(UsageModel.pick(keychain: deadKC, held: liveHeld).use?.accessToken == "held",
          "expired keychain token falls back to the one we minted")
    check(UsageModel.pick(keychain: nil, held: liveHeld).use?.accessToken == "held",
          "a truncated credentials blob does not take the meter down")

    let bothDead = UsageModel.pick(keychain: deadKC, held: deadHeld)
    check(bothDead.use == nil && bothDead.refreshFrom?.refreshToken == "grant-kc",
          "both expired: refresh from the keychain grant, where a fresh sign-in lands")
    let readFailed = UsageModel.pick(keychain: nil, held: deadHeld)
    check(readFailed.use == nil && readFailed.refreshFrom?.refreshToken == "grant-held",
          "no keychain read: refresh from the last grant we saw")
    let nothing = UsageModel.pick(keychain: nil, held: nil)
    check(nothing.use == nil && nothing.refreshFrom == nil, "nothing to use and nothing to refresh")

    // A sub-1 reading is a real sub-1 percentage, not a 0-1 fraction to rescale.
    let small = """
    {"five_hour":{"utilization":0.5,"resets_at":null},"seven_day":{"utilization":250}}
    """
    let s3 = UsageModel.decode(Data(small.utf8), plan: nil)
    check(s3?.session?.pct == 0.5, "0.5% stays 0.5%")
    check(s3?.session?.resetsAt == nil, "null resets_at")
    check(s3?.weeklyAll?.pct == 100, "clamp to 100")

    let nulls = "{\"five_hour\":null}"
    let s4 = UsageModel.decode(Data(nulls.utf8), plan: nil)
    check(s4 != nil && s4?.session == nil && s4?.scoped.isEmpty == true, "all-null windows valid")

    check(Credentials.planName(tier: "claude_max_20x", type: "max") == "Max 20x", "plan name from tier")
    check(Credentials.planName(tier: nil, type: "pro") == "Pro", "plan name from type")

    // MARK: Retry-After

    check(UsageModel.parseRetryAfter("120") == 120, "Retry-After seconds")
    check(UsageModel.parseRetryAfter("0") == nil, "Retry-After zero ignored")
    check(UsageModel.parseRetryAfter("garbage") == nil, "Retry-After garbage ignored")
    check(UsageModel.parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT") == nil, "Retry-After past date ignored")
    let future = Date().addingTimeInterval(300)
    let httpDate = DateFormatter()
    httpDate.locale = Locale(identifier: "en_US_POSIX")
    httpDate.timeZone = TimeZone(identifier: "GMT")
    httpDate.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
    let parsed = UsageModel.parseRetryAfter(httpDate.string(from: future)) ?? 0
    check(abs(parsed - 300) < 2, "Retry-After http date -> ~300s")

    // MARK: burn rate

    let key = UsageHistory.sessionKey
    let now = Date()
    var history = UsageHistory()
    // 10 %/h for 40 minutes, sampled every 5.
    for step in stride(from: 8, through: 0, by: -1) {
        history.record([key: 40 - Double(step) * 10 * 300 / 3600], at: now.addingTimeInterval(-Double(step) * 300))
    }
    let rate = history.rate(key, now: now) ?? 0
    check(abs(rate - 10) < 0.5, "least squares rate ~10%/h, got \(rate)")

    // 40% now, +10 %/h -> 100% in 6h. Resets in 2h, so the window clears first.
    check(
        history.projection(key, pct: 40, resetsAt: now.addingTimeInterval(2 * 3600), now: now) == .clears,
        "projection clears before reset"
    )
    switch history.projection(key, pct: 40, resetsAt: now.addingTimeInterval(9 * 3600), now: now) {
    case .exhausts(let at): check(abs(at.timeIntervalSince(now) - 6 * 3600) < 600, "projection exhausts in ~6h")
    default: check(false, "expected exhausts")
    }

    var flat = UsageHistory()
    for step in stride(from: 8, through: 0, by: -1) {
        flat.record([key: 40], at: now.addingTimeInterval(-Double(step) * 300))
    }
    check(flat.projection(key, pct: 40, resetsAt: nil, now: now) == .idle, "flat series is idle")
    check(UsageHistory().projection(key, pct: 40, resetsAt: nil, now: now) == nil, "no samples, no projection")

    check(history.spark(key, now: now).count == 9, "sparkline point count")
    check(history.spark(key, now: now).allSatisfy { (0...1).contains($0.x) && (0...1).contains($0.y) },
          "sparkline points normalised")

    // A drop past the threshold clears that series and reports the reset.
    var rolling = history
    let didReset = rolling.record([key: 2], at: now.addingTimeInterval(60))
    check(didReset == [key], "reset detected")
    check(rolling.series[key]?.count == 1, "reset clears the series")
    check(rolling.rate(key, now: now.addingTimeInterval(60)) == nil, "no rate right after a reset")

    // Samples closer than 30s are coalesced, and dropped windows are forgotten.
    var coalescing = UsageHistory()
    coalescing.record([key: 10], at: now)
    coalescing.record([key: 11], at: now.addingTimeInterval(5))
    check(coalescing.series[key]?.count == 1, "burst samples coalesced")
    coalescing.record(["weekly": 3], at: now.addingTimeInterval(600))
    check(coalescing.series[key] == nil, "unreported window forgotten")

    // MARK: threshold crossings

    var tracker = ThresholdTracker()
    check(tracker.update(pct: 90, didReset: false).isEmpty, "first reading only arms")
    check(tracker.update(pct: 92, didReset: false).isEmpty, "no re-alert below the next level")
    check(tracker.update(pct: 96, didReset: false) == [.crossed(95)], "95 fires once")
    check(tracker.update(pct: 97, didReset: false).isEmpty, "95 does not repeat")
    check(tracker.update(pct: 1, didReset: true) == [.reset], "reset fires")
    check(tracker.update(pct: 55, didReset: false) == [.crossed(50)], "50 re-arms after reset")
    check(tracker.update(pct: 99, didReset: false) == [.crossed(80), .crossed(95)],
          "a jump fires every level it passed")
    var quiet = ThresholdTracker()
    _ = quiet.update(pct: 30, didReset: false)
    check(quiet.update(pct: 2, didReset: true).isEmpty, "a routine rollover from 30% is not worth an alert")
    var weekly = ThresholdTracker(levels: ThresholdTracker.weeklyLevels)
    _ = weekly.update(pct: 10, didReset: false)
    check(weekly.update(pct: 60, didReset: false).isEmpty, "weekly has no 50% alert")
    check(weekly.update(pct: 81, didReset: false) == [.crossed(80)], "weekly 80 fires")

    // MARK: update check

    check(UsageModel.isNewer("1.10", than: "1.9"), "numeric version compare")
    check(!UsageModel.isNewer("1.2", than: "1.2"), "same version is not an update")
    check(!UsageModel.isNewer("1.1", than: "1.2"), "older version is not an update")
}
