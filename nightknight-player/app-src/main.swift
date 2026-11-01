import AppKit
import Foundation
import UserNotifications

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    var statusItem: NSStatusItem!
    var ambientProcess: Process?
    var bridgeProcess: Process?
    var isAmbientPaused: Bool = false
    var currentWhiteTone: String = "bright"

    let pythonPath = "/usr/bin/python3"
    let playerDir = "/Users/jordanallison/Documents/stremio add on/nightknight-player"
    let configFile = NSString(string: "~/.nightknight_ambient.json").expandingTildeInPath

    func applicationDidFinishLaunching(_ notification: Notification) {
        loadConfig()
        setupStatusItem()
        startBackgroundEngines()
        launchStremio()
        sendNotification(title: "NightKnight's Cinema Experience", body: "4K Metal AI upscaler & Ambient Lighting are active!")
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
        updateMenu()
    }

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

        // Header
        let titleItem = NSMenuItem(title: "🎬 NightKnight's Cinema Experience", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)

        let statusStr = isAmbientPaused ? "⏸ Ambient Lights: Paused" : "● Ambient Lights: Active"
        let statusItemMenu = NSMenuItem(title: statusStr, action: nil, keyEquivalent: "")
        statusItemMenu.isEnabled = false
        menu.addItem(statusItemMenu)

        menu.addItem(NSMenuItem.separator())

        // Launch Stremio
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

        // Pause/Resume Ambient
        let toggleTitle = isAmbientPaused ? "Resume Ambient Sync" : "Pause Ambient Sync"
        let toggleItem = NSMenuItem(title: toggleTitle, action: #selector(toggleAmbientSync), keyEquivalent: "p")
        toggleItem.target = self
        menu.addItem(toggleItem)

        // Setup Wizard
        let wizardItem = NSMenuItem(title: "Run Hardware Setup Wizard...", action: #selector(runSetupWizard), keyEquivalent: "")
        wizardItem.target = self
        menu.addItem(wizardItem)

        menu.addItem(NSMenuItem.separator())

        // Quit
        let quitItem = NSMenuItem(title: "Quit Cinema Experience", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    func startBackgroundEngines() {
        stopBackgroundEngines()

        // 1. Ambient Engine
        let ambientScript = "\(playerDir)/ambient_engine.py"
        if FileManager.default.fileExists(atPath: ambientScript) {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: pythonPath)
            p.arguments = [ambientScript]
            try? p.run()
            ambientProcess = p
        }

        // 2. Stremio Bridge
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
        if let p = ambientProcess, p.isRunning {
            p.terminate()
        }
        ambientProcess = nil

        if let p = bridgeProcess, p.isRunning {
            p.terminate()
        }
        bridgeProcess = nil
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
            if let p = ambientProcess, p.isRunning {
                p.suspend()
            }
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
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory) // Runs as a clean Menu Bar application!
let delegate = AppDelegate()
app.delegate = delegate
app.run()
