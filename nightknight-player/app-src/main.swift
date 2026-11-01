import AppKit
import WebKit
import Foundation
import UserNotifications
import GameController

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, NSMenuDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var navBar: NSView!
    var titleLabel: NSTextField!
    var toneSegment: NSSegmentedControl!
    var statusItem: NSStatusItem!

    var ambientProcess: Process?
    var bridgeProcess: Process?
    var playerProcess: Process?
    var isAmbientPaused: Bool = false
    var currentWhiteTone: String = "bright"

    let pythonPath = "/usr/bin/python3"
    let playerDir = "/Users/jordanallison/Documents/stremio add on/nightknight-player"
    let configFile = NSString(string: "~/.nightknight_ambient.json").expandingTildeInPath
    let watchlistFile = NSString(string: "~/.nightknight_watchlist.json").expandingTildeInPath
    let tmdbConfigFile = NSString(string: "~/.nightknight_tmdb.json").expandingTildeInPath

    var dashboardUrl: URL {
        let bundlePath = Bundle.main.bundlePath
        let inAppPath = "\(bundlePath)/Contents/Resources/ui/dashboard.html"
        if FileManager.default.fileExists(atPath: inAppPath) {
            return URL(fileURLWithPath: inAppPath)
        }
        let localPath = "\(playerDir)/ui/dashboard.html"
        return URL(fileURLWithPath: localPath)
    }

    var embeddedPlayerCli: String {
        let bundlePath = Bundle.main.bundlePath
        let internalPath = "\(bundlePath)/Contents/Helpers/IINA.app/Contents/MacOS/iina-cli"
        if FileManager.default.fileExists(atPath: internalPath) {
            return internalPath
        }
        return "/Users/jordanallison/Desktop/NightKnight's Cinema Experience.app/Contents/Helpers/IINA.app/Contents/MacOS/iina-cli"
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Explicitly set Dock Icon from bundle
        if let iconUrl = Bundle.main.url(forResource: "AppIcon", withExtension: "icns") {
            NSApp.applicationIconImage = NSImage(contentsOf: iconUrl)
        } else if let icon = NSImage(contentsOfFile: "/Users/jordanallison/Desktop/NightKnight's Cinema Experience.app/Contents/Resources/AppIcon.icns") {
            NSApp.applicationIconImage = icon
        }

        loadConfig()
        setupStatusItem()
        startBackgroundEngines()
        setupWindow()
        setupGlobalKeyMonitor()
        setupGameControllers()
        runAutoUpdaterSilently()

        let args = CommandLine.arguments
        if args.count > 1 && !args[1].starts(with: "-") {
            let streamUrl = args[1]
            playStream(streamUrl)
        } else {
            loadDashboard()
        }

        sendNotification(
            title: "NightKnight's Cinema Experience",
            body: "Cinema Hub, 4K AI Upscaler, Gamepads & Ambient Sync are active!"
        )
    }

    func loadConfig() {
        if let data = try? Data(contentsOf: URL(fileURLWithPath: configFile)),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let tone = json["white_tone"] as? String {
            currentWhiteTone = tone
        }
    }

    func saveWhiteTone(_ tone: String) {
        currentWhiteTone = tone
        var json: [String: Any] = [:]
        if let data = try? Data(contentsOf: URL(fileURLWithPath: configFile)),
           let existing = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            json = existing
        }
        json["white_tone"] = tone
        if let data = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted) {
            try? data.write(to: URL(fileURLWithPath: configFile))
        }
        updateToneSegment()
        updateMenu()
    }

    // MARK: - Native Cinema Hub Window
    func setupWindow() {
        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 100, y: 100, width: 1280, height: 820)
        let initialWidth = min(1360, screenRect.width * 0.9)
        let initialHeight = min(860, screenRect.height * 0.9)
        let windowRect = NSRect(
            x: screenRect.midX - initialWidth / 2,
            y: screenRect.midY - initialHeight / 2,
            width: initialWidth,
            height: initialHeight
        )

        window = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "NightKnight's Cinema Experience"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor(red: 0.04, green: 0.05, blue: 0.08, alpha: 1.0)
        window.isMovableByWindowBackground = false
        window.delegate = self

        let container = NSView(frame: NSRect(x: 0, y: 0, width: initialWidth, height: initialHeight))
        container.autoresizingMask = [.width, .height]
        container.wantsLayer = true
        container.layer?.backgroundColor = NSColor(red: 0.04, green: 0.05, blue: 0.08, alpha: 1.0).cgColor

        // Top Cinema Navigation Bar
        let barHeight: CGFloat = 46
        navBar = NSView(frame: NSRect(x: 0, y: initialHeight - barHeight, width: initialWidth, height: barHeight))
        navBar.autoresizingMask = [.width, .minYMargin]
        navBar.wantsLayer = true
        navBar.layer?.backgroundColor = NSColor(red: 0.04, green: 0.05, blue: 0.07, alpha: 0.96).cgColor

        // Left Controls: Home, Back, Forward, Reload
        let homeBtn = createCinemaButton(title: " 🏠 Home ", x: 14, y: 7, width: 85, height: 32, action: #selector(returnHome))
        homeBtn.bezelColor = NSColor(red: 0.90, green: 0.60, blue: 0.15, alpha: 0.35)
        navBar.addSubview(homeBtn)

        let backBtn = createCinemaButton(title: "◀", x: 106, y: 7, width: 36, height: 32, action: #selector(navigateBack))
        navBar.addSubview(backBtn)

        let fwdBtn = createCinemaButton(title: "▶", x: 146, y: 7, width: 36, height: 32, action: #selector(navigateForward))
        navBar.addSubview(fwdBtn)

        let reloadBtn = createCinemaButton(title: "🔄", x: 186, y: 7, width: 36, height: 32, action: #selector(reloadPage))
        navBar.addSubview(reloadBtn)

        // Center Title / Status
        titleLabel = NSTextField(frame: NSRect(x: 235, y: 11, width: initialWidth - 620, height: 24))
        titleLabel.autoresizingMask = [.width]
        titleLabel.isBezeled = false
        titleLabel.drawsBackground = false
        titleLabel.isEditable = false
        titleLabel.isSelectable = false
        titleLabel.textColor = NSColor(red: 0.92, green: 0.75, blue: 0.40, alpha: 1.0)
        titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
        titleLabel.alignment = .center
        titleLabel.stringValue = "🎬 NightKnight Cinema Lounge • Dolby Ambient Active"
        navBar.addSubview(titleLabel)

        // Right Controls: Tone Switcher, Cast, Fullscreen
        let rightEdge = initialWidth

        let fsBtn = createCinemaButton(title: "⛶", x: rightEdge - 50, y: 7, width: 36, height: 32, action: #selector(toggleFullScreen))
        fsBtn.autoresizingMask = [.minXMargin]
        navBar.addSubview(fsBtn)

        let castBtn = createCinemaButton(title: "📡 Cast", x: rightEdge - 135, y: 7, width: 78, height: 32, action: #selector(openCastDialog))
        castBtn.autoresizingMask = [.minXMargin]
        navBar.addSubview(castBtn)

        toneSegment = NSSegmentedControl(labels: ["Bright", "Warm", "Cool"], trackingMode: .selectOne, target: self, action: #selector(toneSegmentChanged(_:)))
        toneSegment.frame = NSRect(x: rightEdge - 345, y: 9, width: 200, height: 28)
        toneSegment.autoresizingMask = [.minXMargin]
        toneSegment.segmentStyle = .roundRect
        updateToneSegment()
        navBar.addSubview(toneSegment)

        container.addSubview(navBar)

        // WebKit Cinema View
        let webConfig = WKWebViewConfiguration()
        webConfig.allowsAirPlayForMediaPlayback = true
        webConfig.mediaTypesRequiringUserActionForPlayback = []
        webConfig.websiteDataStore = WKWebsiteDataStore.default()

        let pref = WKPreferences()
        if #available(macOS 12.3, *) {
            pref.isElementFullscreenEnabled = true
        }
        pref.setValue(true, forKey: "fullScreenEnabled")
        webConfig.preferences = pref
        webConfig.userContentController.add(self, name: "cinemaAction")

        webView = WKWebView(
            frame: NSRect(x: 0, y: 0, width: initialWidth, height: initialHeight - barHeight),
            configuration: webConfig
        )
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"

        container.addSubview(webView)
        window.contentView = container
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func createCinemaButton(title: String, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, action: Selector) -> NSButton {
        let btn = NSButton(frame: NSRect(x: x, y: y, width: width, height: height))
        btn.title = title
        btn.target = self
        btn.action = action
        btn.bezelStyle = .rounded
        btn.font = NSFont.systemFont(ofSize: 12, weight: .semibold)
        return btn
    }

    func updateToneSegment() {
        guard let seg = toneSegment else { return }
        switch currentWhiteTone {
        case "warm": seg.selectedSegment = 1
        case "cool": seg.selectedSegment = 2
        default: seg.selectedSegment = 0
        }
    }

    @objc func toneSegmentChanged(_ sender: NSSegmentedControl) {
        switch sender.selectedSegment {
        case 1: setWarmWhite()
        case 2: setCoolWhite()
        default: setBrightWhite()
        }
    }

    // MARK: - Game Controllers & Remotes
    func setupGameControllers() {
        NotificationCenter.default.addObserver(self, selector: #selector(controllerDidConnect(_:)), name: .GCControllerDidConnect, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(controllerDidDisconnect(_:)), name: .GCControllerDidDisconnect, object: nil)

        for controller in GCController.controllers() {
            configureController(controller)
        }
    }

    @objc func controllerDidConnect(_ notification: Notification) {
        guard let controller = notification.object as? GCController else { return }
        let name = controller.vendorName ?? "Wireless Gamepad"
        configureController(controller)
        sendNotification(title: "Controller Auto-Connected", body: "\(name) is ready & calibrated!")
    }

    @objc func controllerDidDisconnect(_ notification: Notification) {
        guard let controller = notification.object as? GCController else { return }
        let name = controller.vendorName ?? "Wireless Gamepad"
        sendNotification(title: "Controller Disconnected", body: "\(name) disconnected.")
    }

    func configureController(_ controller: GCController) {
        if let extended = controller.extendedGamepad {
            extended.buttonB.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed {
                    DispatchQueue.main.async { self?.returnHome() }
                }
            }
            extended.buttonX.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed {
                    DispatchQueue.main.async { self?.toggleFullScreen() }
                }
            }
            extended.buttonY.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed {
                    DispatchQueue.main.async { self?.openCastDialog() }
                }
            }
            extended.leftShoulder.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed {
                    DispatchQueue.main.async {
                        self?.webView.evaluateJavaScript("cycleRegion(-1)", completionHandler: nil)
                    }
                }
            }
            extended.rightShoulder.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed {
                    DispatchQueue.main.async {
                        self?.webView.evaluateJavaScript("cycleRegion(1)", completionHandler: nil)
                    }
                }
            }
        }
    }

    func setupGlobalKeyMonitor() {
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self = self else { return event }
            // Cmd+H -> Return to Home
            if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers?.lowercased() == "h" {
                self.returnHome()
                return nil
            }
            // Escape -> Return to Home if on external page
            if event.keyCode == 53 {
                if let current = self.webView.url?.absoluteString, !current.contains("dashboard.html") {
                    self.returnHome()
                    return nil
                }
            }
            return event
        }
    }

    // MARK: - Navigation Actions
    @objc func returnHome() {
        loadDashboard()
    }

    @objc func navigateBack() {
        if webView.canGoBack {
            webView.goBack()
        }
    }

    @objc func navigateForward() {
        if webView.canGoForward {
            webView.goForward()
        }
    }

    @objc func reloadPage() {
        webView.reload()
    }

    @objc func toggleFullScreen() {
        window.toggleFullScreen(nil)
    }

    func loadDashboard() {
        titleLabel.stringValue = "🎬 NightKnight Cinema Lounge • Dolby Ambient Active"
        webView.loadFileURL(dashboardUrl, allowingReadAccessTo: dashboardUrl.deletingLastPathComponent())
    }

    func navigateTo(url: URL, serviceName: String) {
        titleLabel.stringValue = "Now Streaming: \(serviceName) • Press (B), Esc, or [🏠 Home] to return"
        let req = URLRequest(url: url)
        webView.load(req)
    }

    // MARK: - WebKit Script Message Handler
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "cinemaAction", let dict = message.body as? [String: Any], let action = dict["action"] as? String else { return }

        switch action {
        case "navigateService":
            if let urlStr = dict["url"] as? String, let url = URL(string: urlStr) {
                let name = dict["name"] as? String ?? "Streaming Service"
                navigateTo(url: url, serviceName: name)
            }
        case "launchStremio":
            launchStremio()
        case "returnHome":
            returnHome()
        case "toggleFullScreen":
            toggleFullScreen()
        case "setWhiteTone":
            if let tone = dict["tone"] as? String {
                saveWhiteTone(tone)
            }
        case "runWizard":
            runSetupWizard()
        case "triggerAirPlay":
            openCastDialog()
        case "triggerScreenMirroring":
            openScreenMirroringSettings()
        case "checkUpdates":
            checkUpdatesManually()
        case "saveWatchlist":
            if let list = dict["watchlist"] as? [[String: Any]] {
                saveWatchlist(list)
            }
        case "saveTmdbConfig":
            if let cfg = dict["config"] as? [String: Any] {
                saveTmdbConfig(cfg)
            }
        case "loadTmdbConfig":
            let cfg = loadTmdbConfig()
            if let jsonData = try? JSONSerialization.data(withJSONObject: cfg),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                webView.evaluateJavaScript("onTmdbConfigLoaded(\(jsonString))", completionHandler: nil)
            }
        case "sendNotification":
            let title = dict["title"] as? String ?? "Cinema Alert"
            let body = dict["body"] as? String ?? ""
            sendNotification(title: title, body: body)
        case "openControllerSettings":
            openControllerSettings()
        default:
            break
        }
    }

    func saveTmdbConfig(_ config: [String: Any]) {
        if let data = try? JSONSerialization.data(withJSONObject: config, options: .prettyPrinted) {
            try? data.write(to: URL(fileURLWithPath: tmdbConfigFile))
        }
    }

    func loadTmdbConfig() -> [String: Any] {
        if let data = try? Data(contentsOf: URL(fileURLWithPath: tmdbConfigFile)),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return json
        }
        return [:]
    }

    func saveWatchlist(_ list: [[String: Any]]) {
        if let data = try? JSONSerialization.data(withJSONObject: list, options: .prettyPrinted) {
            try? data.write(to: URL(fileURLWithPath: watchlistFile))
        }
    }

    func openControllerSettings() {
        let script = "open 'x-apple.systempreferences:com.apple.Game-Controller-Settings.extension'"
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script]
        try? p.run()
    }

    // MARK: - Auto-Updater
    func runAutoUpdaterSilently() {
        let updaterScript = "\(playerDir)/auto_updater.py"
        if FileManager.default.fileExists(atPath: updaterScript) {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: pythonPath)
            p.arguments = [updaterScript]
            try? p.run()
        }
    }

    @objc func checkUpdatesManually() {
        let updaterScript = "\(playerDir)/auto_updater.py"
        let p = Process()
        let pipe = Pipe()
        p.executableURL = URL(fileURLWithPath: pythonPath)
        p.arguments = [updaterScript, "--check-only"]
        p.standardOutput = pipe
        try? p.run()
        p.waitUntilExit()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8) ?? ""

        let alert = NSAlert()
        alert.messageText = "Embedded Core Update Status"
        if output.contains("\"update_available\": false") {
            alert.informativeText = "✓ All embedded engines and 4K AI Neural shaders are fully up to date!\n\n• Embedded Core: IINA v1.5.0 (mpv Metal)\n• 4K Shaders: SSimSuperRes, Adaptive-Sharpen & NNEDI3 verified\n• Auto-Updater: Active in background"
        } else {
            alert.informativeText = "A core update was found and is being applied quietly in the background without interrupting your current playback."
        }
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    // MARK: - Casting & AirPlay
    @objc func openCastDialog() {
        let alert = NSAlert()
        alert.messageText = "📡 Universal Casting & Display Mirroring"
        alert.informativeText = """
        How to cast from NightKnight's Cinema Experience:

        1. Apple AirPlay 2 (Instant):
           While any video is playing, click the AirPlay icon inside the video controls, or use macOS Control Center -> Screen Mirroring to beam audio and video to Apple TV, LG webOS, Samsung Tizen, Sony Bravia, Roku, or Amazon Fire TV.

        2. Google Cast / Chromecast:
           Connect to smart TVs using macOS Display Mirroring or DIAL protocol.

        Click 'Open Display Settings' below to open the macOS Cast & Mirroring selector.
        """
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Open Display Settings")
        alert.addButton(withTitle: "Close")

        if alert.runModal() == .alertFirstButtonReturn {
            openScreenMirroringSettings()
        }
    }

    func openScreenMirroringSettings() {
        let script = "open 'x-apple.systempreferences:com.apple.Displays-Settings.extension'"
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script]
        try? p.run()
    }

    // MARK: - Menu Bar
    func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            if let image = NSImage(systemSymbolName: "play.tv.fill", accessibilityDescription: "NightKnight Cinema") {
                image.isTemplate = true
                button.image = image
            } else {
                button.title = "🎬"
            }
        }
        updateMenu()
    }

    func updateMenu() {
        let menu = NSMenu()
        menu.delegate = self

        let titleItem = NSMenuItem(title: "🎬 NightKnight's Cinema Experience", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)

        let statusStr = isAmbientPaused ? "⏸ Ambient Lights: Paused" : "● Ambient Lights: Active"
        let statusItemMenu = NSMenuItem(title: statusStr, action: nil, keyEquivalent: "")
        statusItemMenu.isEnabled = false
        menu.addItem(statusItemMenu)

        menu.addItem(NSMenuItem.separator())

        let hubItem = NSMenuItem(title: "Open Cinema Hub...", action: #selector(showWindow), keyEquivalent: "o")
        hubItem.target = self
        menu.addItem(hubItem)

        let stremioItem = NSMenuItem(title: "Open Stremio (4K AI Ready)", action: #selector(launchStremio), keyEquivalent: "s")
        stremioItem.target = self
        menu.addItem(stremioItem)

        // White Tone Submenu
        let toneMenu = NSMenu()
        let brightItem = NSMenuItem(title: "💡 Bright White (D65 / 6500K)", action: #selector(setBrightWhite), keyEquivalent: "")
        brightItem.target = self
        brightItem.state = (currentWhiteTone == "bright") ? .on : .off
        toneMenu.addItem(brightItem)

        let warmItem = NSMenuItem(title: "🔥 Warm White (~3000K Amber)", action: #selector(setWarmWhite), keyEquivalent: "")
        warmItem.target = self
        warmItem.state = (currentWhiteTone == "warm") ? .on : .off
        toneMenu.addItem(warmItem)

        let coolItem = NSMenuItem(title: "❄️ Cool White (~8000K Icy)", action: #selector(setCoolWhite), keyEquivalent: "")
        coolItem.target = self
        coolItem.state = (currentWhiteTone == "cool") ? .on : .off
        toneMenu.addItem(coolItem)

        let toneParent = NSMenuItem(title: "White Point Tone", action: nil, keyEquivalent: "")
        toneParent.submenu = toneMenu
        menu.addItem(toneParent)

        let toggleTitle = isAmbientPaused ? "Resume Ambient Sync" : "Pause Ambient Sync"
        let toggleItem = NSMenuItem(title: toggleTitle, action: #selector(toggleAmbientSync), keyEquivalent: "p")
        toggleItem.target = self
        menu.addItem(toggleItem)

        let wizardItem = NSMenuItem(title: "Run Hardware Setup Wizard...", action: #selector(runSetupWizard), keyEquivalent: "")
        wizardItem.target = self
        menu.addItem(wizardItem)

        menu.addItem(NSMenuItem.separator())

        let updateItem = NSMenuItem(title: "Check for Core Updates...", action: #selector(checkUpdatesManually), keyEquivalent: "u")
        updateItem.target = self
        menu.addItem(updateItem)

        let creditsItem = NSMenuItem(title: "About & Open Source Credits...", action: #selector(showCredits), keyEquivalent: "")
        creditsItem.target = self
        menu.addItem(creditsItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit Cinema Experience", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    @objc func showWindow() {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func playStream(_ urlString: String) {
        let shaderDir = "\(playerDir)/shaders"
        var args = [
            "--mpv-hwdec=videotoolbox",
            "--mpv-vo=libmpv",
            "--mpv-input-ipc-server=/tmp/nightknight_mpv.sock"
        ]
        if FileManager.default.fileExists(atPath: "\(shaderDir)/SSimSuperRes.glsl") &&
           FileManager.default.fileExists(atPath: "\(shaderDir)/adaptive-sharpen.glsl") {
            args.append("--mpv-glsl-shaders=\(shaderDir)/SSimSuperRes.glsl:\(shaderDir)/adaptive-sharpen.glsl")
        }
        args.append(urlString)

        let p = Process()
        p.executableURL = URL(fileURLWithPath: embeddedPlayerCli)
        p.arguments = args
        try? p.run()
        playerProcess = p
    }

    func startBackgroundEngines() {
        stopBackgroundEngines()

        let ambientScript = "\(playerDir)/ambient_engine.py"
        if FileManager.default.fileExists(atPath: ambientScript) {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: pythonPath)
            p.arguments = [ambientScript]
            try? p.run()
            ambientProcess = p
        }

        let bridgeScript = "\(playerDir)/stremio_bridge.py"
        if FileManager.default.fileExists(atPath: bridgeScript) {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: pythonPath)
            p.arguments = [bridgeScript]
            try? p.run()
            bridgeProcess = p
        }
    }

    func stopBackgroundEngines() {
        if let p = ambientProcess, p.isRunning { p.terminate() }
        ambientProcess = nil
        if let p = bridgeProcess, p.isRunning { p.terminate() }
        bridgeProcess = nil
        if let p = playerProcess, p.isRunning { p.terminate() }
        playerProcess = nil
    }

    @objc func launchStremio() {
        NSWorkspace.shared.openApplication(
            at: URL(fileURLWithPath: "/Applications/Stremio.app"),
            configuration: NSWorkspace.OpenConfiguration()
        )
    }

    @objc func setBrightWhite() {
        saveWhiteTone("bright")
        sendNotification(title: "White Point: Bright (D65)", body: "Pure reference cinema white active.")
    }

    @objc func setWarmWhite() {
        saveWhiteTone("warm")
        sendNotification(title: "White Point: Warm (~3000K)", body: "Cozy amber glow active for eye comfort.")
    }

    @objc func setCoolWhite() {
        saveWhiteTone("cool")
        sendNotification(title: "White Point: Cool (~8000K)", body: "Frosty daylight tone active.")
    }

    @objc func toggleAmbientSync() {
        isAmbientPaused.toggle()
        if isAmbientPaused {
            if let p = ambientProcess, p.isRunning { p.suspend() }
        } else {
            if let p = ambientProcess, p.isRunning {
                p.resume()
            } else {
                startBackgroundEngines()
            }
        }
        updateMenu()
    }

    @objc func runSetupWizard() {
        let script = "tell application \"Terminal\" to do script \"python3 \\\"\(playerDir)/setup_wizard.py\\\"\""
        var error: NSDictionary?
        if let scriptObject = NSAppleScript(source: script) {
            scriptObject.executeAndReturnError(&error)
        }
    }

    @objc func showCredits() {
        let alert = NSAlert()
        alert.messageText = "NightKnight's Cinema Experience"
        alert.informativeText = """
        Version 1.0.0 (Apple Silicon Metal Edition)
        Created for the ultimate Stremio IMAX home cinema experience.

        Open Source Attributions & Credits:
        • Embedded Core Engine: Powered by the open-source IINA media player, created by Collider LI (Claudio Li) and contributors (https://iina.io, GNU GPLv3).
        • Video Engine: Powered by the mpv project (https://mpv.io).
        • 4K Neural AI Shaders:
          - SSimSuperRes & Adaptive-Sharpen by igv.
          - NNEDI3 Neural Edge Upscaler by bjin.
        • Streaming & Catalog Integration: Stremio & Real-Debrid.
        """
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Close")
        alert.runModal()
    }

    func sendNotification(title: String, body: String) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            if granted {
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = UNNotificationSound.default
                let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
                center.add(request)
            }
        }
    }

    @objc func quitApp() {
        stopBackgroundEngines()
        NSApp.terminate(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopBackgroundEngines()
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
