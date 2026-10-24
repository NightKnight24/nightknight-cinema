#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if lsof -i :7000 | grep -q "node"; then
    echo "NightKnight Cinema Addon is already running on http://127.0.0.1:7000"
    exit 0
fi

NODE_BIN="$(which node 2>/dev/null || echo "node")"
nohup "$NODE_BIN" "$DIR/server.js" > "$DIR/addon.log" 2>&1 &
echo "Started NightKnight Cinema Addon (PID: $!) on http://127.0.0.1:7000"
