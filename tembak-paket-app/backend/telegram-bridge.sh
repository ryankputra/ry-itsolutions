#!/bin/bash
# Hermes Telegram Task Bridge
# Polls owner-tasks.json from STB server every 30 seconds
# Executes pending tasks via Hermes Agent on laptop

QUEUE_LOCAL="/Users/ryankptr/tembak-paket-app/tembak-paket-app/backend/owner-tasks-local.json"
STB_HOST="root@192.168.0.203"
STB_QUEUE="/www/wwwroot/ry-itsolutions/tembak-paket-app/backend/owner-tasks.json"

while true; do
  # Pull queue from STB
  sshpass -p 'Ayusiawan1R' scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$STB_HOST:$STB_QUEUE" "$QUEUE_LOCAL" 2>/dev/null
  
  if [ -f "$QUEUE_LOCAL" ]; then
    # Check for pending tasks
    PENDING=$(python3 -c "
import json, sys
try:
    tasks = json.load(open('$QUEUE_LOCAL'))
    pending = [t for t in tasks if t.get('status') == 'pending']
    if pending:
        print(pending[0]['id'] + '|||' + pending[0]['command'] + '|||' + pending[0].get('sender','Owner'))
except:
    pass
" 2>/dev/null)
    
    if [ -n "$PENDING" ]; then
      TASK_ID=$(echo "$PENDING" | cut -d'|||' -f1)
      COMMAND=$(echo "$PENDING" | cut -d'|||' -f2)
      SENDER=$(echo "$PENDING" | cut -d'|||' -f3)
      
      echo "[$(date)] Processing task $TASK_ID from $SENDER: $COMMAND"
      
      # Mark as processing on STB
      sshpass -p 'Ayusiawan1R' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$STB_HOST" "
        python3 -c \"
import json
tasks = json.load(open('$STB_QUEUE'))
for t in tasks:
    if t['id'] == '$TASK_ID':
        t['status'] = 'processing'
json.dump(tasks, open('$STB_QUEUE','w'), indent=2)
\"" 2>/dev/null
      
      echo "Task queued for Hermes: $COMMAND"
      # Write command to a file Hermes can pick up
      echo "$COMMAND" > /Users/ryankptr/tembak-paket-app/tembak-paket-app/backend/hermes-pending-command.txt
    fi
  fi
  
  sleep 30
done
