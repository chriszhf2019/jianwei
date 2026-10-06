import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import { 
  Sparkles, 
  CheckCircle2, 
  Lightbulb, 
  Layers, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Info
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

export type AnnotationFilterMode = 'all' | 'facts_only' | 'opinions_only';

export interface LogicSegment {
  id: string;
  type: 'fact' | 'opinion';
  label: string;
  text: string;
  sourceContext?: string;
  confidenceOrBasis?: string;
  rationale: string;
  tags?: string[];
}

interface InteractiveLogicAnnotationProps {
  article: NewsArticle;
  onOpenTermExplain?: (term: string) => void;
  compact?: boolean;
}

/**
 * 将文章的模型解读、七要素与因果链智能拆解为“客观事实”与“主观观点/模型推断”两部分
 */
function extractLogicSegments(article: NewsArticle): LogicSegment[] {
  const segments: LogicSegment[] = [];
  let seq = 1;

  // 1. 从 7W 中提取明确的事实要素 (What, Who, When, Where)
  if (article.sevenElements) {
    if (article.sevenElements.what) {
      segments.push({
        id: `seg-${seq++}`,
        type: 'fact',
        label: '核心事实动作 (What)',
        text: article.sevenElements.what,
        sourceContext: article.sourceName ? `出处：${article.sourceName}` : '官方披露/媒体报道',
        confidenceOrBasis: '确凿客观发生',
        rationale: '描述实际发生的物理事件、交易发布或官方公开行动，具备可复核性。',
        tags: ['事件动作', '客观发生'],
      });
    }

    if (article.sevenElements.who || article.sevenElements.where) {
      const whoWhere = [
        article.sevenElements.who ? `责任主体：${article.sevenElements.who}` : '',
        article.sevenElements.where ? `落地地域/赛道：${article.sevenElements.where}` : '',
      ].filter(Boolean).join(' ｜ ');

      if (whoWhere) {
        segments.push({
          id: `seg-${seq++}`,
          type: 'fact',
          label: '主体与空间锚点 (Who / Where)',
          text: whoWhere,
          sourceContext: article.publishedAt ? `时间：${article.publishedAt.slice(0, 10)}` : '公开信息',
          confidenceOrBasis: '公开实体与管辖范围',
          rationale: '指明事件参与方、监管机构及落地行业赛道，属于基础结构化事实。',
          tags: ['主体', '范围'],
        });
      }
    }
  }

  // 2. 提取证据链中的事实引述
  if (Array.isArray(article.evidenceChain) && article.evidenceChain.length > 0) {
    for (const ev of article.evidenceChain.slice(0, 2)) {
      if (ev.quote || ev.sourceFact) {
        segments.push({
          id: `seg-${seq++}`,
          type: 'fact',
          label: `信源引述事实 (${ev.sourceName || '公开引言'})`,
          text: ev.quote || ev.sourceFact || ev.claim,
          sourceContext: ev.sourceName || '权威引证',
          confidenceOrBasis: ev.relation === 'supports' ? '交叉支持' : '事实佐证',
          rationale: '来自一线当事方公开财报、声明或监管备案的直接引言。',
          tags: ['原话引述', '客观证据'],
        });
      }
    }
  }

  // 3. 提取 7W 中的因果动因与格局 (Why, How, So What) -> 归入模型推断与观点
  if (article.sevenElements) {
    if (article.sevenElements.why) {
      segments.push({
        id: `seg-${seq++}`,
        type: 'opinion',
        label: '归因推断 (Why 为什么发生)',
        text: article.sevenElements.why,
        sourceContext: 'AI 归因逻辑模型',
        confidenceOrBasis: '逻辑因果推导',
        rationale: '对事件根本动机的结构化归纳，包含对行业供需、政策博弈的主观推论。',
        tags: ['归因假说', '因果推演'],
      });
    }

    if (article.sevenElements.soWhat) {
      segments.push({
        id: `seg-${seq++}`,
        type: 'opinion',
        label: '远期格局与外溢影响 (So What)',
        text: article.sevenElements.soWhat,
        sourceContext: '战略影响研判模型',
        confidenceOrBasis: '概率推演',
        rationale: '基于当前事实对未来产业链生态演化做出的前瞻性展望，非即时事实。',
        tags: ['前瞻预测', '外溢效应'],
      });
    }
  }

  // 4. 从一句话定调 / 核心逻辑中提取观点
  if (article.oneSentenceVerdict && !segments.some((s) => s.text === article.oneSentenceVerdict)) {
    segments.push({
      id: `seg-${seq++}`,
      type: 'opinion',
      label: '见微定调研判 (Verdict)',
      text: article.oneSentenceVerdict,
      sourceContext: '见微认知引擎',
      confidenceOrBasis: article.sevenElements?.aiVerdict?.confidenceScore 
        ? `模型自评 ${article.sevenElements.aiVerdict.confidenceScore}/100 (未校准)` 
        : '模型第一性视角',
      rationale: '对全篇核心实质的高度概括与定性研判，属于分析师/模型视角的提炼。',
      tags: ['定调结论', '核心观点'],
    });
  }

  if (article.coreLogic?.essence && !segments.some((s) => s.text === article.coreLogic?.essence)) {
    segments.push({
      id: `seg-${seq++}`,
      type: 'opinion',
      label: '底层第一性机制 (Essence)',
      text: article.coreLogic.essence,
      sourceContext: '本质剖析模型',
      confidenceOrBasis: '结构性解构',
      rationale: '穿透表面修辞直击底层商业或物理规律，用于辅助理解复杂博弈。',
      tags: ['底层逻辑', '商业机制'],
    });
  }

  // 兜底：若没有任何结构化字段，基于正文与摘要生成默认事实与观点
  if (segments.length === 0) {
    segments.push({
      id: `seg-${seq++}`,
      type: 'fact',
      label: '核心事实摘要',
      text: article.summary || article.title,
      sourceContext: article.sourceName || '新闻报道',
      confidenceOrBasis: '新闻通稿原文',
      rationale: '媒体公开刊发的基础事实描述。',
      tags: ['公开报道'],
    });
    segments.push({
      id: `seg-${seq++}`,
      type: 'opinion',
      label: '延伸影响研判',
      text: '该事件预计将对相关产业链上下游协同及终端市场定价产生连带波动。',
      sourceContext: '行业趋势推演',
      confidenceOrBasis: '模型推断',
      rationale: '基于行业通用传导规律做出的潜在影响评估。',
      tags: ['趋势推断'],
    });
  }

  return segments;
}

export const InteractiveLogicAnnotation: React.FC<InteractiveLogicAnnotationProps> = ({
  article,
  onOpenTermExplain,
  compact = false,
}) => {
  const [filterMode, setFilterMode] = useState<AnnotationFilterMode>('all');
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const segments = useMemo(() => extractLogicSegments(article), [article]);

  const factsCount = segments.filter((s) => s.type === 'fact').length;
  const opinionsCount = segments.filter((s) => s.type === 'opinion').length;
  const totalCount = segments.length;
  const factPercentage = totalCount > 0 ? Math.round((factsCount / totalCount) * 100) : 50;

  const filteredSegments = useMemo(() => {
    if (filterMode === 'facts_only') return segments.filter((s) => s.type === 'fact');
    if (filterMode === 'opinions_only') return segments.filter((s) => s.type === 'opinion');
    return segments;
  }, [segments, filterMode]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 font-sans">
      {/* 头部标题与逻辑标注说明 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-stone-200 pb-4 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-stone-900 text-amber-400">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-base font-serif font-black text-stone-950 flex items-center gap-2">
              <span>交互式逻辑标注 · 事实与观点解构</span>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                双轨穿透
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-600 font-sans">
            将模型推断严密拆解为<strong>「客观可查证事实」</strong>与<strong>「前瞻分析观点」</strong>，悬停术语可随时展开大白话通俗注释。
          </p>
        </div>

        {/* 交互过滤切换器 */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-300 text-xs font-serif font-bold shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>全部解构</span>
            <span className="text-[10px] font-mono px-1 rounded bg-stone-800 text-stone-300">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('facts_only')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'facts_only'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-stone-600 hover:text-[#0284C7]'
            }`}
            title="仅看官方公布、客观数据与实际发生动作"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            <span>只看事实</span>
            <span className="text-[10px] font-mono px-1 rounded bg-blue-800/80 text-blue-100">
              {factsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('opinions_only')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'opinions_only'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-purple-700'
            }`}
            title="仅看模型归纳、底层机制与前瞻预测"
          >
            <span className="w-2 h-2 rounded-full bg-purple-300 inline-block" />
            <span>只看观点推断</span>
            <span className="text-[10px] font-mono px-1 rounded bg-purple-900/80 text-purple-100">
              {opinionsCount}
            </span>
          </button>
        </div>
      </div>

      {/* 事实 vs 观点成分比例指示条 */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-serif font-bold text-stone-800 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-stone-500" />
            <span>认知成分配比：</span>
          </span>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sky-800 font-bold">
              📌 客观事实 {factsCount} 项 ({factPercentage}%)
            </span>
            <span className="text-stone-300">|</span>
            <span className="font-mono text-purple-800 font-bold">
              💡 观点推断 {opinionsCount} 项 ({100 - factPercentage}%)
            </span>
          </div>
        </div>

        {/* 双色进度条 */}
        <div className="w-full sm:w-48 h-2 bg-purple-200 rounded-full overflow-hidden flex shrink-0">
          <div 
            className="h-full bg-[#0284C7] transition-all duration-300"
            style={{ width: `${factPercentage}%` }}
            title={`客观事实占比 ${factPercentage}%`}
          />
          <div 
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${100 - factPercentage}%` }}
            title={`观点推断占比 ${100 - factPercentage}%`}
          />
        </div>
      </div>

      {/* 交互式标注流列表 (Interactive Annotated Stream) */}
      <div className="space-y-3.5">
        {filteredSegments.map((seg) => {
          const isFact = seg.type === 'fact';
          const isSelected = activeSegmentId === seg.id;

          return (
            <div
              key={seg.id}
              onClick={() => setActiveSegmentId(isSelected ? null : seg.id)}
              className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                isFact
                  ? isSelected
                    ? 'border-[#0284C7] bg-sky-50/70 shadow-sm ring-2 ring-sky-200'
                    : 'border-sky-200 hover:border-[#0284C7] bg-white hover:bg-sky-50/30'
                  : isSelected
                    ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-2 ring-purple-200'
                    : 'border-purple-200 hover:border-purple-600 bg-white hover:bg-purple-50/30'
              }`}
            >
              {/* 卡片头部标注胶囊 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-2.5 border-stone-100">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif font-black ${
                      isFact
                        ? 'bg-sky-100 text-sky-900 border border-sky-300'
                        : 'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}
                  >
                    {isFact ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-sky-700" />
                        <span>📌 客观事实</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-purple-700" />
                        <span>💡 模型观点 / 推断</span>
                      </>
                    )}
                  </span>

                  <span className="text-xs font-serif font-bold text-stone-800">
                    {seg.label}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono text-stone-500">
                  <span>{seg.sourceContext}</span>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-700 font-bold">{seg.confidenceOrBasis}</span>
                </div>
              </div>

              {/* 核心文段内容（集成悬停展开通俗释义） */}
              <p className="text-sm sm:text-base font-serif text-stone-900 leading-relaxed">
                <KeyTermHighlight
                  text={seg.text}
                  entities={(article.entityMentions || []).map((e) => e.name)}
                  onOpenTermExplain={onOpenTermExplain}
                />
              </p>

              {/* 展开的逻辑依据与归类解析 */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-stone-200/80 animate-fadeIn space-y-2 text-xs">
                  <div className="bg-stone-100/90 rounded-lg p-3 border border-stone-200 space-y-1">
                    <div className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-600" />
                      <span>标注定性依据：</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed font-sans">
                      {seg.rationale}
                    </p>
                  </div>

                  {Array.isArray(seg.tags) && seg.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-serif text-stone-500">属性标签：</span>
                      {seg.tags.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 底部折叠/展开提示 */}
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono mt-2 pt-1">
                <span>{isSelected ? '点击卡片收起定性依据 ▲' : '点击卡片展开定性依据与校验详情 ▼'}</span>
                <span className="text-purple-700 underline decoration-dashed">鼠标悬停于下划线词汇可看通俗解释</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
