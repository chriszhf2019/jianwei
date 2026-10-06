#!/bin/bash
# Jianwei Genway - detached server launcher (nohup). Survives this shell.
# Usage:
#   ./scripts/start-server.sh            # start (idempotent; self-heals stale instances)
#   ./scripts/start-server.sh stop       # stop
# Port overridable via env PORT (default 3000, matches server.ts).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
LOG="scripts/server.log"
PID_FILE="scripts/server.pid"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"

is_healthy() { curl -sf "$HEALTH_URL" > /dev/null 2>&1; }
listener_pid() { lsof -tnP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true; }
port_busy() { [ -n "$(listener_pid)" ]; }

start() {
  # 1) 已在监听且健康：把 pidfile 指向真实监听进程并返回
  if is_healthy; then
    local LP
    LP="$(listener_pid)"
    echo "$LP" > "$PID_FILE"
    echo "[OK] server already running and healthy at $HEALTH_URL (pid $LP)"
    return 0
  fi

  # 2) 端口被占用但不健康（僵尸/启动中）：先清理再启动
  if port_busy; then
    echo "[warn] port busy but not healthy; killing stale listener"
    kill "$(listener_pid)" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PID_FILE"

  # 3) 启动并等待健康，pidfile 写真实监听进程
  echo "[start] launching server, log: $LOG"
  nohup npx tsx server.ts >> "$LOG" 2>&1 &
  for i in $(seq 1 30); do
    if is_healthy; then
      echo "$(listener_pid)" > "$PID_FILE"
      echo "[OK] server healthy at $HEALTH_URL (pid $(cat "$PID_FILE"), log $LOG)"
      return 0
    fi
    sleep 1
  done

  echo "[FAIL] not healthy within 30s; see log: $LOG"
  return 1
}

stop() {
  local LP
  LP="$(listener_pid)"
  if [ -n "$LP" ]; then
    kill "$LP" 2>/dev/null || true
    echo "[stop] stopped listener pid $LP on port $PORT."
  else
    echo "[stop] nothing listening on port $PORT."
  fi
  rm -f "$PID_FILE"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  *) echo "Usage: $0 [start|stop]"; exit 1 ;;
esac
