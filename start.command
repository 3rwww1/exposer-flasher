#!/bin/bash
# set -x


dir=${0%/*}
if [ -d "$dir" ]; then
  cd "$dir"
fi


npm start
