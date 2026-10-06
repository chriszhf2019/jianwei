import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import { TopicCluster, TimelineEventNode } from '../../utils/topicCluster';
import {
  X,
  Clock,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  Building,
  Radio,
  ArrowRight,
  Scale,
  Calendar,
  CheckCircle2,
  Columns,
} from 'lucide-react';

interface TopicSpectrumModalProps {
  cluster: TopicCluster;
  onClose: () => void;
  onSelectArticle: (article: NewsArticle) => void;
  onCompareArticles?: (articleA: NewsArticle, articleB: NewsArticle) => void;
}

export const TopicSpectrumModal: React.FC<TopicSpectrumModalProps> = ({
  cluster,
  onClose,
  onSelectArticle,
  onCompareArticles,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'spectrum' | 'compare'>('spectrum');
  const [selectedForCompareA, setSelectedForCompareA] = useState<NewsArticle | null>(cluster.articles[0] || null);
  const [selectedForCompareB, setSelectedForCompareB] = useState<NewsArticle | null>(cluster.articles[1] || null);

  const { official, commercial, global, independent } = cluster.mediaSpectrum;
  const totalArticles = cluster.articles.length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-stone-900 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 space-y-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[11px] font-mono font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-700" />
                <span>跨源事件聚合脉络</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-mono font-bold">
                收录 {totalArticles} 篇跨源报道
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-mono">
                持续 {cluster.timeSpan.durationHours} 小时
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 leading-snug">
              {cluster.topicTitle}
            </h2>
            {cluster.sharedEntities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-serif text-stone-400">核心实体:</span>
                {cluster.sharedEntities.map((ent, i) => (
                  <span key={i} className="text-[11px] font-mono px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full">
                    #{ent}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Modes Tabs */}
        <div className="flex border-b border-stone-200 space-x-2 sm:space-x-4 shrink-0">
          <button
            onClick={() => setActiveTab('spectrum')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-serif font-bold flex items-center space-x-1.5 border-b-2 -mb-[1px] transition-all cursor-pointer ${
              activeTab === 'spectrum'
                ? 'border-[#E3120B] text-stone-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Scale className="w-4 h-4 text-purple-600" />
            <span>信息源光谱与叙事对比</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-serif font-bold flex items-center space-x-1.5 border-b-2 -mb-[1px] transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-[#E3120B] text-stone-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span>事件演进时间轴 ({cluster.timeline.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-serif font-bold flex items-center space-x-1.5 border-b-2 -mb-[1px] transition-all cursor-pointer ${
              activeTab === 'compare'
                ? 'border-[#E3120B] text-stone-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Columns className="w-4 h-4 text-emerald-600" />
            <span>双源差异并排对照</span>
          </button>
        </div>

        {/* Modal Tab 1: Media Spectrum Breakdown */}
        {activeTab === 'spectrum' && (
          <div className="space-y-6">
            {/* Spectrum Narrative Synthesis Banner */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>各方视角叙事提炼</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="font-serif font-bold text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>权威通稿立场</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">{cluster.narrativeSummary.officialFocus}</p>
                </div>

                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="font-serif font-bold text-[#0284C7] flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>商业财经观察</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">{cluster.narrativeSummary.marketFocus}</p>
                </div>

                <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1">
                  <div className="font-serif font-bold text-purple-800 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>国际外媒视界</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">{cluster.narrativeSummary.globalFocus}</p>
                </div>
              </div>
            </div>

            {/* 4 Quadrants Spectrum Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quadrant 1: 官方权威 (Official/State Tier A) */}
              <div className="border-2 border-emerald-200 bg-emerald-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="font-serif font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>官方权威通稿 (Tier A)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {official.length} 篇
                  </span>
                </div>
                {official.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 font-serif">
                    未监测到国家级或政府权威通讯社直接发稿
                  </div>
                ) : (
                  <div className="space-y-2">
                    {official.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="p-3 bg-white border border-emerald-200 hover:border-emerald-400 rounded-lg transition-all cursor-pointer space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-emerald-800">{art.sourceName}</span>
                          <span className="text-stone-400 font-mono">{art.publishedAt?.slice(0, 16)}</span>
                        </div>
                        <div className="font-serif font-bold text-xs text-stone-900 line-clamp-2">
                          {art.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 2: 商业财经主流 (Commercial Tier B) */}
              <div className="border-2 border-sky-200 bg-sky-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                  <div className="font-serif font-bold text-xs text-sky-950 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#0284C7]" />
                    <span>主流商业财经与科技 (Tier B)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                    {commercial.length} 篇
                  </span>
                </div>
                {commercial.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 font-serif">
                    暂无主流商业财经媒体报道
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commercial.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="p-3 bg-white border border-sky-200 hover:border-sky-400 rounded-lg transition-all cursor-pointer space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-[#0284C7]">{art.sourceName}</span>
                          <span className="text-stone-400 font-mono">{art.publishedAt?.slice(0, 16)}</span>
                        </div>
                        <div className="font-serif font-bold text-xs text-stone-900 line-clamp-2">
                          {art.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 3: 国际/外媒视角 (Global) */}
              <div className="border-2 border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <div className="font-serif font-bold text-xs text-purple-950 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>国际通讯社与外媒 (Global)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    {global.length} 篇
                  </span>
                </div>
                {global.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 font-serif">
                    暂无外媒或国际信源相关收录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {global.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="p-3 bg-white border border-purple-200 hover:border-purple-400 rounded-lg transition-all cursor-pointer space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-purple-800">{art.sourceName}</span>
                          <span className="text-stone-400 font-mono">{art.publishedAt?.slice(0, 16)}</span>
                        </div>
                        <div className="font-serif font-bold text-xs text-stone-900 line-clamp-2">
                          {art.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 4: 独立/自媒体/行业观点 (Independent Tier C) */}
              <div className="border-2 border-stone-200 bg-stone-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="font-serif font-bold text-xs text-stone-950 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-stone-600" />
                    <span>创投智库与自媒体观点 (Tier C)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-bold">
                    {independent.length} 篇
                  </span>
                </div>
                {independent.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 font-serif">
                    暂无其他自媒体观点
                  </div>
                ) : (
                  <div className="space-y-2">
                    {independent.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="p-3 bg-white border border-stone-200 hover:border-stone-400 rounded-lg transition-all cursor-pointer space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-stone-800">{art.sourceName}</span>
                          <span className="text-stone-400 font-mono">{art.publishedAt?.slice(0, 16)}</span>
                        </div>
                        <div className="font-serif font-bold text-xs text-stone-900 line-clamp-2">
                          {art.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Tab 2: Chronological Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="text-xs text-stone-500 font-serif">
              按时间先后顺序排列各信源报道演进节点：
            </div>

            <div className="relative border-l-2 border-stone-200 ml-4 space-y-6 pl-6 py-2">
              {cluster.timeline.map((node, i) => {
                const isOfficial = node.perspective === 'official';
                const isCommercial = node.perspective === 'commercial';
                const isGlobal = node.perspective === 'global';

                const targetArticle = cluster.articles.find((a) => a.id === node.articleId);

                return (
                  <div key={i} className="relative group">
                    {/* Circle on timeline */}
                    <div
                      className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                        isOfficial
                          ? 'bg-emerald-600 ring-2 ring-emerald-200'
                          : isCommercial
                          ? 'bg-sky-600 ring-2 ring-sky-200'
                          : isGlobal
                          ? 'bg-purple-600 ring-2 ring-purple-200'
                          : 'bg-stone-500'
                      }`}
                    />

                    {/* Timeline Card */}
                    <div
                      onClick={() => {
                        if (targetArticle) {
                          onSelectArticle(targetArticle);
                          onClose();
                        }
                      }}
                      className="p-4 bg-stone-50 hover:bg-white border border-stone-200 hover:border-stone-400 rounded-xl transition-all cursor-pointer space-y-1.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900">{node.sourceName}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              isOfficial
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCommercial
                                ? 'bg-sky-100 text-sky-800'
                                : isGlobal
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {isOfficial ? '官方通稿' : isCommercial ? '商业观察' : isGlobal ? '国际视角' : '独立观点'}
                          </span>
                        </div>
                        <span className="text-stone-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{node.formattedTime}</span>
                        </span>
                      </div>

                      <div className="font-serif font-bold text-sm text-stone-900 group-hover:text-[#E3120B] transition-colors">
                        {node.title}
                      </div>

                      {node.summary && (
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                          {node.summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Tab 3: Side-by-Side Dual Article Comparison */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs">
              <span className="font-serif text-stone-600">
                选择专题内任意两篇报道进行并排深度比对：
              </span>
              {selectedForCompareA && selectedForCompareB && onCompareArticles && (
                <button
                  onClick={() => {
                    onCompareArticles(selectedForCompareA, selectedForCompareB);
                    onClose();
                  }}
                  className="px-4 py-1.5 bg-[#E3120B] hover:bg-[#c90f09] text-white rounded-lg font-serif font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>启动双栏对比研读模式</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column A Picker */}
              <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="font-serif font-bold text-xs text-stone-900 border-b border-stone-100 pb-2">
                  对照组 A:
                </div>
                <select
                  value={selectedForCompareA?.id || ''}
                  onChange={(e) => {
                    const found = cluster.articles.find((a) => a.id === e.target.value);
                    if (found) setSelectedForCompareA(found);
                  }}
                  className="w-full text-xs font-serif p-2 border border-stone-300 rounded-lg bg-stone-50"
                >
                  {cluster.articles.map((art) => (
                    <option key={art.id} value={art.id}>
                      [{art.sourceName || '来源'}] {art.title}
                    </option>
                  ))}
                </select>

                {selectedForCompareA && (
                  <div className="p-3 bg-stone-50 rounded-lg space-y-2 text-xs">
                    <div className="font-serif font-bold text-stone-900">{selectedForCompareA.title}</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      来源: {selectedForCompareA.sourceName} · {selectedForCompareA.publishedAt?.slice(0, 16)}
                    </div>
                    <p className="text-stone-700 leading-relaxed">{selectedForCompareA.summary}</p>
                  </div>
                )}
              </div>

              {/* Column B Picker */}
              <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="font-serif font-bold text-xs text-stone-900 border-b border-stone-100 pb-2">
                  对照组 B:
                </div>
                <select
                  value={selectedForCompareB?.id || ''}
                  onChange={(e) => {
                    const found = cluster.articles.find((a) => a.id === e.target.value);
                    if (found) setSelectedForCompareB(found);
                  }}
                  className="w-full text-xs font-serif p-2 border border-stone-300 rounded-lg bg-stone-50"
                >
                  {cluster.articles.map((art) => (
                    <option key={art.id} value={art.id}>
                      [{art.sourceName || '来源'}] {art.title}
                    </option>
                  ))}
                </select>

                {selectedForCompareB && (
                  <div className="p-3 bg-stone-50 rounded-lg space-y-2 text-xs">
                    <div className="font-serif font-bold text-stone-900">{selectedForCompareB.title}</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      来源: {selectedForCompareB.sourceName} · {selectedForCompareB.publishedAt?.slice(0, 16)}
                    </div>
                    <p className="text-stone-700 leading-relaxed">{selectedForCompareB.summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-stone-200 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
