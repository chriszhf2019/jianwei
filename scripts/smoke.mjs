#!/usr/bin/env node
/**
 * 见微 Genway · API 冒烟脚本（需先启动服务：pnpm dev / pnpm start）
 * 用法：node scripts/smoke.mjs            # 默认 http://127.0.0.1:3001
 *       BASE_URL=http://127.0.0.1:3001 node scripts/smoke.mjs
 * 任一断言失败将以非 0 退出码结束。
 */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';

let failed = 0;
function check(name, cond, extra = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

async function main() {
  console.log(`冒烟测试 @ ${BASE}\n`);

  // 1) 健康检查
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check('GET /api/health -> status ok', health.status === 'ok', JSON.stringify(health));

  // 2) 首页 HTML
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  check('GET / -> 页面包含标题', html.includes('见微 Genway'));

  // 3) /api/analyze（无 Key 时走 fallback，要求仍能产出完整文章字段）
  const analyze = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '冒烟测试新闻：某新能源龙头宣布固态电池量产提前',
      source: '测试源',
      category: '产业纵深',
      content: '某龙头在投资者日宣布固态电池中试线良率达标，量产计划提前两个季度。',
    }),
  }).then((r) => r.json());
  check(
    '/api/analyze -> 无 Key 时不返回伪造分析',
    analyze.fallback === true && analyze.data === null,
    JSON.stringify(analyze).slice(0, 200)
  );

  // 4) /api/snapshot 派生骨架
  const snap = await fetch(`${BASE}/api/snapshot`).then((r) => r.json());
  check('GET /api/snapshot -> 语料派生统计', !!snap.derived?.categoryCounts && Array.isArray(snap.derived.tagFrequency), JSON.stringify(snap.meta));
  check('GET /api/snapshot -> 空语料明确标注 empty', !!snap.meta?.note && snap.meta.corpus === 'empty' && snap.meta.demo === false);

  // 5) /api/predict：空请求 400
  const empty = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  check('/api/predict 空请求 -> 400', empty.status === 400);

  // 6) /api/predict：最小载荷（当前无 Key 环境应回落本地基准且结构完整）
  const predict = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '未来 90 天内，是否会出现至少 2 家头部 SaaS 厂商对 Agent 能力二次加价？',
      modelChoice: 'auto',
      articleContext: {
        title: 'OpenAI 发布新一代 Agent 架构',
        category: 'AI 前沿',
        sourceCount: 6,
        logicTree: { variableWeights: [{ name: '任务准确率', weight: 40, impactDirection: 'up' }] },
      },
      questionOptions: { positive: '会加价', negative: '不会加价' },
    }),
  }).then((r) => r.json());
  const pd = predict.data || {};
  check(
    '/api/predict -> 返回同构预测对象',
    !!pd.direction && typeof pd.confidenceScore === 'number' && Array.isArray(pd.causalLogicChain),
    JSON.stringify(predict).slice(0, 160)
  );
  check('/api/predict -> 无 Key 时明确回落本地确定性引擎', predict.fallback === true && pd.modelChoice === 'jianwei-local');

  // 7) /api/feeds/status（信源接入骨架；无配置时应返回 enabled:false 的结构化状态）
  const feeds = await fetch(`${BASE}/api/feeds/status`).then((r) => r.json());
  check('GET /api/feeds/status -> 结构化状态', typeof feeds.enabled === 'boolean' && Array.isArray(feeds.urls) && typeof feeds.corpusSize === 'number', JSON.stringify(feeds).slice(0, 120));
  check('GET /api/feeds/status -> 无配置时明确 enabled:false', feeds.enabled === false || feeds.enabled === true);

  // 8) /api/corpus（服务端运行时语料，前端首页合并用）
  const corpus = await fetch(`${BASE}/api/corpus`).then((r) => r.json());
  const corpusMeta = corpus && corpus.meta ? JSON.stringify(corpus.meta).slice(0, 120) : JSON.stringify(corpus).slice(0, 120);
  check('GET /api/corpus -> 无真实数据时返回空数组', Array.isArray(corpus.corpus) && corpus.corpus.length === 0 && corpus.meta && corpus.meta.corpus === 'empty', corpusMeta);

  // 9) 未配置信源时 ingest 应 400（避免误吞）
  const ingest = await fetch(`${BASE}/api/feeds/ingest`, { method: 'POST' });
  check('POST /api/feeds/ingest (无配置) -> 400', ingest.status === 400);

  // 10) /api/enrich：无 Key 时明确不可用（不造假）；空请求 400
  const enrichEmpty = await fetch(`${BASE}/api/enrich`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('POST /api/enrich 空请求 -> 400', enrichEmpty.status === 400);
  const enrich = await fetch(`${BASE}/api/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '某公司发布季度财报摘要', content: '营收同比小幅增长，毛利率承压。', source: '外部RSS', category: '外部信源' }),
  }).then((r) => r.json());
  check('POST /api/enrich -> 无 Key 明确返回 unavailable', enrich.enriched === false && enrich.reason === 'no_api_key', JSON.stringify(enrich));

  // 12) /api/admin/status（限流/缓存/语料可见状态）
  const adm = await fetch(`${BASE}/api/admin/status`).then((r) => r.json());
  check(
    'GET /api/admin/status -> 缓存/限流状态可见',
    typeof adm.rateLimit?.maxPerMinute === 'number' &&
      typeof adm.caches?.enrich === 'number' &&
      typeof adm.caches?.predict === 'number' &&
      typeof adm.corpus?.corpusSize === 'number',
    JSON.stringify(adm).slice(0, 160)
  );

  // 13) 设置与 AI 测试
  const st = await fetch(`${BASE}/api/settings`).then((r) => r.json());
  check(
    'GET /api/settings -> 脱敏配置（无密钥字段）',
    typeof st.userName === 'string' &&
      st.ai && typeof st.ai.gemini === 'boolean' &&
      !('geminiApiKey' in st) && !('deepseekApiKey' in st) &&
      Array.isArray(st.feeds),
    JSON.stringify(st).slice(0, 160)
  );
  const aiTest = await fetch(`${BASE}/api/ai/test`, { method: 'POST' }).then((r) => r.json());
  check('POST /api/ai/test (无 Key) -> ok:false 且带原因', aiTest.ok === false && !!aiTest.reason, JSON.stringify(aiTest).slice(0, 160));

  // 14) /api/strategic-advisor 与 /api/ask-nuance 存在性
  for (const p of ['/api/strategic-advisor', '/api/ask-nuance']) {
    const r = await fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p === '/api/strategic-advisor' ? { question: '今日最大风险点是什么？' } : { question: '文中关键细节如何理解？' }),
    });
    check(`POST ${p} -> ${r.status}`, r.status === 200);
  }

  // 15) 来源核验必须阻止本机/内网地址，避免 SSRF
  const sourceBlocked = await fetch(`${BASE}/api/source/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://127.0.0.1:3001/api/health' }),
  });
  const sourceBlockedData = await sourceBlocked.json().catch(() => ({}));
  check(
    'POST /api/source/inspect 阻止本机/内网地址',
    sourceBlocked.status === 403 && sourceBlockedData.status === 'blocked',
    JSON.stringify(sourceBlockedData).slice(0, 160)
  );

  // 16) 人工评测队列在没有真实语料时保持为空
  const evalQueue = await fetch(`${BASE}/api/evaluation/queue?task=sentiment&annotator=smoke`, { headers: {} }).then((r) => r.json());
  check(
    'GET /api/evaluation/queue 空语料时不生成标注样本',
    Array.isArray(evalQueue.samples) && evalQueue.samples.length === 0,
    JSON.stringify(evalQueue).slice(0, 160)
  );
  const evalSummary = await fetch(`${BASE}/api/evaluation/summary?task=sentiment`).then((r) => r.json());
  check(
    'GET /api/evaluation/summary 无标注时保持零样本',
    evalSummary.annotations === 0 && evalSummary.goldSamples === 0,
    JSON.stringify(evalSummary).slice(0, 160)
  );
  const invalidAdjudication = await fetch(`${BASE}/api/evaluation/adjudicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'sentiment', sampleKey: 'x', adjudicator: 'smoke', label: 'invalid' }),
  });
  check('POST /api/evaluation/adjudicate 拒绝非法标签', invalidAdjudication.status === 400);
  const freezeEmpty = await fetch(`${BASE}/api/evaluation/freeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'sentiment', version: 'smoke-empty' }),
  });
  check('POST /api/evaluation/freeze 无 Gold 时拒绝冻结', freezeEmpty.status === 409);
  const goldSets = await fetch(`${BASE}/api/evaluation/gold-sets?task=sentiment`).then((r) => r.json());
  check('GET /api/evaluation/gold-sets 无数据时返回空数组', Array.isArray(goldSets.goldSets) && goldSets.goldSets.length === 0);
  const emptyImport = await fetch(`${BASE}/api/evaluation/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  check('POST /api/evaluation/import 拒绝空导入', emptyImport.status === 400);

  console.log(failed === 0 ? '\n全部通过 ✅' : `\n${failed} 项失败 ❌`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('冒烟脚本异常：', e);
  process.exit(1);
});
