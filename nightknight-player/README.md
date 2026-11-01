# 🎬 NightKnight Cinema Studio — 4K Apple Metal AI & Universal Ambient Cinema

Turn Stremio on macOS into an ultra-high-definition, immersive IMAX home theater with zero buffering, real-time Apple Metal AI 4K upscaling, smart binge-watching automation, and universal reactive ambient room lighting.

---

## 🌟 Core Features

1. **🚀 4K Apple Metal AI Super-Resolution**:
   - Hardware-accelerated decoding powered by Apple Silicon (`videotoolbox` / `libmpv`).
   - Real-time neural shaders (`SSimSuperRes` anti-ringing + `adaptive-sharpen` contrast adaptive sharpening + `nnedi3` edge interpolation).
   - Reconstructs crisp 4K detail from 1080p video with zero dropped frames and silent fans.

2. **🌈 Universal Ambient Lighting Engine**:
   - Converts **ANY regular RGB lights** (Bluetooth or USB) into reactive ambient cinema lighting.
   - **Solid Color Gliding**: Built-in temporal smoothing filter completely eliminates eye-straining flashing and strobing.
   - **3-Way White Tone Toggle**: Switch on the fly between **Warm White** (~3000K), **Bright Cinema White** (D65 / 6500K), and **Cool White** (~8000K) by pressing **`W`**.
   - **Broken Diode Diagnostic**: Tick `[✓]` which colors work and cross `[✗]` which are broken. If a channel (e.g. Blue) is dead, the Smart Fallback Engine automatically shifts colors so lights never black out.
   - **Wire Swap Auto-Fix**: Automatically detects and fixes reversed `GRB` vs `RGB` wiring in software.

3. **📺 Smart Binge-Watching Automation**:
   - **Auto-Play Next Episode**: Smoothly transitions into the next episode of a series without touching your keyboard or leaving full screen.
   - **Stremio Watch Sync**: Automatically marks episodes as "Watched" (with the purple checkmark) in Stremio once you pass 85% of the episode.
   - **Next Episode Skip Hotkey**: Press **`N`** anytime to jump straight to the next episode.

---

## ⚠️ Critical Hardware Pinout Notice for USB Lights

> **Important**: USB addressable LED strips require exact pin matching to your USB controller. Never feed 12V into a 5V USB strip or into your Mac!
>
> ### Standard 3-Pin WS2812B / SK6812 (Recommended):
> * **Pin 1 — `+5V` (VCC / Power)**: Connects ONLY to 5V power.
> * **Pin 2 — `DATA` (`DIN` / Signal In)**: Connects to controller TX/Data pin. (Direction arrows `▶` must point into the strip).
> * **Pin 3 — `GND` (Ground)**: Common ground.

---

## 🚀 Quick Start Guide

### 1. Launching NightKnight Cinema
Double-click the shortcut on your Desktop:
```text
NightKnight Cinema.command
```
Or run from terminal:
```bash
"/Users/jordanallison/Documents/stremio add on/nightknight-player/launch_cinema.sh"
```

### 2. Running the Ambient Setup Wizard
To re-run the hardware scanner, color test, or change your white tone:
```bash
python3 "/Users/jordanallison/Documents/stremio add on/nightknight-player/setup_wizard.py"
```

### 3. Keyboard Shortcuts During Playback
* **`Space`**: Pause / Resume video
* **`Left / Right Arrows`**: Jump backward / forward 5 seconds
* **`W`**: Toggle White Tone (**Warm ➔ Bright ➔ Cool**)
* **`N`**: Skip immediately to Next Episode
* **`Esc` or `Q`**: Close cinema player and return to Stremio
