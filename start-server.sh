#!/bin/bash
cd "$(dirname "$0")"
PORT=3000

if lsof -i :"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is already in use."
  echo "Open: http://127.0.0.1:$PORT/"
  exit 0
fi

echo "Starting Weaving Type at http://127.0.0.1:$PORT/"
echo "Use http:// (not https://). Keep this terminal open while you work."
python3 -m http.server "$PORT" --bind 127.0.0.1
