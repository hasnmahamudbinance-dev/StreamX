#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..."
  node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 --webpack 2>&1
  EXIT=$?
  echo "[$(date)] Server exited ($EXIT), restarting in 2s..."
  sleep 2
done
