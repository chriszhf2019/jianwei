import React, { useState } from 'react';
import {
  SAMPLE_EVENTS,
  SAMPLE_WATCH_OBJECT,
  type SampleEvent,
} from '../../data/sampleBriefing';
import { EVIDENCE_STATE_META } from '../../utils/evidenceReceipt';
import {
  Sparkles,
  ChevronDown,
  Bell,
  Bookmark,
  Crosshair,
  Check,
  Settings,
  Rss,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface FirstExperienceSampleProps {
  onOpenAnalyze?: () => void;
  onOpenSettings?: () => void;
}

/** 首次体验样例：在无真实语料时展示一份只读简报，让新用户两分钟内走完「事件 → 证据 → 判断」。 */
export const FirstExperienceSample: React.FC<FirstExperienceSampleProps> = ({
  onOpenAnalyze,
  onOpenSettings,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(SAMPLE_EVENTS[0]?.id ?? null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [reminded, setReminded] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('演示：已取消收藏');
      } else {
        next.add(id);
        showToast('演示：已模拟收藏（真实收藏需登录）');
      }
      return next;
    });
  };

  return (
    <section className="mb-8 space-y-4">
      {/* 演示横幅 */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <b>演示样例</b> · 这是一份预置的只读简报，演示见微的完整价值链路，内容非真实数据。配置真实信源后这里会替换为你的今日简报。
          </span>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-serif font-bold hover:bg-amber-100"
          >
            <Rss className="w-3.5 h-3.5" /> 配置真实信源
          </button>
        )}
      </div>

      {/* 3 个样例事件 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {SAMPLE_EVENTS.map((ev) => {
          const meta = EVIDENCE_STATE_META[ev.evidence.state];
          const expanded = expandedId === ev.id;
          const saved = bookmarked.has(ev.id);
          return (
            <div
              key={ev.id}
              className={`bg-white border rounded-xl p-4 space-y-3 transition-all ${expanded ? 'border-stone-900 shadow-sm' : 'border-stone-200 hover:border-stone-400'}`}
            >
              <div className="text-[10px] font-mono text-stone-400">{ev.sector}</div>
              <h4 className="text-sm font-serif font-bold text-stone-950 leading-snug">{ev.title}</h4>
              <p className="text-xs text-stone-600 leading-relaxed">{ev.verdict}</p>

              {/* 证据收据（三态） */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : ev.id)}
                className="w-full text-left rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${meta.badgeCls} px-2 py-0.5 rounded border`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dotCls}`} />
                  {meta.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>

              {expanded && (
                <div className="space-y-1.5 text-[11px]">
                  {ev.evidence.quote && (
                    <blockquote className="border-l-2 border-stone-300 pl-2 text-stone-600 italic">“{ev.evidence.quote}”</blockquote>
                  )}
                  {ev.evidence.sourceName && (
                    <div className="text-stone-500 font-mono">来源：{ev.evidence.sourceName}</div>
                  )}
                  <div className="text-stone-400">{meta.hint}</div>
                </div>
              )}

              <div className="pt-1 border-t border-stone-100">
                <div className="text-[10px] text-stone-400">对「{ev.personaImpact.persona}」意味着：</div>
                <div className="text-[11px] text-stone-700 leading-relaxed">{ev.personaImpact.coreImpact}</div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-400 font-mono truncate">观察：{ev.watchSignals.slice(0, 2).join(' · ')}</span>
                <button
                  type="button"
                  onClick={() => toggleBookmark(ev.id)}
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-serif font-bold ${saved ? 'text-amber-700' : 'text-stone-500 hover:text-stone-900'}`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-500 text-amber-600' : ''}`} />
                  {saved ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 1 个可跟踪对象 */}
      <div className="rounded-xl border-2 border-stone-800 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[#E3120B]" />
          <h3 className="text-sm font-serif font-bold text-stone-950">可跟踪对象（演示）</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-serif font-bold text-stone-900">
              {SAMPLE_WATCH_OBJECT.name} <span className="text-[10px] font-mono text-stone-400">({SAMPLE_WATCH_OBJECT.type})</span>
            </div>
            <p className="text-xs text-stone-500">关注理由：{SAMPLE_WATCH_OBJECT.reason}</p>
            <p className="text-xs text-stone-400">证伪信号：{SAMPLE_WATCH_OBJECT.falsification}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setReminded(true);
              showToast('演示：已模拟创建提醒（真实提醒需配置投递通道）');
            }}
            disabled={reminded}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-serif font-bold"
          >
            {reminded ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            {reminded ? '已模拟提醒' : '模拟创建提醒'}
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-stone-900 bg-[#FAF8F5] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-stone-600">
          看完样例了吗？配置真实 RSS 信源或登录，开始你自己的「关注 → 发现变化 → 核验 → 简报」。
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenAnalyze && (
            <button onClick={onOpenAnalyze} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E3120B] hover:bg-red-700 text-white text-xs font-serif font-bold">
              <Sparkles className="w-3.5 h-3.5" /> 读懂新闻
            </button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold">
              <Settings className="w-3.5 h-3.5" /> 去配置
            </button>
          )}
        </div>
      </div>

      {/* 演示 toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-serif font-bold shadow-xl animate-in fade-in">
          {toast}
        </div>
      )}
    </section>
  );
};
