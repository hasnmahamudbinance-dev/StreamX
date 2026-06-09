#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/next/dist/bin/next dev -p 3000
  echo "Server died, restarting in 3 seconds..."
  sleep 3
done
