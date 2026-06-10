#!/bin/bash
# Double fork to fully detach from controlling terminal
cd /home/z/my-project

if [ "$1" = "child" ]; then
  # This is the child - start the actual server
  exec node .next/standalone/server.js
else
  # This is the parent - fork and exit
  setsid /home/z/my-project/run-server.sh child </dev/null >> /home/z/my-project/dev.log 2>&1 &
  exit 0
fi
