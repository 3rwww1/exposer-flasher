#!/bin/sh

# killall -9 "Safari"
killall -9 "Google Chrome"
killall -9 "Chromium"

sleep 2

osascript <<EOF
  tell application "Chromium"
    open location "http://localhost:3000/projection"
    activate

    delay 2

    get bounds of first window
    set bounds of first window to {2500, 0, 3500, 1000}

    tell window 1 to enter presentation mode

  end tell
EOF

sleep 1

osascript <<EOF
  tell application "Google Chrome"
    open location "http://localhost:3000/monitor"
    activate

    delay 2

    get bounds of first window
    set bounds of first window to {0, 0, 1000, 1000}

    tell window 1 to enter presentation mode

  end tell
EOF
