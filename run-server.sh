#!/bin/bash
cd /home/z/my-project
# Close all file descriptors except stdin/stdout/stderr
# Redirect all output to log file
exec >> /home/z/my-project/dev.log 2>&1
# Start the server
exec node node_modules/next/dist/bin/next dev -p 3000
