import React, { useMemo } from 'react';
import { Compass, Eye, ShieldCheck, TriangleAlert } from 'lucide-react';
import { NewsArticle } from '../../types';
import { SECTOR_TAXONOMY, detectSectors } from '../../utils/sectorTaxonomy';
import { buildEvidenceProfile } from '../../utils/evidenceProfile';
import { MethodBadge } from '../common/MethodBadge';
import { articleSortTime } from '../../utils/articleTime';

interface SituationReadoutPanelProps {
  articles: NewsArticle[];
}

export const SituationReadoutPanel: React.FC<SituationReadoutPanelProps> = ({ articles }) => {
  const derived = useMemo(() => {
    const sources = new Set(articles.map((article) => article.sourceName).filter(Boolean));
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = articles.filter((article) => {
      const time = articleSortTime(article);
      return time >= dayStart.getTime();
    }).length;

    const sectorCounts = SECTOR_TAXONOMY.map((sector) => ({
      id: sector.id,
      name: sector.name,
      count: articles.filter((article) => detectSectors(article).includes(sector.id)).length,
    })).sort((a, b) => b.count - a.count);

    let corroborated = 0;
    let singleSource = 0;
    let untraceable = 0;
    for (const article of articles) {
      const profile = buildEvidenceProfile(article, articles);
      if (profile.status === 'corroborated') corroborated += 1;
      if (profile.status === 'single-source') singleSource += 1;
      if (!article.sourceUrl || articleSortTime(article) <= 0) untraceable += 1;
    }

    const total = articles.length;
    const topSectors = sectorCounts.filter((item) => item.count > 0).slice(0, 3);
    const topShare = total > 0 && topSectors[0] ? topSectors[0].count / total : 0;
    const singleRatio = total > 0 ? singleSource / total : 0;

    const readings: string[] = [];
    readings.push(
      total > 0
        ? `当前样本覆盖 ${sources.size} 个来源、${total} 篇条目；来源数量只代表订阅覆盖，不代表信息已经互证。`
        : '当前没有可分析语料，不能生成态势解读。'
    );
    if (topSectors.length > 0) {
      readings.push(
        `覆盖最集中的三个赛道是 ${topSectors.map((item) => `${item.name} ${item.count} 篇`).join('、')}。这反映新闻供给与关注度，不等同于现实产业权重。`
      );
    }
    readings.push(
      `多源印证 ${corroborated} 篇，单源条目 ${singleSource} 篇。多源指不同发布方出现相似报道，仍不自动证明内容为真。`
    );
    if (untraceable > 0) {
      readings.push(`${untraceable} 篇缺少可解析原文链接或发布时间，不能进入高置信追踪。`);
    }

    const guidance: string[] = [];
    if (sources.size < 5) guidance.push('补充多类型 RSS 来源，避免单一媒体议程主导。');
    if (singleRatio >= 0.6) guidance.push('优先对高影响单源条目做原文核验和交叉来源检查。');
    if (topShare >= 0.5 && topSectors[0]) guidance.push(`单一赛道“${topSectors[0].name}”占比偏高，先检查是否存在同源热点或重复转载。`);
    if (untraceable > 0) guidance.push('先补齐链接和发布时间，再进入趋势、地区或预测分析。');
    if (guidance.length === 0) guidance.push('从多源条目中选择可证伪判断，登记观察指标与到期时间。');

    return {
      total,
      sourceCount: sources.size,
      todayCount,
      corroborated,
      singleSource,
      untraceable,
      topSectors,
      readings,
      guidance,
    };
  }, [articles]);

  return (
    <section className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">今日态势解读与行动指引</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">统计负责发现异常，指引只告诉下一步如何核验，不替你下结论。</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MethodBadge methodId="corpus_count" compact />
          <MethodBadge methodId="evidence_profile" compact />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="text-[10px] text-stone-500">来源覆盖</div>
          <div className="text-lg font-mono font-black text-stone-900">{derived.sourceCount}</div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="text-[10px] text-stone-500">今日条目</div>
          <div className="text-lg font-mono font-black text-stone-900">{derived.todayCount}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10px] text-emerald-700">多源印证</div>
          <div className="text-lg font-mono font-black text-emerald-900">{derived.corroborated}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-[10px] text-amber-700">单源条目</div>
          <div className="text-lg font-mono font-black text-amber-900">{derived.singleSource}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-sky-900 mb-2">
            <Eye className="w-4 h-4" /> 怎么解读
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-sky-950">
            {derived.readings.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-sky-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-emerald-900 mb-2">
            <ShieldCheck className="w-4 h-4" /> 下一步指引
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-emerald-950">
            {derived.guidance.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-emerald-600">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[10px] text-stone-500">
        <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
        <span>本解读基于当前订阅语料。赛道为词典匹配，来源互证为标题与发布方规则，不是全网事实真值。</span>
      </div>
    </section>
  );
};
