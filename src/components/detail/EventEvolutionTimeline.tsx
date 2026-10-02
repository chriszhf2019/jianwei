import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle } from '../../types';
import {
  Clock,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  Target,
  ChevronDown,
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface EventEvolutionTimelineProps {
  article: NewsArticle;
  onOpenTermExplain?: (term: string) => void;
}

interface TimelineNode {
  phase: 'antecedent' | 'current' | 'future';
  phaseLabel: string;
  timeLabel: string;
  title: string;
  detail: string;
  impact: string;
  keySignals: string[];
}

interface TimelineResponse {
  summary: string;
  timeline: TimelineNode[];
}

export const EventEvolutionTimeline: React.FC<EventEvolutionTimelineProps> = ({
  article,
  onOpenTermExplain,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeNodeIdx, setActiveNodeIdx] = useState<number>(1); // Default to current node (idx: 1)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchTimeline = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    const plainTongsu = typeof article.tongsuSummary === 'string'
      ? article.tongsuSummary
      : article.tongsuSummary?.simpleSay || '';

    try {
      const res = await fetch('/api/article-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: {
            title: article.title,
            summary: article.summary,
            tongsuSummary: plainTongsu,
            oneSentenceVerdict: article.oneSentenceVerdict,
            category: article.category,
            publishedAt: article.publishedAt,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`分析接口响应异常: ${res.status}`);
      }
      const json: TimelineResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Failed to load article timeline:', err);
      // Fallback local derivation if offline/network error
      setData({
        summary: `围绕《${article.title}》的演变脉络：从前置技术/政策积累，到当前核心突破，再到未来连锁溢出。`,
        timeline: [
          {
            phase: 'antecedent',
            phaseLabel: '📜 前因与溯源',
            timeLabel: '前序积累期 (T-180D ~ T-30D)',
            title: '技术预研与地缘政策前期酝酿',
            detail: '在此次事件正式爆发前，产业主体已在底层技术验证、原材料采购及跨国合规摸底上完成了关键准备。',
            impact: '推升了行业准入门槛与竞争壁垒。',
            keySignals: ['早期专利公布', '产业试点征求意见'],
          },
          {
            phase: 'current',
            phaseLabel: '⚡ 当前关键节点',
            timeLabel: '当前实质突破 (T0)',
            title: article.title,
            detail: article.summary || plainTongsu || '核心性能参数达到商用标准，或关键政策法案正式签署生效。',
            impact: article.oneSentenceVerdict || '重塑产业链定价权与上下游利润分配机制。',
            keySignals: ['官方正式通告', '同业竞品价格跟进'],
          },
          {
            phase: 'future',
            phaseLabel: '🔮 潜在未来触发点',
            timeLabel: '未来演化窗口 (T+30D ~ T+180D)',
            title: '商业化规模量产爬坡与衍生监管终裁',
            detail: '重点关注未来数月内大客户装车部署反馈、良品率爬坡曲线以及跨国反制措施。',
            impact: '决定该技术路线或商业模式能否确立跨周期主导地位。',
            keySignals: ['客户复购与出货量数据', '反倾销终裁节点'],
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [article.id]);

  // 点击节点进行平滑滚动定位并高亮
  const handleSelectNode = (idx: number) => {
    setActiveNodeIdx(idx);
    const targetEl = nodeRefs.current[idx];
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-[#E3120B]/10 text-[#E3120B]">
              <GitBranch className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
              事件全生命周期演变脉络 · 垂直时序因果轴
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 text-red-900 font-bold border border-red-200">
              交互探索
            </span>
          </div>
          <p className="text-xs text-stone-500">
            点击任意时间节点即可直接滚动至可视区域，并高亮该节点的上下文因果链
          </p>
        </div>

        <button
          onClick={() => fetchTimeline(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-serif font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-300 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E3120B]' : ''}`} />
          <span>{loading ? 'AI 正在梳理…' : '重新梳理脉络'}</span>
        </button>
      </div>

      {/* 顶部时序节点快速切换导航条 (Quick Stage Indicator Pills) */}
      {data?.timeline && data.timeline.length > 0 && (
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-serif font-bold text-stone-600 mr-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-red-600" />
            <span>时序节点跳转：</span>
          </span>
          {data.timeline.map((node, idx) => {
            const isSelected = activeNodeIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectNode(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-md ring-2 ring-red-400 scale-[1.02]'
                    : 'bg-white text-stone-700 border border-stone-300 hover:border-stone-500 hover:bg-stone-100'
                }`}
              >
                <span>{node.phaseLabel}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${
                  isSelected ? 'bg-stone-800 text-amber-400' : 'bg-stone-100 text-stone-500'
                }`}>
                  {node.timeLabel.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Banner */}
      {data?.summary && (
        <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 text-xs font-serif text-stone-800 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-stone-950">演变全局摘要：</strong>
            <KeyTermHighlight
              text={data.summary}
              onOpenTermExplain={onOpenTermExplain}
            />
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="py-12 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-200 border-t-[#E3120B]" />
          <p className="text-xs text-stone-500 font-serif">
            正在调用智能分析引擎，拆解事件前因背景与潜在未来触发分支…
          </p>
        </div>
      )}

      {/* Vertical Timeline Tree */}
      {data && data.timeline && (
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-stone-400 before:via-[#E3120B] before:to-purple-500">
          {data.timeline.map((node, idx) => {
            const isAntecedent = node.phase === 'antecedent';
            const isCurrent = node.phase === 'current';
            const isFuture = node.phase === 'future';
            const isSelected = activeNodeIdx === idx;

            const dotBg = isAntecedent
              ? 'bg-stone-600'
              : isCurrent
              ? 'bg-[#E3120B] ring-4 ring-red-100'
              : 'bg-purple-600 ring-4 ring-purple-100';

            const cardBorder = isSelected
              ? 'border-2 border-stone-950 bg-white shadow-xl ring-4 ring-amber-300/80 transition-all duration-300 scale-[1.01]'
              : isAntecedent
              ? 'border-2 border-stone-300 bg-[#FAF8F5] hover:border-stone-400'
              : isCurrent
              ? 'border-2 border-red-300 bg-white shadow-sm hover:border-red-400'
              : 'border-2 border-purple-200 bg-purple-50/20 hover:border-purple-300';

            return (
              <div
                key={idx}
                ref={(el) => {
                  nodeRefs.current[idx] = el;
                }}
                id={`timeline-node-${idx}`}
                onClick={() => handleSelectNode(idx)}
                className="relative space-y-2 cursor-pointer group"
              >

                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[27px] sm:-left-[35px] top-3.5 w-4 h-4 rounded-full ${dotBg} ${
                    isSelected ? 'scale-125 ring-4 ring-amber-400' : ''
                  } transition-all`}
                />

                {/* Card */}
                <div className={`rounded-xl p-5 space-y-3 transition-all ${cardBorder}`}>
                  {/* Phase & Time Label */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-serif font-bold px-2.5 py-0.5 rounded-full ${
                          isAntecedent
                            ? 'bg-stone-200 text-stone-800'
                            : isCurrent
                            ? 'bg-red-600 text-white font-black'
                            : 'bg-purple-600 text-white font-black'
                        }`}
                      >
                        {node.phaseLabel}
                      </span>
                      <span className="font-mono text-xs text-stone-600 font-bold">
                        {node.timeLabel}
                      </span>

                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-in fade-in flex items-center gap-1">
                          <Target className="w-3 h-3 text-amber-700" />
                          <span>当前探索焦点</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {node.keySignals.map((sig, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-600 border border-stone-200"
                        >
                          #{sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-base sm:text-lg font-serif font-black text-stone-950 leading-snug">
                    <KeyTermHighlight
                      text={node.title}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </h4>

                  {/* Detail */}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
                    <KeyTermHighlight
                      text={node.detail}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </p>

                  {/* Impact & So What Box */}
                  <div
                    className={`p-3.5 rounded-lg border text-xs leading-snug space-y-1.5 ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-300 text-stone-950 shadow-xs'
                        : isAntecedent
                        ? 'bg-stone-100/80 border-stone-200 text-stone-700'
                        : isCurrent
                        ? 'bg-red-50/70 border-red-200 text-red-950'
                        : 'bg-purple-50/70 border-purple-200 text-purple-950'
                    }`}
                  >
                    <div className="font-serif font-bold flex items-center gap-1.5 text-xs">
                      {isAntecedent ? '📜 历史铺垫与始发动因：' : isCurrent ? '💥 当下核心实质冲击：' : '🔮 未来演化关键观察阈值：'}
                    </div>
                    <p className="font-sans text-xs leading-relaxed text-stone-800">
                      <KeyTermHighlight
                        text={node.impact}
                        onOpenTermExplain={onOpenTermExplain}
                      />
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
