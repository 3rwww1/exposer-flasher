#!/bin/bash
# set -x

dir=${0%/*}
if [ -d "$dir" ]; then
  cd "$dir"
fi

killall PTPCamera
gphoto2 --auto-detect
gphoto2 --summary
