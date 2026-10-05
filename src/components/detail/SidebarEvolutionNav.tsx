import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle, CognitiveDetailTab } from '../../types';
import {
  Clock,
  Sparkles,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Crosshair,
  GitFork,
  UserCheck,
  Compass,
  ArrowDownRight,
  Zap,
  X,
} from 'lucide-react';


interface SidebarEvolutionNavProps {
  article: NewsArticle;
  activeTab: CognitiveDetailTab;
  onSelectTab: (tab: CognitiveDetailTab) => void;
}

export interface EvolutionMilestone {
  id: string;
  phase: 'antecedent' | 'current' | 'stakeholder' | 'future';
  phaseLabel: string;
  timeLabel: string;
  title: string;
  detail: string;
  impact: string;
  keySignals?: string[];
  targetTab: CognitiveDetailTab;
  sectionName: string;
}

interface EvolutionResponse {
  summary: string;
  timeline: Array<{
    phase: string;
    phaseLabel: string;
    timeLabel: string;
    title: string;
    detail: string;
    impact: string;
    keySignals?: string[];
  }>;
}

const TAB_ICON_MAP: Record<CognitiveDetailTab, React.ReactNode> = {
  seven_elements: <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />,
  logic_tree: <GitFork className="w-3.5 h-3.5 text-purple-600" />,
  architecture_diagram: <Layers className="w-3.5 h-3.5 text-blue-600" />,
  relevance_identity: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
  forecast_arena: <Crosshair className="w-3.5 h-3.5 text-red-600" />,
  deep_spectrum: <Layers className="w-3.5 h-3.5 text-amber-600" />,
};

export const SidebarEvolutionNav: React.FC<SidebarEvolutionNavProps> = ({
  article,
  activeTab,
  onSelectTab,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [milestones, setMilestones] = useState<EvolutionMilestone[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('node-1');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/article-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: {
            id: article.id,
            title: article.title,
            summary: article.summary,
            oneSentenceVerdict: article.oneSentenceVerdict,
            category: article.category,
            publishedAt: article.publishedAt,
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EvolutionResponse = await res.json();
      setSummary(data.summary || '事件全景演变脉络与深度研判导航');

      const rawNodes = Array.isArray(data.timeline) ? data.timeline : [];
      const mapped: EvolutionMilestone[] = rawNodes.map((n, idx) => {
        let phase: 'antecedent' | 'current' | 'stakeholder' | 'future' = 'current';
        let targetTab: CognitiveDetailTab = 'logic_tree';
        let sectionName = '第二篇 · 底层逻辑与博弈';

        if (n.phase === 'antecedent' || idx === 0) {
          phase = 'antecedent';
          targetTab = 'seven_elements';
          sectionName = '第一篇 · 事实全貌与溯源';
        } else if (n.phase === 'current' || idx === 1) {
          phase = 'current';
          targetTab = 'logic_tree';
          sectionName = '第二篇 · 底层逻辑与博弈';
        } else if (n.phase === 'stakeholder' || idx === 2) {
          phase = 'stakeholder';
          targetTab = 'relevance_identity';
          sectionName = '第四篇 · 切身决策与行动';
        } else if (n.phase === 'future' || idx >= 3) {
          phase = 'future';
          targetTab = 'forecast_arena';
          sectionName = '第三篇 · 未来推演与预测';
        }

        return {
          id: `node-${idx}`,
          phase,
          phaseLabel: n.phaseLabel || (phase === 'antecedent' ? '前因溯源' : phase === 'current' ? '实质爆发' : phase === 'stakeholder' ? '主体分化' : '未来外溢'),
          timeLabel: n.timeLabel || '',
          title: n.title || '关键演进节点',
          detail: n.detail || '',
          impact: n.impact || '',
          keySignals: n.keySignals || [],
          targetTab,
          sectionName,
        };
      });

      // If backend gave less than 3, pad with standard structure
      if (mapped.length < 3) {
        setMilestones([
          {
            id: 'node-0',
            phase: 'antecedent',
            phaseLabel: '📜 前因与溯源',
            timeLabel: '前序发酵期',
            title: '行业前置积累与政策酝酿准备',
            detail: '底层技术验证与地缘政策酝酿构成事件爆发的土壤。',
            impact: '抬升行业准入门槛',
            targetTab: 'seven_elements',
            sectionName: '第一篇 · 事实全貌与溯源',
          },
          {
            id: 'node-1',
            phase: 'current',
            phaseLabel: '⚡ 实质突破点火',
            timeLabel: '当前正在发生',
            title: article.title,
            detail: article.summary || '核心技术点火或官方通告出台，确立全新市场预期。',
            impact: article.oneSentenceVerdict || '重塑产业链定价权',
            targetTab: 'logic_tree',
            sectionName: '第二篇 · 底层逻辑与博弈',
          },
          {
            id: 'node-2',
            phase: 'future',
            phaseLabel: '🔮 潜在未来演变',
            timeLabel: '未来 1-6 个月预警',
            title: '商业化验收与次生监管连锁反应',
            detail: '未来密切跟进良品率爬坡与关键客户部署反馈。',
            impact: '验证商业闭环成立',
            targetTab: 'forecast_arena',
            sectionName: '第三篇 · 未来推演与预测',
          },
        ]);
      } else {
        setMilestones(mapped);
      }
    } catch (e) {
      console.warn('Fallback to local milestone timeline:', e);
      setMilestones([
        {
          id: 'node-0',
          phase: 'antecedent',
          phaseLabel: '📜 前因与溯源',
          timeLabel: '前序积累期',
          title: '底层技术预研与政策合规摸底',
          detail: '在此次事件正式爆发前，产业主体已在底层技术验证与供应链摸底上完成准备。',
          impact: '形成先发技术专利壁垒',
          targetTab: 'seven_elements',
          sectionName: '第一篇 · 事实全貌与溯源',
        },
        {
          id: 'node-1',
          phase: 'current',
          phaseLabel: '⚡ 当前实质节点',
          timeLabel: '实质性突破 (T0)',
          title: article.title,
          detail: article.summary || '关键性能参数达到商用标准，引发行业广泛关注。',
          impact: article.oneSentenceVerdict || '确立市场领先优势',
          targetTab: 'logic_tree',
          sectionName: '第二篇 · 底层逻辑与博弈',
        },
        {
          id: 'node-2',
          phase: 'stakeholder',
          phaseLabel: '👥 主体利益分化',
          timeLabel: '利益博弈期',
          title: '行业上下游利润格局再分配',
          detail: '头部企业加速技术封装，中小供应商面临技术替换或升级选型压力。',
          impact: '行业两极分化加剧',
          targetTab: 'relevance_identity',
          sectionName: '第四篇 · 切身决策与行动',
        },
        {
          id: 'node-3',
          phase: 'future',
          phaseLabel: '🔮 未来连锁演化',
          timeLabel: '中长期演进窗口',
          title: '全球商业化落地与跨国监管终裁',
          detail: '规模量产良品率爬坡与跨国反制合规将决定中长期终局。',
          impact: '验证长期商业生命力',
          targetTab: 'forecast_arena',
          sectionName: '第三篇 · 未来推演与预测',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [article.id]);

  // Sync active milestone when activeTab changes
  useEffect(() => {
    const matched = milestones.find((m) => m.targetTab === activeTab);
    if (matched) {
      setActiveMilestoneId(matched.id);
    }
  }, [activeTab, milestones]);

  // Handle jump to section
  const handleJumpToMilestone = (milestone: EvolutionMilestone) => {
    setActiveMilestoneId(milestone.id);
    onSelectTab(milestone.targetTab);
    setMobileDrawerOpen(false);

    // Smooth scroll to container
    setTimeout(() => {
      const container = document.getElementById('detail-tabs-container');
      if (container) {
        const topOffset = container.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    }, 50);
  };

  const nodeHeight = 84;
  const totalSvgHeight = Math.max(200, milestones.length * nodeHeight);

  return (
    <>
      {/* Desktop Sticky Sidebar Navigator (Visible on large screens) */}
      <aside className="hidden xl:block w-72 shrink-0">
        <div className="sticky top-20 bg-white/95 backdrop-blur-md border-2 border-stone-800 rounded-2xl p-4 shadow-md font-sans space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div className="flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-[#E3120B] animate-spin-slow" />
              <span className="font-serif font-black text-xs text-stone-900">
                事件演变脉络导航
              </span>
            </div>
            <button
              onClick={fetchTimelineData}
              disabled={loading}
              title="重新生成/刷新演变脉络"
              className="p-1 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* SVG Linked Interactive Vertical Timeline */}
          <div className="relative pt-1 pb-1">
            {/* SVG Connecting Line */}
            <svg
              className="absolute left-[17px] top-4 w-4 pointer-events-none"
              style={{ height: `${totalSvgHeight - 40}px` }}
            >
              <defs>
                <linearGradient id="timeline-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E3120B" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#9333ea" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <line
                x1="8"
                y1="4"
                x2="8"
                y2={totalSvgHeight - 44}
                stroke="url(#timeline-line-gradient)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
            </svg>

            {/* Milestone Nodes List */}
            <div className="space-y-3 relative z-10">
              {milestones.map((m, idx) => {
                const isActive = activeMilestoneId === m.id || activeTab === m.targetTab;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleJumpToMilestone(m)}
                    className={`group flex items-start space-x-2.5 p-2 rounded-xl transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50/70 hover:bg-stone-100 text-stone-700 border-transparent hover:border-stone-200'
                    }`}
                  >
                    {/* Node Dot / Circle Indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black transition-all ${
                          isActive
                            ? 'bg-[#E3120B] text-white ring-4 ring-red-500/20 shadow-xs'
                            : 'bg-stone-200 text-stone-700 group-hover:bg-stone-300'
                        }`}
                      >
                        {idx + 1}
                      </div>
                    </div>

                    {/* Milestone Information & Jump Target */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-tight ${
                            isActive ? 'text-red-300' : 'text-stone-500'
                          }`}
                        >
                          {m.phaseLabel}
                        </span>
                        <span
                          className={`text-[9px] font-mono opacity-80 ${
                            isActive ? 'text-stone-300' : 'text-stone-400'
                          }`}
                        >
                          {m.timeLabel}
                        </span>
                      </div>

                      <div
                        className={`text-xs font-serif font-bold line-clamp-1 ${
                          isActive ? 'text-white' : 'text-stone-900 group-hover:text-stone-950'
                        }`}
                      >
                        {m.title}
                      </div>

                      <div
                        className={`text-[10px] font-serif flex items-center justify-between pt-0.5 ${
                          isActive ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {TAB_ICON_MAP[m.targetTab]}
                          <span>跳转段落: {m.sectionName.split(' · ')[1]}</span>
                        </span>
                        <ChevronRight className="w-3 h-3 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Tip Footer */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-serif">
            <span>💡 点击节点直达深度段落</span>
            <span className="font-mono text-emerald-700">AI 演变推演</span>
          </div>
        </div>
      </aside>

      {/* Mobile Floating Pill & Drawer Button (Visible on screens < 1280px) */}
      <div className="xl:hidden fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="px-3.5 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-full shadow-2xl border-2 border-stone-800 text-xs font-serif font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4 text-red-400 animate-spin-slow" />
          <span>事件脉络 ({milestones.length})</span>
          {mobileDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Mobile Expanded Drawer */}
        {mobileDrawerOpen && (
          <div className="absolute bottom-12 right-0 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border-2 border-stone-900 p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 font-sans">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-serif font-bold text-xs text-stone-900 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#E3120B]" />
                <span>事件演化脉络 · 点击跳转</span>
              </span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="text-stone-400 hover:text-stone-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {milestones.map((m, idx) => {
                const isActive = activeTab === m.targetTab;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleJumpToMilestone(m)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={isActive ? 'text-red-300 font-bold' : 'text-stone-500'}>
                        阶段 {idx + 1} · {m.phaseLabel}
                      </span>
                      <span className="opacity-70">{m.timeLabel}</span>
                    </div>
                    <div className="font-serif font-bold text-xs mt-0.5 line-clamp-1">{m.title}</div>
                    <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
                      <span>直达: {m.sectionName}</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
