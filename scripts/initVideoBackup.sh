
# find first movie on Desktop
movie=$(find ~/Desktop -iname "*.mov" -type f | head -n 1)
echo $movie

# lanch it fullscreen
osascript <<EOF
  on appIsRunning(appName)
    tell application "System Events" to (name of processes) contains appName
  end appIsRunning

  if appIsRunning("QuickTime Player") then
    tell application "QuickTime Player"
      delay 1
      try
        close document 1
      end try
      delay 1
      quit
    end tell
  end if

  delay 1

  tell application "QuickTime Player"
    delay 1
    activate

    delay 1
    open POSIX file "$movie"
    play document 1
    set looping of document 1 to true
    set presenting of document 1 to true

  end tell
EOF
