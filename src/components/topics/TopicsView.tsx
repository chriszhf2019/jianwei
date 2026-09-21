import React, { useMemo, useState } from 'react';
import { TopicCluster, NewsArticle } from '../../types';
import { TOPIC_CLUSTERS } from '../../data/intelligenceData';
import { Layers, ArrowRight, Clock, Sparkles, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';
import { formatArticleTime } from '../../utils/articleTime';
import { articleSortTime } from '../../utils/articleTime';
import { MethodBadge } from '../common/MethodBadge';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { FeatureSummary } from '../common/FeatureSummary';

interface TopicsViewProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

interface DynamicEntityTopic {
  key: string;
  name: string;
  articleIds: string[];
  sources: string[];
  mentionCount: number;
  latestAt: number;
}

export const TopicsView: React.FC<TopicsViewProps> = ({ articles, onSelectArticle }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(TOPIC_CLUSTERS[0]?.id || '');
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(null);

  const dynamicTopics = useMemo<DynamicEntityTopic[]>(() => {
    const map = new Map<string, {
      name: string;
      articleIds: Set<string>;
      sources: Set<string>;
      mentionCount: number;
      latestAt: number;
    }>();
    for (const article of articles) {
      for (const entity of article.entityMentions || []) {
        const name = String(entity.name || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const current = map.get(key) || {
          name,
          articleIds: new Set<string>(),
          sources: new Set<string>(),
          mentionCount: 0,
          latestAt: 0,
        };
        current.articleIds.add(article.id);
        if (article.sourceName) current.sources.add(article.sourceName);
        current.mentionCount += 1;
        current.latestAt = Math.max(current.latestAt, articleSortTime(article));
        map.set(key, current);
      }
    }
    return [...map.entries()]
      .map(([key, value]) => ({
        key,
        name: value.name,
        articleIds: [...value.articleIds],
        sources: [...value.sources],
        mentionCount: value.mentionCount,
        latestAt: value.latestAt,
      }))
      .filter((item) => item.articleIds.length >= 2)
      .sort((a, b) => b.articleIds.length - a.articleIds.length || b.mentionCount - a.mentionCount || b.latestAt - a.latestAt)
      .slice(0, 12);
  }, [articles]);

  const selectedDynamicTopic =
    dynamicTopics.find((topic) => topic.key === selectedEntityKey) ||
    dynamicTopics[0] ||
    null;

  const dynamicArticles = useMemo(() => {
    if (!selectedDynamicTopic) return [];
    const ids = new Set(selectedDynamicTopic.articleIds);
    return articles
      .filter((article) => ids.has(article.id))
      .sort((a, b) => articleSortTime(b) - articleSortTime(a));
  }, [articles, selectedDynamicTopic]);

  const selectedTopic =
    TOPIC_CLUSTERS.find((t) => t.id === selectedTopicId) || TOPIC_CLUSTERS[0] || null;

  // 每个专题“收录报告数”以当前文章集的真实匹配为准，不再展示可能与列表不符的静态值
  const countMatched = (topic: TopicCluster): number =>
    articles.filter((a) => (topic.articleIds || []).includes(a.id)).length;

  const relatedArticlesList = articles.filter((a) =>
    (selectedTopic?.articleIds || []).includes(a.id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Title */}
      <div className="border-b-2 border-stone-900 pb-4">
        <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          <span>见微 · 深度专题档案库</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 tracking-tight">
          长周期专题脉络与结构性博弈
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
          摆脱单条新闻的碎片化干扰，将跨周期的微观事实编织为完整的演进图景。
        </p>
      </div>

      <FeatureSummary featureId="topics" compact />

      {TOPIC_CLUSTERS.length === 0 && (
        dynamicTopics.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-800">暂无可形成的实体专题</h2>
            <p className="text-xs text-stone-500">
              当前语料还没有同一主体被至少两篇真实报道提及。系统不会用静态时间轴或虚构冲突填充专题页。
            </p>
          </div>
        ) : selectedDynamicTopic ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dynamicTopics.map((topic) => {
                const selected = topic.key === selectedDynamicTopic.key;
                return (
                  <button
                    key={topic.key}
                    type="button"
                    onClick={() => setSelectedEntityKey(topic.key)}
                    className={`text-left rounded-xl border-2 p-4 transition-colors ${
                      selected
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-serif font-black">{topic.name}</span>
                      <span className={`font-mono text-[10px] ${selected ? 'text-stone-300' : 'text-stone-400'}`}>
                        {topic.articleIds.length} 篇
                      </span>
                    </div>
                    <p className={`text-[11px] ${selected ? 'text-stone-300' : 'text-stone-500'}`}>
                      {topic.sources.length} 个来源 · 最近更新 {topic.latestAt ? new Date(topic.latestAt).toLocaleDateString('zh-CN') : '未知'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
                <div>
                  <div className="text-[10px] font-mono text-stone-400">实体报道档案 · 非人工专题</div>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-950 mt-1">{selectedDynamicTopic.name}</h2>
                </div>
                <MethodBadge methodId="entity_cooccurrence" compact />
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 leading-relaxed">
                <b className="font-serif">为什么形成这个档案：</b>
                「{selectedDynamicTopic.name}」在当前语料中被 {selectedDynamicTopic.articleIds.length} 篇真实报道提及，
                分布在 {selectedDynamicTopic.sources.length} 个来源中，累计出现 {selectedDynamicTopic.mentionCount} 次。
                这代表当前新闻覆盖集中度，不代表企业基本面、事件因果或未来走势。
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950">
                  <div className="font-serif font-bold mb-1">怎么看</div>
                  <p>先看多篇报道是否在讲同一事实变化。来源数量增加只提高可追溯性，仍需检查它们是否引用同一个原始消息。</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
                  <div className="font-serif font-bold mb-1">下一步做什么</div>
                  <p>打开最新原文核对时间、数字和主体动作；把影响判断写成带指标与到期日的可证伪预测，而不是直接当作结论。</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-serif font-bold text-stone-900">相关报道时间线</h3>
                  <span className="text-[10px] text-stone-400">按真实发布时间倒序</span>
                </div>
                <div className="space-y-2">
                  {dynamicArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => onSelectArticle(article)}
                      className="w-full text-left rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3.5 py-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-stone-400 mb-1">
                        <span className="font-mono">{formatArticleTime(article)}</span>
                        <span>·</span>
                        <span>{article.sourceName || '来源未标'}</span>
                        {article.category && <><span>·</span><span>{article.category}</span></>}
                      </div>
                      <div className="text-sm font-serif font-bold text-stone-900 line-clamp-2">
                        <KeyTermHighlight text={article.title} entities={(article.entityMentions || []).map((item) => item.name)} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null
      )}

      {TOPIC_CLUSTERS.length > 0 && !selectedTopic && (
        <div className="bg-white border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-800">暂无人工策展专题</h2>
          <p className="text-xs text-stone-500">
            当前没有关联到真实文章、时间线和来源的专题数据。系统不会用虚构时间轴填充此页面。
          </p>
        </div>
      )}

      {/* Topics Selector Tabs */}
      {TOPIC_CLUSTERS.length > 0 && selectedTopic && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOPIC_CLUSTERS.map((topic) => {
          const isSelected = topic.id === selectedTopicId;
          return (
            <div
              key={topic.id}
              onClick={() => setSelectedTopicId(topic.id)}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                  : 'bg-white text-stone-900 border-stone-300 hover:border-stone-500'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={`font-mono px-2 py-0.5 rounded text-[10px] ${
                  isSelected ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
                }`}>
                  {topic.updatedAt}
                </span>
                <span className={`text-[11px] font-bold ${
                  isSelected ? 'text-[#E3120B]' : 'text-stone-500'
                }`}>
                  收录 {countMatched(topic)} 篇深度报告
                </span>
              </div>

              <h3 className="text-base font-serif font-bold mb-1.5 leading-snug">
                {topic.title}
              </h3>
              <p className={`text-xs line-clamp-2 leading-relaxed ${
                isSelected ? 'text-stone-300' : 'text-stone-600'
              }`}>
                {topic.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Selected Topic Full Showcase */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
        {/* Topic Header & Thesis */}
        <div className="space-y-4 border-b border-stone-200 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {selectedTopic.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950">
            {selectedTopic.title}
          </h2>

          <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-4 rounded-r-xl">
            <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
              专题核心论断与底层逻辑
            </div>
            <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
              {selectedTopic.summary}
            </p>
          </div>
        </div>

        {/* 核心博弈焦点 */}
        <div className="space-y-3">
          <div className="text-xs font-serif font-bold text-stone-600 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>核心博弈焦点与各方阵营诉求</span>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
            <div className="font-serif font-bold text-stone-900">
              结构性冲突：
            </div>
            <p className="text-stone-700 leading-relaxed font-sans">
              {selectedTopic.coreConflict}
            </p>
          </div>
        </div>

        {/* 演进时间轴里程碑 */}
        <div className="space-y-4">
          <div className="text-xs font-serif font-bold text-stone-600 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-[#0284C7]" />
            <span>时间轴与关键拐点演进脉络</span>
          </div>

          <div className="relative pl-6 border-l-2 border-stone-300 space-y-6">
            {selectedTopic.timeline.map((item, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-stone-900 border-2 border-white" />
                <div className="text-xs font-mono font-bold text-stone-500 mb-0.5">
                  {item.date}
                </div>
                <h4 className="text-sm font-serif font-bold text-stone-950 mb-1">
                  {item.milestone}
                </h4>
                <p className="text-xs text-stone-700 leading-relaxed font-sans">
                  {item.impact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 专题下归档的深度报告 */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-[#E3120B]" />
            <span>本专题收录的深度解读报告 ({relatedArticlesList.length})</span>
          </div>

          {relatedArticlesList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticlesList.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art)}
                  className="p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-stone-400 rounded-xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-[#E3120B]">{art.category}</span>
                    <span className="text-stone-400 font-mono">{formatArticleTime(art)}</span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-stone-950 group-hover:text-[#E3120B] transition-colors line-clamp-2">
                    {art.title}
                  </h4>
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {art.oneSentenceVerdict || art.summary}
                  </p>
                  <div className="flex items-center justify-end text-xs font-serif font-bold text-stone-800 group-hover:text-[#E3120B] pt-1">
                    <span>展开解读 ➔</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-stone-400 text-sm font-sans">
              当前文章库中暂无归入该专题的报告，可先到首页浏览或在顶部发起「AI 提交分析」。
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
