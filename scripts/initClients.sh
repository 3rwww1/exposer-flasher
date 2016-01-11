#!/bin/sh

# killall -9 "Safari"
killall -9 "Google Chrome"

sleep 3

osascript <<EOF
  tell application "Google Chrome"
    open location "http://localhost:3000/projection"
    activate

    delay 2

    get bounds of first window
    set bounds of first window to {2500, 0, 3500, 1000}

    tell window 1 to enter presentation mode
  end tell
  EOF
