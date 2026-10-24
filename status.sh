#!/bin/bash
if curl -s http://127.0.0.1:7000/manifest.json > /dev/null; then
    echo "🟢 Status: Online"
    echo "🌐 URL: http://127.0.0.1:7000/manifest.json"
    PID=$(lsof -t -i :7000 -sTCP:LISTEN -a -c node 2>/dev/null)
    echo "🔢 Process ID: $PID"
else
    echo "🔴 Status: Offline"
fi
