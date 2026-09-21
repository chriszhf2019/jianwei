import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import {
  Flame, TrendingUp, TrendingDown, Minus, ShieldCheck,
  Database, AlertTriangle, Activity,
} from 'lucide-react';
import { todayShort } from '../../utils/dateUtils';
import { BreakingHit } from '../../utils/todayBrief';
import { MethodBadge } from '../common/MethodBadge';

export interface SectorHeatItem {
  id: string;
  name: string;
  count: number;
  /** 该赛道下今日命中的高频词（≤3） */
  topWords: string[];
}

interface HeroStats {
  /** 语料库总条数（含历史） */
  total: number;
  /** 今日（本地日期当天发布）外部条目数 */
  todayCount: number;
  /** 窗口内实际参与词典扫描的样本数 */
  scanned: number;
  /** 窗口内命中正面词条数 */
  positive: number;
  /** 窗口内命中负面词条数 */
  negative: number;
  /** 窗口内未命中正负词的条数 */
  neutral: number;
  /** 同篇正负词均命中的条数 */
  mixed: number;
  /** 净情绪 [-100,100]；null = 样本内无任何正负词命中 */
  net: number | null;
  /** 正向占比 %；null = 无正负命中 */
  ratio: number | null;
  /** 是否存在真实运行时语料（RSS 或用户提交，不代表必须来自外部抓取） */
  hasLive: boolean;
  /** 本次情绪统计实际采用的口径：today=今日条目优先；30d=今日样本不足回退近30天 */
  scope: 'today' | '30d';
}

interface HomeHeroStatusProps {
  stats: HeroStats;
  /** 今日重大突发（重大才有；空数组时不显示该行） */
  breaking: BreakingHit[];
  /** 今日赛道热度（真实命中计数 Top N，含词） */
  sectorHeat: SectorHeatItem[];
  onOpenBreaking: (article: NewsArticle) => void;
  onSelectSector?: (sectorName: string) => void;
}

/** 把净情绪分翻译成一句人话 */
function verdictOf(net: number | null, scanned: number): {
  word: string; sub: string; cls: string; Icon: typeof TrendingUp;
} {
  if (net === null) {
    return {
      word: scanned === 0 ? '暂无样本' : '无明显倾向',
      sub: scanned === 0
        ? '今日没有可扫描的条目，暂无情绪结论'
        : '今日样本未命中正/负面关键词，消息面偏中性',
      cls: 'text-stone-600 bg-stone-100 border-stone-300',
      Icon: Minus,
    };
  }
  if (net >= 40) {
    return {
      word: '明显偏乐观', sub: '好消息显著多于坏消息', cls: 'text-emerald-800 bg-emerald-50 border-emerald-300', Icon: TrendingUp,
    };
  }
  if (net >= 15) {
    return {
      word: '温和乐观', sub: '好消息略占上风，但不算一边倒', cls: 'text-emerald-700 bg-emerald-50 border-emerald-300', Icon: TrendingUp,
    };
  }
  if (net > -15) {
    return {
      word: '多空胶着', sub: '好消息与坏消息大致均衡', cls: 'text-stone-700 bg-stone-100 border-stone-300', Icon: Minus,
    };
  }
  if (net > -40) {
    return {
      word: '温和谨慎', sub: '坏消息略多，宜留一份风险意识', cls: 'text-amber-700 bg-amber-50 border-amber-300', Icon: TrendingDown,
    };
  }
  return {
    word: '明显偏谨慎', sub: '坏消息显著多于好消息', cls: 'text-red-700 bg-red-50 border-red-300', Icon: TrendingDown,
  };
}

/** 短名：去掉“与XX”后缀（AI 与软件 → AI） */
function shortName(name: string): string {
  return name.replace('与软件', '').replace('与硬件', '').replace('与数码', '').replace('与平台', '').replace('与电力', '').replace('与贸易', '').replace('与金融', '');
}

export const HomeHeroStatus: React.FC<HomeHeroStatusProps> = ({
  stats,
  breaking,
  sectorHeat,
  onOpenBreaking,
  onSelectSector,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { total, todayCount, scanned, positive, negative, neutral, mixed, net, hasLive, scope } = stats;
  const verdict = verdictOf(net, scanned);
  const { Icon } = verdict;
  const meterLeft = net === null ? 50 : Math.max(0, Math.min(100, ((net + 100) / 200) * 100));
  const isTodayScope = scope === 'today';
  const gaugeTip =
    '情绪值：词典统计 (正面-负面)/(正面+负面)×100，仅对“今日发布”条目（今日样本不足20条时自动放宽近30天）；热词/赛道/突发同为可复核的关键词计数，非 AI 判断。词表见 utils/corpusMetrics.ts 与 utils/sectorTaxonomy.ts。';

  return (
    <div className="bg-white border-2 border-stone-900 rounded-2xl p-3.5 sm:p-4 shadow-sm font-sans mb-4">
      {/* 行1：徽标带（含口径说明，hover 可见） */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="font-mono font-bold text-stone-500 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded">
          {todayShort()} · 今日速览
        </span>
        <span
          className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded ${
            hasLive ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
          }`}
          title={hasLive ? '基于服务端真实抓取的 RSS 语料' : '尚未接入真实 RSS 语料'}
        >
          <Database className="w-3 h-3 mr-0.5" />
          {hasLive ? '实时' : '无数据'}
        </span>
        <MethodBadge methodId="lexicon_sentiment" compact />
        <span
          className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded border ${
            isTodayScope ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-[#0284C7] bg-sky-50 border-sky-200'
          }`}
          title={gaugeTip}
        >
          <ShieldCheck className="w-3 h-3 mr-0.5" />
          {isTodayScope ? `今日 ${todayCount} 条` : `近 30 天 ${scanned} 篇（今日样本不足）`}
          <HelpTipIcon tip={gaugeTip} />
        </span>
        <span className="inline-flex items-center font-bold text-red-600 ml-auto">
          <Flame className="w-3 h-3 mr-0.5 animate-pulse" />
          全球微澜
        </span>
      </div>

      {/* 行2：结论 + 好/坏/中性 + 迷你温度条（单行紧凑） */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[13px] font-serif font-black text-stone-950">
          {isTodayScope ? '今天新闻整体' : '近 30 天新闻整体'}
          <span
            className={`ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-serif font-black align-middle ${verdict.cls}`}
          >
            <Icon className="w-3 h-3" />
            {verdict.word}
            {net !== null && <span className="font-mono text-[10px]">{net > 0 ? `+${net}` : net}</span>}
          </span>
        </span>

        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-serif font-bold">
          <TrendingUp className="w-3 h-3" /> 好 {positive}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-serif font-bold">
          <TrendingDown className="w-3 h-3" /> 坏 {negative}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-serif font-medium">
          <Minus className="w-3 h-3" /> 中性 {neutral}
        </span>
        {mixed > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-serif font-medium" title="同一篇报道同时命中正负关键词，不重复计入好/坏">
            <Activity className="w-3 h-3" /> 交织 {mixed}
          </span>
        )}

        <div className="hidden lg:flex items-center gap-1.5 ml-auto w-40 shrink-0" title={`情绪值 ${net ?? '—'}（-100 悲观 ~ +100 乐观）`}>
          <div className="relative flex-1">
            <div className="h-1 rounded-full bg-gradient-to-r from-red-400/70 via-stone-300 to-emerald-400/80" />
            <div
              className="absolute -top-[2.5px] h-2.5 w-2.5 rounded-full border-2 border-white shadow ring-1 transition-all"
              style={{
                left: `calc(${meterLeft}% - 5px)`,
                background: net === null ? '#a8a29e' : net! >= 0 ? '#059669' : '#dc2626',
              }}
            />
          </div>
        </div>
      </div>

      {/* 行3：默认只展示前三赛道，详细统计按需展开。 */}
      {sectorHeat.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-stone-600 mr-0.5">
            <Activity className="w-3.5 h-3.5 text-[#0284C7]" /> 今日：
          </span>
          {(detailsOpen ? sectorHeat : sectorHeat.slice(0, 3)).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSector?.(s.name)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-serif border-stone-200 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              title={`点击筛选「${s.name}」：今日 ${s.count} 篇文章命中${s.topWords.length ? '；热词 ' + s.topWords.join('、') : ''}。词表可在设置页编辑`}
            >
              <strong className="text-stone-900">{shortName(s.name)}</strong>
              <span className="font-mono text-stone-400">{s.count}</span>
              {s.topWords.length > 0 && (
                <span className="text-[10px] text-[#0284C7] hidden sm:inline">
                  {s.topWords.slice(0, 2).join('·')}
                </span>
              )}
            </button>
          ))}
          {sectorHeat.length > 3 && (
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="text-[10px] font-mono text-stone-500 hover:text-stone-900 px-1.5 py-0.5 rounded border border-stone-200 bg-white"
            >
              {detailsOpen ? '收起' : `+${sectorHeat.length - 3}`}
            </button>
          )}
        </div>
      )}

      {/* 行4：重大突发（重大才有；无则不打扰） */}
      {breaking.length > 0 && (
        <div className="mt-2 bg-red-50/80 border border-red-200 rounded-xl px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 font-serif font-bold text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" /> 突发
          </span>
          {breaking.map((b) => (
            <button
              key={b.word + (b.article.id || b.article.title)}
              onClick={() => {
                const art = {
                  id: b.article.id || `breaking-${Date.now()}`,
                  title: b.article.title,
                  sourceName: b.article.sourceName,
                  sourceUrl: b.article.sourceUrl,
                  category: '重大突发',
                  isExternal: true,
                } as NewsArticle;
                onOpenBreaking(art);
              }}
              className="text-left text-red-900 hover:text-red-600 underline decoration-red-300 underline-offset-2 font-medium"
              title={`${b.total} 篇 · ${b.sources} 个来源提及「${b.word}」；${b.verification === 'official_single' ? '官方单源' : '多源印证'}；点击查看`}
            >
              <span className="font-mono text-[10px] mr-1">
                {b.verification === 'official_single' ? '官方单源' : `${b.sources}源`}
              </span>
              「{b.word}」{b.article.title.slice(0, 40)}{b.article.title.length > 40 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {detailsOpen && (
        <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-stone-400">
          <span>{hasLive ? `语料库共 ${total} 篇（含历史）` : '当前没有真实语料'}</span>
          <span title={gaugeTip}>统计口径可复核</span>
        </div>
      )}
    </div>
  );
};

/** 极小的口径说明图标（hover 看说明；不占正文空间） */
function HelpTipIcon({ tip }: { tip: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 ml-0.5 rounded-full text-[9px] leading-none bg-stone-200 text-stone-500 cursor-help font-bold"
      title={tip}
    >
      ?
    </span>
  );
}
