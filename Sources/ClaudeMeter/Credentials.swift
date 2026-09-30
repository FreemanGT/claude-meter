import Foundation

enum Credentials {
    struct Creds: Sendable {
        let accessToken: String
        let refreshToken: String?
        let scopes: [String]
        let expiresAt: Date?
        let planName: String?
        var expired: Bool { (expiresAt ?? .distantFuture) < Date() }
    }

    struct CredError: Error, Sendable {
        let message: String
        /// Don't negative-cache this for 30 minutes — it's a blip, not a missing sign-in.
        var transient = false
        /// Blip that clears in seconds (a consent prompt still on screen), so skip the poll floor.
        var retrySoon = false
        /// The sign-in itself is dead; only Claude Code can fix it.
        var unauthorized = false
    }

    // Claude Code's own public OAuth client and token endpoint, read out of its bundle.
    // Refreshing with them is the same call the CLI makes with the same stored grant —
    // this is not a sign-in flow of our own.
    static let signInHint = "Sign in to Claude Code (Pro or Max): run claude, then /login"

    private static let clientID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
    private static let tokenURL = URL(string: "https://platform.claude.com/v1/oauth/token")!

    private static let http: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15
        return URLSession(configuration: config)
    }()

    // Reads the Claude Code OAuth token. Runs off the main actor (blocking subprocess).
    // Deliberately shells out to /usr/bin/security, even with a Developer ID: Claude Code itself
    // writes this item through the `security` CLI, so that binary is already on the item's ACL
    // and the read is silent. SecItemCopyMatching from our team ID would ask for the login
    // password — and again after every Claude Code re-login, which recreates the item.
    static func read() -> Result<Creds, CredError> {
        let primary: Result<Creds, CredError>
        switch keychainRead() {
        case .success(let data): primary = parse(data)
        case .failure(let error): primary = .failure(error)
        }
        if case .success = primary { return primary }
        // Claude Code writes both stores together. On 2026-09-01 the keychain copy landed
        // truncated mid-string while the file copy was intact, so a blob that won't parse is
        // as good a reason to fall back as a keychain that won't answer.
        if let data = fileRead(), case .success(let creds) = parse(data) { return .success(creds) }
        return primary
    }

    private static func keychainRead() -> Result<Data, CredError> {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/security")
        process.arguments = ["find-generic-password", "-s", "Claude Code-credentials", "-w"]
        let stdout = Pipe()
        process.standardOutput = stdout
        process.standardError = Pipe()
        do { try process.run() } catch {
            return .failure(CredError(message: "keychain busy", transient: true, retrySoon: true))
        }

        // The keychain consent prompt can block forever; kill after a minute. Not sooner:
        // someone typing their login password to answer it must not have it yanked away.
        let started = Date()
        let killer = DispatchWorkItem { process.terminate() }
        DispatchQueue.global().asyncAfter(deadline: .now() + 60, execute: killer)
        let data = stdout.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        killer.cancel()

        guard process.terminationStatus == 0, !data.isEmpty else {
            // A kill-timer death (e.g. consent prompt still on screen) is transient —
            // don't let it get negative-cached as "no credentials" for 30 minutes.
            if Date().timeIntervalSince(started) >= 59.5 {
                return .failure(CredError(message: "keychain busy", transient: true, retrySoon: true))
            }
            return .failure(CredError(message: signInHint))
        }
        return .success(data)
    }

    private static func fileRead() -> Data? {
        let url = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/.credentials.json")
        return try? Data(contentsOf: url)
    }

    private static func parse(_ data: Data) -> Result<Creds, CredError> {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            // Claude Code rewrites this blob whenever an MCP server re-authorizes, and it has
            // been observed truncated mid-write. Transient so the last good token keeps serving.
            return .failure(CredError(message: "credentials unreadable — sign in to Claude Code again",
                                      transient: true))
        }
        guard let oauth = json["claudeAiOauth"] as? [String: Any],
              let token = oauth["accessToken"] as? String, !token.isEmpty
        else {
            if json["mcpOAuth"] != nil {
                return .failure(CredError(message: "Only MCP credentials found — sign in to Claude Code again"))
            }
            return .failure(CredError(message: signInHint))
        }
        let expiresAt = (oauth["expiresAt"] as? Double).map { Date(timeIntervalSince1970: $0 / 1000) }
        return .success(Creds(
            accessToken: token,
            refreshToken: oauth["refreshToken"] as? String,
            scopes: oauth["scopes"] as? [String] ?? [],
            expiresAt: expiresAt,
            planName: planName(
                tier: oauth["rateLimitTier"] as? String,
                type: oauth["subscriptionType"] as? String
            )
        ))
    }

    /// Trade the stored refresh token for a fresh access token — the same `grant_type=refresh_token`
    /// call Claude Code makes. Deliberately read-only: the result is held in memory by the caller and
    /// never written back to the keychain. Claude Code owns that item, and a second writer is exactly
    /// what truncated it on 2026-08-31.
    /// ponytail: assumes the endpoint does not rotate refresh tokens — concurrent `claude` processes
    /// share one grant, so it can't. If that ever changes it costs one re-login, and we log it.
    static func refresh(_ creds: Creds) async -> Result<Creds, CredError> {
        guard let refreshToken = creds.refreshToken else {
            return .failure(CredError(message: "no refresh token", unauthorized: true))
        }
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("claude-cli/2.1.175 (external, cli)", forHTTPHeaderField: "User-Agent")
        var body: [String: Any] = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": clientID,
        ]
        if !creds.scopes.isEmpty { body["scope"] = creds.scopes.joined(separator: " ") }
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        let data: Data, response: URLResponse
        do {
            (data, response) = try await http.data(for: request)
        } catch {
            // Retry soon: the reconnect fetch shouldn't have to wait out the poll floor.
            return .failure(CredError(message: "offline", transient: true, retrySoon: true))
        }

        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let token = json["access_token"] as? String, !token.isEmpty
        else {
            // 400/401 mean the grant itself is gone (revoked, or past its ~90 day life).
            if code == 400 || code == 401 {
                return .failure(CredError(message: "refresh rejected", unauthorized: true))
            }
            return .failure(CredError(message: "refresh HTTP \(code)", transient: true))
        }

        let rotated = json["refresh_token"] as? String
        if let rotated, rotated != refreshToken {
            // Claude Code still holds the old grant in its keychain item, which we don't write.
            NSLog("ClaudeMeter: refresh token rotated — Claude Code may need to sign in again")
        }
        let lifetime = (json["expires_in"] as? NSNumber)?.doubleValue ?? 3600
        return .success(Creds(
            accessToken: token,
            refreshToken: rotated ?? refreshToken,
            scopes: (json["scope"] as? String).map { $0.split(separator: " ").map(String.init) } ?? creds.scopes,
            // A minute of slack so we renew before the usage call starts 401ing.
            expiresAt: Date().addingTimeInterval(max(60, lifetime - 60)),
            planName: creds.planName
        ))
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

extension Credentials {
    /// Test seam: --selftest cares which of the three outcomes a blob produces, not the strings.
    enum ParseOutcome { case ok, transient, noSignIn }

    static func parseForTests(_ data: Data) -> ParseOutcome {
        switch parse(data) {
        case .success: return .ok
        case .failure(let error): return error.transient ? .transient : .noSignIn
        }
    }
}
