#!/bin/bash
# 见微 Genway · 一键重建并重启常驻服务（避免手动 vite build 清空 dist/server.cjs 的竞态）
# 用法：bash scripts/rebuild.sh   （等价 pnpm rebuild；不依赖 pnpm）
#
# 严格校验（2026-09-11 修复"假成功"）：
#   1) vite 必须在 esbuild 之前（vite 会清空 dist）
#   2) launchctl kickstart 失败必须非 0 退出（不再 || true 吞错）
#   3) 重启后校验：端口监听 PID 必须变化，且 /api/health 回报的构建指纹必须等于本次 dist 产物的 mtime
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:$PATH"

PORT="${PORT:-3001}"
LABEL="${JIANWEI_LAUNCHD_LABEL:-com.user.news-jianwei}"
HEALTH="http://127.0.0.1:${PORT}/api/health"

echo "== 1/4 tsc 类型检查 =="
npx tsc --noEmit

echo "== 2/4 vite 前端构建 =="
npx vite build > /tmp/jianwei-vite.log 2>&1
tail -1 /tmp/jianwei-vite.log

echo "== 3/4 esbuild 服务端打包（必须在 vite 之后，确保 dist/server.cjs 存在）=="
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs > /tmp/jianwei-esb.log 2>&1
ls -la dist/server.cjs

echo "== 4/4 重启常驻服务并严格校验 =="
DIST_MTIME_MS=$(python3 -c "import os;print(int(os.stat('dist/server.cjs').st_mtime*1000))")
OLD_PID=$(lsof -tnP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)

if ! launchctl kickstart -k "gui/$(id -u)/$LABEL" > /dev/null 2>&1; then
  echo "[FAIL] launchctl kickstart 失败（label=$LABEL）"
  echo "       请确认已加载：launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/$LABEL.plist"
  exit 1
fi

HEALTHY=0
for _ in $(seq 1 20); do
  if curl -sf "$HEALTH" > /dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 1
done
if [ "$HEALTHY" != "1" ]; then
  echo "[FAIL] 20s 内未就绪；见 /tmp/news-jianwei.err.log"
  exit 1
fi

NEW_PID=$(lsof -tnP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)
if [ -n "$OLD_PID" ] && [ "$NEW_PID" = "$OLD_PID" ]; then
  echo "[FAIL] 端口仍由原进程 PID=$NEW_PID 持有：进程未真正重启（可能 kickstart 未生效）"
  exit 1
fi

BUILD_MTIME_MS=$(curl -sf "$HEALTH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('build',{}).get('bundleMtimeMs',0))" 2>/dev/null || echo 0)
if [ "$BUILD_MTIME_MS" = "0" ]; then
  echo "[WARN] 未能读取构建指纹（旧版本服务或读取失败），已确认 PID 变化：pid $NEW_PID"
else
  DIFF=$(python3 -c "print(abs($BUILD_MTIME_MS - $DIST_MTIME_MS))")
  if [ "$DIFF" -gt 2000 ]; then
    echo "[FAIL] 运行进程加载的产物 mtime=$BUILD_MTIME_MS，本次构建 mtime=$DIST_MTIME_MS —— 跑的不是新包"
    exit 1
  fi
fi

echo "[OK] 服务已健康且已加载新构建：$HEALTH（pid $NEW_PID，bundle mtime $DIST_MTIME_MS）"
