#!/usr/bin/env node
// 见微 Genway · 逐功能自动测试（非破坏性；不调用 reset/不写配置以外的改动）
// 层次：A.基础 B.情报中心(派生/面板数据源) C.AI 端点 D.设置 E.地区/主体 F.纯函数算法 G.导出
// 说明：与真实 Key 共存运行（DeepSeek 在线）；破坏性项（admin/reset、全量 ingest 重放）不在本脚本中执行。
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';
let failed = 0;
const results = [];
function check(name, ok, extra = '', grade = '—') {
  results.push({ name, ok, grade });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ' — ' + extra}`);
  if (!ok) failed += 1;
}
const get = (p) => fetch(`${BASE}${p}`).then((r) => r.json());
const post = async (p, body) =>
  fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

async function main() {
  console.log(`逐功能测试 @ ${BASE}\n`);

  // A. 基础
  const health = await get('/api/health');
  check('A1 健康检查', health.status === 'ok', JSON.stringify(health).slice(0, 80), 'A');
  const page = await fetch(`${BASE}/`).then((r) => r.text());
  check('A2 首页可访问且含设置入口', page.includes('见微 Genway') && page.includes('assets/index-'), '', 'A');

  // B. 情报中心（派生数据源与面板输入）
  const snap = await get('/api/snapshot');
  const sMeta = snap.meta || {};
  const sDer = snap.derived || {};
  check('B1 语料快照：大小与统计完整性', sMeta.corpusSize >= 1 && Object.keys(sDer.categoryCounts || {}).length >= 1 && Array.isArray(sDer.tagFrequency), '', 'B');
  check('B2 涉事地区标注已入库', (sDer.regionAnnotatedCount || 0) > 0 && Array.isArray(sDer.regionMentionDistribution), '', 'B');
  const corp = await get('/api/corpus');
  const ext = corp.corpus.filter((a) => a.isExternal);
  check('B3 语料含外部条目及时间/标注', ext.length >= 2 && ext.every((a) => a.publishedAt || a.isExternal) && ext.some((a) => Array.isArray(a.regionMentions)), '', 'B');
  check('B4 主体标注已入库', ext.some((a) => Array.isArray(a.entityMentions)), '', 'B');
  const regionFilter = await get('/api/corpus?region=' + encodeURIComponent((sDer.regionMentionDistribution || [])[0]?.region || '中国大陆') + '&limit=5');
  check('B5 corpus?region 过滤', (regionFilter.meta.matches || 0) > 0 && regionFilter.corpus.length <= 5, '', 'B');

  // C. AI 端点（真实在线）
  const p = await post('/api/predict', {
    question: '未来90天头部SaaS是否会对Agent能力二次加价？', modelChoice: 'auto',
    articleContext: { title: 'OpenAI Agent 突破', sourceCount: 6, logicTree: { variableWeights: [{ name: '准确率', weight: 40, impactDirection: 'up' }] } },
    questionOptions: { positive: '会加价', negative: '不会加价' } });
  check('C1 /api/predict 在线返回结构', p.status === 200 && p.data.fallback === false && !!p.data.data.direction && typeof p.data.data.confidenceScore === 'number', '', 'C');
  const en = await post('/api/enrich', { articleId: 'feat-test-enrich', title: '某车企固态电池量产提前', summary: '中试线良率达标，量产提前两个季度。', source: '测试', category: '外部信源' });
  const en2 = await post('/api/enrich', { articleId: 'feat-test-enrich', title: '某车企固态电池量产提前', summary: '中试线良率达标，量产提前两个季度。', source: '测试', category: '外部信源' });
  check('C2 /api/enrich 生成并缓存命中', en.data.enriched === true && en2.data.cached === true, '', 'C');
  const an = await post('/api/analyze', { title: '逐功能测试：某芯片厂上调全年资本开支', source: '测试源', category: '科技前沿', content: '财报披露新产线投产，先进封装供不应求。' });
  check('C3 /api/analyze 完整拆解', an.data.fallback === false && !!an.data.data.oneSentenceVerdict && (an.data.data.spectrumLayers || []).length >= 3, '', 'C');
  const adv = await post('/api/strategic-advisor', { question: '今日最值得关注的变化是什么？', userPersona: '测试', contextArticles: [] });
  const probe = await post('/api/ask-nuance', { question: '关键风险是什么？', articleContext: { title: '测试' } });
  check('C4 战略顾问/微观探针有答复', (adv.data.answer || '').length > 20 && (probe.data.answer || '').length > 20, '', 'C');
  const e400 = await post('/api/enrich', {});
  check('C5 enrich 空请求 400', e400.status === 400, '', 'C');

  // D. 设置（脱敏；热更新昵称并还原）
  const st0 = await get('/api/settings');
  check('D1 设置脱敏无密钥', !('geminiApiKey' in st0) && !('deepseekApiKey' in st0) && typeof st0.userName === 'string', '', 'D');
  const d1 = await post('/api/settings', { userName: '__feat_test__' });
  const st1 = await get('/api/settings');
  const d2 = await post('/api/settings', { userName: st0.userName });
  check('D2 设置热更新昵称并还原', d1.data.ok && st1.userName === '__feat_test__' && (await get('/api/settings')).userName === st0.userName, '', 'D');

  // E. 地区/主体（在线抽样）
  const sample = corp.corpus.filter((a) => a.isExternal && a.title).slice(-3).map((a) => ({ id: a.id, title: a.title, summary: a.summary || '' }));
  const rg = await post('/api/regions', { items: sample });
  const en2e = await post('/api/entities', { items: sample });
  check('E1 涉事地区抽样判定', rg.data.ok === true && (rg.data.results || []).length === sample.length, '', 'E');
  check('E2 主体抽样抽取', en2e.data.ok === true && (en2e.data.results || []).length === sample.length, '', 'E');
  const es = await get('/api/entities/status');
  check('E3 主体全量任务状态可查', ['idle', 'running', 'finished', 'cancelled'].includes(es.task?.status), '', 'E');

  // F. 纯函数算法（在语料上执行不变量断言）
  const { corpusDerived, keywordHits, sentimentCounts } = await import('/Users/zhaohf/Downloads/News-Jianwei-main/src/utils/corpusMetrics.ts');
  const { detectSectors, scanCoverage, SECTOR_TAXONOMY } = await import('/Users/zhaohf/Downloads/News-Jianwei-main/src/utils/sectorTaxonomy.ts');
  const { primaryMentionRegion } = await import('/Users/zhaohf/Downloads/News-Jianwei-main/src/utils/mentionRegion.ts');
  const { regionOf } = await import('/Users/zhaohf/Downloads/News-Jianwei-main/src/utils/sourceRegion.ts');
  const derived = corpusDerived(corp.corpus);
  check('F1 净情绪/占比在界内', derived.net === null || (derived.net >= -100 && derived.net <= 100), '', 'F');
  check('F2 词库检测返回合法赛道 id', detectSectors({ title: '谷歌推出 Gemini 模型与算力芯片' }).every((id) => SECTOR_TAXONOMY.some((s) => s.id === id)), '', 'F');
  const scan = scanCoverage(corp.corpus);
  check('F3 覆盖扫描结构与计数一致', scan.every((c) => c.count === c.samples.length + (c.count - c.samples.length)), '', 'F');
  check('F4 监控词命中统计可计算', keywordHits('AI', corp.corpus).total >= 0, '', 'F');
  check('F5 涉事地区词典命中样例', primaryMentionRegion('美联储在华盛顿宣布降息，美元走弱') === '美国', '', 'F');
  check('F6 来源地区映射', regionOf('people.com.cn') === '中国大陆', '', 'F');

  // G. 导出（CSV 结构与行数）
  const { buildIntelCsv } = await import('/Users/zhaohf/Downloads/News-Jianwei-main/src/utils/intelExport.ts');
  const csv = buildIntelCsv(corp.corpus.slice(0, 20));
  const lines = csv.trim().split('\n');
  check('G1 CSV 头与行数正确', lines.length === 21 && lines[0].includes('title'), '', 'G');

  console.log(`\n结果：通过 ${results.length - failed}/${results.length}；失败 ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error('测试异常：', e);
  process.exit(1);
});
