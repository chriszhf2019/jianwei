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
# 清理可能残留的同端口进程，避免冒烟打到脏语料实例
fuser -k "${PORT_TEST}/tcp" 2>/dev/null || true
fuser -k 3211/tcp 2>/dev/null || true
sleep 1
# RSS 夹具用「今天」时间戳生成，避免 FEED_MAX_AGE_DAYS=30 把固定旧日期条目判为过期
RSS_DIR=$(mktemp -d /tmp/jianwei-rss.XXXXXX)
TEST_DB=$(mktemp /tmp/jianwei-release-XXXXXX.db)
cp -R scripts/fixtures/. "$RSS_DIR/"
node -e '
const fs = require("fs");
const dir = process.argv[1];
const t0 = Date.now();
const items = [
  ["功能测试外部新闻A：某车企发布固态电池量产时间表", "https://news-a.example/story1", t0 - 2 * 3600e3, "该车企宣布中试线良率达标，量产提前两个季度。"],
  ["功能测试外部新闻B：央行会议纪要措辞微调", "https://news-b.example/story2", t0 - 1 * 3600e3, "纪要删去固定锚定描述，市场解读为宽松窗口临近。"],
  ["功能测试外部新闻A：某车企发布固态电池量产时间表", "https://news-c.example/story1-copy", t0 - 0.5 * 3600e3, "另一家媒体转引该车企的量产计划，并补充供应链排期信息。"],
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Jianwei Test Feed</title>
${items.map(([title, link, ts, desc]) => `<item><title>${title}</title><link>${link}</link><pubDate>${new Date(ts).toUTCString()}</pubDate><description><![CDATA[<p>${desc}</p>]]></description></item>`).join("\n")}
</channel></rss>
`;
fs.writeFileSync(dir + "/rss.xml", xml);
' "$RSS_DIR"
python3 -m http.server 3211 --directory "$RSS_DIR" > /tmp/release-rss.log 2>&1 &
RSS_PID=$!
PORT=$PORT_TEST BIND_HOST=127.0.0.1 JIANWEI_DB_FILE="$TEST_DB" JIANWEI_AUTH_TOKEN="" JIANWEI_NO_SETTINGS=1 JIANWEI_ALLOW_PRIVATE_FEEDS=1 nohup npx tsx server.ts > /tmp/release-server.log 2>&1 &
SRV_PID=$!
trap 'kill $RSS_PID $SRV_PID 2>/dev/null || true; rm -rf "$RSS_DIR" "$TEST_DB" 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT_TEST/api/health" > /dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://127.0.0.1:$PORT_TEST/api/health" > /dev/null

echo "== 5/5 冒烟 + 功能级测试 =="
BASE_URL="http://127.0.0.1:$PORT_TEST" node scripts/smoke.mjs
RSS_URL="http://127.0.0.1:3211/rss.xml" BASE_URL="http://127.0.0.1:$PORT_TEST" node scripts/functional-test.mjs

echo "✅ release-check 全部通过"
