import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../../types';
import { X, ShieldAlert, Radio as RadarIcon, GitFork, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { SupplyChainStressSimulator } from '../intelligence/SupplyChainStressSimulator';
import { CompetitorDynamicRadar } from '../intelligence/CompetitorDynamicRadar';
import { ArchitectureDiagramTab } from '../detail/ArchitectureDiagramTab';

export type IntelligenceToolType = 'simulator' | 'radar' | 'architecture';

interface IntelligenceToolModalProps {
  isOpen: boolean;
  activeTool: IntelligenceToolType;
  onClose: () => void;
  onChangeTool?: (tool: IntelligenceToolType) => void;
  articles: NewsArticle[];
  selectedArticle?: NewsArticle | null;
  onSelectArticle?: (article: NewsArticle) => void;
}

export const IntelligenceToolModal: React.FC<IntelligenceToolModalProps> = ({
  isOpen,
  activeTool,
  onClose,
  onChangeTool,
  articles,
  selectedArticle,
  onSelectArticle,
}) => {
  const [currentTool, setCurrentTool] = useState<IntelligenceToolType>(activeTool);
  const [architectureArticleId, setArchitectureArticleId] = useState<string>(
    selectedArticle?.id || articles[0]?.id || ''
  );

  useEffect(() => {
    setCurrentTool(activeTool);
  }, [activeTool]);

  useEffect(() => {
    if (selectedArticle?.id) {
      setArchitectureArticleId(selectedArticle.id);
    } else if (articles[0]?.id && !architectureArticleId) {
      setArchitectureArticleId(articles[0].id);
    }
  }, [selectedArticle, articles]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentArticle =
    articles.find((a) => a.id === architectureArticleId) ||
    selectedArticle ||
    articles[0];

  const handleSelectArticleTitle = (title: string) => {
    const matched = articles.find((a) => a.title.includes(title));
    if (matched && onSelectArticle) {
      onSelectArticle(matched);
      onClose();
    }
  };

  const handleSwitchTab = (tool: IntelligenceToolType) => {
    setCurrentTool(tool);
    onChangeTool?.(tool);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Top Header */}
        <div className="bg-stone-900 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#E3120B] text-white flex items-center justify-center font-serif font-black text-sm shadow-xs">
              工
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono tracking-wider text-stone-400 uppercase">
                  情报专项工具箱 · 二级工作台
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-stone-300">
                  专业推演模型
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-serif font-black tracking-tight text-white flex items-center gap-2">
                {currentTool === 'simulator' && '断供模拟器 · 极限压力测试与卡脖子推演'}
                {currentTool === 'radar' && '竞对雷达 · 跨国核心竞对战略动作监测'}
                {currentTool === 'architecture' && '架构全景图 · AI 架构与因果传导技术拓扑'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tool Switcher Tabs */}
            <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => handleSwitchTab('simulator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTool === 'simulator'
                    ? 'bg-[#E3120B] text-white shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                }`}
                title="全球供应链断供压力测试"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">断供模拟器</span>
                <span className="sm:hidden">模拟器</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('radar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTool === 'radar'
                    ? 'bg-[#E3120B] text-white shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                }`}
                title="跨国竞对战略动作雷达"
              >
                <RadarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">竞对雷达</span>
                <span className="sm:hidden">雷达</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('architecture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTool === 'architecture'
                    ? 'bg-[#E3120B] text-white shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                }`}
                title="技术栈与因果拓扑架构全景图"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">架构全景图</span>
                <span className="sm:hidden">全景图</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Subheader / Explanatory Note */}
        <div className="bg-[#FAF8F5] border-b border-stone-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {currentTool === 'simulator' && (
              <span>
                <strong>断供模拟器</strong>：推演先进半导体、关键材料及特种电网单点断供对产业链上下游的冲击缓冲期与替代方案。
              </span>
            )}
            {currentTool === 'radar' && (
              <span>
                <strong>竞对雷达</strong>：动态追踪跨国科技龙头（OpenAI、台积电、丰田、宁德时代等）的技术突破、人才流向与资本开支动作。
              </span>
            )}
            {currentTool === 'architecture' && (
              <span>
                <strong>架构全景图</strong>：针对前沿资讯提炼其因果触发、核心机制、临界博弈与终局效应之技术架构拓扑。
              </span>
            )}
          </div>

          {currentTool === 'architecture' && articles.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-serif font-bold text-stone-700">切换目标研报：</span>
              <select
                value={architectureArticleId}
                onChange={(e) => setArchitectureArticleId(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-stone-900 font-sans focus:outline-hidden focus:ring-1 focus:ring-stone-900 max-w-[14rem] sm:max-w-xs truncate"
              >
                {articles.slice(0, 30).map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentTool === 'simulator' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs">
              <SupplyChainStressSimulator
                articles={articles}
                onSelectArticleTitle={handleSelectArticleTitle}
              />
            </div>
          )}

          {currentTool === 'radar' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs">
              <CompetitorDynamicRadar
                articles={articles}
                onSelectArticleTitle={handleSelectArticleTitle}
              />
            </div>
          )}

          {currentTool === 'architecture' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs">
              {currentArticle ? (
                <ArchitectureDiagramTab article={currentArticle} />
              ) : (
                <div className="p-12 text-center text-stone-400 font-serif">
                  暂无可用文章生成架构全景图
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 border-t border-stone-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>见微 Genway · 专项情报工具箱（编辑部情景沙盒与因果架构可视化模型）</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-serif font-bold text-xs transition-colors cursor-pointer"
          >
            完成并返回
          </button>
        </div>
      </div>
    </div>
  );
};
