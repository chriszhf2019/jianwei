#!/usr/bin/env node
/**
 * 见微 Genway · 功能级端到端测试套件（覆盖全部服务端功能 + 设置热更新 + 真实 RSS 摄取闭环）
 * 前置：本地 RSS 测试源已运行在 3211（含 2 条外部新闻）。
 * 用法：node scripts/functional-test.mjs
 * 说明：会临时写入服务端设置（信源/昵称），结束时自动还原为空；摄取的外部条目在重启服务后清除。
 */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
const RSS = process.env.RSS_URL || 'http://127.0.0.1:3211/rss.xml';

let failed = 0;
const pass = [];
function check(name, cond, extra = '') {
  if (cond) {
    pass.push(name);
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

const get = async (path) => (await fetch(`${BASE}${path}`)).json();

async function main() {
  console.log(`功能级测试 @ ${BASE}（本地 RSS @ 3211）\n`);

  // —— 0. 环境复位：清空内存语料/缓存，保证用例可重复 ——
  const rst = await post('/api/admin/reset', undefined);
  check('Z0 环境复位成功（无真实数据时语料为空）', rst.data.ok === true && rst.data.corpusSize === 0, JSON.stringify(rst.data));

  // —— A. 基础与页面 ——
  const health = await get('/api/health');
  check('A1 /api/health 正常', health.status === 'ok' && typeof health.ai === 'object');
  const page = await fetch(`${BASE}/`).then((r) => r.text());
  check('A2 首页包含标题与根节点', page.includes('见微 Genway') && page.includes('id="root"'));

  // —— B. 快照 / 语料（基线） ——
  const snap0 = await get('/api/snapshot');
  check('B1 基线 snapshot：empty + 0 篇', snap0.meta.corpus === 'empty' && snap0.meta.demo === false && snap0.meta.corpusSize === 0);
  check('B2 snapshot 空语料结构完整', Object.keys(snap0.derived.categoryCounts).length === 0 && snap0.derived.tagFrequency.length === 0 && snap0.derived.sourceStats.avgPerArticle === 0);
  const corp0 = await get('/api/corpus');
  check('B3 /api/corpus 基线为空', corp0.corpus.length === 0);

  // —— C. AI 分析（无 Key 走本地兜底，仍返回完整结构 + 动态日期） ——
  const an = await post('/api/analyze', {
    title: '功能测试：某存储大厂上调 HBM 全年出货指引',
    source: '功能测试源',
    category: '科技前沿',
    content: '财报电话会披露新订单锁定至明年，产能利用率维持高位。' });
  check('C1 /api/analyze 无 Key 时不返回伪造分析', an.data.fallback === true && an.data.data === null);

  // —— D. 微观探针 / 战略顾问 ——
  const nu = await post('/api/ask-nuance', { question: '如何理解文中的关键细节？', articleContext: { title: '测试' } });
  check('D1 /api/ask-nuance 无 Key 时明确未生成', nu.data.fallback === true && nu.data.answer === null);
  const ad2 = await post('/api/strategic-advisor', { question: '今天最值得注意的变化是什么？', userPersona: '测试用户', contextArticles: [] });
  check('D2 /api/strategic-advisor 无 Key 时明确未生成', ad2.data.answer === null && Array.isArray(ad2.data.citations));

  // —— E. 预测擂台端点 ——
  const p400 = await post('/api/predict', {});
  check('E1 /api/predict 空请求 400', p400.status === 400);
  const p1 = await post('/api/predict', {
    question: '未来90天头部SaaS是否会对Agent二次加价？',
    modelChoice: 'auto',
    articleContext: { title: 'OpenAI Agent', sourceCount: 6, logicTree: { variableWeights: [{ name: '准确率', weight: 40, impactDirection: 'up' }] } },
    questionOptions: { positive: '会加价', negative: '不会加价' } });
  const pd1 = p1.data.data || {};
  check('E2 无 Key 回落本地确定性引擎且结构完整', p1.data.fallback === true && pd1.modelChoice === 'jianwei-local' && ['positive', 'negative'].includes(pd1.direction) && pd1.confidenceScore >= 25 && pd1.confidenceScore <= 85 && Array.isArray(pd1.causalLogicChain));
  const p2 = await post('/api/predict', {
    question: '美联储 6 个月内是否至少两次降息？',
    modelChoice: 'local',
    articleContext: { title: '美联储纪要', sourceCount: 7, logicTree: null },
    questionOptions: { positive: '是', negative: '否' } });
  check('E3 modelChoice=local 不发起在线、仍可解析', p2.data.fallback === true && !!p2.data.data.direction);

  // —— F. 深度补全（无 Key 不造假） ——
  const e400 = await post('/api/enrich', {});
  check('F1 /api/enrich 空请求 400', e400.status === 400);
  const en = await post('/api/enrich', { articleId: 'feed-test-1', title: '某外部新闻标题', content: '外部新闻摘要', source: '外部RSS', category: '外部信源' });
  check('F2 无 Key 明确 no_api_key（不返回假内容）', en.data.enriched === false && en.data.reason === 'no_api_key');

  // —— G. 设置：热更新（写入本地 RSS 源） ——
  const orig = await get('/api/settings');
  const s1 = await post('/api/settings', { userName: '', aiChoice: 'auto', feeds: [RSS] });
  check('G1 设置热更新成功（feeds 写入）', s1.data.ok === true && s1.data.feeds.includes(RSS));
  check('G2 设置接口脱敏（无密钥字段）', !('geminiApiKey' in s1.data) && !('deepseekApiKey' in s1.data));
  const fs1 = await get('/api/feeds/status');
  check('G3 feeds/status 变为 enabled:true', fs1.enabled === true && fs1.urls.includes(RSS));

  // —— H. 真实 RSS 摄取闭环 ——
  const ing = await post('/api/feeds/ingest', undefined);
  const li = ing.data.lastIngest || {};
  check('H1 ingest 成功并新增 2 条', ing.data.ok === true && li.added >= 2 && ing.data.corpusSize >= 2, JSON.stringify(ing.data).slice(0, 200));
  check('H1b 同标题跨媒体稿记录为额外来源而非重复文章', li.mergedSources >= 1, JSON.stringify(li).slice(0, 220));
  const corp1 = await get('/api/corpus');
  const extItems = corp1.corpus.filter((a) => a.isExternal === true);
  check('H2 corpus 含外部条目（isExternal/sourceUrl）', extItems.length >= 2 && extItems.every((a) => a.sourceUrl));
  const corroborated = extItems.find((a) => (a.sourceOccurrences || []).length >= 2);
  check('H2b 首发文章保留第二家媒体发布记录', !!corroborated, JSON.stringify(extItems.map((a) => ({ title: a.title, occurrences: a.sourceOccurrences?.length || 0 }))).slice(0, 300));
  const snap1 = await get('/api/snapshot');
  check('H3 snapshot 切换 live（demo:false, corpusSize 增长）', snap1.meta.corpus === 'live' && snap1.meta.demo === false && snap1.meta.corpusSize >= 2);
  check('H4 snapshot 派生包含外部信源分类', (snap1.derived.categoryCounts['外部信源'] || 0) >= 2);

  // —— I. 摄取错误路径（指向不可达源） ——
  const s2 = await post('/api/settings', { feeds: ['http://127.0.0.1:3999/none.xml', RSS] });
  check('I1 追加不可达源后设置生效', s2.data.ok === true);
  const ing2 = await post('/api/feeds/ingest', undefined);
  // 同源重复摄取按标题去重（added 可为 0）；核心是错误源被隔离记录、请求不整体失败
  check('I2 不可达源被记录为 errors 且整体不失败', Array.isArray(ing2.data.lastIngest?.errors) && ing2.data.lastIngest.errors.length >= 1 && typeof ing2.data.lastIngest.added === 'number' && typeof ing2.data.lastIngest.skipped === 'number', JSON.stringify(ing2.data.lastIngest).slice(0, 220));

  // —— J. 清除设置 / 还原 ——
  const s3 = await post('/api/settings', { userName: '', aiChoice: 'auto', feeds: [] });
  check('J1 还原设置（feeds 清空）', s3.data.ok === true && s3.data.feeds.length === 0);
  const fs2 = await get('/api/feeds/status');
  check('J2 feeds/status 回到 enabled:false', fs2.enabled === false);
  check('J3 原设置完整性（保存前 userName/choice 已还原）', s3.data.userName === orig.userName && s3.data.ai.choice === (orig.ai?.choice || 'auto'));

  // —— K. 管理状态 / AI 测试 ——
  const adm = await get('/api/admin/status');
  check('K1 /api/admin/status 结构可见', typeof adm.caches?.enrich === 'number' && typeof adm.caches?.predict === 'number');
  const t = await post('/api/ai/test', undefined);
  check('K2 /api/ai/test（无 Key）返回 ok:false + reason', t.data.ok === false && !!t.data.reason);

  console.log(`\n通过 ${pass.length} 项；失败 ${failed} 项。`);
  if (failed > 0) {
    console.log('已通过项：');
    pass.forEach((p) => console.log('  · ' + p));
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('功能测试异常：', e);
  process.exit(1);
});
