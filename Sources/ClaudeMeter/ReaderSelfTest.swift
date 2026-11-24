import Foundation
import Security

/// A keychain and a credentials file in memory, counting how often an item is opened: opening is
/// what makes macOS ask, so the counts are what these checks are about.
private final class FakeKeychain: @unchecked Sendable {
    struct Entry {
        var changed: Date
        var status: OSStatus = errSecSuccess
        var data: Data?
    }

    var items: [String: [Entry]] = [:]
    var listable = true
    var files: [URL: Data] = [:]
    var opens = 0
    /// Runs inside an open, as if a question were on screen.
    var duringOpen: (() -> Void)?
    var refusedSaved: [String] = []
    var clock = Date()

    var store: Credentials.Store {
        Credentials.Store(
            list: { service in
                guard self.listable else { return nil }
                return (self.items[service] ?? []).enumerated()
                    .map { Credentials.Item(ref: Data("\(service)#\($0.offset)".utf8), changed: $0.element.changed) }
                    .sorted { $0.changed > $1.changed }
            },
            open: { ref in
                self.opens += 1
                self.duringOpen?()
                let parts = String(decoding: ref, as: UTF8.self).split(separator: "#")
                guard parts.count == 2, let index = Int(parts[1]),
                      let entry = self.items[String(parts[0])]?[index]
                else { return (errSecItemNotFound, nil) }
                return (entry.status, entry.status == errSecSuccess ? entry.data : nil)
            },
            file: { self.files[$0] },
            now: { self.clock }
        )
    }

    func reader() -> Credentials.Reader {
        Credentials.Reader(store: store, refusedStore: (load: { self.refusedSaved }, save: { self.refusedSaved = $0 }))
    }
}

private func blob(_ token: String, expiresIn: TimeInterval = 3600) -> Data {
    let ms = (Date().timeIntervalSince1970 + expiresIn) * 1000
    return Data(#"{"claudeAiOauth":{"accessToken":"\#(token)","expiresAt":\#(ms)}}"#.utf8)
}

private func token(_ reading: Credentials.Reading) -> String? { try? reading.result.get().accessToken }
private func kind(_ reading: Credentials.Reading) -> Credentials.CredError.Kind? {
    if case .failure(let error) = reading.result { return error.kind }
    return nil
}

func runReaderSelfTest(_ check: (Bool, String) -> Void) {
    let service = "Claude Code-credentials-test"
    let login = Credentials.Login(service: service, directory: URL(fileURLWithPath: "/tmp/claude-meter-test"),
                                  accountUUID: nil, email: nil)
    let t0 = Date(timeIntervalSince1970: 1_000_000)
    let t1 = t0.addingTimeInterval(60)

    // A good sign-in is opened once and then served from memory while the item stays the same.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("one"))]
        let reader = kc.reader()
        check(token(reader.read(login)) == "one" && kc.opens == 1, "first read opens the item once")
        for _ in 0..<5 { _ = reader.read(login) }
        check(kc.opens == 1, "unchanged item is not opened again")
        check(reader.newestChange(service) == t0 && kc.opens == 1, "listing a change date opens nothing")
        kc.items[service] = [.init(changed: t1, data: blob("two"))]
        check(token(reader.read(login)) == "two" && kc.opens == 2, "Claude Code saved a new sign-in: read again")
        kc.listable = false
        check(token(reader.read(login)) == "two" && kc.opens == 2, "Keychain can't be searched: last token keeps serving")
    }

    // An expired token is reported, never renewed, and the item stays closed until Claude Code saves again.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("old", expiresIn: -600))]
        let reader = kc.reader()
        check(kind(reader.read(login)) == .expired && kc.opens == 1, "expired token reads as expired")
        for _ in 0..<5 { _ = reader.read(login) }
        check(kc.opens == 1, "expired item is not opened again")
        kc.items[service] = [.init(changed: t1, data: blob("new"))]
        check(token(reader.read(login)) == "new" && kc.opens == 2, "renewed by Claude Code: picked up")
    }

    // A token that expires while held is reported without opening the unchanged item again.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("soon", expiresIn: 30))]
        let reader = kc.reader()
        check(kind(reader.read(login)) == .expired && kc.opens == 1, "a token within a minute of its end is not sent")
    }

    // "No" to the question stands, across launches, and the file isn't used to get around it.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, status: errSecUserCanceled)]
        kc.files[login.fileURL] = blob("file")
        let reader = kc.reader()
        check(kind(reader.read(login)) == .denied && kc.opens == 1, "Deny reads as denied")
        for _ in 0..<5 { _ = reader.read(login, manual: true) }
        check(kc.opens == 1, "denied item is not opened again, even on a click")
        check(kc.refusedSaved == [service], "the refusal is kept (the item's name only)")
        let relaunched = kc.reader()
        check(kind(relaunched.read(login)) == .denied && kc.opens == 1, "still refused after a relaunch")
        kc.items[service] = [.init(changed: t0, data: blob("ok"))]
        relaunched.allowAgain(service)
        check(token(relaunched.read(login)) == "ok" && kc.opens == 2, "asked again only when the person says so")
        check(kc.refusedSaved.isEmpty, "allowing again forgets the refusal")
    }

    // A locked Keychain is tried again later, waiting longer each time; a click may try at once.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, status: errSecInteractionNotAllowed)]
        let reader = kc.reader()
        check(kind(reader.read(login)) == .busy && kc.opens == 1, "locked Keychain reads as busy")
        for _ in 0..<5 { _ = reader.read(login) }
        check(kc.opens == 1, "locked Keychain is not tried again straight away")
        _ = reader.read(login, manual: true)
        check(kc.opens == 2, "a click tries again")
    }

    // One question at a time: a read while another item is being opened doesn't open a second.
    do {
        let kc = FakeKeychain()
        let other = Credentials.Login(service: service + "-b", directory: URL(fileURLWithPath: "/tmp/claude-meter-test-b"),
                                      accountUUID: nil, email: nil)
        kc.items[service] = [.init(changed: t0, data: blob("a"))]
        kc.items[other.service] = [.init(changed: t0, data: blob("b"))]
        let reader = kc.reader()
        var nested: Credentials.Reading?
        kc.duringOpen = { if nested == nil { kc.duringOpen = nil; nested = reader.read(other) } }
        check(token(reader.read(login)) == "a", "the item being opened is read")
        check(nested.map(kind) == .busy && kc.opens == 1, "a second item isn't opened while a question may be up")
    }

    // Newest first, one good item is enough; an unreadable newest one doesn't hide an older good one.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t1, data: Data("{\"mcpOAuth\":{".utf8)), .init(changed: t0, data: blob("older"))]
        let reader = kc.reader()
        check(token(reader.read(login)) == "older" && kc.opens == 2, "falls through an unreadable newest item")
        let single = FakeKeychain()
        single.items[service] = [.init(changed: t0, data: Data("{\"mcpOAuth\":{".utf8))]
        let r2 = single.reader()
        check(kind(r2.read(login)) == .unreadable, "truncated item reads as unreadable")
        _ = r2.read(login)
        check(single.opens == 1, "unreadable item is not opened again until it changes")
    }

    // A token Anthropic refused is not sent again, from the keychain or from the file.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("bad"))]
        let reader = kc.reader()
        let first = reader.read(login)
        reader.rejected(service, token: "bad", seen: first.seen)
        check(kind(reader.read(login)) == .signedOut && kc.opens == 1, "refused token: signed out, item left closed")
        // Claude Code saves the item again (an MCP sign-in, say) with the same refused token in it.
        kc.items[service] = [.init(changed: t0.addingTimeInterval(30), data: blob("bad"))]
        check(kind(reader.read(login)) == .signedOut, "a refused token saved again is still not sent")
        kc.items[service] = [.init(changed: t1, data: blob("good"))]
        check(token(reader.read(login)) == "good", "a new sign-in from Claude Code is used")

        let fileOnly = FakeKeychain()
        fileOnly.files[login.fileURL] = blob("filetoken")
        let r2 = fileOnly.reader()
        let fromFile = r2.read(login)
        check(token(fromFile) == "filetoken" && fromFile.seen == nil && fileOnly.opens == 0,
              "no keychain item: the credentials file is read, nothing opened")
        r2.rejected(service, token: "filetoken", seen: fromFile.seen)
        check(kind(r2.read(login)) == .signedOut, "a refused token from the file isn't sent again: signed out, not missing")
        check(kind(fileOnly.reader().read(Credentials.Login(service: "none", directory: URL(fileURLWithPath: "/nowhere"),
                                                              accountUUID: nil, email: nil))) == .missing,
              "nothing anywhere: no sign-in")
    }
    // Cancel on a password sheet counts as a "no" too.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, status: errSecAuthFailed)]
        let reader = kc.reader()
        check(kind(reader.read(login)) == .denied, "errSecAuthFailed reads as denied")
        _ = reader.read(login)
        check(kc.opens == 1, "and is not asked again")
    }

    // The wait after a locked Keychain doubles, up to an hour.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, status: errSecInteractionNotAllowed)]
        let reader = kc.reader()
        _ = reader.read(login)                                       // wait 1 min
        kc.clock = kc.clock.addingTimeInterval(59); _ = reader.read(login)
        check(kc.opens == 1, "not tried again within the first minute")
        kc.clock = kc.clock.addingTimeInterval(2); _ = reader.read(login)  // wait 2 min
        check(kc.opens == 2, "tried again after a minute")
        kc.clock = kc.clock.addingTimeInterval(110); _ = reader.read(login)
        check(kc.opens == 2, "then waits two minutes")
        kc.clock = kc.clock.addingTimeInterval(15); _ = reader.read(login)
        check(kc.opens == 3, "and tries again after them")
        for _ in 0..<12 { kc.clock = kc.clock.addingTimeInterval(4000); _ = reader.read(login) }
        let before = kc.opens
        kc.clock = kc.clock.addingTimeInterval(3500); _ = reader.read(login)
        check(kc.opens == before, "the wait stops growing at an hour")
        kc.clock = kc.clock.addingTimeInterval(200); _ = reader.read(login)
        check(kc.opens == before + 1, "an hour, not more")
    }

    // A token that runs out while held: reported, and the unchanged item is not opened for it.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("held", expiresIn: 600))]
        let reader = kc.reader()
        check(token(reader.read(login)) == "held", "read while in date")
        kc.clock = kc.clock.addingTimeInterval(600)
        check(kind(reader.read(login)) == .expired && kc.opens == 1, "expired while held: no new open")
    }

    // An expired newest item doesn't lead to opening older ones (each could be another question).
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t1, data: blob("new-expired", expiresIn: -600)), .init(changed: t0, data: blob("older"))]
        let reader = kc.reader()
        check(kind(reader.read(login)) == .expired && kc.opens == 1, "stops at an expired newest item")
    }

    // An expired keychain item falls back to a good credentials file.
    do {
        let kc = FakeKeychain()
        kc.items[service] = [.init(changed: t0, data: blob("kc", expiresIn: -600))]
        kc.files[login.fileURL] = blob("file")
        check(token(kc.reader().read(login)) == "file", "expired keychain item: the file's token is used")
    }

    // Nothing to search and nothing held: busy, not "no sign-in".
    do {
        let kc = FakeKeychain()
        kc.listable = false
        check(kind(kc.reader().read(login)) == .busy && kc.opens == 0, "Keychain can't be searched: busy")
    }

    // Which fix the menu offers. Arguments: issue, refused, refusedUnknown, missingAppAccount,
    // unauthorized, daysLeft.
    let act = UsageModel.credentialAction
    check(act(.denied, true, false, false, true, 2) == .allowKeychain, "a no to the Keychain comes before signing in again")
    check(act(nil, true, true, true, false, nil) == .allowKeychain,
          "a refused sign-in of unknown account can be why the app's account looks missing: allow, don't add a duplicate")
    check(act(nil, true, false, true, false, nil) == .signInAppAccount,
          "a refused sign-in whose account is known can't be why: adding the app's account stays reachable")
    check(act(nil, false, false, true, false, nil) == .signInAppAccount, "missing app account: add it")
    check(act(.signedOut, false, false, false, true, nil) == .signInAgain, "signed out: sign in again")
    check(act(nil, false, false, false, false, 2) == .signInEnding(days: 2), "ending soon: say so")
    check(act(.missing, false, false, false, false, nil) == .getClaudeCode, "no sign-in at all: get Claude Code")
    check(act(.expired, false, false, false, false, nil) == nil, "expired: nothing to click, Claude Code renews it")
    check(act(nil, true, false, false, false, nil) == .allowKeychain, "another sign-in refused: still offered")
}
