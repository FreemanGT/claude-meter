import CryptoKit
import Foundation
import Security

// The Claude Code sign-in is only ever read here. Claude Meter never renews it, never writes or
// deletes a Keychain item or a credentials file, never calls the sign-in server and never reads
// the refresh token: Claude Code renews its own sign-in. `build.sh` fails when the binary holds
// the strings that would do any of that.

enum Credentials {
    /// One Claude Code sign-in on this Mac. The default one lives in ~/.claude. Each extra one is
    /// a folder Claude Code was started in with CLAUDE_CONFIG_DIR: its token sits in a keychain
    /// item of its own, named after a hash of that folder, and its account in `<folder>/.claude.json`.
    struct Login: Sendable, Equatable, Identifiable {
        let service: String
        let directory: URL
        let accountUUID: String?
        let email: String?
        var id: String { accountUUID ?? service }
        var fileURL: URL { directory.appendingPathComponent(".credentials.json") }
    }

    struct Creds: Sendable {
        let accessToken: String
        let scopes: [String]
        let expiresAt: Date?
        let planName: String?
        /// When the grant itself stops renewing (`refreshTokenExpiresAt`); past it, only a new
        /// sign-in brings the meter back. Claude Code warns about it 3 days ahead.
        var signInEnds: Date? = nil
        /// A minute early, so a token about to run out isn't sent.
        func expired(at now: Date = Date()) -> Bool { (expiresAt ?? .distantFuture) < now.addingTimeInterval(60) }
    }

    struct CredError: Error, Sendable, Equatable {
        enum Kind: Sendable, Equatable {
            /// No sign-in here at all: Claude Code isn't installed or never signed in.
            case missing
            /// The sign-in is dead (signed out, ended, or refused by Anthropic); only signing in again fixes it.
            case signedOut
            /// The token ran out. Claude Code renews it the next time it runs.
            case expired
            /// The item doesn't parse (seen truncated mid-write); Claude Code's next write fixes it.
            case unreadable
            /// The person said no to the Keychain question. Not asked again until they say so.
            case denied
            /// The Keychain is locked or busy with another question; tried again later.
            case busy
        }
        let kind: Kind
        let message: String
        /// Busy only because another item was being opened just then: worth trying again in seconds.
        var soon = false
    }

    static let signInHint = "Sign in to Claude Code (Pro or Max): run claude, then /login"
    static let signedOut = "signed out of Claude Code"
    static let expiredMessage = "sign-in expired — run claude to renew it"
    static let deniedMessage = "Keychain access declined — right-click → Allow Keychain access"
    static let service = "Claude Code-credentials"
    private static var home: URL { FileManager.default.homeDirectoryForCurrentUser }

    /// The sign-in a plain `claude` uses: no CLAUDE_CONFIG_DIR, so no hash on the item's name. Its
    /// account is deliberately not taken from ~/.claude.json: Claude Code sessions inside the Claude
    /// app rewrite `oauthAccount` there to the app's account while the keychain keeps the terminal
    /// login. On 2026-11-08 it named one account over another's token, so the meter showed one
    /// account's numbers under the other's name and dropped the real one as a duplicate.
    static var primary: Login {
        Login(service: service, directory: home.appendingPathComponent(".claude"), accountUUID: nil, email: nil)
    }

    /// Every Claude Code sign-in that may exist, the default one first, each carrying only what its
    /// files say about its account; `resolvedLogins` fills in the default one's. Extra ones are
    /// dot-folders in the home folder with "claude" in the name (`~/.claude-work`) and a signed-in
    /// `.claude.json`; a config folder anywhere else isn't looked for. Only processes started with
    /// that folder write there, so its hint is sound.
    static func logins() -> [Login] {
        var found = [primary]
        let names = (try? FileManager.default.contentsOfDirectory(atPath: home.path)) ?? []
        for name in names.sorted() where name.hasPrefix(".") && name.lowercased().contains("claude") {
            let directory = home.appendingPathComponent(name, isDirectory: true)
            guard let account = profileAccount(directory.appendingPathComponent(".claude.json")) else { continue }
            found.append(Login(service: serviceName(forConfigDir: directory.path), directory: directory,
                               accountUUID: account.uuid, email: account.email))
        }
        return found
    }

    // MARK: - Whose sign-in is it

    /// The account behind the default keychain item, tied to the item's change date. Claude Code
    /// changes the item when it renews or signs in again, and only then is the question asked again.
    /// Kept in the preferences: an account ID, an email and a date, nothing taken from a token.
    private struct Owner: Codable {
        let changed: Date
        let uuid: String
        let email: String?
    }

    private static let ownersKey = "loginOwners"
    /// 1.4 kept a hash of each refresh token here. No longer needed or kept.
    static let legacyIdentitiesKey = "loginIdentities"
    private static let profileURL = URL(string: "https://api.anthropic.com/api/oauth/profile")!

    /// `logins()` with the default sign-in's account as the API reports it for its own token, one
    /// entry per account. Lists keychain items without opening them; opens the default one only when
    /// Claude Code has saved a sign-in there since its account was last asked for, and that opening
    /// is remembered for the usage read that follows. Blocking, so run it off the main actor.
    /// `ask: false` (the --accounts listing) uses only what is already known: nothing is opened
    /// and nothing is sent.
    static func resolvedLogins(reader: Reader = .shared, ask: Bool = true) async -> [Login] {
        var owners = loadOwners()
        let before = owners
        var resolved: [Login] = []
        for candidate in logins() {
            var uuid = candidate.accountUUID, email = candidate.email
            let known = ask ? await owner(of: candidate, owners: &owners, reader: reader) : owners[candidate.service]
            if candidate.service == service, let owner = known {
                uuid = owner.uuid
                email = owner.email
            }
            if let uuid, resolved.contains(where: { $0.accountUUID == uuid }) { continue }
            resolved.append(Login(service: candidate.service, directory: candidate.directory,
                                  accountUUID: uuid, email: email))
        }
        // Two syncs can overlap (the account watcher and a fetch): save only what this one learned,
        // on top of what is on file now, so one doesn't overwrite the other's answer.
        let learned = owners.filter { before[$0.key]?.changed != $0.value.changed }
        if !learned.isEmpty { saveOwners(loadOwners().merging(learned) { $1 }) }
        return resolved
    }

    /// Item change dates the profile was already asked about (whatever the answer), so a failing
    /// call is made once per new sign-in, not on every sync. Memory only.
    private static let asked = AskedDates()

    private static func owner(of login: Login, owners: inout [String: Owner], reader: Reader) async -> Owner? {
        let known = owners[login.service]
        guard login.service == service else { return known }
        guard let changed = reader.newestChange(login.service) else { return known }
        if let known, known.changed == changed { return known }
        guard asked.take(login.service, changed) else { return known }
        let reading = reader.read(login)
        // Expired, declined, offline, or refused: the last answer is still very likely right, since
        // a keychain item only changes hands when someone signs in to it again.
        guard case .success(let creds) = reading.result, let seen = reading.seen else {
            // Not read (busy, say): ask again at the next sync rather than wait for another change.
            // Declined: once the person allows it again, ask then. (A refused item isn't opened, so
            // trying again costs nothing.)
            if case .failure(let error) = reading.result, error.kind == .busy || error.kind == .denied {
                asked.forget(login.service)
            }
            return known
        }
        switch await profile(creds.accessToken) {
        case .account(let uuid, let email):
            let found = Owner(changed: seen, uuid: uuid, email: email)
            owners[login.service] = found
            return found
        case .refused:
            reader.rejected(login.service, token: creds.accessToken, seen: seen)
            return known
        case .failed:
            // Offline, a timeout, 429 or 5xx: try again later, a minute and then longer each time.
            asked.failed(login.service)
            return known
        }
    }

    /// Per item: the change date the profile was asked about, and when it may be asked again about
    /// that same date (never, after an answer; later and later after a failed call).
    private final class AskedDates: @unchecked Sendable {
        private let lock = NSLock()
        private var asked: [String: (changed: Date, again: Date, wait: TimeInterval)] = [:]
        /// True when this item's profile may be asked about now.
        func take(_ service: String, _ changed: Date, now: Date = Date()) -> Bool {
            lock.lock(); defer { lock.unlock() }
            if let entry = asked[service], entry.changed == changed, entry.again > now { return false }
            let wait = asked[service].map { $0.changed == changed ? $0.wait : 0 } ?? 0
            asked[service] = (changed, .distantFuture, wait)
            return true
        }
        func failed(_ service: String, now: Date = Date()) {
            lock.lock(); defer { lock.unlock() }
            guard let entry = asked[service] else { return }
            let wait = min(3600, max(60, entry.wait * 2))
            asked[service] = (entry.changed, now.addingTimeInterval(wait), wait)
        }
        func forget(_ service: String) { lock.lock(); asked[service] = nil; lock.unlock() }
    }

    private enum ProfileAnswer { case account(String, String?), refused, failed }

    /// Claude Code's own "who am I" call (GET /api/oauth/profile with the sign-in's token).
    private static func profile(_ accessToken: String) async -> ProfileAnswer {
        var request = Net.request(profileURL)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard let (data, response) = try? await Net.session.data(for: request) else { return .failed }
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 { return .refused }
        guard code == 200,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let account = json["account"] as? [String: Any],
              let uuid = account["uuid"] as? String, !uuid.isEmpty
        else { return .failed }
        return .account(uuid, account["email"] as? String)
    }

    private static func loadOwners() -> [String: Owner] {
        guard let data = UserDefaults.standard.data(forKey: ownersKey) else { return [:] }
        return (try? JSONDecoder().decode([String: Owner].self, from: data)) ?? [:]
    }

    private static func saveOwners(_ owners: [String: Owner]) {
        guard let data = try? JSONEncoder().encode(owners) else { return }
        UserDefaults.standard.set(data, forKey: ownersKey)
    }

    /// Claude Code's own rule: "Claude Code-credentials-" + the first 8 hex digits of the SHA-256
    /// of the CLAUDE_CONFIG_DIR value, NFC-normalized (read out of its 2.1.317 bundle).
    static func serviceName(forConfigDir path: String) -> String {
        let digest = SHA256.hash(data: Data(path.precomposedStringWithCanonicalMapping.utf8))
        return service + "-" + digest.prefix(4).map { String(format: "%02x", $0) }.joined()
    }

    /// Where an added sign-in goes: the first `~/.claude-N` not already signed in to an account.
    static func newConfigDir() -> URL {
        var n = 2
        while profileAccount(home.appendingPathComponent(".claude-\(n)/.claude.json")) != nil { n += 1 }
        return home.appendingPathComponent(".claude-\(n)")
    }

    /// The account Claude Code last signed in to with this profile; nil when it never has.
    private static func profileAccount(_ url: URL) -> (uuid: String, email: String?)? {
        guard let data = try? Data(contentsOf: url),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let account = json["oauthAccount"] as? [String: Any],
              let uuid = account["accountUuid"] as? String, !uuid.isEmpty
        else { return nil }
        return (uuid, account["emailAddress"] as? String)
    }

    // MARK: - Reading a sign-in

    static func parse(_ data: Data) -> Result<Creds, CredError> {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            // Claude Code rewrites this blob whenever an MCP server re-authorizes, and it has
            // been observed truncated mid-write.
            return .failure(CredError(kind: .unreadable, message: "credentials unreadable — sign in to Claude Code again"))
        }
        guard let oauth = json["claudeAiOauth"] as? [String: Any],
              let token = oauth["accessToken"] as? String, !token.isEmpty
        else {
            // Claude Code is installed and has used this item, so the fix is signing in again, not
            // getting Claude Code. Seen 2026-11-16: every token blanked in place (expiresAt 0) two
            // days after the sign-in's refreshTokenExpiresAt, next to 20 intact MCP sign-ins.
            if json["claudeAiOauth"] != nil || json["mcpOAuth"] != nil {
                return .failure(CredError(kind: .signedOut, message: signedOut))
            }
            return .failure(CredError(kind: .missing, message: signInHint))
        }
        let expiresAt = (oauth["expiresAt"] as? Double).map { Date(timeIntervalSince1970: $0 / 1000) }
        let signInEnds = (oauth["refreshTokenExpiresAt"] as? Double).map { Date(timeIntervalSince1970: $0 / 1000) }
        let creds = Creds(
            accessToken: token,
            scopes: oauth["scopes"] as? [String] ?? [],
            expiresAt: expiresAt,
            planName: planName(
                tier: oauth["rateLimitTier"] as? String,
                type: oauth["subscriptionType"] as? String
            ),
            signInEnds: signInEnds
        )
        guard creds.expired() else { return .success(creds) }
        // Both spent: Claude Code can't renew it either, so it takes a new sign-in.
        if let signInEnds, signInEnds < Date() {
            return .failure(CredError(kind: .signedOut, message: "sign-in ended — " + signedOut))
        }
        return .failure(CredError(kind: .expired, message: expiredMessage))
    }

    // "claude_max_20x" -> "Max 20x"
    static func planName(tier: String?, type: String?) -> String? {
        if let tier {
            let parts = tier.split(separator: "_").filter { $0 != "claude" }
            if !parts.isEmpty {
                return parts.enumerated()
                    .map { $0.offset == 0 ? $0.element.capitalized : String($0.element) }
                    .joined(separator: " ")
            }
        }
        return type?.capitalized
    }
}

// MARK: - The Keychain, read only

extension Credentials {
    /// One keychain item: a reference to open it by, and when it was last changed.
    struct Item: Sendable {
        let ref: Data
        let changed: Date
    }

    /// Where sign-ins are read from. `keychain` is the real one; --selftest passes a fake.
    struct Store: Sendable {
        /// Items with that name, newest first. Listing doesn't open anything, so macOS doesn't
        /// ask. Empty: there is no such item. nil: the Keychain can't be searched just now.
        var list: @Sendable (_ service: String) -> [Item]?
        /// Opens one item. This is the only step that can make macOS ask.
        var open: @Sendable (_ ref: Data) -> (status: OSStatus, data: Data?)
        var file: @Sendable (_ url: URL) -> Data?
        var now: @Sendable () -> Date

        static let keychain = Store(
            list: { service in
                let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                            kSecAttrService as String: service,
                                            kSecReturnAttributes as String: true,
                                            kSecReturnPersistentRef as String: true,
                                            kSecMatchLimit as String: kSecMatchLimitAll,
                                            // A listing must never put a window on screen (an
                                            // unlock dialog for a locked keychain, say).
                                            kSecUseAuthenticationUI as String: kSecUseAuthenticationUIFail]
                var out: AnyObject?
                let status = SecItemCopyMatching(query as CFDictionary, &out)
                if status == errSecItemNotFound { return [] }
                guard status == errSecSuccess, let found = out as? [[String: Any]] else { return nil }
                return found.compactMap { item -> Item? in
                    guard let ref = item[kSecValuePersistentRef as String] as? Data else { return nil }
                    return Item(ref: ref, changed: (item[kSecAttrModificationDate as String] as? Date) ?? .distantPast)
                }.sorted { $0.changed > $1.changed }
            },
            open: { ref in
                var out: AnyObject?
                let query: [String: Any] = [kSecValuePersistentRef as String: ref, kSecReturnData as String: true]
                let status = SecItemCopyMatching(query as CFDictionary, &out)
                return (status, out as? Data)
            },
            file: { try? Data(contentsOf: $0) },
            now: { Date() }
        )
    }

    /// What one look for a sign-in found. `seen` is the change date of the newest keychain item it
    /// was read from; nil when it came from the credentials file or there was no item.
    struct Reading: Sendable {
        let result: Result<Creds, CredError>
        let seen: Date?
    }

    /// Reads sign-ins and remembers what it learned, so a keychain item is opened as rarely as
    /// possible: opening is what makes macOS ask. All of it is in memory, except the names of items
    /// the person said no to.
    ///  - cache: a token once read, with the change date of the item it came from. Used while that
    ///    date stays the same; when Claude Code saves a new sign-in the item is read again.
    ///  - settled: an item found to hold nothing usable (expired, signed out, unreadable, refused
    ///    by Anthropic), and its change date then. Not opened again until that date moves.
    ///  - refused: items the person said no to. Not opened again until `allowAgain`. Kept across
    ///    launches so starting the app again doesn't put the question back on screen.
    ///  - retry: after the Keychain couldn't be opened (locked), when to try next; the wait doubles
    ///    from a minute up to an hour.
    /// Only one item is ever being opened at a time, so there is never more than one question on
    /// screen; anyone else asking meanwhile gets the last good token or "busy".
    final class Reader: @unchecked Sendable {
        static let refusedKey = "keychainRefused"
        static let shared = Reader(store: .keychain, refusedStore: (
            load: { UserDefaults.standard.stringArray(forKey: refusedKey) ?? [] },
            save: { UserDefaults.standard.set($0, forKey: refusedKey) }
        ))

        private let store: Store
        private let refusedStore: (load: () -> [String], save: ([String]) -> Void)
        private let lock = NSLock()
        private let opening = NSLock()
        private var cache: [String: (creds: Creds, seen: Date)] = [:]
        private var settled: [String: (changed: Date, error: CredError)] = [:]
        private var refused: Set<String>
        private var retry: [String: (at: Date, wait: TimeInterval)] = [:]
        /// Hashes of tokens Anthropic refused, so one read from the credentials file (which has
        /// no change date to go by) isn't sent again. Memory only.
        private var turnedDown: Set<String> = []

        private static func hash(_ token: String) -> String {
            SHA256.hash(data: Data(token.utf8)).map { String(format: "%02x", $0) }.joined()
        }

        init(store: Store, refusedStore: (load: () -> [String], save: ([String]) -> Void)) {
            self.store = store
            self.refusedStore = refusedStore
            refused = Set(refusedStore.load())
        }

        private func locked<T>(_ body: () -> T) -> T { lock.lock(); defer { lock.unlock() }; return body() }

        func isRefused(_ service: String) -> Bool { locked { refused.contains(service) } }

        /// The newest item's change date, without opening anything; nil when there is none or the
        /// Keychain can't be searched.
        func newestChange(_ service: String) -> Date? { store.list(service)?.first?.changed }

        /// The person asked to be asked again (after saying no, or after unlocking the Keychain).
        func allowAgain(_ service: String) {
            locked {
                refused.remove(service)
                refusedStore.save(refused.sorted())
                retry[service] = nil
                settled[service] = nil
            }
        }

        /// Anthropic refused this token (401). It isn't sent again, and the item it came from stays
        /// closed until Claude Code saves another sign-in there.
        func rejected(_ service: String, token: String, seen: Date?) {
            locked {
                if turnedDown.count > 32 { turnedDown = [] }
                turnedDown.insert(Self.hash(token))
                if cache[service]?.creds.accessToken == token { cache[service] = nil }
                if let seen { settled[service] = (seen, Self.refusedError) }
            }
        }

        /// The sign-in for one login. `manual`: a click, which may retry a locked Keychain early,
        /// but never reopens an item the person said no to.
        func read(_ login: Login, manual: Bool = false) -> Reading {
            let service = login.service
            let now = store.now()
            // "No" stands: nothing is opened, and the credentials file, which can hold the same
            // sign-in, isn't used to get around it.
            if isRefused(service) {
                return Reading(result: .failure(CredError(kind: .denied, message: Credentials.deniedMessage)), seen: nil)
            }
            let listed = store.list(service)
            let newest = listed?.first?.changed
            let fromKeychain: Reading
            if listed == nil {
                fromKeychain = remembered(service, at: now)
                    ?? Reading(result: .failure(CredError(kind: .busy, message: "Keychain locked")), seen: nil)
            } else if let newest, let held = locked({ cache[service] }), held.seen == newest {
                // The item hasn't changed since this token was read out of it: nothing new to find.
                fromKeychain = held.creds.expired(at: now)
                    ? Reading(result: .failure(CredError(kind: .expired, message: Credentials.expiredMessage)), seen: newest)
                    : Reading(result: .success(held.creds), seen: newest)
            } else if let newest, let known = locked({ settled[service] }), known.changed == newest {
                fromKeychain = Reading(result: .failure(known.error), seen: newest)
            } else if let newest, let items = listed {
                fromKeychain = open(items, service: service, newest: newest, now: now, manual: manual)
            } else {
                fromKeychain = Reading(result: .failure(CredError(kind: .missing, message: Credentials.signInHint)), seen: nil)
            }
            if case .success(let creds) = fromKeychain.result {
                if !wasTurnedDown(creds) { return fromKeychain }
            } else if case .failure(let error) = fromKeychain.result, error.kind == .denied {
                return fromKeychain
            }
            // Claude Code keeps the sign-in in this file when it can't use the keychain; only read.
            if let data = store.file(login.fileURL), case .success(let creds) = Credentials.parse(data),
               !wasTurnedDown(creds) {
                return Reading(result: .success(creds), seen: nil)
            }
            // The only token found was refused by Anthropic: that's a dead sign-in, not a missing one.
            if case .success = fromKeychain.result {
                return Reading(result: .failure(Self.refusedError), seen: fromKeychain.seen)
            }
            if case .failure(let error) = fromKeychain.result, error.kind == .missing,
               let data = store.file(login.fileURL), case .success = Credentials.parse(data) {
                return Reading(result: .failure(Self.refusedError), seen: nil)
            }
            return fromKeychain
        }

        private static let refusedError = CredError(kind: .signedOut, message: "sign-in refused — " + Credentials.signedOut)

        private func wasTurnedDown(_ creds: Creds) -> Bool {
            let key = Self.hash(creds.accessToken)
            return locked { turnedDown.contains(key) }
        }

        private func remembered(_ service: String, at now: Date) -> Reading? {
            locked {
                guard let held = cache[service], !held.creds.expired(at: now) else { return nil }
                return Reading(result: .success(held.creds), seen: held.seen)
            }
        }

        private func open(_ items: [Item], service: String, newest: Date, now: Date, manual: Bool) -> Reading {
            let waiting = locked { retry[service].map { $0.at > now } ?? false }
            let busy = { (soon: Bool) in self.remembered(service, at: now)
                ?? Reading(result: .failure(CredError(kind: .busy, message: "waiting for the Keychain", soon: soon)), seen: nil) }
            if waiting && !manual { return busy(false) }
            // Another item is being opened (its question may be on screen): don't add a second.
            guard opening.try() else { return busy(true) }
            defer { opening.unlock() }

            var firstError: CredError?
            var denied = false, cantOpen = false
            // Newest first, stopping at the first good one: one question from macOS, not one per item.
            for item in items {
                let (status, data) = store.open(item.ref)
                if status == errSecUserCanceled || status == errSecAuthFailed { denied = true; break }
                if status != errSecSuccess { cantOpen = status != errSecItemNotFound || cantOpen; continue }
                guard let data else { continue }
                switch Credentials.parse(data) {
                case .success(let creds):
                    locked {
                        cache[service] = (creds, newest)
                        settled[service] = nil
                        retry[service] = nil
                    }
                    return Reading(result: .success(creds), seen: newest)
                case .failure(let error):
                    if firstError == nil { firstError = error }
                }
                // An older item behind an expired or signed-out one only holds something older
                // still; opening it would only mean another question. Only an unreadable one
                // (seen truncated mid-write) is worth looking past.
                if let firstError, firstError.kind != .unreadable { break }
            }
            if denied {
                locked {
                    cache[service] = nil
                    refused.insert(service)
                    refusedStore.save(refused.sorted())
                }
                return Reading(result: .failure(CredError(kind: .denied, message: Credentials.deniedMessage)), seen: newest)
            }
            if let firstError {
                locked {
                    cache[service] = nil
                    settled[service] = (newest, firstError)
                    retry[service] = nil
                }
                return Reading(result: .failure(firstError), seen: newest)
            }
            if cantOpen {
                locked {
                    let wait = min(3600, max(60, (retry[service]?.wait ?? 30) * 2))
                    retry[service] = (now.addingTimeInterval(wait), wait)
                }
                return busy(false)
            }
            return Reading(result: .failure(CredError(kind: .missing, message: Credentials.signInHint)), seen: nil)
        }
    }
}

// MARK: - Network

/// Every request goes through this session. It keeps nothing on disk: no cache, no cookies, no
/// stored credentials. (The shared session keeps each request, headers included, in ~/Library/Caches.)
enum Net {
    static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.urlCache = nil
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.httpCookieAcceptPolicy = .never
        config.urlCredentialStorage = nil
        config.waitsForConnectivity = false
        config.timeoutIntervalForRequest = 15
        return URLSession(configuration: config)
    }()

    // Wrong UA lands in an aggressively rate-limited bucket with persistent 429s.
    static let userAgent = "claude-cli/2.1.175 (external, cli)"

    static func request(_ url: URL) -> URLRequest {
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 15)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        return request
    }
}

/// The account the Claude desktop app is signed in to. The app records it as `lastKnownAccountUuid`
/// in its settings file, which holds no secrets. The app's own sign-in stays out of reach on purpose:
/// following it means showing the Claude Code sign-in for the same account.
enum ClaudeApp {
    static var configURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/Claude/config.json")
    }

    /// Nil when the app isn't installed or has never been signed in.
    static func accountUUID() -> String? {
        guard let data = try? Data(contentsOf: configURL),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let uuid = json["lastKnownAccountUuid"] as? String, !uuid.isEmpty
        else { return nil }
        return uuid
    }

    /// Cheap enough to check every few seconds; the file is only parsed when this changes.
    static func modified() -> Date? {
        (try? FileManager.default.attributesOfItem(atPath: configURL.path))?[.modificationDate] as? Date
    }
}

extension Credentials {
    /// Test seam: --selftest cares which of the outcomes a blob produces, not the strings.
    enum ParseOutcome { case ok, expired, unreadable, signedOut, noSignIn }

    static func parseForTests(_ data: Data) -> ParseOutcome {
        switch parse(data) {
        case .success: return .ok
        case .failure(let error):
            switch error.kind {
            case .expired: return .expired
            case .unreadable: return .unreadable
            case .signedOut: return .signedOut
            default: return .noSignIn
            }
        }
    }

    static func signInEndsForTests(_ data: Data) -> Date? {
        try? parse(data).get().signInEnds
    }
}
