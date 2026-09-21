import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { ShieldCheck, Globe, Scale, RefreshCw, Link2 } from 'lucide-react';
import { articleSortTime } from '../../utils/articleTime';
import { sourceGroupInfo } from '../../utils/sourceGrouping';
import { MethodBadge } from '../common/MethodBadge';

interface DataSourceHealthPanelProps {
  articles: NewsArticle[];
}

export const DataSourceHealthPanel: React.FC<DataSourceHealthPanelProps> = ({ articles }) => {
  const stats = useMemo(() => {
    const total = articles.length;
    const external = articles.filter((a) => a.isExternal === true);
    const curated = articles.filter((a) => !a.isExternal);

    // 按来源计数（外部=域名；其他=来源名）
    const sourceCounts = new Map<string, number>();
    for (const a of articles) {
      const name = String(a.sourceName || (a.isExternal ? '外部信源' : '未标来源') || '未知');
      sourceCounts.set(name, (sourceCounts.get(name) || 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const withOriginalLink = articles.filter((a) => Boolean(a.sourceUrl)).length;
    const withTimestamp = articles.filter((a) => articleSortTime(a) > 0).length;
    const fullyTraceable = articles.filter((a) => Boolean(a.sourceUrl) && articleSortTime(a) > 0).length;
    const distinctExternalHosts = new Set(external.map((a) => a.sourceName)).size;
    const sourceGroups = external.map((article) => sourceGroupInfo(article.sourceName, article.sourceUrl));
    const knownGroupCount = new Set(sourceGroups.filter((group) => group.known).map((group) => group.key)).size;
    const unknownDomainCount = new Set(sourceGroups.filter((group) => !group.known).map((group) => group.key)).size;

    return {
      total,
      externalCount: external.length,
      curatedCount: curated.length,
      distinctExternalHosts,
      topSources,
      withOriginalLink,
      withTimestamp,
      fullyTraceable,
      knownGroupCount,
      unknownDomainCount,
    };
  }, [articles]);

  const sourceMax = Math.max(...stats.topSources.map((s) => s.count), 1);

  // —— 多源立场冲突仲裁（真实：同话题分组 + 在线模型判定） ——
  interface ArbitrationCase {
    topic: string;
    sources: Array<{ source: string; stance: string; quote: string }>;
    divergence: string;
    summary: string;
  }
  const [arb, setArb] = useState<{ ok: boolean; candidates?: ArbitrationCase[]; note?: string; reason?: string; candidateSectors?: string[] } | null>(null);
  const [arbLoading, setArbLoading] = useState(false);
  const runArbitration = async () => {
    if (arbLoading) return;
    setArbLoading(true);
    try {
      const r = await fetch('/api/conflicts', { method: 'POST' });
      const d = await r.json();
      setArb(d as { ok: boolean; candidates?: ArbitrationCase[]; note?: string; reason?: string; candidateSectors?: string[] });
    } catch {
      setArb({ ok: false, reason: 'error' });
    } finally {
      setArbLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              数据源基础完整度（语料派生统计）
            </h3>
            <MethodBadge methodId="source_grouping" compact />
            <p className="text-xs text-stone-500">
              基于当前运行时语料 {stats.total} 篇（RSS 外部 {stats.externalCount} / 其他来源 {stats.curatedCount}）统计来源构成与可追溯信息。
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-serif font-bold text-emerald-950">原文+时间可追溯</span>
          <span className="text-lg font-serif font-black text-emerald-800 font-mono">
            {stats.fullyTraceable}/{stats.total}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 font-mono">
        这里不合成“健康分”：原文链接、发布时间与来源数量是不同维度，任意加权都会制造伪精确。
        当前语料 {stats.total} 篇、外部来源 {stats.distinctExternalHosts} 个。
        已知来源集团 {stats.knownGroupCount} 个，母集团未登记域名 {stats.unknownDomainCount} 个。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 来源构成（真实计数） */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
          <div className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-1.5">
            <Globe className="w-4 h-4 text-emerald-700" />
            <span>来源构成（按条目计数，Top {stats.topSources.length}）</span>
          </div>

          {stats.topSources.length > 0 ? (
            <div className="space-y-2 text-xs">
              {stats.topSources.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="truncate">{s.name}</span>
                    <span className="font-mono font-bold">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(s.count / sourceMax) * 100}%` }}
                      className="bg-emerald-600 h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-stone-400">暂无语料。</div>
          )}
        </div>

        {/* 可追溯性覆盖 */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
          <div className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-1.5">
            <Link2 className="w-4 h-4 text-emerald-700" />
            <span>可追溯信息覆盖</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: '原文链接', count: stats.withOriginalLink },
              { label: '可解析发布时间', count: stats.withTimestamp },
              { label: '两者齐全', count: stats.fullyTraceable },
            ].map((item) => (
              <div key={item.label} className="flex items-center space-x-2">
                <span className="w-28 font-mono text-stone-700">{item.label}</span>
                <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${stats.total ? (item.count / stats.total) * 100 : 0}%` }}
                    className="h-full bg-emerald-600"
                  />
                </div>
                <span className="w-16 text-right font-mono text-stone-600">{item.count} 条</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-stone-400 leading-relaxed">
            “来源可追溯”不等于内容为真。AI 列出的媒体名称不计入此统计，也不构成独立交叉验证。
          </p>
        </div>
      </div>

      {/* 冲突仲裁：真实同话题分组 + 在线模型立场判定 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-serif font-bold text-red-700 flex items-center space-x-1.5">
            <Scale className="w-4 h-4 text-red-600" />
            <span>多源立场冲突仲裁（AI 判定 · 非事实结论）</span>
          </div>
          <button
            onClick={() => void runArbitration()}
            disabled={arbLoading}
            className="text-[11px] font-mono text-stone-500 hover:text-stone-900 flex items-center space-x-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${arbLoading ? 'animate-spin' : ''}`} />
            <span>{arbLoading ? '仲裁中…' : '重新仲裁'}</span>
          </button>
        </div>

        {arbLoading ? (
          <div className="py-6 text-center text-stone-400 text-xs">正在对同话题分组调用在线模型判定立场…</div>
        ) : arb?.ok === false ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5">
            <div className="text-amber-900 font-serif font-bold">
              {arb.reason === 'no_api_key' ? '未配置 API Key，暂不可执行在线仲裁' : '仲裁服务暂不可用，请稍后重试'}
            </div>
            <p className="text-amber-800 leading-relaxed">
              {arb.reason === 'no_api_key'
                ? '配置 DeepSeek/Gemini Key 后即可对同话题多源分组（当前候选赛道：' +
                  (arb.candidateSectors || []).join('、') + '）进行真实立场判定。'
                : '服务端未返回有效结果。'}
            </p>
          </div>
        ) : arb?.candidates && arb.candidates.length > 0 ? (
          <div className="space-y-3">
            {arb.candidates.map((c, i) => (
              <div key={i} className="bg-red-50/70 border-2 border-red-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-serif font-bold text-red-950">话题：{c.topic}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      c.divergence.includes('分歧')
                        ? 'bg-red-100 text-red-800'
                        : c.divergence.includes('一致')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    分歧：{c.divergence}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {c.sources.map((src, j) => (
                    <div key={j} className="bg-white p-2.5 rounded-lg border border-red-200">
                      <div className="font-serif font-bold text-stone-900 mb-1 flex items-center justify-between">
                        <span className="truncate">{src.source}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            src.stance === '正面'
                              ? 'bg-emerald-100 text-emerald-800'
                              : src.stance === '负面'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {src.stance}
                        </span>
                      </div>
                      <p className="text-stone-700 text-[11px] leading-relaxed">“{src.quote}”</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-stone-700 leading-relaxed">{c.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs">
            <div className="text-stone-700 font-serif font-bold">暂无满足条件的多源同话题分组</div>
            <p className="text-stone-600 leading-relaxed mt-1">
              需要同一赛道下 ≥2 个不同来源且各 ≥2 条的报道。语料规模扩大或补充信源后会自动出现候选；
              仲裁结果为“AI 立场判定（在线模型）”，非事实结论。
            </p>
          </div>
        )}

        <p className="text-[10px] text-stone-400">
          口径：同话题分组=关键词赛道词典（src/utils/sectorTaxonomy.ts）；立场=在线模型对来源报道的文本判定，可复核引句，非人工核验结论。
        </p>
      </div>
    </div>
  );
};
