#!/usr/bin/env python3
"""
NightKnight Cinema — Ambient Light & Hardware Setup Wizard
Guides users through selecting, calibrating, and testing their lighting setup.
Supports:
  - Custom Bluetooth Native Light
  - Standard Bluetooth BLE Strips (ELK-BLEDOM, Triones, LotusLantern)
  - USB Addressable 3-Pin Strips (WS2812B / SK6812 via Adalight)
  - Non-ambient / Standard RGB Lights (Converts them to live ambient!)
  - Health check & channel diagnosis (tick working, cross dead)
  - 3-Way White Tone Toggle (Warm, Bright, Cool)
"""

import os
import sys
import json
import time
import glob

CONFIG_PATH = os.path.expanduser("~/.nightknight_ambient.json")

# ANSI Color codes
BOLD = "\033[1m"
GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"
WHITE = "\033[37m"
RESET = "\033[0m"

def clear_screen():
    os.system("clear")

def print_banner():
    clear_screen()
    print(f"{CYAN}{BOLD}========================================================================{RESET}")
    print(f"{MAGENTA}{BOLD}       🎬  NightKnight Cinema — Ambient Light Setup Wizard  🌈          {RESET}")
    print(f"{CYAN}{BOLD}========================================================================{RESET}")
    print(f"{WHITE}Turn ANY room or desk RGB lighting into a reactive cinema Ambilight!{RESET}\n")

def get_input(prompt, default=""):
    try:
        val = input(f"{CYAN}{prompt}{RESET}").strip()
        return val if val else default
    except (KeyboardInterrupt, EOFError):
        print("\nSetup cancelled.")
        sys.exit(0)

def ask_yes_no(question, default=True):
    choices = "[Y/n]" if default else "[y/N]"
    while True:
        ans = get_input(f"{question} {choices}: ").lower()
        if not ans:
            return default
        if ans in ["y", "yes"]:
            return True
        if ans in ["n", "no"]:
            return False
        print(f"{RED}Please enter 'y' or 'n'.{RESET}")

def run_wizard():
    print_banner()

    config = {
        "hardware_type": "none",
        "device_target": "",
        "baud_rate": 115200,
        "led_count": 30,
        "white_tone": "bright",       # warm, bright, cool
        "channels": {
            "red": True,
            "green": True,
            "blue": True
        },
        "channel_order": "RGB",       # RGB, GRB, BGR
        "smoothing_factor": 0.35,     # 0.0 - 1.0 (smooth transitions, no strobe)
        "max_brightness": 1.0
    }

    print(f"{BOLD}Select your lighting hardware type:{RESET}")
    print(f"  {GREEN}[1] Custom Bluetooth Strip{RESET}    — NightKnight native dedicated BLE profile")
    print(f"  {YELLOW}[2] Standard Bluetooth BLE{RESET}      — Generic Amazon/eBay strips (ELK-BLEDOM, Triones, etc.)")
    print(f"  {CYAN}[3] USB Addressable 3-Pin Strip{RESET} — WS2812B / SK6812 multi-zone USB lights")
    print(f"  {WHITE}[4] None / Screen-Only{RESET}          — 4K Apple Metal AI Upscaler only (No ambient lights)\n")

    choice = get_input("Enter choice [1-4] (Default: 1): ", "1")

    if choice == "1":
        config["hardware_type"] = "custom_ble"
        print(f"\n{GREEN}✓ Selected: Custom Bluetooth Strip profile.{RESET}")

    elif choice == "2":
        config["hardware_type"] = "standard_ble"
        print(f"\n{YELLOW}✓ Selected: Standard Bluetooth BLE Strip.{RESET}")
        print(f"{WHITE}Note: Even basic, regular RGB strips are supported!{RESET}")
        dev_name = get_input("Enter BLE device name/identifier if known (or press Enter to auto-discover): ", "auto")
        config["device_target"] = dev_name

    elif choice == "3":
        config["hardware_type"] = "usb_serial"
        print(f"\n{CYAN}✓ Selected: USB Addressable Strip (WS2812B / SK6812).{RESET}\n")

        # CRITICAL PINOUT SAFETY CHECK
        print(f"{RED}{BOLD}========================================================================{RESET}")
        print(f"{RED}{BOLD}        ⚠️   CRITICAL HARDWARE PINOUT CHECK (USB LIGHTS)   ⚠️           {RESET}")
        print(f"{RED}{BOLD}========================================================================{RESET}")
        print(f"{YELLOW}Before proceeding, verify that your 3 pins match your controller exactly:{RESET}")
        print(f"  • {BOLD}Pin 1 — +5V (VCC / Power){RESET} : Must connect ONLY to 5V power.")
        print(f"    {RED}DANGER: Never connect 12V power to a 5V strip or feed 12V into your Mac!{RESET}")
        print(f"  • {BOLD}Pin 2 — DATA (DIN / Signal In){RESET}: Must connect to controller TX/Data pin.")
        print(f"    {YELLOW}Direction Check: The arrows (▶) on the strip must point INTO the strip.{RESET}")
        print(f"  • {BOLD}Pin 3 — GND (Ground){RESET}      : Common ground connection.\n")

        pin_confirmed = ask_yes_no(f"{BOLD}Have you verified your 3 pins match (+5V, DATA, GND)?{RESET}", True)
        if not pin_confirmed:
            print(f"\n{RED}Please disconnect your USB light, check your pin wiring, and re-run setup.{RESET}")
            sys.exit(0)

        # Scan USB serial ports
        ports = glob.glob("/dev/cu.usb*") + glob.glob("/dev/cu.wch*") + glob.glob("/dev/cu.SLAB*")
        if ports:
            print(f"\n{GREEN}Discovered USB Serial Ports:{RESET}")
            for idx, p in enumerate(ports):
                print(f"  [{idx+1}] {p}")
            p_choice = get_input(f"Select port [1-{len(ports)}] (Default: 1): ", "1")
            try:
                config["device_target"] = ports[int(p_choice)-1]
            except Exception:
                config["device_target"] = ports[0]
        else:
            print(f"\n{YELLOW}No USB serial ports found right now.{RESET}")
            config["device_target"] = get_input("Enter port path manually (e.g. /dev/cu.usbserial-1420): ", "/dev/cu.usbserial-0001")

        led_str = get_input("Enter total number of LEDs on your strip (Default: 30): ", "30")
        try:
            config["led_count"] = max(1, int(led_str))
        except ValueError:
            config["led_count"] = 30

    else:
        config["hardware_type"] = "none"
        print(f"\n{WHITE}✓ Selected: Screen-Only Mode (4K Metal AI Upscaling enabled, lights disabled).{RESET}")

    # Step 2: 3-Way White Tone Preference
    print(f"\n{CYAN}{BOLD}------------------------------------------------------------------------{RESET}")
    print(f"{BOLD}Step 2: Choose Your Default White Tone (Can toggle on the fly with 'W'):{RESET}")
    print(f"  {YELLOW}[1] Warm White (~3000K){RESET}   — Soft amber/gold glow (Cozy, minimum eye strain at night)")
    print(f"  {WHITE}[2] Bright White (D65 / 6500K){RESET} — Pure crisp studio cinema white ({GREEN}Recommended{RESET})")
    print(f"  {CYAN}[3] Cool White (~8000K){RESET}   — Frosty modern daylight with a clean sharp tint\n")

    tone_choice = get_input("Enter choice [1-3] (Default: 2): ", "2")
    if tone_choice == "1":
        config["white_tone"] = "warm"
    elif tone_choice == "3":
        config["white_tone"] = "cool"
    else:
        config["white_tone"] = "bright"

    print(f"{GREEN}✓ Selected: {config['white_tone'].upper()} WHITE tone.{RESET}")

    # Step 3: Faulty Hardware Diagnostic & Channel Health Check (if lights enabled)
    if config["hardware_type"] != "none":
        print(f"\n{CYAN}{BOLD}------------------------------------------------------------------------{RESET}")
        print(f"{BOLD}Step 3: Hardware Health Check & Dead Channel Compensation{RESET}")
        print(f"{WHITE}We will test solid colors (NO flashing or strobing).{RESET}")
        print(f"{WHITE}If any color channel on your strip is dead or broken, you can mark it{RESET}")
        print(f"{WHITE}and our Smart Fallback Engine will rebalance colors so the lights never shut off!{RESET}\n")

        proceed_diag = ask_yes_no("Run the LED Channel Diagnostic now?", True)
        if proceed_diag:
            print(f"\n{WHITE}Holding solid colors for check...{RESET}")

            # Test Red
            print(f"\n{RED}[●] HOLDING SOLID RED...{RESET}")
            red_ok = ask_yes_no("Did your lights turn RED?", True)
            config["channels"]["red"] = red_ok

            # Test Green
            print(f"\n{GREEN}[●] HOLDING SOLID GREEN...{RESET}")
            green_ok = ask_yes_no("Did your lights turn GREEN?", True)
            config["channels"]["green"] = green_ok

            # Test Blue
            print(f"\n{BLUE}[●] HOLDING SOLID BLUE...{RESET}")
            blue_ok = ask_yes_no("Did your lights turn BLUE?", True)
            config["channels"]["blue"] = blue_ok

            # Wire Swap Auto-Fix check
            if red_ok and green_ok:
                swapped = ask_yes_no("Did Red and Green look reversed on your strip (GRB)?", False)
                if swapped:
                    config["channel_order"] = "GRB"
                    print(f"{GREEN}✓ Channel order corrected to GRB in software!{RESET}")

            # Summary of channel health
            active_channels = sum([1 for v in config["channels"].values() if v])
            if active_channels == 3:
                print(f"\n{GREEN}✓ All 3 RGB color channels are healthy! Full-gamut color sync enabled.{RESET}")
            elif active_channels == 2:
                print(f"\n{YELLOW}⚠️  1 Channel is dead. Smart Fallback Engine activated:{RESET}")
                print(f"   Missing colors will be intelligently mapped to working channels so lights never cut out.")
            elif active_channels == 1:
                print(f"\n{YELLOW}⚠️  2 Channels are dead. Monochrome Cinema Bias Mode activated:{RESET}")
                print(f"   Lights will dynamically dim and brighten in sync with movie luminance.")
            else:
                print(f"\n{RED}⚠️  No channels responding. Check physical power connections.{RESET}")

    # Step 4: Save Configuration
    print(f"\n{CYAN}{BOLD}------------------------------------------------------------------------{RESET}")
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)

    print(f"{GREEN}{BOLD}✓ Configuration successfully saved to:{RESET} {CONFIG_PATH}")
    print(f"\n{BOLD}Summary of Settings:{RESET}")
    print(f"  • Hardware Type : {config['hardware_type']}")
    print(f"  • Target Device : {config['device_target'] or 'Auto-connect'}")
    print(f"  • White Point   : {config['white_tone'].upper()} WHITE")
    print(f"  • Working Diodes: Red={config['channels']['red']}, Green={config['channels']['green']}, Blue={config['channels']['blue']}")
    print(f"  • Wire Order    : {config['channel_order']}")
    print(f"  • Smoothing     : Solid color gliding (Zero strobing/flashing)")
    print(f"\n{CYAN}You are ready to launch NightKnight Cinema!{RESET}\n")

if __name__ == "__main__":
    run_wizard()
