#!/bin/sh

osascript <<EOF
  tell application "Chromium"
    open location "http://localhost:3000/projection"

    delay 1

    set bounds of first window to {2500, 0, 3500, 1000}
    tell window 1 to enter presentation mode

  end tell

  --tell application "Google Chrome"
    --open location "http://localhost:3000/monitor"

    --delay 1

    --set bounds of first window to {0, 0, 1000, 1000}
    --tell window 1 to enter presentation mode

  --end tell
EOF
