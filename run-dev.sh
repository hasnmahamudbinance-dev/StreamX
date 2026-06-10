#!/bin/bash
# StreamX dev server daemon script
# Uses double-fork to fully detach from the controlling terminal
cd /home/z/my-project

if [ "$1" = "child" ]; then
  # Child process - start the actual server
  exec node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 --webpack
else
  # Parent - fork and exit
  setsid /home/z/my-project/run-dev.sh child </dev/null >> /home/z/my-project/dev.log 2>&1 &
  exit 0
fi
