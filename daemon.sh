#!/bin/bash
cd /home/z/my-project

# Trap all signals and log them
trap 'echo "Received SIGHUP at $(date)" >> /home/z/my-project/signal.log' SIGHUP
trap 'echo "Received SIGINT at $(date)" >> /home/z/my-project/signal.log' SIGINT
trap 'echo "Received SIGTERM at $(date)" >> /home/z/my-project/signal.log' SIGTERM
trap 'echo "Received SIGUSR1 at $(date)" >> /home/z/my-project/signal.log' SIGUSR1
trap 'echo "Received SIGUSR2 at $(date)" >> /home/z/my-project/signal.log' SIGUSR2

echo "Daemon started at $(date)" >> /home/z/my-project/signal.log
exec npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
