import AppKit
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
        /// The account's email, set only when there's more than one sign-in to tell apart.
        var account: String? = nil
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
    @Published private(set) var history = UsageHistory()
    /// Newer version published on the website, if any.
    @Published private(set) var updateAvailable: String?

    /// Every Claude Code sign-in on this Mac, the default one first.
    @Published private(set) var logins: [Credentials.Login] = []
    /// The sign-in being shown; nil while the Claude app is on an account none of them is for.
    @Published private(set) var shown: Credentials.Login?
    @Published private(set) var appAccount: String?
    @Published private(set) var missingAppAccount = false

    /// UserDefaults: a sign-in's id picked in the menu, or `followApp`.
    nonisolated static let accountKey = "account"
    nonisolated static let followApp = "follow"
    nonisolated static let missingMessage =
        "The Claude app's account isn't signed in to Claude Code — right-click to add it"

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
    private var watchTask: Task<Void, Never>?
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
        // Switching accounts in the Claude app rewrites its settings file; follow within seconds
        // rather than at the next poll. While its account has no sign-in, also keep looking for
        // the one being added in Terminal.
        watchTask = Task { [weak self] in
            var seen = ClaudeApp.modified()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                guard let self else { return }
                let modified = ClaudeApp.modified()
                guard modified != seen || missingAppAccount else { continue }
                seen = modified
                await followAccount()
            }
        }
    }

    // MARK: - Accounts

    /// What belongs to one account, set aside while another is shown: its numbers, its trend, and
    /// its poll state. The poll floor and backoff are per account, so switching back and forth
    /// can't poll one account faster than the floor allows.
    private struct Parked {
        var snapshot: Snapshot?
        var status: Status
        var history: UsageHistory
        var lastAttempt: Date
        var backoff: TimeInterval
        var rateLimitedUntil: Date?
        var credentialsFailedAt: Date?
    }

    private var parked: [String: Parked] = [:]
    private var activeKey: String?
    private var historyKey: String?

    /// Which sign-in to show. One picked in the menu wins while it still exists; otherwise the
    /// Claude app's account, or the plain `claude` sign-in when there is no Claude app. Nil means
    /// the app is on an account Claude Code isn't signed in to: say so rather than show another
    /// account's numbers as if they were this one's.
    nonisolated static func choose(_ logins: [Credentials.Login], app: String?, pinned: String?) -> Credentials.Login? {
        if let pinned, let login = logins.first(where: { $0.id == pinned }) { return login }
        guard let app else { return logins.first }
        if let login = logins.first(where: { $0.accountUUID == app }) { return login }
        // A lone sign-in with no account on file may well be the app's: better tried than blanked.
        if logins.count == 1, logins[0].accountUUID == nil { return logins[0] }
        return nil
    }

    /// Re-reads the sign-ins and the Claude app's account, and switches what's shown if needed.
    /// Two small files and a directory listing, so it runs before every fetch.
    private func syncAccount() async {
        let (found, app) = await Task.detached { (Credentials.logins(), ClaudeApp.accountUUID()) }.value
        logins = found
        appAccount = app
        let login = Self.choose(found, app: app, pinned: UserDefaults.standard.string(forKey: Self.accountKey))
        missingAppAccount = login == nil
        show(login, key: login?.id ?? "app:" + (app ?? ""))
    }

    private func followAccount() async {
        let before = activeKey
        await syncAccount()
        if activeKey != before { await fetch() }
    }

    private func show(_ login: Credentials.Login?, key: String) {
        shown = login
        guard key != activeKey else { return }
        if let activeKey {
            parked[activeKey] = Parked(
                snapshot: snapshot, status: status, history: history, lastAttempt: lastAttempt,
                backoff: backoff, rateLimitedUntil: rateLimitedUntil, credentialsFailedAt: credentialsFailedAt
            )
        }
        historyKey = login.map { login in
            login.accountUUID.map(UsageHistory.storeKey(account:)) ?? UsageHistory.legacyStoreKey
        }
        let next = parked.removeValue(forKey: key) ?? Parked(
            snapshot: nil, status: .loading, history: storedHistory(for: login),
            lastAttempt: .distantPast, backoff: Self.baseBackoff, rateLimitedUntil: nil, credentialsFailedAt: nil
        )
        activeKey = key
        snapshot = next.snapshot
        // A countdown parked with its account would come back frozen; its numbers are still good.
        if case .throttled = next.status { status = .ok } else { status = next.status }
        history = next.history
        lastAttempt = next.lastAttempt
        backoff = next.backoff
        rateLimitedUntil = next.rateLimitedUntil
        credentialsFailedAt = next.credentialsFailedAt
        pendingRefresh?.cancel()
        pendingRefresh = nil
        NSLog("ClaudeMeter showing %@", login?.service ?? "nothing: no sign-in for the Claude app's account")
    }

    private func storedHistory(for login: Credentials.Login?) -> UsageHistory {
        guard let login, let historyKey else { return UsageHistory() }
        if let stored = UsageHistory.load(historyKey) { return stored }
        // 1.3 kept a single history, and it was the default sign-in's.
        if login.service == Credentials.service, let legacy = UsageHistory.load(UsageHistory.legacyStoreKey) {
            return legacy
        }
        return UsageHistory()
    }

    /// Picked in the menu: an id from `logins`, or `followApp`.
    func pickAccount(_ id: String) {
        UserDefaults.standard.set(id, forKey: Self.accountKey)
        Task { await followAccount() }
    }

    /// Runs Claude Code's own `claude auth login` in Terminal. With no login: against a fresh config
    /// folder, so the Claude app's account gets a keychain item of its own and the existing sign-in
    /// is left alone. With one: against that sign-in's own folder, since a plain `claude` would only
    /// ever renew the default one. The login happens entirely in Claude Code; the watcher above
    /// notices it land.
    func signIn(again login: Credentials.Login? = nil) {
        func quote(_ text: String) -> String { "'" + text.replacingOccurrences(of: "'", with: #"'\''"#) + "'" }
        let folder: String?
        if let login {
            folder = login.service == Credentials.service ? nil : login.directory.path
        } else {
            folder = Credentials.newConfigDir().path
        }
        let intro = login.map { "Claude Meter: sign Claude Code in to \($0.email ?? "this account") again." }
            ?? "Claude Meter: sign Claude Code in to the account the Claude app is using."
        let script = """
        #!/bin/zsh
        \(folder.map { "export CLAUDE_CONFIG_DIR=" + quote($0) } ?? "unset CLAUDE_CONFIG_DIR")
        clear
        echo \(quote(intro))
        echo "Your other Claude Code sign-ins stay as they are."
        echo
        if ! command -v claude >/dev/null; then
          echo "Claude Code isn't installed. Get it at https://claude.com/product/claude-code"
          exit 1
        fi
        claude auth login --claudeai && echo && echo "Done. Claude Meter picks it up in a few seconds; you can close this window."

        """
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Claude Meter - Sign In.command")
        do {
            try Data(script.utf8).write(to: url, options: .atomic)
            try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: url.path)
            NSWorkspace.shared.open(url)
        } catch {
            NSLog("ClaudeMeter: add-account script failed: %@", String(describing: error))
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
    /// One per sign-in, keyed by `Login.id`.
    private var held: [String: Credentials.Creds] = [:]

    private func usableCredentials(_ login: Credentials.Login) async -> Result<Credentials.Creds, Credentials.CredError> {
        var keychain: Credentials.Creds?
        var readError: Credentials.CredError?
        switch await Task.detached(operation: { Credentials.read(login) }).value {
        case .success(let creds):
            keychain = creds
            if !creds.expired { held[login.id] = creds }
        case .failure(let error):
            readError = error
        }
        let choice = Self.pick(keychain: keychain, held: held[login.id])
        if let usable = choice.use { return .success(usable) }
        guard let grant = choice.refreshFrom else {
            return .failure(readError ?? Credentials.CredError(message: Credentials.signInHint))
        }
        var result = await Credentials.refresh(grant, for: login)
        // Grants rotate, so only the newest works. If a keychain write-back failed, that's ours.
        if case .failure(let error) = result, error.unauthorized,
           let mine = held[login.id], mine.refreshToken != grant.refreshToken {
            result = await Credentials.refresh(mine, for: login)
        }
        switch result {
        case .success(let creds):
            held[login.id] = creds
            return .success(creds)
        case .failure(let error):
            if error.unauthorized { held[login.id] = nil }  // spent or revoked: stop offering it
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
        await syncAccount()
        guard let login = shown, let key = activeKey else {
            status = .noCredentials(Self.missingMessage)
            return
        }
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
        let usable = await usableCredentials(login)
        // Switched accounts while the keychain was read: this result belongs to the other one.
        guard activeKey == key else { return }
        switch usable {
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
            guard activeKey == key else { return }
            let http = response as? HTTPURLResponse
            switch http?.statusCode ?? 0 {
            case 200:
                if var snap = Self.decode(data, plan: creds.planName) {
                    snap.account = logins.count > 1 ? login.email : nil
                    snapshot = snap
                    status = .ok
                    backoff = Self.baseBackoff
                    rateLimitedUntil = nil
                    record(snap, account: key)
                } else {
                    status = .stale("bad response")
                }
            case 401:
                held[login.id] = nil
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
            guard activeKey == key else { return }
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

    private func record(_ snap: Snapshot, account: String) {
        let resets = history.record(snap.readings)
        if let historyKey { history.save(historyKey) }
        Notifier.shared.usageChanged(snap.metrics, resets: resets, account: account)
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
        case "missing":
            return (nil, .noCredentials(missingMessage), UsageHistory())
        case "account":
            var s = snap(42)
            s.account = "yiftach41@gmail.com"
            return (s, .ok, trend(s, ratePerHour: 9))
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

    // MARK: write-back compare-and-swap

    let update: [String: Any] = ["accessToken": "t2", "refreshToken": "r2", "expiresAt": 1.0]
    let stored = #"{"claudeAiOauth":{"accessToken":"t","refreshToken":"r","clientId":"c"},"mcpOAuth":{"x":1}}"#
    let merged = Credentials.merge(Data(stored.utf8), spent: "r", update: update)
        .flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    let mergedOAuth = merged?["claudeAiOauth"] as? [String: Any]
    check(mergedOAuth?["refreshToken"] as? String == "r2" && mergedOAuth?["accessToken"] as? String == "t2",
          "write-back replaces the spent grant")
    check(mergedOAuth?["clientId"] as? String == "c" && merged?["mcpOAuth"] != nil,
          "write-back keeps every key it doesn't own")
    check(Credentials.merge(Data(stored.utf8), spent: "other", update: update) == nil,
          "a newer grant in the store wins: no write")
    check(Credentials.merge(Data(truncated.utf8), spent: "r", update: update) == nil,
          "never write over a blob that doesn't parse")

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

    // MARK: accounts

    // Expected names computed independently: sha256(path).hexdigest()[:8], as Claude Code does.
    check(Credentials.serviceName(forConfigDir: "/Users/freemansmain/.claude-yiftach41")
          == "Claude Code-credentials-1b9a5af7", "keychain item name for a CLAUDE_CONFIG_DIR sign-in")
    check(Credentials.serviceName(forConfigDir: "/Users/freemansmain/.claude")
          == "Claude Code-credentials-a572acdc", "an explicit ~/.claude still gets a hashed name")

    func login(_ account: String?, _ service: String) -> Credentials.Login {
        Credentials.Login(service: service, directory: URL(fileURLWithPath: "/tmp/\(service)"),
                          accountUUID: account, email: account.map { "\($0)@example.com" })
    }
    let plain = login("a", "Claude Code-credentials"), extra = login("b", "Claude Code-credentials-12345678")
    check(UsageModel.choose([plain, extra], app: "b", pinned: nil) == extra, "follows the Claude app's account")
    check(UsageModel.choose([plain, extra], app: "a", pinned: UsageModel.followApp) == plain,
          "'follow' in the menu means follow")
    check(UsageModel.choose([plain, extra], app: "b", pinned: "a") == plain, "a pick in the menu beats the app")
    check(UsageModel.choose([plain, extra], app: "b", pinned: "gone") == extra,
          "a pick whose sign-in is gone falls back to following")
    check(UsageModel.choose([plain], app: "z", pinned: nil) == nil,
          "the app on an account with no sign-in shows nothing, not another account's numbers")
    check(UsageModel.choose([plain, extra], app: nil, pinned: nil) == plain, "no Claude app: the plain claude sign-in")
    let unnamed = login(nil, "Claude Code-credentials")
    check(UsageModel.choose([unnamed], app: "z", pinned: nil) == unnamed, "a lone unnamed sign-in is still tried")

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
