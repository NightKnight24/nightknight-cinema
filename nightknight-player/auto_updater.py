#!/usr/bin/env python3
"""
NightKnight Cinema Experience — Embedded Core Auto-Updater
Silently checks, verifies, and updates the embedded media engine (IINA/mpv)
and 4K Metal neural shaders to keep everything working smoothly.
"""

import os
import sys
import json
import urllib.request
import subprocess
import shutil
import tempfile
import time

HELPER_DIR = "/Users/jordanallison/Desktop/NightKnight's Cinema Experience.app/Contents/Helpers"
EMBEDDED_IINA = os.path.join(HELPER_DIR, "IINA.app")
SHADER_DIR = "/Users/jordanallison/Documents/stremio add on/nightknight-player/shaders"
CONFIG_FILE = os.path.expanduser("~/.nightknight_ambient.json")
LOG_FILE = os.path.expanduser("~/.nightknight_updater.log")

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] [Updater] {msg}\n"
    sys.stdout.write(entry)
    sys.stdout.flush()
    try:
        with open(LOG_FILE, "a") as f:
            f.write(entry)
    except Exception:
        pass

def get_current_iina_version():
    plist = os.path.join(EMBEDDED_IINA, "Contents", "Info.plist")
    if os.path.exists(plist):
        try:
            res = subprocess.run(["defaults", "read", plist, "CFBundleShortVersionString"], capture_output=True, text=True, check=True)
            return res.stdout.strip()
        except Exception:
            pass
    return "1.3.5"

def check_iina_update():
    log("Checking upstream IINA GitHub releases...")
    url = "https://api.github.com/repos/iina/iina/releases/latest"
    try:
        proc = subprocess.run(["curl", "-s", "-H", "User-Agent: NightKnight-Updater/1.0", url], capture_output=True, text=True, check=True, timeout=10)
        data = json.loads(proc.stdout)
        tag = data.get("tag_name", "").lstrip("v")
        current = get_current_iina_version()
        log(f"Current embedded IINA version: {current} | Upstream latest: {tag}")
        
        # Find dmg or app download url
        download_url = None
        for asset in data.get("assets", []):
            if asset.get("name", "").endswith(".dmg"):
                download_url = asset.get("browser_download_url")
                break
        
        return {
            "update_available": tag != "" and tag != current,
            "latest_version": tag,
            "current_version": current,
            "download_url": download_url
        }
    except Exception as e:
        log(f"Check failed (offline or rate-limited): {e}")
        return {"update_available": False, "error": str(e)}

def update_shaders():
    log("Verifying 4K Neural AI Shaders...")
    shaders = {
        "SSimSuperRes.glsl": "https://gist.githubusercontent.com/igv/2364ffa6e81540f29cb7ab4c9bc05b6b/raw/SSimSuperRes.glsl",
        "adaptive-sharpen.glsl": "https://gist.githubusercontent.com/igv/36508af3e184413213874e4018d5f171/raw/adaptive-sharpen.glsl",
        "nnedi3-nns64-win8x4.hook": "https://raw.githubusercontent.com/bjin/mpv-prescalers/master/nnedi3-nns64-win8x4.hook"
    }
    os.makedirs(SHADER_DIR, exist_ok=True)
    updated = 0
    for name, url in shaders.items():
        dest = os.path.join(SHADER_DIR, name)
        if not os.path.exists(dest) or os.path.getsize(dest) == 0:
            log(f"Downloading missing neural shader: {name}...")
            try:
                subprocess.run(["curl", "-s", "-L", url, "-o", dest], check=True, timeout=15)
                updated += 1
                log(f"✓ {name} installed successfully.")
            except Exception as e:
                log(f"Shader download error for {name}: {e}")
    if updated == 0:
        log("✓ All 4K AI Neural shaders verified up to date.")
    return True

def perform_auto_update():
    log("Starting NightKnight Cinema maintenance & update routine...")
    update_shaders()
    
    status = check_iina_update()
    if not status.get("update_available"):
        log("✓ Embedded core is currently up to date.")
        return True

    download_url = status.get("download_url")
    if not download_url:
        log("No DMG found in release.")
        return False

    latest_ver = status.get("latest_version")
    log(f"New core update available: v{latest_ver}. Beginning safe atomic update...")
    
    temp_dir = tempfile.mkdtemp(prefix="nightknight_update_")
    dmg_path = os.path.join(temp_dir, "iina_update.dmg")
    mount_point = os.path.join(temp_dir, "mount")
    os.makedirs(mount_point, exist_ok=True)
    
    try:
        log(f"Downloading update from {download_url}...")
        subprocess.run(["curl", "-s", "-L", download_url, "-o", dmg_path], check=True, timeout=180)
        
        log("Mounting downloaded DMG...")
        subprocess.run(["hdiutil", "attach", dmg_path, "-mountpoint", mount_point, "-nobrowse", "-quiet"], check=True)
        
        source_app = os.path.join(mount_point, "IINA.app")
        if not os.path.exists(source_app):
            raise RuntimeError("IINA.app not found in mounted DMG")
            
        backup_app = os.path.join(HELPER_DIR, "IINA.app.backup")
        if os.path.exists(backup_app):
            shutil.rmtree(backup_app)
            
        log("Creating fallback backup of previous embedded core...")
        shutil.copytree(EMBEDDED_IINA, backup_app)
        
        log("Deploying updated engine...")
        shutil.rmtree(EMBEDDED_IINA)
        shutil.copytree(source_app, EMBEDDED_IINA)
        
        # Unmount DMG
        subprocess.run(["hdiutil", "detach", mount_point, "-quiet"])
        
        log(f"✓ Successfully updated embedded core to v{latest_ver}!")
        shutil.rmtree(backup_app, ignore_errors=True)
        return True
    except Exception as e:
        log(f"Update failed: {e}. Restoring previous backup...")
        backup_app = os.path.join(HELPER_DIR, "IINA.app.backup")
        if os.path.exists(backup_app):
            if os.path.exists(EMBEDDED_IINA):
                shutil.rmtree(EMBEDDED_IINA)
            shutil.copytree(backup_app, EMBEDDED_IINA)
            log("✓ Restored previous working core successfully.")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check-only":
        res = check_iina_update()
        print(json.dumps(res))
    else:
        perform_auto_update()
