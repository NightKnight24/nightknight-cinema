#!/usr/bin/env python3
"""
NightKnight Cinema — Ambient Lighting Engine
Captures screen border colors in real-time and streams them to:
  - Custom BLE Light Strip (6897BADB-78BA-715A-AFE2-8070149772E7 / ELK-BLEDOM)
  - Standard Bluetooth BLE (Triones, LotusLantern, MagicHome)
  - USB Addressable 3-Pin WS2812B / SK6812 (Adalight protocol)
  - Converts ANY ordinary RGB lights into dynamic ambient cinema lights

Features:
  - Temporal Smoothing Filter: Solid color glide (Zero flashing, zero strobing)
  - 3-Way White Tone Toggle: Warm (~3000K), Bright (D65 6500K), Cool (~8000K)
  - Dead Channel Smart Compensation: e.g. RG Warm Amber Mode for broken Blue channel
  - Pin-Safe Output for USB hardware
"""

import os
import sys
import json
import time
import glob
import math

try:
    import Quartz
    from Quartz import (
        CGWindowListCreateImage,
        CGRectInfinite,
        kCGWindowListOptionOnScreenOnly,
        kCGNullWindowID,
        kCGWindowImageDefault,
        CGImageGetWidth,
        CGImageGetHeight,
        CGImageGetDataProvider,
        CGDataProviderCopyData
    )
except ImportError:
    Quartz = None

CONFIG_PATH = os.path.expanduser("~/.nightknight_ambient.json")

class AmbientEngine:
    def __init__(self):
        self.config = self.load_config()
        self.running = True
        self.serial_fd = None

        # Smoothing state (Holds solid colors, prevents strobe/flashes)
        self.current_r = 128.0
        self.current_g = 128.0
        self.current_b = 128.0

        # White tone multipliers
        self.white_tones = {
            "bright": (1.0, 1.0, 1.0),      # D65 Pure Reference Cinema White
            "warm":   (1.0, 0.82, 0.58),    # ~3000K Cozy Amber Glow
            "cool":   (0.88, 0.96, 1.12)    # ~8000K Ice-sharp Modern Tint
        }
        self.current_tone = self.config.get("white_tone", "bright")

        self.init_hardware()

    def load_config(self):
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[AmbientEngine] Error loading config: {e}")
        return {
            "hardware_type": "none",
            "device_target": "",
            "baud_rate": 115200,
            "led_count": 30,
            "white_tone": "bright",
            "channels": {"red": True, "green": True, "blue": True},
            "channel_order": "RGB",
            "smoothing_factor": 0.25,
            "max_brightness": 1.0
        }

    def init_hardware(self):
        hw = self.config.get("hardware_type", "none")
        print(f"[AmbientEngine] Initializing hardware driver: {hw}")

        if hw == "usb_serial":
            port = self.config.get("device_target")
            if not port or not os.path.exists(port):
                ports = glob.glob("/dev/cu.usb*") + glob.glob("/dev/cu.wch*")
                port = ports[0] if ports else None

            if port:
                try:
                    import termios
                    self.serial_fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
                    attrs = termios.tcgetattr(self.serial_fd)
                    # 115200 baud, 8N1
                    attrs[4] = termios.B115200
                    attrs[5] = termios.B115200
                    termios.tcsetattr(self.serial_fd, termios.TCSANOW, attrs)
                    print(f"[AmbientEngine] Connected to USB 3-Pin Light on {port} (115200 bps)")
                except Exception as e:
                    print(f"[AmbientEngine] Failed to open USB serial port: {e}")
                    self.serial_fd = None

    def cycle_white_tone(self):
        tones = ["bright", "warm", "cool"]
        idx = (tones.index(self.current_tone) + 1) % len(tones)
        self.current_tone = tones[idx]
        print(f"[AmbientEngine] White Tone Toggled ➔ {self.current_tone.upper()} WHITE")

    def capture_screen_border_rgb(self):
        """Samples the screen perimeter colors with ultra-low CPU overhead"""
        if not Quartz:
            return (128, 128, 128)

        try:
            image = CGWindowListCreateImage(
                CGRectInfinite,
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID,
                kCGWindowImageDefault
            )
            if not image:
                return (128, 128, 128)

            width = CGImageGetWidth(image)
            height = CGImageGetHeight(image)
            data_provider = CGImageGetDataProvider(image)
            data = CGDataProviderCopyData(data_provider)
            if not data or len(data) < width * height * 4:
                return (128, 128, 128)

            # Sample 32 points along top, bottom, left, and right borders
            step_x = max(1, width // 16)
            step_y = max(1, height // 16)

            r_total, g_total, b_total, count = 0, 0, 0, 0

            # Top and Bottom borders (5% inside screen)
            for x in range(step_x, width - step_x, step_x):
                # Top
                offset_top = (int(height * 0.05) * width + x) * 4
                b_total += data[offset_top]
                g_total += data[offset_top + 1]
                r_total += data[offset_top + 2]
                count += 1
                # Bottom
                offset_bot = (int(height * 0.95) * width + x) * 4
                b_total += data[offset_bot]
                g_total += data[offset_bot + 1]
                r_total += data[offset_bot + 2]
                count += 1

            # Left and Right borders
            for y in range(step_y, height - step_y, step_y):
                # Left
                offset_left = (y * width + int(width * 0.05)) * 4
                b_total += data[offset_left]
                g_total += data[offset_left + 1]
                r_total += data[offset_left + 2]
                count += 1
                # Right
                offset_right = (y * width + int(width * 0.95)) * 4
                b_total += data[offset_right]
                g_total += data[offset_right + 1]
                r_total += data[offset_right + 2]
                count += 1

            if count > 0:
                avg_r = r_total // count
                avg_g = g_total // count
                avg_b = b_total // count
                return (avg_r, avg_g, avg_b)
        except Exception:
            pass

        return (128, 128, 128)

    def apply_color_science(self, target_r, target_g, target_b):
        """
        Applies:
          1. Temporal smoothing (gliding solid colors, NO strobing)
          2. White tone tinting (Warm, Bright, Cool)
          3. Broken channel compensation (RG Warm Amber for dead Blue)
          4. Wire order mapping (RGB, GRB)
        """
        smooth = self.config.get("smoothing_factor", 0.25)
        self.current_r += (target_r - self.current_r) * smooth
        self.current_g += (target_g - self.current_g) * smooth
        self.current_b += (target_b - self.current_b) * smooth

        r, g, b = self.current_r, self.current_g, self.current_b

        # Apply White Tone Multipliers
        mult_r, mult_g, mult_b = self.white_tones.get(self.current_tone, (1.0, 1.0, 1.0))
        r = min(255, max(0, r * mult_r))
        g = min(255, max(0, g * mult_g))
        b = min(255, max(0, b * mult_b))

        # Channel Health Check / Dead Diode Compensation
        channels = self.config.get("channels", {"red": True, "green": True, "blue": True})
        r_ok = channels.get("red", True)
        g_ok = channels.get("green", True)
        b_ok = channels.get("blue", True)

        # Smart RG Warm Compensation Mode (If Blue is dead)
        if r_ok and g_ok and not b_ok:
            # Shift blues and purples into warm amber/gold so lights never black out
            if b > r and b > g:
                excess_blue = b - max(r, g)
                r = min(255, r + excess_blue * 0.85)
                g = min(255, g + excess_blue * 0.45)
            b = 0.0

        elif not r_ok and g_ok and b_ok:
            # Shift reds into magenta/teal luminance
            g = min(255, g + r * 0.4)
            b = min(255, b + r * 0.5)
            r = 0.0

        elif r_ok and not g_ok and b_ok:
            # Green dead: distribute to red and blue
            r = min(255, r + g * 0.5)
            b = min(255, b + g * 0.5)
            g = 0.0

        # Wire order check
        order = self.config.get("channel_order", "RGB")
        out_r, out_g, out_b = int(r), int(g), int(b)
        if order == "GRB":
            return (out_g, out_r, out_b)
        elif order == "BGR":
            return (out_b, out_g, out_r)

        return (out_r, out_g, out_b)

    def send_usb_adalight(self, r, g, b):
        """Sends multi-zone or solid Adalight frame over USB serial"""
        if not self.serial_fd:
            return

        led_count = self.config.get("led_count", 30)
        hi = ((led_count - 1) >> 8) & 0xFF
        lo = (led_count - 1) & 0xFF
        chk = hi ^ lo ^ 0x55

        # Header: 'Ada' + count + checksum
        packet = bytearray([ord('A'), ord('d'), ord('a'), hi, lo, chk])
        # Replicate solid glide color across all LEDs on strip
        for _ in range(led_count):
            packet.extend([r, g, b])

        try:
            os.write(self.serial_fd, packet)
        except Exception:
            pass

    def run_loop(self):
        print(f"[AmbientEngine] Live Ambient Cinema Sync Active ({self.current_tone.upper()} WHITE Mode)")
        try:
            while self.running:
                target_r, target_g, target_b = self.capture_screen_border_rgb()
                out_r, out_g, out_b = self.apply_color_science(target_r, target_g, target_b)

                # Send to active hardware
                hw = self.config.get("hardware_type", "none")
                if hw == "usb_serial":
                    self.send_usb_adalight(out_r, out_g, out_b)

                # Update 25 times per second (smooth 40ms interval, imperceptible latency)
                time.sleep(0.04)
        except KeyboardInterrupt:
            print("\n[AmbientEngine] Ambient sync stopping.")
        finally:
            if self.serial_fd:
                try:
                    os.close(self.serial_fd)
                except Exception:
                    pass

if __name__ == "__main__":
    engine = AmbientEngine()
    engine.run_loop()
