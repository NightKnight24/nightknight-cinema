#!/bin/bash

# ==============================================================================
# 🎬  NightKnight Cinema Studio — 4K Apple Metal AI & Ambient Cinema Launcher  🎬
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CONFIG_FILE="$HOME/.nightknight_ambient.json"
SHADER_DIR="$DIR/shaders"
SOCKET_PATH="/tmp/nightknight_mpv.sock"

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${CYAN}${BOLD}========================================================================${NC}"
echo -e "${MAGENTA}${BOLD}     🎬  NightKnight Cinema Studio — 4K Metal AI & Ambient Sync  🌈     ${NC}"
echo -e "${CYAN}${BOLD}========================================================================${NC}"
echo ""

# 1. Run Setup Wizard if first time
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}[!] First-time setup detected. Launching Ambient Hardware Wizard...${NC}"
    echo ""
    python3 "$DIR/setup_wizard.py"
fi

# Clean up any lingering socket
rm -f "$SOCKET_PATH"

# 2. Start Background Ambient Engine
echo -e "${GREEN}[*] Initializing Ambient Lighting Engine...${NC}"
python3 "$DIR/ambient_engine.py" > /dev/null 2>&1 &
AMBIENT_PID=$!

# 3. Start Background Stremio Auto-Play & Watched Tracker Bridge
echo -e "${GREEN}[*] Initializing Stremio Next-Episode & Watched Tracker...${NC}"
python3 "$DIR/stremio_bridge.py" > /dev/null 2>&1 &
BRIDGE_PID=$!

cleanup() {
    echo ""
    echo -e "${YELLOW}[*] Shutting down NightKnight Cinema session...${NC}"
    kill $AMBIENT_PID 2>/dev/null
    kill $BRIDGE_PID 2>/dev/null
    rm -f "$SOCKET_PATH"
    echo -e "${GREEN}✓ All services cleanly stopped. Have a great day!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 4. Check for input stream or prompt
STREAM_URL="$1"

if [ -z "$STREAM_URL" ]; then
    echo ""
    echo -e "${BOLD}Select how to play:${NC}"
    echo -e "  ${GREEN}[1] Open Stremio & Stream Live${NC} (Use Stremio normally with 4K AI & Lights)"
    echo -e "  ${CYAN}[2] Run Ambient Light Setup Wizard${NC} (Change hardware, white tones, pins)"
    echo -e "  ${YELLOW}[3] Play a Specific Stream / File URL${NC}"
    echo ""
    read -p "Enter choice [1-3] (Default: 1): " USER_CHOICE
    USER_CHOICE=${USER_CHOICE:-1}

    if [ "$USER_CHOICE" == "2" ]; then
        python3 "$DIR/setup_wizard.py"
        cleanup
    elif [ "$USER_CHOICE" == "3" ]; then
        read -p "Paste stream URL or drag & drop video file: " STREAM_URL
    else
        echo ""
        echo -e "${GREEN}[*] Launching Stremio...${NC}"
        open -a "Stremio"
        echo -e "${CYAN}NightKnight Cinema is active in the background!${NC}"
        echo -e "Play any movie or episode in Stremio — 4K AI upscaling and ambient lights are active."
        echo ""
        echo -e "${YELLOW}Press Ctrl+C when you are finished watching to stop ambient sync.${NC}"
        while true; do sleep 2; done
    fi
fi

# 5. Launch IINA with Apple Metal Hardware Acceleration & Neural Shaders
echo -e "${GREEN}[*] Starting 4K Apple Metal AI Cinema Player...${NC}"

SHADER_ARGS=""
if [ -f "$SHADER_DIR/SSimSuperRes.glsl" ] && [ -f "$SHADER_DIR/adaptive-sharpen.glsl" ]; then
    SHADER_ARGS="--mpv-glsl-shaders=$SHADER_DIR/SSimSuperRes.glsl:$SHADER_DIR/adaptive-sharpen.glsl"
fi

EMBEDDED_PLAYER="$DIR/NightKnight's Cinema Experience.app/Contents/Helpers/IINA.app/Contents/MacOS/iina-cli"
if [ ! -f "$EMBEDDED_PLAYER" ]; then
    EMBEDDED_PLAYER="/Users/jordanallison/Desktop/NightKnight's Cinema Experience.app/Contents/Helpers/IINA.app/Contents/MacOS/iina-cli"
fi

"$EMBEDDED_PLAYER" \
    --mpv-hwdec=videotoolbox \
    --mpv-vo=libmpv \
    --mpv-input-ipc-server="$SOCKET_PATH" \
    $SHADER_ARGS \
    "$STREAM_URL"

cleanup
