import type { Express, Request, Response } from 'express';
import { activeProvider, callAI } from '../ai';
import { serverCorpus } from '../corpus';
import { serverDetectSectors, serverSectorList } from '../sectors';
import { taskQueue } from '../taskQueue';
import { parseArticleDate } from '../../utils/articleTime';

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

export function registerAnalysisRoutes(app: Express, applyRateLimit: RateLimiter): void {
  // —— 异步任务查询端点 ——
  app.get('/api/tasks', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, tasks: taskQueue.listTasks() });
  });

  app.get('/api/tasks/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const task = taskQueue.getTask(String(req.params.id));
    if (!task) return res.status(404).json({ error: 'task_not_found' });
    res.json({ ok: true, task });
  });

  // —— 宏观趋势对比研判 (Trend Comparison) ——
  app.post('/api/trend-comparison', applyRateLimit, async (req, res) => {
    try {
      const articles = Array.isArray(req.body?.articles) ? req.body.articles : serverCorpus;
      const now = Date.now();
      const ONE_DAY = 24 * 3600 * 1000;
      const THREE_DAYS = 3 * ONE_DAY;
      const THIRTY_DAYS = 30 * ONE_DAY;

      let todayTotal = 0;
      let last3DaysTotal = 0;
      let last30DaysTotal = 0;

      // 按时间窗口切分
      const wordCountsToday = new Map<string, number>();
      const wordCounts3d = new Map<string, number>();
      const wordCounts30d = new Map<string, number>();

      for (const article of articles) {
        const time = parseArticleDate(article.publishedAt) || now;
        const diff = now - time;
        if (diff <= ONE_DAY) todayTotal++;
        if (diff <= THREE_DAYS) last3DaysTotal++;
        if (diff <= THIRTY_DAYS) last30DaysTotal++;

        const text = `${article.title || ''} ${(article.tags || []).join(' ')} ${article.category || ''}`;
        const sectors = serverDetectSectors(article);

        for (const s of sectors) {
          if (diff <= ONE_DAY) wordCountsToday.set(s, (wordCountsToday.get(s) || 0) + 1);
          if (diff <= THREE_DAYS) wordCounts3d.set(s, (wordCounts3d.get(s) || 0) + 1);
          if (diff <= THIRTY_DAYS) wordCounts30d.set(s, (wordCounts30d.get(s) || 0) + 1);
        }
      }

      const allKeywords = Array.from(new Set([...wordCounts30d.keys(), ...wordCounts3d.keys()]));
      const sectorMap = new Map(serverSectorList().map((s) => [s.id, s.name]));

      const trends = allKeywords.map((kw) => {
        const todayCount = wordCountsToday.get(kw) || 0;
        const prev3dCount = wordCounts3d.get(kw) || 0;
        const prev30dCount = wordCounts30d.get(kw) || 0;
        const kwName = sectorMap.get(kw) || kw;

        const growthRateNum = prev3dCount > 0 ? ((todayCount * 3 - prev3dCount) / prev3dCount) * 100 : todayCount > 0 ? 100 : 0;
        const growthRate = `${growthRateNum >= 0 ? '+' : ''}${Math.round(growthRateNum)}%`;

        let status: 'surge' | 'hot' | 'stable' | 'cooling' = 'stable';
        if (growthRateNum >= 50 && todayCount >= 2) status = 'surge';
        else if (todayCount >= 3) status = 'hot';
        else if (growthRateNum < -20) status = 'cooling';

        const heatIndex = Math.min(100, Math.round(todayCount * 25 + prev3dCount * 5 + (growthRateNum > 0 ? 20 : 0)));

        return {
          keyword: kwName,
          todayCount,
          prev3dCount,
          prev30dCount,
          heatIndex,
          status,
          growthRate,
          insight: `近 24 小时收录 ${todayCount} 篇相关报道，3 日累计 ${prev3dCount} 篇。`,
        };
      })
      .sort((a, b) => b.heatIndex - a.heatIndex)
      .slice(0, 8);

      const topKeywordsStr = trends.slice(0, 3).map((t) => `${t.keyword}(${t.status === 'surge' ? '词频上升' : '活跃'})`).join('、');
      const aiSynthesis = trends.length > 0
        ? `近 24 小时站内词频相对突出：【${topKeywordsStr}】。以上为语料篇数启发式对照，不是全网热度或市场真值。`
        : '当前语料库样本分布平稳，暂无突增赛道；不编造涨跌叙事。';

      res.json({
        ok: true,
        timeWindow: {
          todayTotal,
          last3DaysTotal,
          last30DaysTotal,
        },
        trends,
        aiSynthesis,
      });
    } catch (e: any) {
      console.error('Trend comparison error:', e);
      res.status(500).json({ ok: false, error: 'trend_comparison_failed' });
    }
  });

  // —— 事件全周期演变时序脉络 (Article Timeline) ——
  app.post('/api/article-timeline', applyRateLimit, async (req, res) => {
    const article = req.body?.article;
    if (!article || !article.title) {
      return res.status(400).json({ error: 'article object with title is required' });
    }

    const provider = activeProvider();
    if (!provider) {
      const isTech = String(article.category || '').includes('科技') || String(article.title).includes('AI') || String(article.title).includes('电池');
      const isGov = String(article.category || '').includes('政策') || String(article.title).includes('关税') || String(article.title).includes('监管');

      return res.json({
        summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
        timeline: [
          {
            phase: 'antecedent',
            phaseLabel: '📜 前因与溯源',
            timeLabel: 'T-180D ~ T-30D 酝酿期',
            title: isGov ? '地缘贸易规则重审与前期反补贴立案调查' : isTech ? '上一代架构瓶颈凸显与研发中试线持续投入' : '供需失衡与行业集中度提升',
            detail: '在此次事件爆发前，相关主体已在行业标准制定、供应链原材料备货及专利布局上进行了多轮博弈与测试。',
            impact: '推升了行业准入门槛与单点技术迁移成本。',
            keySignals: ['专利公开激增', '前期政策吹风会', '供应链散件排期延长'],
          },
          {
            phase: 'current',
            phaseLabel: '⚡ 当前关键节点',
            timeLabel: '当前 (T0) 突破发生',
            title: article.title,
            detail: article.summary || article.tongsuSummary || '核心指标落地或关键协议签署，正式确立新的事实标准。',
            impact: article.oneSentenceVerdict || '重塑产业链利润分配格局，倒逼同业竞品调整应对策略。',
            keySignals: ['核心性能突破', '正式通告下发', '同业股价与现货价格波动'],
          },
          {
            phase: 'future',
            phaseLabel: '🔮 潜在未来触发点',
            timeLabel: 'T+30D ~ T+180D 演变窗口',
            title: isGov ? '属地化合规审查落地与关税正式执行节点' : isTech ? '规模化量产良品率爬坡与二代商业化竞品入场' : '上下游议价权重排与新订单周期释放',
            detail: '未来 90 天内需重点关注下游应用端客户采纳率、监管司法审查终裁及供应链二次扩产节奏。',
            impact: '决定该技术或政策是否能成为跨周期主导范式。',
            keySignals: ['客户留存与复购率', '海关通关抽检率', '第三方基准评测报告'],
          },
        ],
      });
    }

    const prompt = `你是全球宏观与产业情报资深分析师。请对以下新闻事件进行深度时序因果穿透，严格梳理出该事件的【前因溯源】、【当前关键节点】和【潜在未来触发点】三阶段演变脉络。

新闻标题：${article.title}
新闻摘要：${article.summary || article.tongsuSummary || ''}
核心判断：${article.oneSentenceVerdict || ''}
所在赛道：${article.category || ''}
发布时间：${article.publishedAt || '近期'}

严格输出 JSON 格式（不要输出 markdown 标记外的其它文字）：
{
  "summary": "一句话概括事件从起因到未来的演变本质",
  "timeline": [
    {
      "phase": "antecedent",
      "phaseLabel": "📜 前因与溯源",
      "timeLabel": "起因阶段 / 过去 1-6 个月",
      "title": "简明节点标题",
      "detail": "深度解析驱动该事件发生的前提、历史铺垫与直接导火索",
      "impact": "对当时格局的影响",
      "keySignals": ["关键催化信号1", "信号2"]
    },
    {
      "phase": "current",
      "phaseLabel": "⚡ 当前关键节点",
      "timeLabel": "当前正在发生",
      "title": "当前突破或核心转折标题",
      "detail": "当前发生的实质性动作、关键数据变动或政策签署",
      "impact": "对当下的直接冲击与行业重塑",
      "keySignals": ["关键突破1", "关键数据2"]
    },
    {
      "phase": "future",
      "phaseLabel": "🔮 潜在未来触发点",
      "timeLabel": "未来 1-6 个月预警",
      "title": "潜在未来演变分支或触发条件",
      "detail": "未来可能发生的次生连锁反应、政策落地窗口或反制动作",
      "impact": "决策者需留意的中长期格局变化",
      "keySignals": ["未来观察指标1", "触发阈值2"]
    }
  ]
}`;

    try {
      const aiText = await callAI(prompt, { json: true, temperature: 0.2 });
      let parsed: any;
      try {
        parsed = JSON.parse(aiText);
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
        return res.json(parsed);
      }
      throw new Error('Invalid timeline structure from AI');
    } catch (err: any) {
      console.error('article-timeline AI error:', err);
      return res.json({
        summary: `围绕《${article.title}》的产业链演变脉络：从前期技术/政策酝酿到当前实质突破，再到后续连锁溢出。`,
        timeline: [
          {
            phase: 'antecedent',
            phaseLabel: '📜 前因与溯源',
            timeLabel: '前序发酵期 (T-180D ~ T-30D)',
            title: '行业前置技术研发与政策立项准备',
            detail: '前期积累的研发投入、实验数据沉淀与地缘政策酝酿构成事件爆发的底层土壤。',
            impact: '催化上下游供应链提前进行产能与技术选型预备。',
            keySignals: ['早期论文与专利申报', '属地政策意见征求稿'],
          },
          {
            phase: 'current',
            phaseLabel: '⚡ 当前关键节点',
            timeLabel: '当前正在发生 (T0)',
            title: article.title,
            detail: article.summary || article.tongsuSummary || '实质性技术点火或官方通告出台，确立全新市场预期。',
            impact: article.oneSentenceVerdict || '重塑行业竞争格局与利润分配机制。',
            keySignals: ['正式发布会 / 官方公报', '行业现货价格与订单异动'],
          },
          {
            phase: 'future',
            phaseLabel: '🔮 潜在未来触发点',
            timeLabel: '未来演变窗口 (T+30D ~ T+180D)',
            title: '商业化规模量产验收与次生政策监管终裁',
            detail: '未来需密切跟进良品率爬坡数据、关键客户装车/部署反馈及海外监管跟进举措。',
            impact: '验证商业闭环成立并决定中长期市场占有率。',
            keySignals: ['首批大宗交付验收', '合规审查与反制通报'],
          },
        ],
      });
    }
  });

  // —— 多源立场冲突仲裁 (Conflicts & Standpoints) ——
  app.post('/api/conflicts', applyRateLimit, async (req, res) => {
    try {
      const specifiedArticles = Array.isArray(req.body?.articles) ? req.body.articles : null;

      if (specifiedArticles && specifiedArticles.length >= 2) {
        const A = specifiedArticles[0];
        const B = specifiedArticles[1];
        const provider = activeProvider();

        if (!provider) {
          return res.json({
            ok: true,
            provider: 'heuristic',
            candidates: [
              {
                topic: `${A.category} ⨉ ${B.category}`,
                sources: [
                  { source: A.sourceName || '来源 A', stance: '中性', quote: (A.summary || A.title).slice(0, 60) },
                  { source: B.sourceName || '来源 B', stance: '中性', quote: (B.summary || B.title).slice(0, 60) },
                ],
                divergence: '互补与侧重差异',
                summary: `来源 A (${A.sourceName}) 侧重于【${A.title}】，而 来源 B (${B.sourceName}) 侧重于【${B.title}】，两篇形成双重视角补充。`,
              },
            ],
          });
        }

        const prompt = `你是「见微 Genway」的多源立场仲裁员。请对以下两篇报道做立场与观点分歧判定，仅输出 JSON：
{"sources":[{"source":"来源A名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"},{"source":"来源B名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"}],"divergence":"一致|分歧|部分分歧","summary":"≤120字的克制仲裁小结"}
来源A（${A.sourceName || '媒体A'}）：${String(A.title)}。${String(A.summary || '')}
来源B（${B.sourceName || '媒体B'}）：${String(B.title)}。${String(B.summary || '')}`;

        const text = await callAI(prompt, { json: true, temperature: 0.2 });
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        return res.json({
          ok: true,
          provider,
          candidates: [
            {
              topic: `${A.category} 对比`,
              sources: parsed?.sources || [
                { source: A.sourceName, stance: '中性', quote: A.title.slice(0, 60) },
                { source: B.sourceName, stance: '中性', quote: B.title.slice(0, 60) },
              ],
              divergence: parsed?.divergence || '视角互补',
              summary: parsed?.summary || '两篇文章互为上下文延伸。',
            },
          ],
        });
      }

      // 常规全库同赛道扫描
      const ext: any[] = serverCorpus.filter(
        (a: any) => a.isExternal === true && ((a.title || '') + (a.summary || '')).trim().length > 2
      );
      if (ext.length < 2) {
        return res.json({ ok: true, candidates: [], note: '语料中外部条目不足 2 篇，无法进行跨源比对。' });
      }

      const groups = new Map<string, any[]>();
      for (const a of ext) {
        for (const id of serverDetectSectors(a)) {
          const arr = groups.get(id) || [];
          arr.push(a);
          groups.set(id, arr);
        }
      }

      const candidates: Array<{ sectorId: string; sectorName: string; items: any[] }> = [];
      for (const sector of serverSectorList()) {
        const items = groups.get(sector.id) || [];
        const sources = new Set(items.map((i) => i.sourceName));
        if (sources.size >= 2 && items.length >= 2) {
          candidates.push({ sectorId: sector.id, sectorName: sector.name, items });
        }
      }
      candidates.sort((a, b) => new Set(b.items.map((i) => i.sourceName)).size - new Set(a.items.map((i) => i.sourceName)).size);
      const top = candidates.slice(0, 3);

      const provider = activeProvider();
      if (!provider) {
        return res.json({ ok: false, reason: 'no_api_key', candidateSectors: top.map((c) => c.sectorName) });
      }

      const results = [];
      for (const cand of top) {
        const picked: any[] = [];
        const usedSrc = new Set<string>();
        for (let i = cand.items.length - 1; i >= 0 && picked.length < 2; i -= 1) {
          const it = cand.items[i];
          if (usedSrc.has(it.sourceName)) continue;
          usedSrc.add(it.sourceName);
          picked.push(it);
        }
        if (picked.length < 2) continue;

        const A = picked[0];
        const B = picked[1];
        const prompt = `你是「见微 Genway」的多源立场仲裁员。请对同一话题（${cand.sectorName}）来自两家不同来源的报道做立场判定，仅输出 JSON：
{"sources":[{"source":"来源A名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"},{"source":"来源B名称","stance":"正面|中性|负面","quote":"该源核心论断原句（≤60字）"}],"divergence":"一致|分歧|部分分歧","summary":"≤120字的克制仲裁小结"}
来源A（${A.sourceName}）：${String(A.title)}。${String(A.summary || '')}
来源B（${B.sourceName}）：${String(B.title)}。${String(B.summary || '')}`;
        const text = await callAI(prompt, { json: true, temperature: 0.2 });
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        }
        if (parsed && Array.isArray(parsed.sources)) {
          results.push({
            topic: cand.sectorName,
            sources: parsed.sources.map((s: any) => ({
              source: String(s?.source || '').slice(0, 80),
              stance: s?.stance === '正面' ? '正面' : s?.stance === '负面' ? '负面' : '中性',
              quote: String(s?.quote || '').slice(0, 120),
            })),
            divergence: String(parsed.divergence || '未知').slice(0, 20),
            summary: String(parsed.summary || '').slice(0, 300),
          });
        }
      }

      res.json({ ok: true, provider, candidates: results, candidateSectors: top.map((c) => c.sectorName) });
    } catch (e: any) {
      console.error('Conflicts error:', e);
      res.json({ ok: false, reason: 'error' });
    }
  });
}
