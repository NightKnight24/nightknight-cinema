#!/bin/bash
PID=$(lsof -t -i :7000 -sTCP:LISTEN -a -c node 2>/dev/null)
if [ -n "$PID" ]; then
    kill -9 "$PID"
    echo "Stopped NightKnight Cinema Addon (PID: $PID)"
else
    echo "No running node process found on port 7000"
fi
