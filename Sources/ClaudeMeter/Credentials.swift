import Foundation

enum Credentials {
    struct Creds: Sendable {
        let accessToken: String
        let refreshToken: String?
        let scopes: [String]
        let expiresAt: Date?
        let planName: String?
        /// The OAuth client that minted the grant; refreshing under any other one is a 400.
        var clientID: String? = nil
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
    private static let service = "Claude Code-credentials"
    private static let security = URL(fileURLWithPath: "/usr/bin/security")
    private static var fileURL: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".claude/.credentials.json")
    }

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
        process.executableURL = security
        process.arguments = ["find-generic-password", "-s", service, "-w"]
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
        try? Data(contentsOf: fileURL)
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
            ),
            clientID: oauth["clientId"] as? String
        ))
    }

    /// Trade the stored refresh token for a fresh access token — the same `grant_type=refresh_token`
    /// call Claude Code makes — then hand the result back to Claude Code's store (see `writeBack`).
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
            "client_id": creds.clientID ?? clientID,
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
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard code == 200, let json, let token = json["access_token"] as? String, !token.isEmpty else {
            // The OAuth error code (invalid_grant, invalid_client, ...) carries no secret.
            NSLog("ClaudeMeter: refresh HTTP %d %@", code, json?["error"] as? String ?? "")
            // 400/401 mean the grant itself is gone: spent by a rotation, revoked, or expired.
            if code == 400 || code == 401 {
                return .failure(CredError(message: "refresh rejected", unauthorized: true))
            }
            return .failure(CredError(message: "refresh HTTP \(code)", transient: true))
        }

        let now = Date()
        let lifetime = (json["expires_in"] as? NSNumber)?.doubleValue ?? 3600
        let fresh = Creds(
            accessToken: token,
            refreshToken: json["refresh_token"] as? String ?? refreshToken,
            scopes: (json["scope"] as? String).map { $0.split(separator: " ").map(String.init) } ?? creds.scopes,
            // A minute of slack so we renew before the usage call starts 401ing.
            expiresAt: now.addingTimeInterval(max(60, lifetime - 60)),
            planName: creds.planName,
            clientID: creds.clientID
        )
        // Claude Code's own field names and units (ms since epoch).
        var update: [String: Any] = [
            "accessToken": token,
            "refreshToken": fresh.refreshToken ?? refreshToken,
            "expiresAt": ((now.timeIntervalSince1970 + lifetime) * 1000).rounded(),
            "scopes": fresh.scopes,
        ]
        if let life = (json["refresh_token_expires_in"] as? NSNumber)?.doubleValue {
            update["refreshTokenExpiresAt"] = ((now.timeIntervalSince1970 + life) * 1000).rounded()
        }
        writeBack(spent: refreshToken, update: update)
        return .success(fresh)
    }

    /// Refresh tokens are single-use: the call above killed the one it posted. Unless the new grant
    /// lands where Claude Code keeps it, the terminal `claude` is signed out and this app loses its
    /// only grant on the next restart — what broke 1.2. The rule is Claude Code's own compare-and-swap
    /// between its processes: only replace a blob that parses and still holds the grant we spent;
    /// anything else is a newer write, and it wins.
    private static func writeBack(spent: String, update: [String: Any]) {
        let newGrant = update["refreshToken"] as? String
        if case .success(let data) = keychainRead(), let merged = merge(data, spent: spent, update: update) {
            let written = keychainWrite(merged)
            let readBack = (try? keychainRead().get()).flatMap { try? parse($0).get() }?.refreshToken
            NSLog("ClaudeMeter: keychain write-back %@", written && readBack == newGrant ? "ok" : "FAILED")
        }
        // Claude Code falls back to this file when it can't use the keychain.
        if let data = fileRead(), let merged = merge(data, spent: spent, update: update) {
            do {
                try merged.write(to: fileURL, options: .atomic)
                try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
            } catch {
                NSLog("ClaudeMeter: file write-back FAILED")
            }
        }
    }

    /// The blob with `update` merged into `claudeAiOauth`, or nil when it doesn't parse or a newer
    /// grant already replaced the one we spent. Every other key survives untouched.
    static func merge(_ data: Data, spent: String, update: [String: Any]) -> Data? {
        guard var json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              var oauth = json["claudeAiOauth"] as? [String: Any],
              let stored = oauth["refreshToken"] as? String, stored.isEmpty || stored == spent
        else { return nil }
        oauth.merge(update) { _, new in new }
        json["claudeAiOauth"] = oauth
        return try? JSONSerialization.data(withJSONObject: json)
    }

    /// Exactly how Claude Code writes the item, so `security` stays its only accessor and the
    /// write never prompts.
    private static func keychainWrite(_ data: Data) -> Bool {
        let user = ProcessInfo.processInfo.environment["USER"] ?? NSUserName()
        let account = user.range(of: #"^[a-zA-Z0-9._-]+$"#, options: .regularExpression) != nil
            ? user : "claude-code-user"
        let hex = data.map { String(format: "%02x", $0) }.joined()
        let line = "add-generic-password -U -a \"\(account)\" -s \"\(service)\" -X \"\(hex)\"\n"
        // `security -i` silently truncates a long line (the ~2 KB blob of 2026-09-01). Past Claude
        // Code's own 4032-byte cutoff, pass it on argv the way Claude Code does.
        let interactive = line.utf8.count <= 4032
        let process = Process()
        process.executableURL = security
        process.arguments = interactive
            ? ["-i"] : ["add-generic-password", "-U", "-a", account, "-s", service, "-X", hex]
        let stdin = Pipe()
        if interactive { process.standardInput = stdin }
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        do { try process.run() } catch { return false }
        if interactive {
            stdin.fileHandleForWriting.write(Data(line.utf8))
            try? stdin.fileHandleForWriting.close()
        }
        let killer = DispatchWorkItem { process.terminate() }
        DispatchQueue.global().asyncAfter(deadline: .now() + 10, execute: killer)
        process.waitUntilExit()
        killer.cancel()
        return process.terminationStatus == 0
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
