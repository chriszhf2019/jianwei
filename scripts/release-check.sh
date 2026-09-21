#!/bin/bash
# 见微 Genway · 发布前检查（③ 回归/发布流程）
# 1) tsc 类型检查 2) 客户端构建 3) 服务端打包
# 4) 启动“纯净实例”（PORT=3215、JIANWEI_AUTH_TOKEN="" JIANWEI_NO_SETTINGS=1 → 无 Key/不写磁盘）跑 smoke 与 functional
set -euo pipefail
cd "$(dirname "$0")/.."
PORT_TEST=3215
export PATH="/usr/local/bin:$PATH"

echo "== 1/5 tsc =="
npx tsc --noEmit

echo "== 2/5 vite build =="
npx vite build > /tmp/release-vite.log 2>&1 && tail -1 /tmp/release-vite.log

echo "== 3/5 esbuild server =="
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs > /tmp/release-esb.log 2>&1

echo "== 4/5 启动纯净测试实例(:$PORT_TEST, 无Key/不写盘) =="
python3 -m http.server 3211 --directory scripts/fixtures > /tmp/release-rss.log 2>&1 &
RSS_PID=$!
PORT=$PORT_TEST JIANWEI_AUTH_TOKEN="" JIANWEI_NO_SETTINGS=1 JIANWEI_ALLOW_PRIVATE_FEEDS=1 nohup npx tsx server.ts > /tmp/release-server.log 2>&1 &
SRV_PID=$!
trap 'kill $RSS_PID $SRV_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT_TEST/api/health" > /dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://127.0.0.1:$PORT_TEST/api/health" > /dev/null

echo "== 5/5 冒烟 + 功能级测试 =="
BASE_URL="http://127.0.0.1:$PORT_TEST" node scripts/smoke.mjs
RSS_URL="http://127.0.0.1:3211/rss.xml" BASE_URL="http://127.0.0.1:$PORT_TEST" node scripts/functional-test.mjs

echo "✅ release-check 全部通过"
