// 纯函数单元测试（Node 内置 test runner + tsx 执行；无第三方依赖）
// 运行：npx tsx --test scripts/unit.test.ts   或 pnpm test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseArticleDate, articleSortTime, formatArticleTime, isStaleArticle } from '../src/utils/articleTime';
import { appendActionMemo } from '../src/utils/actionMemo';
import { demoDataEnabledFrom, feedMaxAgeDaysFrom } from '../src/server/settings';
import { sentimentCounts, netSentiment, corpusDerived, keywordHits } from '../src/utils/corpusMetrics';
import { monitorHits } from '../src/utils/monitorKeywords';
import { mediaProfile, tierBadge, mediaKey } from '../src/utils/mediaAuthority';
import { topHotWords, detectBreaking } from '../src/utils/todayBrief';
import { parseRSS, parseAtom, parseFeed, canonicalFeedUrl, normalizedTitleKey } from '../src/server/feeds';
import { splitKeyTerms } from '../src/utils/keyTermTone';
import { localTrendModel } from '../src/utils/localTrendModel';
import { detectMentionRegions, primaryMentionRegion } from '../src/utils/mentionRegion';
import { regionOf } from '../src/utils/sourceRegion';
import { composeModel, SEVEN_W_ITEMS } from '../src/utils/sevenElementsBrief';
import { buildEvidenceProfile, headlineSimilarity, normalizeHeadline } from '../src/utils/evidenceProfile';
import {
  sanitizeEnrichPayload,
  sanitizeEvidenceChain,
  sanitizeFrequencyAnalysis,
  sanitizeGrayscaleAssessment,
  sanitizeRegionImpact,
} from '../src/server/aiValidation';
import { calibrationBuckets, forecastMetrics, predictionOutcomes } from '../src/utils/predictionCalibration';
import {
  extractPageMetadata,
  evaluateQuoteMatch,
  findQuoteContext,
  isPublicAddress,
  normalizeComparable,
  revalidateCachedQuote,
  sourceCheckKey,
  validatePublicOutboundBaseUrl,
} from '../src/server/sourceVerification';
import {
  buildEntityGraph,
  canonicalEntityId,
  canonicalEntityName,
  entityCoMentions,
  entityIdentity,
  normalizeEntityMentions,
} from '../src/utils/entityGraph';
import { sourceGroupInfo, sourceGroupKey } from '../src/utils/sourceGrouping';
import { buildSyndicationGraph, findSyndicationCandidates } from '../src/utils/syndication';
import {
  expectedCalibrationError,
  krippendorffAlphaNominal,
  macroF1,
  ndcgAtK,
  precisionAtK,
  recallAtK,
} from '../src/utils/evaluationMetrics';
import { rankDocumentsBM25, tokenizeForRetrieval } from '../src/utils/textRetrieval';
import { rankEventCandidates } from '../src/utils/eventCandidates';
import { normalizeRegionMentions, regionScopeOf } from '../src/utils/regionSemantics';
import { clearEnrichCache, enrichKey, getOrCreateCached, predictKey } from '../src/server/cache';
import { predictionDueInfo } from '../src/utils/predictionLedger';
import { certificationSpec } from '../src/utils/methodRegistry';
import { articleIdsToHash, planArticlePersistence } from '../src/server/database';
import { detectSectors, keywordMatches } from '../src/utils/sectorTaxonomy';
import { deriveBlindspots, deriveSourceHealth, deriveTomorrowHeat } from '../src/utils/corpusSnapshot';
import { categoryBaseRate, dueWatchItems } from '../src/utils/forecastReference';
import type { PredictionContract } from '../src/types';

test('parseArticleDate: RFC822 / ISO / 空格 / 纯日期 / 中文', () => {
  assert.equal(parseArticleDate('Fri, 04 Sep 2026 02:33:08 +0000')! > 0, true);
  assert.equal(parseArticleDate('2026-09-05T10:16:46Z')! > 0, true);
  assert.equal(parseArticleDate('2026-09-01 10:15')! > 0, true);
  assert.equal(parseArticleDate('2025-06-05')! > 0, true);
  assert.equal(parseArticleDate('2026年9月1日')! > 0, true);
  assert.equal(parseArticleDate(''), null);
  assert.equal(parseArticleDate('abc'), null);
});

test('articleSortTime: publishedAt 优先于 sourceDate/date；解析失败回 0', () => {
  const a = { publishedAt: '2026-09-05', sourceDate: '2026-01-01', date: '2026-01-01' };
  const b = { sourceDate: '2026-06-01' };
  const bad = { date: 'not-a-date' };
  assert.ok(articleSortTime(a) > articleSortTime(b));
  assert.equal(articleSortTime(bad), 0);
});

test('formatArticleTime: 中文日期回退真实日期而非空', () => {
  const old = { publishedAt: '2025-06-05' };
  const s = formatArticleTime(old, Date.parse('2026-09-05T00:00:00Z'));
  assert.ok(s.includes('2025'), s);
});

test('isStaleArticle: 30 天阈值', () => {
  const now = Date.parse('2026-09-05T00:00:00Z');
  const fresh = { publishedAt: '2026-09-04' };
  const stale = { publishedAt: '2025-06-05' };
  assert.equal(isStaleArticle(fresh, 30, now), false);
  assert.equal(isStaleArticle(stale, 30, now), true);
});

test('sentimentCounts/netSentiment: 词典命中与公式', () => {
  const arts = [
    { title: '业绩增长超预期，股价新高', summary: '' },
    { title: '公司亏损裁员，风险提示', summary: '' },
    { title: '普通新闻无关键词', summary: '' },
  ];
  const c = sentimentCounts(arts);
  assert.equal(c.positive >= 1, true);
  assert.equal(c.negative >= 1, true);
  const net = netSentiment(c);
  assert.equal(net !== null, true);
  assert.ok(net! >= -100 && net! <= 100);
  const mixed = sentimentCounts([{ title: '增长但风险上升', summary: '' }]);
  assert.equal(mixed.positive, 0);
  assert.equal(mixed.negative, 0);
  assert.equal(mixed.mixed, 1);
  assert.equal(mixed.scanned, 1);
});

test('corpusDerived: 30 天窗口排除旧闻，无 publishedAt 保留', () => {
  const now = Date.parse('2026-09-05T00:00:00Z');
  const arts = [
    { title: '增长', summary: '', publishedAt: '2026-09-04' }, // 窗口内
    { title: '增长', summary: '', publishedAt: '2025-06-01' }, // 窗口外（排除）
    { title: '增长', summary: '' }, // 无时刻（保留）
  ];
  const d = corpusDerived(arts as any, 30);
  // 用“增长”命中正词：窗口内 1 篇 + 无时刻 1 篇 = 2（2025 被滤）
  assert.equal(d.positive, 2);
});

test('monitorHits: 短语需完整或具体组成词，避免 AI 首词过宽', () => {
  const kws = [
    { id: 'k1', keyword: 'NVIDIA 算力' },
    { id: 'k2', keyword: 'AI Agent 智能体' },
  ];
  // 完整命中
  assert.equal(monitorHits({ title: 'NVIDIA 算力迎来爆发', summary: '' }, kws as any).length, 1);
  // 仅含具体词“智能体”（≥3汉字）也算（k2）
  const r2 = monitorHits({ title: '新智能体产品发布', summary: '' }, kws as any);
  assert.ok(r2.some((h) => h.id === 'k2'));
  // 仅含 2 字母 ai 不应误命中短语 k2（无 ≥3 汉字组成词）
  assert.equal(monitorHits({ title: 'paid ai services mail', summary: '' }, kws as any).length, 0);
});

test('mediaProfile/tierBadge: 域名归一与档位', () => {
  assert.equal(mediaProfile('politics.people.com.cn')?.tier, 'A');
  assert.equal(mediaProfile('ithome.com')?.tier, 'B');
  assert.equal(mediaProfile('ifanr.com')?.tier, 'C');
  assert.equal(mediaProfile('random.unknown.xyz'), null);
  assert.equal(mediaKey('www.ithome.com', 'https://www.ithome.com/x'), 'ithome.com');
  assert.equal(tierBadge('A')?.label, '官方 · A');
  assert.equal(tierBadge(null), null);
});

test('topHotWords: 返回计数排序且过滤套话', () => {
  const arts = [
    { title: 'AI 大模型又发新品 手机销量好', summary: '' },
    { title: 'AI 手机芯片竞争激烈', summary: '' },
    { title: '发布 宣布 推出（套话不应成为热词）', summary: '' },
  ];
  const top = topHotWords(arts, 6);
  assert.ok(top.length > 0);
  assert.ok(top.every((h) => h.word !== '发布'), '套话“发布”不应出现');
  const ai = top.find((h) => h.word === 'AI');
  assert.ok(ai && ai.count >= 2, JSON.stringify(top));
});

test('detectBreaking: 无显著事件返回空（重大才有）', () => {
  const arts = [
    { title: '某公司发布季度财报，业绩平稳', sourceName: 'ithome.com' },
    { title: '另一家公司例行公告', sourceName: 'ifanr.com' },
  ];
  assert.equal(detectBreaking(arts).length, 0);
  // 未知来源单篇耸动标题不再被放大为“重大突发”
  const single = detectBreaking([{ title: '港口发生爆炸事故', sourceName: 'a.com' }]);
  assert.equal(single.length, 0);
  // 已收录官方媒体可单源展示，并明确标为官方单源
  const official = detectBreaking([{ title: '某地发生地震', sourceName: 'people.com.cn', sourceUrl: 'https://people.com.cn/a' }]);
  assert.ok(official.length >= 1 && official[0].verification === 'official_single', JSON.stringify(official));
  // 多源印证仍正常
  const boom = [
    { title: '港口发生爆炸事故', sourceName: 'a.com' },
    { title: '港口爆炸致多人送医', sourceName: 'b.com' },
  ];
  const hits = detectBreaking(boom);
  assert.ok(hits.length >= 1 && hits[0].word === '爆炸' && hits[0].sources === 2, JSON.stringify(hits));
  assert.equal(hits[0].verification, 'corroborated');
  // 否定语境在突发词之前 → 不算事件（辟谣）
  assert.equal(detectBreaking([{ title: '警方辟谣：网传商场枪击系谣言', sourceName: 'a.com' }]).length, 0);
  // 否定词在突发词之后（事后回应）→ 两源印证时仍算事件
  const after = detectBreaking([
    { title: '商场发生枪击，警方回应已控制现场', sourceName: 'a.com' },
    { title: '商场枪击事件后警方通报进展', sourceName: 'b.com' },
  ]);
  assert.ok(after.length >= 1 && after[0].word === '枪击', JSON.stringify(after));
  // 弱词单篇不报（需多篇或多源）
  assert.equal(detectBreaking([{ title: '某公司宣布裁员', sourceName: 'a.com' }]).length, 0);
});

test('parseFeed: 同时支持 RSS2 <item> 与 Atom <entry>', () => {
  const rss = `<?xml version="1.0"?><rss><channel><item>
    <title>RSS 标题</title><link>https://example.com/rss</link>
    <pubDate>Fri, 05 Sep 2026 02:33:08 +0000</pubDate>
    <description><![CDATA[<p>RSS 摘要</p>]]></description>
  </item></channel></rss>`;
  assert.equal(parseRSS(rss).length, 1);
  assert.equal(parseFeed(rss)[0].description, 'RSS 摘要');

  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <title>Atom 标题</title>
    <link rel="alternate" href="https://example.com/atom"/>
    <updated>2026-09-05T10:16:46Z</updated>
    <summary>Atom 摘要</summary>
  </entry></feed>`;
  assert.equal(parseAtom(atom).length, 1);
  assert.equal(parseAtom(atom)[0].link, 'https://example.com/atom');
  assert.equal(parseFeed(atom)[0].title, 'Atom 标题');
  assert.equal(normalizedTitleKey('某公司：发布新品！'), '某公司发布新品');
  assert.equal(
    canonicalFeedUrl('https://example.com/news/1/?utm_source=test&from=rss#top'),
    'https://example.com/news/1'
  );
});

test('keywordHits 与监控词同样支持“短语具体组成词”兜底匹配', () => {
  const arts = [
    { title: '英伟达发布新一代数据中心芯片', summary: 'NVIDIA 算力集群供不应求', publishedAt: '2026-09-05' },
    { title: 'AI Agent 完成长程任务', summary: '', publishedAt: '2026-09-05' },
  ];
  const hit = keywordHits('NVIDIA 算力', arts as any);
  assert.ok(hit.total >= 1, JSON.stringify(hit));
});

test('splitKeyTerms: 词典/数字/普通文本分段且不重叠', () => {
  const segs = splitKeyTerms('今日指数上涨 3.2%，AI Agent 落地。');
  assert.ok(segs.some((s) => s.text === '上涨' && s.tone === 'pos'));
  assert.ok(segs.some((s) => s.text.includes('3.2%') && s.tone === 'num'));
  assert.ok(segs.some((s) => s.text.includes('Agent') && s.tone === 'key'));
  assert.equal(segs.map((s) => s.text).join(''), '今日指数上涨 3.2%，AI Agent 落地。');
});

test('localTrendModel: 权重齐全时给方向；缺失时不伪精确', () => {
  const article = {
    logicTree: {
      variableWeights: [
        { name: 'a', weight: 60, impactDirection: 'up' },
        { name: 'b', weight: 40, impactDirection: 'down' },
      ],
    },
  };
  const r = localTrendModel(article as any);
  assert.equal(r.kind, 'weights');
  if (r.kind === 'weights') {
    assert.ok(r.pPos >= 50);
    assert.equal(r.pNeg, 100 - r.pPos);
  }
  const none = localTrendModel({} as any);
  assert.equal(none.kind, 'none');
});

test('mentionRegion/sourceRegion: 词典检测与人工来源区可复核', () => {
  assert.ok(detectMentionRegions('美联储加息').includes('美国'));
  assert.equal(primaryMentionRegion('OpenAI 发布新模型'), '美国');
  assert.equal(regionOf('www.ithome.com'), '中国大陆');
  assert.equal(regionOf(''), '未标注');
});

test('composeModel: 7W 整合不丢内容', () => {
  const se = {
    what: '某公司发布新产品',
    who: '甲公司',
    when: '2026年9月',
    where: '上海',
    why: '需求增长',
    how: '扩大产线',
    soWhat: '影响行业格局',
  };
  const text = composeModel(se as any);
  assert.ok(text.includes('某公司发布新产品'));
  assert.ok(text.includes('甲公司'));
  assert.ok(text.includes('影响行业格局'));
  assert.ok(SEVEN_W_ITEMS.length === 7);
});

test('sectorTaxonomy: 英文缩写按词边界匹配，避免 pcgamer 命中 PC', () => {
  assert.equal(keywordMatches('游戏媒体 pcgamer 认为', 'PC'), false);
  assert.equal(keywordMatches('PC 市场增长', 'PC'), true);
  assert.equal(keywordMatches('This is a spacecraft.', 'PC'), false);
  assert.equal(detectSectors({ title: '暴雪《魔兽世界》官宣上线：pcgamer 评论', summary: '' }).includes('consume'), false);
  assert.equal(detectSectors({ title: 'PC 出货量回暖', summary: '' }).includes('consume'), true);
});

test('corpusSnapshot: 信源计数、低覆盖阈值与明日窗口占比', () => {
  const health = deriveSourceHealth([
    {
      title: '新华',
      sourceName: 'news.cn',
      sourceUrl: 'https://www.news.cn/a',
      isExternal: true,
      publishedAt: '2026-09-01T00:00:00Z',
    },
    {
      title: '未知站',
      sourceName: 'example.com',
      sourceUrl: 'https://example.com/b',
      isExternal: true,
      publishedAt: '2026-09-02T00:00:00Z',
    },
    { title: '无链接', sourceName: '内部', isExternal: false },
  ]);
  assert.equal(health.total, 3);
  assert.equal(health.externalCount, 2);
  assert.equal(health.curatedCount, 1);
  assert.equal(health.distinctExternalHosts, 2);
  assert.equal(health.withOriginalLink, 2);
  assert.equal(health.withTimestamp, 2);
  assert.equal(health.fullyTraceable, 2);
  assert.equal(health.knownGroupCount, 1);
  assert.equal(health.unknownDomainCount, 1);
  assert.equal(health.topSources[0].count >= health.topSources[health.topSources.length - 1].count, true);
  assert.equal('score' in health, false);

  const taxonomy = [
    { id: 'hot', name: '热门', keywords: ['芯片'] },
    { id: 'edge', name: '边界', keywords: ['光伏'] },
    { id: 'cold', name: '冷门', keywords: ['出海'] },
  ];
  const coverageArticles = [
    ...Array.from({ length: 20 }, (_, index) => ({ title: `芯片新闻 ${index}`, summary: '' })),
    ...Array.from({ length: 7 }, (_, index) => ({ title: `光伏装机 ${index}`, summary: '' })),
    { title: '出海工厂', summary: '' },
  ];
  const blind = deriveBlindspots(coverageArticles, taxonomy);
  assert.equal(blind.maxCount, 20);
  assert.equal(blind.matchedTotal, 28);
  assert.equal(blind.coveredSectorCount, 3);
  // 7/20 = 0.35，阈值是严格小于 35%，边界赛道不进入低覆盖。
  assert.deepEqual(blind.lowCoverage.map((item) => item.sectorId), ['cold']);
  assert.equal(blind.lowCoverage[0].count, 1);

  const recent = Array.from({ length: 80 }, (_, index) => ({
    title: 'AI 新闻',
    publishedAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}T00:00:00Z`,
  }));
  const heat = deriveTomorrowHeat(
    [{ title: '电动车旧闻', publishedAt: '2020-01-01T00:00:00Z' }, ...recent],
    [
      { id: 'ai', name: 'AI', keywords: ['AI'] },
      { id: 'ev', name: '汽车', keywords: ['电动车'] },
    ],
  );
  assert.equal(heat.corpusSize, 81);
  assert.equal(heat.totalWindow, 80);
  assert.equal(heat.list.length, 1);
  assert.equal(heat.list[0].sectorId, 'ai');
  assert.equal(heat.list[0].count, 80);
  assert.equal(heat.list[0].share, 100);
  assert.equal('probability' in heat, false);
  assert.equal('probability' in heat.list[0], false);

  const mixed = deriveTomorrowHeat(
    [
      { title: 'AI 一', publishedAt: '2026-09-04T00:00:00Z' },
      { title: 'AI 二', publishedAt: '2026-09-03T00:00:00Z' },
      { title: '电动车', publishedAt: '2026-09-02T00:00:00Z' },
      { title: '未命中', publishedAt: '2026-09-01T00:00:00Z' },
    ],
    [
      { id: 'ai', name: 'AI', keywords: ['AI'] },
      { id: 'ev', name: '汽车', keywords: ['电动车'] },
    ],
  );
  assert.equal(mixed.totalWindow, 4);
  assert.equal(mixed.list.find((item) => item.sectorId === 'ai')?.share, 50);
  assert.equal(mixed.list.find((item) => item.sectorId === 'ev')?.share, 25);
});

test('evidenceProfile: 只按真实语料计算独立来源，AI 来源线索不计入', () => {
  const a = {
    id: 'a',
    title: '某公司发布新一代芯片，宣称算力翻倍',
    sourceName: 'a.com',
    sourceUrl: 'https://a.com/1',
    publishedAt: '2026-09-10T08:00:00Z',
  } as any;
  const b = {
    id: 'b',
    title: '某公司发布新一代芯片 算力较上一代翻倍',
    sourceName: 'b.com',
    sourceUrl: 'https://b.com/2',
    publishedAt: '2026-09-10T09:00:00Z',
  } as any;
  assert.ok(headlineSimilarity(a.title, b.title) >= 0.46);
  assert.equal(normalizeHeadline(a.title), normalizeHeadline(a.title));

  const profile = buildEvidenceProfile(
    { ...a, rippleEffect: { stages: [], knowledgeGraph: [], multiSources: [{ sourceName: '虚构媒体' }] } },
    [b]
  );
  assert.equal(profile.status, 'corroborated');
  assert.equal(profile.independentSources, 2);
  assert.equal(profile.aiClaimedSources, 1);
  assert.ok(profile.note.includes('不参与独立来源计数'));
});

test('evidenceProfile: 无链接且无发布时间时标为待核验', () => {
  const profile = buildEvidenceProfile({
    id: 'x',
    title: '一条无法回到原文的消息',
    sourceName: 'unknown.example',
  } as any, []);
  assert.equal(profile.status, 'unverified');
  assert.equal(profile.hasOriginalLink, false);
  assert.equal(profile.hasPublishedTime, false);
});

test('evidenceProfile: 同一文章的跨媒体发布记录计入独立来源', () => {
  const profile = buildEvidenceProfile({
    id: 'with-occurrences',
    title: '某公司发布重要产品',
    sourceName: 'a.com',
    sourceUrl: 'https://a.com/1',
    publishedAt: '2026-09-10T08:00:00Z',
    sourceOccurrences: [
      { sourceName: 'b.com', sourceUrl: 'https://b.com/1', publishedAt: '2026-09-10T09:00:00Z' },
    ],
  } as any, []);
  assert.equal(profile.status, 'corroborated');
  assert.equal(profile.independentSources, 2);
  assert.equal(profile.occurrenceCount, 2);
});

test('sanitizeEvidenceChain: 链接可点击不等于已核验，非法链接会被移除', () => {
  const linked = sanitizeEvidenceChain([{
    id: 'e1',
    claim: '测试论断',
    sourceFact: '官方披露了该事实',
    sourceUrl: 'https://example.com/report',
    confidenceScore: 180,
    reliability: '官方文件',
  }]);
  assert.equal(linked.length, 1);
  assert.equal(linked[0].confidenceScore, 100);
  assert.equal(linked[0].verificationStatus, 'linked');
  assert.equal(linked[0].sourceUrl, 'https://example.com/report');

  const unsafe = sanitizeEvidenceChain([{
    claim: '测试论断',
    sourceFact: '来源未知',
    sourceUrl: 'javascript:alert(1)',
  }]);
  assert.equal(unsafe[0].verificationStatus, 'unlinked');
  assert.equal(unsafe[0].sourceUrl, null);
});

test('sanitizeEnrichPayload: AI 来源线索永远不能自报核验通过', () => {
  const cleaned = sanitizeEnrichPayload({
    rippleEffect: {
      stages: [],
      knowledgeGraph: [],
      multiSources: [{ sourceName: '某媒体', tier: 'Tier 1', stance: '中性', verified: true, excerpt: '摘录' }],
    },
  });
  assert.equal(cleaned.rippleEffect.multiSources[0].verified, false);
});

test('sanitizeRegionImpact: 地区传导只保留结构化条件假设', () => {
  const value = sanitizeRegionImpact({
    whyHere: '地区拥有产业集群，材料说明存在配套供应链。',
    drivers: ['供应链集中', '', '政策试点'],
    crossRegion: [
      { target: '周边制造地区', direction: 'pressure', mechanism: '订单可能重新分配', confidence: '中' },
      { target: '', direction: 'benefit', mechanism: '无效条目' },
    ],
    watch: ['本地开工率', '订单变化'],
    guidance: '继续核验本地订单与产能数据。',
    limits: '若供应链没有实际迁移，则判断失效。',
  });
  assert.equal(value.drivers.length, 2);
  assert.equal(value.crossRegion.length, 1);
  assert.equal(value.crossRegion[0].direction, 'pressure');
  assert.equal(value.crossRegion[0].confidence, '中');
});

test('sanitizeFrequencyAnalysis: 频发归因保留证据和替代解释', () => {
  const value = sanitizeFrequencyAnalysis({
    observedPattern: '近 30 天 AI 与软件报道增加。',
    possibleDrivers: [
      { driver: '产品集中发布', evidence: '材料提到多项发布', mechanism: '集中发布推高报道量', confidence: '中' },
      { driver: '', evidence: '无效' },
    ],
    alternativeExplanation: '也可能只是同一来源集中报道。',
    watch: ['后续发布节奏', '来源是否增加'],
    limits: '材料不足以证明因果。',
  });
  assert.equal(value.possibleDrivers.length, 1);
  assert.equal(value.possibleDrivers[0].confidence, '中');
  assert.equal(value.watch.length, 2);
});

test('sanitizeGrayscaleAssessment: 灰度分数不冒充概率，黑白阈值由系统计算', () => {
  const action = sanitizeGrayscaleAssessment({
    memberships: [
      { hypothesis: '产业利好', score: 72 },
      { hypothesis: '产业利空', score: 28 },
    ],
    evidenceStrength: '中',
    support: ['政策支持', '订单增长'],
    oppose: ['执行周期较长'],
    uncertain: ['政策落地时间'],
    reverseRisks: ['需求不及预期'],
    decisionReason: '达到行动评估阈值。',
  });
  assert.equal(action?.decision, '行动');
  assert.equal(action?.memberships[0].score, 72);

  const observe = sanitizeGrayscaleAssessment({
    memberships: [{ hypothesis: '产业利好', score: 68 }],
    evidenceStrength: '低',
    support: ['单一线索'],
    oppose: ['反向案例'],
    uncertain: ['缺少数据'],
    reverseRisks: [],
  });
  assert.equal(observe?.decision, '持续观察');
  assert.equal(observe?.evidenceStrength, '低');
});

test('predictionCalibration: Brier / Log Loss / 分桶口径', () => {
  const points = [
    { probability: 0.8, outcome: 1 as const },
    { probability: 0.2, outcome: 0 as const },
  ];
  const m = forecastMetrics(points);
  assert.equal(m.count, 2);
  assert.equal(m.brier, 0.04);

  const contract = {
    status: 'verified_hit_ai',
    actualOutcome: '官方结果已披露并完成核验。',
  } as any;
  assert.deepEqual(predictionOutcomes(contract), { user: 0, ai: 1 });
  assert.equal(predictionOutcomes({ status: 'verified_hit_ai' } as any), null);

  const buckets = calibrationBuckets(points, points);
  assert.equal(buckets.length, 5);
  assert.equal(buckets[1].userCount, 1);
  assert.equal(buckets[4].aiObserved, 100);
});

test('sourceVerification: 阻止本机、内网、链路本地和保留地址', () => {
  assert.equal(isPublicAddress('127.0.0.1'), false);
  assert.equal(isPublicAddress('10.1.2.3'), false);
  assert.equal(isPublicAddress('172.16.0.1'), false);
  assert.equal(isPublicAddress('192.168.1.1'), false);
  assert.equal(isPublicAddress('169.254.1.1'), false);
  assert.equal(isPublicAddress('::1'), false);
  assert.equal(isPublicAddress('fc00::1'), false);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2001:4860:4860::8888'), true);
});

test('sourceVerification: HTML 元数据、正文归一与引句比较', () => {
  const page = extractPageMetadata(`
    <html><head>
      <title>官方发布新计划</title>
      <meta name="description" content="官方披露新计划">
      <link rel="canonical" href="https://example.com/canonical">
    </head><body><script>忽略</script><p>公司宣布：将于 2027 年扩大生产。</p></body></html>
  `);
  assert.equal(page.title, '官方发布新计划');
  assert.equal(page.canonicalUrl, 'https://example.com/canonical');
  assert.ok(page.text.includes('公司宣布'));
  assert.equal(normalizeComparable('公司宣布：将于 2027 年扩大生产。'), '公司宣布将于2027年扩大生产');
  const context = findQuoteContext('标题。公司宣布：将于 2027 年扩大生产。以上为详情。', '公司宣布将于2027年扩大生产');
  assert.ok(context);
  assert.ok(context!.context.includes('扩大生产'));
  assert.ok(context!.offset > 0);
  assert.equal(sourceCheckKey('https://example.com/a', '公司宣布'), sourceCheckKey('https://example.com/a', '公司宣布'));
  assert.deepEqual(evaluateQuoteMatch(page.text, '公司宣布将于2027年扩大生产'), {
    status: 'verified_quote',
    quoteFound: true,
  });
  const revived = revalidateCachedQuote(
    { status: 'quote_not_found', requestedUrl: 'https://example.com/a', fetchedAt: '2026-09-12T00:00:00.000Z' },
    page.text,
    '公司宣布将于2027年扩大生产'
  );
  assert.equal(revived.status, 'verified_quote');
  assert.equal(revived.quoteFound, true);
  assert.equal(
    revalidateCachedQuote({ status: 'quote_not_found' }, null, '公司宣布将于2027年扩大生产'),
    null
  );
});

test('sourceVerification: AI 自定义地址必须使用无凭据公网 HTTPS', async () => {
  await assert.rejects(
    validatePublicOutboundBaseUrl('http://api.example.com'),
    /https_required/
  );
  await assert.rejects(
    validatePublicOutboundBaseUrl('https://user:pass@api.example.com'),
    /url_credentials_not_allowed/
  );
});

test('entityGraph: 只使用真实 entityMentions，并按别名字典聚合', () => {
  const articles = [
    {
      id: 'a',
      title: 'NVIDIA 发布新品',
      entityMentions: [
        { name: 'NVIDIA', type: '公司', confidence: 0.9 },
        { name: 'OpenAI', type: '公司', confidence: 0.8 },
      ],
    },
    {
      id: 'b',
      title: '英伟达扩大供应',
      entityMentions: [
        { name: '英伟达', type: '公司', confidence: 0.85 },
      ],
    },
  ] as any;
  assert.equal(canonicalEntityName('NVIDIA'), '英伟达');
  assert.equal(canonicalEntityId('NVIDIA'), 'org-nvidia');
  assert.equal(canonicalEntityId('英伟达'), 'org-nvidia');
  assert.notEqual(canonicalEntityId('某未知公司'), canonicalEntityId('另一家未知公司'));
  assert.equal(entityIdentity('未知'), null);
  const normalized = normalizeEntityMentions(
    [
      { name: 'NVIDIA', type: '公司', confidence: 0.7 },
      { name: '英伟达', type: '公司', confidence: 0.9 },
      { name: 'OpenAI', type: '公司', confidence: 0.8 },
    ],
    { title: 'NVIDIA 与 OpenAI 发布新品', summary: '英伟达扩大供应' }
  );
  assert.deepEqual(normalized, [
    {
      id: 'org-nvidia',
      surface: 'NVIDIA',
      name: '英伟达',
      type: '公司',
      confidence: 0.9,
      evidence: { field: 'title', start: 0, end: 6, exact: true },
    },
    {
      id: 'org-openai',
      surface: 'OpenAI',
      name: 'OpenAI',
      type: '公司',
      confidence: 0.8,
      evidence: { field: 'title', start: 9, end: 15, exact: true },
    },
  ]);
  const graph = buildEntityGraph(articles);
  assert.equal(graph[0].name, '英伟达');
  assert.equal(graph[0].count, 2);
  assert.deepEqual(graph[0].articleIds, ['a', 'b']);
  assert.deepEqual(entityCoMentions(articles)[0], { a: 'OpenAI', b: '英伟达', count: 1 });
});

test('regionSemantics: 区分提及、发生、受影响和未标范围', () => {
  const mentions = normalizeRegionMentions([
    { region: '美国', scope: 'mentioned', confidence: 0.8 },
    { region: '美国', scope: 'event', confidence: 0.7 },
    { region: '美国', scope: 'event', confidence: 0.9 },
    { region: '中国大陆', scope: 'invalid', confidence: 0.5 },
  ]);
  assert.deepEqual(mentions, [
    { region: '美国', scope: 'mentioned', confidence: 0.8 },
    { region: '美国', scope: 'event', confidence: 0.9 },
    { region: '中国大陆', scope: 'unspecified', confidence: 0.5 },
  ]);
  assert.equal(regionScopeOf({ scope: 'affected' } as any), 'affected');
});

test('methodRegistry: 认证标准与方法类型分离', () => {
  assert.equal(certificationSpec('source_page_verification').id, 'deterministic');
  assert.equal(certificationSpec('lexicon_sentiment').id, 'heuristic');
  assert.equal(certificationSpec('model_extraction').id, 'ai_single');
  assert.equal(certificationSpec('model_forecast').id, 'prediction_uncalibrated');
  assert.equal(certificationSpec('calibrated_forecast').id, 'prediction_calibrated');
});

test('aiCache: 缓存键包含内容和版本，并发请求只执行一次', async () => {
  clearEnrichCache();
  const base = {
    articleId: 'a1',
    title: '同一标题',
    content: '正文版本一',
    provider: 'deepseek',
    model: 'deepseek-chat',
    promptVersion: 'v1',
  };
  assert.notEqual(enrichKey(base), enrichKey({ ...base, content: '正文版本二' }));
  assert.notEqual(enrichKey(base), enrichKey({ ...base, model: 'deepseek-reasoner' }));
  assert.notEqual(
    predictKey({ question: '问题', provider: 'deepseek', model: 'deepseek-chat' }),
    predictKey({ question: '问题', provider: 'deepseek', model: 'deepseek-reasoner' })
  );

  let calls = 0;
  const key = enrichKey({ ...base, articleId: 'concurrent-test' });
  const loader = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { value: 1 };
  };
  const [first, second] = await Promise.all([
    getOrCreateCached(key, loader),
    getOrCreateCached(key, loader),
  ]);
  assert.equal(calls, 1);
  assert.equal(first.data.value, 1);
  assert.equal(second.data.value, 1);
  assert.equal(first.deduped || second.deduped, true);
});

test('predictionLedger: 创建后不可覆盖，结果只能锁定一次并校验哈希', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jianwei-ledger-'));
  const previousDb = process.env.JIANWEI_DB_FILE;
  process.env.JIANWEI_DB_FILE = path.join(dir, 'ledger.db');
  try {
    const database = await import('../src/server/database.ts');
    const user = database.createUser({
      username: 'editor-test',
      password: 'Strong-Password-123',
      role: 'editor',
    });
    const session = database.createUserSession({
      username: 'editor-test',
      password: 'Strong-Password-123',
    });
    assert.equal(session.ok, true);
    if (!session.ok) throw new Error('session should be created');
    assert.equal(session.user.id, user.id);
    assert.equal(database.resolveUserSession(session.token)?.role, 'editor');
    database.revokeUserSession(session.token);
    assert.equal(database.resolveUserSession(session.token), null);
    const admin = database.createUser({
      username: 'admin-test',
      password: 'Strong-Admin-Password-456',
      role: 'admin',
    });
    const adminSession = database.createUserSession({
      username: 'admin-test',
      password: 'Strong-Admin-Password-456',
    });
    assert.equal(adminSession.ok, true);
    if (!adminSession.ok) throw new Error('admin session should be created');
    database.resetUserPassword(admin.id, 'New-Admin-Password-789');
    assert.equal(database.resolveUserSession(adminSession.token), null);
    assert.throws(
      () => database.updateUser({ id: admin.id, active: false }),
      /cannot_remove_last_admin/
    );
    const firstPreferences = database.saveUserPreferences({
      userId: user.id,
      payload: { nickname: '编辑测试', followedTags: ['AI'] },
      expectedVersion: 0,
    });
    assert.equal(firstPreferences.ok, true);
    assert.equal(database.getUserPreferences(user.id).payload?.nickname, '编辑测试');
    assert.equal(database.saveUserPreferences({
      userId: user.id,
      payload: { nickname: '冲突版本' },
      expectedVersion: 0,
    }).ok, false);
    const forcedUser = database.createUser({
      username: 'forced-test',
      password: 'Initial-Password-123',
      role: 'viewer',
      mustChangePassword: true,
    });
    const forcedSession = database.createUserSession({
      username: 'forced-test',
      password: 'Initial-Password-123',
    });
    assert.equal(forcedSession.ok, true);
    if (!forcedSession.ok) throw new Error('forced session should be created');
    assert.equal(forcedSession.user.mustChangePassword, true);
    assert.equal(database.changeUserPassword({
      userId: forcedUser.id,
      currentPassword: 'Initial-Password-123',
      newPassword: 'Changed-Password-456',
    }), true);
    assert.equal(database.resolveUserSession(forcedSession.token), null);
    const changedSession = database.createUserSession({
      username: 'forced-test',
      password: 'Changed-Password-456',
    });
    assert.equal(changedSession.ok, true);
    if (!changedSession.ok) throw new Error('changed session should be created');
    assert.equal(changedSession.user.mustChangePassword, false);
    const pending = database.createUser({
      username: 'pending-test',
      password: 'Pending-Password-123',
      role: 'viewer',
      approvalStatus: 'pending',
    });
    const pendingSession = database.createUserSession({
      username: 'pending-test',
      password: 'Pending-Password-123',
    });
    assert.deepEqual(pendingSession, { ok: false, reason: 'pending_approval' });
    database.updateUser({ id: pending.id, approvalStatus: 'approved', approvedBy: 'admin-test' });
    assert.equal(database.createUserSession({
      username: 'pending-test',
      password: 'Pending-Password-123',
    }).ok, true);
    const input = {
      id: 'contract-test-1',
      articleId: 'article-1',
      question: '测试命题是否发生？',
      createdAt: '2026-09-13T00:00:00.000Z',
      dataCutoffAt: '2026-09-13T00:00:00.000Z',
      targetVerificationDate: '2026-12-13',
      status: 'pending',
    };
    const created = database.createPredictionContract(input);
    assert.equal(created.ledger, 'server');
    assert.equal(created.integrityValid, true);
    assert.throws(() => database.createPredictionContract(input), /UNIQUE/);
    const editorContract = database.createPredictionContract({
      ...input,
      id: 'contract-test-2',
      ownerUserId: user.id,
    });
    assert.equal(database.listPredictionContracts('local').length, 1);
    assert.equal(database.listPredictionContracts(user.id).length, 1);
    assert.equal(database.deletePendingPredictionContract('contract-test-2', 'local'), false);
    assert.equal(database.deletePendingPredictionContract('contract-test-2', user.id), true);
    assert.equal(editorContract.ownerUserId, user.id);

    const resolved = database.resolvePredictionContract({
      id: input.id,
      status: 'verified_hit_user',
      actualOutcome: '官方结果已披露并完成核验。',
      outcomeEvidence: '官方公告明确披露了测试结果与证据。',
      brierScore: 0.04,
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.contract.status, 'verified_hit_user');
      assert.equal(resolved.contract.integrityValid, true);
    }

    const listed = database.listPredictionContracts();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].integrityValid, true);
    assert.equal(listed[0].reviewStatus, 'provisional');
    assert.equal(database.recordPredictionOutcomeReview({
      contractId: input.id,
      reviewer: '复核员乙',
      decision: 'confirm',
      notes: '已独立核对官方来源。',
    }).ok, true);
    assert.equal(database.listPredictionContracts()[0].reviewStatus, 'confirmed');
    assert.equal(database.recordPredictionOutcomeReview({
      contractId: input.id,
      reviewer: '复核员乙',
      decision: 'dispute',
    }).ok, false);
    const exported = database.buildPredictionLedgerExport();
    assert.equal(exported.payload.summary.contracts, 1);
    database.persistPredictionLedgerSnapshot({
      version: 'v-test-1',
      dataHash: exported.dataHash,
      payload: exported.payload,
    });
    assert.equal(database.listPredictionLedgerSnapshots()[0].dataHash, exported.dataHash);
    assert.equal(database.loadPredictionLedgerSnapshot('v-test-1')?.integrityValid, true);
    assert.throws(() => database.persistPredictionLedgerSnapshot({
      version: 'v-test-1',
      dataHash: exported.dataHash,
      payload: exported.payload,
    }), /UNIQUE/);
    database.recordAuditEvent({ actor: 'tester', action: 'audit.test', entityId: 'one' });
    database.recordAuditEvent({ actor: 'tester', action: 'audit.test', entityId: 'two' });
    assert.equal(database.listAuditEvents().chain.valid, true);
    const backupPath = path.join(dir, 'corpus-backup.db');
    assert.equal(database.backupDatabase(backupPath), true);
    assert.equal(database.verifyDatabaseBackup(backupPath).ok, true);
    const { DatabaseSync } = await import('node:sqlite');
    const tamper = new DatabaseSync(path.join(dir, 'ledger.db'));
    tamper.prepare("UPDATE audit_events SET metadata = ? WHERE id = 1").run('{"tampered":true}');
    tamper.close();
    assert.equal(database.listAuditEvents().chain.valid, false);
    assert.equal(database.restoreDatabaseBackup(backupPath, { confirmation: 'NO' }).ok, false);
    assert.equal(database.restoreDatabaseBackup(backupPath, { confirmation: 'RESTORE' }).ok, true);
    assert.equal(database.listAuditEvents().chain.valid, true);
    assert.equal(database.listPredictionContracts().length, 1);
    assert.equal(database.deletePendingPredictionContract(input.id), false);
    assert.equal(database.resolvePredictionContract({
      id: input.id,
      status: 'verified_hit_ai',
      actualOutcome: '尝试再次修改',
      outcomeEvidence: '这是一次不允许的重复裁决修改尝试。',
    }).ok, false);
  } finally {
    if (previousDb === undefined) delete process.env.JIANWEI_DB_FILE;
    else process.env.JIANWEI_DB_FILE = previousDb;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('predictionLedger: 到期状态按本地自然日计算且不自动裁决', () => {
  const now = new Date(2026, 8, 13, 12, 0, 0);
  assert.equal(predictionDueInfo('2026-09-12', 'pending', now).state, 'overdue');
  assert.equal(predictionDueInfo('2026-09-13', 'pending', now).state, 'due_today');
  assert.equal(predictionDueInfo('2026-09-18', 'pending', now).state, 'due_soon');
  assert.equal(predictionDueInfo('2026-10-13', 'pending', now).state, 'upcoming');
  assert.equal(predictionDueInfo('bad-date', 'pending', now).state, 'invalid');
  assert.equal(predictionDueInfo('2026-09-13', 'verified_hit_ai', now).state, 'resolved');
});

test('sourceGrouping: 已知集团合并，未知来源只按域名区分', () => {
  assert.equal(sourceGroupKey('news.cn', 'https://news.cn/a'), 'group-xinhua');
  assert.equal(sourceGroupKey('xinhuanet.com', 'https://www.xinhuanet.com/a'), 'group-xinhua');
  assert.equal(sourceGroupInfo('news.cn', 'https://news.cn/a').label, '新华社系');
  assert.equal(sourceGroupKey('a.example', 'https://a.example/x'), 'domain:a.example');
  assert.equal(sourceGroupKey('b.example', 'https://b.example/x'), 'domain:b.example');
  assert.equal(sourceGroupInfo('b.example').known, false);
});

test('syndication: 确认 URL/已知同集团，文本相似只标疑似', () => {
  const base = {
    isExternal: true,
    subtitle: '',
    summary: '公司发布新品并宣布扩大生产规模，供应链将同步调整。',
    publishedAt: '2026-09-12T08:00:00Z',
  };
  const duplicate = findSyndicationCandidates([
    { ...base, id: 'a', title: '公司发布新品', sourceName: 'a.example', sourceUrl: 'https://a.example/story?utm_source=x' },
    { ...base, id: 'b', title: '公司发布新品', sourceName: 'b.example', sourceUrl: 'https://a.example/story' },
  ] as any);
  assert.equal(duplicate[0]?.signal, 'duplicate_url');
  assert.equal(duplicate[0]?.confirmed, true);

  const sameGroup = findSyndicationCandidates([
    { ...base, id: 'x', title: '官方发布重要政策', sourceName: 'news.cn', sourceUrl: 'https://news.cn/a' },
    { ...base, id: 'y', title: '官方发布重要政策', sourceName: 'xinhuanet.com', sourceUrl: 'https://xinhuanet.com/b' },
  ] as any);
  assert.equal(sameGroup[0]?.signal, 'known_same_group');
  assert.equal(sameGroup[0]?.confirmed, true);

  const likely = findSyndicationCandidates([
    { ...base, id: 'm', title: '某公司发布新一代产品并扩大生产', sourceName: 'm.example', sourceUrl: 'https://m.example/a' },
    { ...base, id: 'n', title: '某公司发布新一代产品并扩大生产规模', sourceName: 'n.example', sourceUrl: 'https://n.example/b' },
  ] as any);
  assert.ok(['same_headline', 'likely_text_reuse'].includes(likely[0]?.signal));
  assert.equal(likely[0]?.confirmed, false);
  assert.equal(likely[0]?.textBasis, 'excerpt');
});

test('syndication: 双方都有正文时按正文比较，传播链按小时而不是毫秒', () => {
  const summary = '公司发布新品并宣布扩大生产规模，供应链将同步调整。';
  const title = '公司宣布扩大海外产能并调整供应链';
  const articles = [
    {
      id: 'a',
      isExternal: true,
      title,
      subtitle: '',
      summary,
      sourceName: 'a.example',
      sourceUrl: 'https://a.example/a',
      publishedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'b',
      isExternal: true,
      title,
      subtitle: '',
      summary,
      sourceName: 'b.example',
      sourceUrl: 'https://b.example/b',
      publishedAt: '2026-09-12T10:00:00Z',
    },
  ] as any;
  const pageA = `${'甲'.repeat(220)}产能细节与交付时间表`;
  const pageB = `${'乙'.repeat(220)}财务人事与完全不同的说明`;
  const withPages = findSyndicationCandidates(articles, 5, new Map([['a', pageA], ['b', pageB]]));
  const withoutPages = findSyndicationCandidates(articles, 5);
  assert.equal(withPages[0]?.textBasis, 'page_text');
  assert.ok((withPages[0]?.textSimilarity || 0) < 30);
  assert.equal(withoutPages[0]?.textBasis, 'excerpt');
  assert.ok((withoutPages[0]?.textSimilarity || 0) > 80);

  const oneSided = findSyndicationCandidates(articles, 5, new Map([['a', pageA], ['b', '太短']]));
  assert.equal(oneSided[0]?.textBasis, 'excerpt');

  const graph = buildSyndicationGraph(articles, 10, new Map([['a', pageA], ['b', pageB]]));
  assert.equal(graph.meta.pageTextCount, 2);
  assert.equal(graph.edges[0]?.timeDeltaHours, 2);
  assert.equal(graph.edges[0]?.from, 'a');
  assert.equal(graph.edges[0]?.to, 'b');
  assert.equal(graph.chains[0]?.spanHours, 2);
  assert.deepEqual(graph.chains[0]?.nodes, ['a', 'b']);
});

test('evaluationMetrics: 分类、概率和排序指标', () => {
  const f1 = macroF1([
    { expected: 'positive', predicted: 'positive' },
    { expected: 'negative', predicted: 'negative' },
    { expected: 'neutral', predicted: 'negative' },
  ], ['positive', 'negative', 'neutral']);
  assert.ok(Math.abs(f1 - 5 / 9) < 1e-12);

  const ece = expectedCalibrationError([
    { probability: 0.1, outcome: 0 },
    { probability: 0.9, outcome: 1 },
  ]);
  assert.ok(Math.abs(ece - 0.1) < 1e-12);

  const relevant = new Set(['a', 'c']);
  assert.equal(precisionAtK(relevant, ['a', 'b', 'c'], 3), 2 / 3);
  assert.equal(recallAtK(relevant, ['a', 'b', 'c'], 3), 1);
  assert.ok(ndcgAtK(relevant, ['a', 'b', 'c'], 3) > 0.8);
});

test('evaluationMetrics: Krippendorff nominal alpha', () => {
  assert.equal(krippendorffAlphaNominal([
    ['a', 'a'],
    ['b', 'b'],
  ]), 1);
  assert.equal(krippendorffAlphaNominal([
    ['a', 'b'],
    ['b', 'a'],
  ]), -2);
  assert.equal(krippendorffAlphaNominal([]), null);
});

test('textRetrieval: 中文 n-gram 分词与 BM25 排序', () => {
  const tokens = tokenizeForRetrieval('新能源汽车电池技术');
  assert.ok(tokens.includes('新能'));
  assert.ok(tokens.includes('汽车'));
  assert.ok(tokens.includes('电池'));

  const ranked = rankDocumentsBM25('新能源汽车电池', [
    { id: 'a', title: '新能源汽车电池技术升级', body: '续航与充电效率提升' },
    { id: 'b', title: '手机新品发布', body: '屏幕与影像升级' },
    { id: 'c', title: '动力电池工厂投产', body: '面向新能源汽车客户' },
  ], 3);
  assert.equal(ranked[0].document.id, 'a');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('eventCandidates: 使用标题、实体和时间窗生成待人工判断候选', () => {
  const articles = [
    {
      id: 'a',
      title: '英伟达发布新一代AI芯片',
      summary: '新芯片面向数据中心，计划年内量产。',
      category: '科技前沿',
      sourceName: 'a.example',
      sourceUrl: 'https://a.example/a',
      publishedAt: '2026-09-12T08:00:00Z',
      entityMentions: [{ name: '英伟达', type: '公司', confidence: 0.9 }],
    },
    {
      id: 'b',
      title: 'NVIDIA推出面向数据中心的AI芯片',
      summary: '新一代芯片将于年内量产。',
      category: '科技前沿',
      sourceName: 'b.example',
      sourceUrl: 'https://b.example/b',
      publishedAt: '2026-09-12T10:00:00Z',
      entityMentions: [{ name: 'NVIDIA', type: '公司', confidence: 0.85 }],
    },
    {
      id: 'c',
      title: '某车企发布新款SUV',
      summary: '新车聚焦家庭市场。',
      category: '产业纵深',
      sourceName: 'c.example',
      sourceUrl: 'https://c.example/c',
      publishedAt: '2026-09-12T09:00:00Z',
      entityMentions: [],
    },
  ] as any;
  const candidates = rankEventCandidates(articles, 5, 0.05);
  assert.equal(candidates[0].articleA.id, 'a');
  assert.equal(candidates[0].articleB.id, 'b');
  assert.deepEqual(candidates[0].sharedEntities, ['英伟达']);
});

test('demoDataEnabledFrom: 只有显式 1 才加载演示语料', () => {
  assert.equal(demoDataEnabledFrom(undefined), false);
  assert.equal(demoDataEnabledFrom(''), false);
  assert.equal(demoDataEnabledFrom('0'), false);
  assert.equal(demoDataEnabledFrom('true'), false);
  assert.equal(demoDataEnabledFrom('1'), true);
});

test('feedMaxAgeDaysFrom: 摄取与清理共用同一默认窗口', () => {
  assert.equal(feedMaxAgeDaysFrom(undefined), 30);
  assert.equal(feedMaxAgeDaysFrom(''), 30);
  assert.equal(feedMaxAgeDaysFrom('45'), 45);
  assert.equal(feedMaxAgeDaysFrom('nope'), 30);
});

test('appendActionMemo: 追加行动备忘并跳过重复', () => {
  assert.equal(appendActionMemo('', '盯紧交付'), '盯紧交付');
  assert.equal(appendActionMemo('已有', '盯紧交付'), '已有\n\n盯紧交付');
  assert.equal(appendActionMemo('已有\n\n盯紧交付', '盯紧交付'), '已有\n\n盯紧交付');
  assert.equal(appendActionMemo('abcdef', 'xyz', 6), 'abcdef');
});

test('planArticlePersistence: 未变化的文章不写，重复 id 以最后一条为准', () => {
  const known = new Map([
    ['keep', 'hash-keep'],
    ['edit', 'hash-old'],
    ['gone', 'hash-gone'],
  ]);
  const plan = planArticlePersistence([
    { id: 'keep', hash: 'hash-keep' },
    { id: 'edit', hash: 'hash-new' },
    { id: 'dup', hash: 'hash-first' },
    { id: 'dup', hash: 'hash-second' },
    { id: '', hash: 'ignored' },
  ], known, false);
  assert.deepEqual(plan.writeIds, ['edit', 'dup']);
  assert.deepEqual(plan.reindexIds, []);
  assert.deepEqual(plan.removedIds, ['gone']);

  const stale = planArticlePersistence([
    { id: 'keep', hash: 'hash-keep' },
    { id: 'edit', hash: 'hash-new' },
  ], known, true);
  assert.deepEqual(stale.writeIds, ['edit']);
  assert.deepEqual(stale.reindexIds, ['keep']);
  assert.deepEqual(stale.removedIds, ['gone']);
});

test('articleIdsToHash: 只重算脏文章和没有哈希的新文章', () => {
  const known = new Map([
    ['keep', 'hash-keep'],
    ['edit', 'hash-old'],
    ['blank', ''],
  ]);
  const dirty = new Set(['edit']);
  const ids = articleIdsToHash(['keep', 'edit', 'fresh', 'blank', ''], known, dirty);
  assert.deepEqual([...ids], ['edit', 'fresh', 'blank']);
  assert.deepEqual([...articleIdsToHash(['keep', 'edit'], known, null)], ['keep', 'edit']);
  assert.deepEqual([...articleIdsToHash(['keep'], known, new Set())], []);
});

function referenceContract(id: string, overrides: Partial<PredictionContract> = {}): PredictionContract {
  return {
    id,
    articleId: 'a',
    articleTitle: '标题',
    articleCategory: '科技',
    question: `问题 ${id}`,
    createdAt: '2026-01-01',
    targetVerificationDate: '2026-10-05',
    userPred: {
      direction: 'positive',
      directionText: '是',
      confidence: 60,
      premises: [],
      falsifiableIndicator: '指标',
    },
    aiPred: {
      modelName: '模型',
      direction: 'negative',
      directionText: '否',
      confidence: 40,
      verdict: '判断',
    },
    gapSummary: '',
    status: 'verified_hit_user',
    actualOutcome: '已发生',
    ledger: 'server',
    integrityValid: true,
    reviewStatus: 'confirmed',
    ...overrides,
  };
}

test('forecastReference: 样本不足不给基准率，到期日程不含概率', () => {
  const shortSample = Array.from({ length: 19 }, (_, index) => referenceContract(`short-${index}`));
  shortSample.push(
    referenceContract('miss', { status: 'verified_both_miss', actualOutcome: '都未中' }),
    referenceContract('local', { ledger: 'local' }),
    referenceContract('unconfirmed', { reviewStatus: 'provisional' }),
    referenceContract('neutral', {
      userPred: {
        direction: 'neutral',
        directionText: '中性',
        confidence: 50,
        premises: [],
        falsifiableIndicator: '指标',
      },
      status: 'verified_both_win',
    }),
    referenceContract('other', { articleCategory: '宏观' }),
  );
  const short = categoryBaseRate(shortSample, '科技');
  assert.equal(short.binaryCount, 19);
  assert.equal(short.positiveRate, null);
  assert.equal(short.note.includes('不计算基准率'), true);

  const enough = [
    ...Array.from({ length: 8 }, (_, index) => referenceContract(`pos-${index}`)),
    ...Array.from({ length: 12 }, (_, index) =>
      referenceContract(`neg-${index}`, {
        userPred: {
          direction: 'negative',
          directionText: '否',
          confidence: 70,
          premises: [],
          falsifiableIndicator: '指标',
        },
        status: 'verified_hit_user',
      }),
    ),
  ];
  const rate = categoryBaseRate(enough, '科技');
  assert.equal(rate.binaryCount, 20);
  assert.equal(rate.positiveCount, 8);
  assert.equal(rate.positiveRate, 40);

  const aiPositive = categoryBaseRate(
    [
      referenceContract('ai-pos', {
        status: 'verified_hit_ai',
        userPred: {
          direction: 'negative',
          directionText: '否',
          confidence: 30,
          premises: [],
          falsifiableIndicator: '指标',
        },
        aiPred: {
          modelName: '模型',
          direction: 'positive',
          directionText: '是',
          confidence: 80,
          verdict: '判断',
        },
      }),
    ],
    '科技',
  );
  assert.equal(aiPositive.binaryCount, 1);
  assert.equal(aiPositive.positiveCount, 1);
  assert.equal(aiPositive.positiveRate, null);

  const now = new Date(2026, 9, 5, 12, 0, 0);
  const due = dueWatchItems(
    [
      referenceContract('overdue', { status: 'pending', targetVerificationDate: '2026-10-04', actualOutcome: '' }),
      referenceContract('today', { status: 'pending', targetVerificationDate: '2026-10-05', actualOutcome: '' }),
      referenceContract('tomorrow', { status: 'pending', targetVerificationDate: '2026-10-06', actualOutcome: '' }),
      referenceContract('later', { status: 'pending', targetVerificationDate: '2026-10-07', actualOutcome: '' }),
      referenceContract('done', { status: 'verified_hit_user', targetVerificationDate: '2026-10-05' }),
    ],
    now,
  );
  assert.deepEqual(due.map((item) => item.id), ['overdue', 'today', 'tomorrow']);
  assert.deepEqual(due.map((item) => item.state), ['overdue', 'due_today', 'due_tomorrow']);
  assert.equal(due.some((item) => 'probability' in item), false);
});
