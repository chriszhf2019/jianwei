import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, Tag, Newspaper, Radio, Clock, Trash2, CornerDownLeft } from 'lucide-react';
import { NewsArticle, RadarKeyword, TopicCluster } from '../types';
import { formatArticleTime } from '../utils/articleTime';
import { keywordHits } from '../utils/corpusMetrics';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  radarKeywords: RadarKeyword[];
  topics: TopicCluster[];
  onSelectArticle: (article: NewsArticle) => void;
  onSelectTopic: (topicId: string) => void;
}

type SearchTab = 'all' | 'articles' | 'topics' | 'radars';

/** 文本高亮组件：将匹配子串用醒目底色标出，保留周围文本 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const trimmed = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <>{text}</>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + trimmed.length);
  const after = text.slice(idx + trimmed.length);

  return (
    <>
      {before}
      <mark className="bg-amber-200/90 text-stone-950 font-bold px-0.5 rounded text-inherit">
        {match}
      </mark>
      <HighlightMatch text={after} query={query} />
    </>
  );
}

const QUICK_TAGS = ['NVIDIA', '台积电', '降息', '关税', 'AI Agent', '出海', '半导体'];
const RECENT_KEY = 'jianwei:recent-searches';

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  articles,
  radarKeywords,
  topics,
  onSelectArticle,
  onSelectTopic,
}) => {
  useEscapeClose(isOpen, onClose);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const listRef = useRef<HTMLDivElement>(null);

  // 150ms 防抖：避免高频击键卡顿
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // 记录搜索词历史
  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
    setRecentSearches([]);
  };

  const filteredArticles = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [debouncedQuery, articles]);

  const filteredTopics = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle?.toLowerCase().includes(q) ||
        t.summary?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [debouncedQuery, topics]);

  const filteredRadars = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return radarKeywords.filter((r) => r.keyword.toLowerCase().includes(q));
  }, [debouncedQuery, radarKeywords]);

  const radarCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of radarKeywords) {
      map.set(r.id, keywordHits(r.keyword, articles).total);
    }
    return map;
  }, [radarKeywords, articles]);

  // 合并可见条目供键盘导航
  const navigableItems = useMemo(() => {
    const items: Array<
      | { type: 'article'; data: NewsArticle }
      | { type: 'topic'; data: TopicCluster }
      | { type: 'radar'; data: RadarKeyword }
    > = [];

    if (activeTab === 'all' || activeTab === 'articles') {
      for (const art of filteredArticles.slice(0, 30)) {
        items.push({ type: 'article', data: art });
      }
    }
    if (activeTab === 'all' || activeTab === 'topics') {
      for (const top of filteredTopics.slice(0, 10)) {
        items.push({ type: 'topic', data: top });
      }
    }
    if (activeTab === 'all' || activeTab === 'radars') {
      for (const r of filteredRadars.slice(0, 10)) {
        items.push({ type: 'radar', data: r });
      }
    }
    return items;
  }, [activeTab, filteredArticles, filteredTopics, filteredRadars]);

  // 键盘导航 (上下箭头、回车打开)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (navigableItems.length > 0 ? (prev + 1) % navigableItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          navigableItems.length > 0 ? (prev - 1 + navigableItems.length) % navigableItems.length : 0
        );
      } else if (e.key === 'Enter') {
        if (navigableItems.length > 0 && navigableItems[selectedIndex]) {
          e.preventDefault();
          const target = navigableItems[selectedIndex];
          saveSearchTerm(debouncedQuery);
          if (target.type === 'article') {
            onSelectArticle(target.data);
            onClose();
          } else if (target.type === 'topic') {
            onSelectTopic(target.data.id);
            onClose();
          } else if (target.type === 'radar') {
            setQuery(target.data.keyword);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigableItems, selectedIndex, debouncedQuery, onSelectArticle, onSelectTopic, onClose]);

  const totalMatches = filteredArticles.length + filteredTopics.length + filteredRadars.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-16 p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* 搜索输入框 */}
            <div className="p-4 border-b border-stone-300 flex items-center space-x-3 bg-white">
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索微观线索、公司（NVIDIA/台积电）、政策（降息/关税）、术语..."
                autoFocus
                className="flex-1 text-base bg-transparent border-none outline-hidden text-stone-900 placeholder:text-stone-400 font-sans"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-700 transition-colors"
                  title="清除输入"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-900 border border-stone-300 rounded font-mono hover:bg-stone-100 transition-colors"
              >
                ESC
              </button>
            </div>

            {/* 分类过滤 Tab（有输入时展示） */}
            {query.trim() && (
              <div className="px-4 py-2 border-b border-stone-200 bg-stone-50 flex items-center gap-2 text-xs font-serif overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  全部 ({totalMatches})
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'articles'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  情报报告 ({filteredArticles.length})
                </button>
                <button
                  onClick={() => setActiveTab('topics')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'topics'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  专题档案 ({filteredTopics.length})
                </button>
                <button
                  onClick={() => setActiveTab('radars')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'radars'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  关注雷达 ({filteredRadars.length})
                </button>
              </div>
            )}

            {/* 结果主列表 */}
            <div ref={listRef} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 font-sans">
              {!query.trim() ? (
                <div className="space-y-6">
                  {/* 最近搜索历史 */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-serif text-stone-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          最近搜索
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="hover:text-red-600 inline-flex items-center gap-1 text-[11px] font-sans"
                        >
                          <Trash2 className="w-3 h-3" />
                          清除历史
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 hover:border-stone-400 rounded-lg text-xs text-stone-800 transition-all font-sans"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 快捷热门标签 */}
                  <div className="space-y-2">
                    <div className="text-xs font-serif text-stone-500 uppercase tracking-wider">
                      精选搜索热词
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setQuery(tag)}
                          className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 hover:border-stone-400 rounded-lg text-xs font-medium text-stone-800 transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 我的监控雷达词 */}
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <div className="text-xs font-serif text-stone-500 uppercase tracking-wider">
                      我的关注雷达词
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {radarKeywords.length === 0 ? (
                        <span className="text-xs text-stone-400">暂未设置监控关键词。</span>
                      ) : (
                        radarKeywords.map((rk) => (
                          <button
                            key={rk.id}
                            onClick={() => setQuery(rk.keyword)}
                            className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-medium text-stone-800 flex items-center space-x-1.5 transition-colors"
                          >
                            <Radio className="w-3 h-3 text-[#E3120B]" />
                            <span>{rk.keyword}</span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({radarCounts.get(rk.id) ?? 0} 条)
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 文章列表 */}
                  {(activeTab === 'all' || activeTab === 'articles') && filteredArticles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-serif font-bold text-stone-700 uppercase tracking-wide">
                        <Newspaper className="w-4 h-4 text-[#E3120B]" />
                        <span>情报报告 ({filteredArticles.length})</span>
                      </div>
                      <div className="space-y-2">
                        {filteredArticles.slice(0, 30).map((article, idx) => {
                          const isHighlighted =
                            navigableItems[selectedIndex]?.type === 'article' &&
                            (navigableItems[selectedIndex]?.data as NewsArticle).id === article.id;

                          return (
                            <div
                              key={article.id}
                              onClick={() => {
                                saveSearchTerm(debouncedQuery);
                                onSelectArticle(article);
                                onClose();
                              }}
                              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                isHighlighted
                                  ? 'bg-stone-100 border-stone-900 ring-1 ring-stone-900 shadow-xs'
                                  : 'bg-white border-stone-200 hover:border-stone-400 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                    {article.category}
                                  </span>
                                  <span className="text-xs text-stone-400">{formatArticleTime(article)}</span>
                                  {article.sourceName && (
                                    <span className="text-xs text-stone-400">· {article.sourceName}</span>
                                  )}
                                </div>
                                {isHighlighted && (
                                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-0.5">
                                    <CornerDownLeft className="w-3 h-3" />
                                    回车打开
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-serif font-bold text-stone-950 mb-1 leading-snug">
                                <HighlightMatch text={article.title} query={debouncedQuery} />
                              </h4>
                              <p className="text-xs text-stone-600 line-clamp-1">
                                <HighlightMatch
                                  text={article.oneSentenceVerdict || article.subtitle || article.summary || ''}
                                  query={debouncedQuery}
                                />
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 专题列表 */}
                  {(activeTab === 'all' || activeTab === 'topics') && filteredTopics.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-serif font-bold text-stone-700 uppercase tracking-wide">
                        <Tag className="w-4 h-4 text-[#0284C7]" />
                        <span>深度专题档案 ({filteredTopics.length})</span>
                      </div>
                      <div className="space-y-2">
                        {filteredTopics.map((topic) => {
                          const isHighlighted =
                            navigableItems[selectedIndex]?.type === 'topic' &&
                            (navigableItems[selectedIndex]?.data as TopicCluster).id === topic.id;

                          return (
                            <div
                              key={topic.id}
                              onClick={() => {
                                saveSearchTerm(debouncedQuery);
                                onSelectTopic(topic.id);
                                onClose();
                              }}
                              className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                                isHighlighted
                                  ? 'bg-stone-100 border-stone-900 ring-1 ring-stone-900 shadow-xs'
                                  : 'bg-white border-stone-200 hover:border-blue-300'
                              }`}
                            >
                              <div>
                                <h4 className="text-sm font-serif font-bold text-stone-950">
                                  <HighlightMatch text={topic.title} query={debouncedQuery} />
                                </h4>
                                <p className="text-xs text-stone-500 line-clamp-1">
                                  <HighlightMatch text={topic.subtitle || topic.summary || ''} query={debouncedQuery} />
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-stone-400 shrink-0 ml-2" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 雷达词列表 */}
                  {(activeTab === 'all' || activeTab === 'radars') && filteredRadars.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-serif text-stone-500 uppercase tracking-wider">
                        关联关注雷达 ({filteredRadars.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filteredRadars.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              saveSearchTerm(r.keyword);
                              setQuery(r.keyword);
                            }}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs rounded-full border border-stone-300 font-medium transition-colors"
                          >
                            <HighlightMatch text={r.keyword} query={debouncedQuery} />（{radarCounts.get(r.id) ?? 0} 条匹配）
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 空态 */}
                  {totalMatches === 0 && (
                    <div className="text-center py-12 text-stone-400 font-sans space-y-2">
                      <p className="text-sm text-stone-600">
                        未检索到与「<strong>{query}</strong>」直接匹配的情报
                      </p>
                      <p className="text-xs text-stone-400">
                        您可以尝试更宽泛的关键词、切换搜索标签，或在顶部点击「AI 提交分析」摄取新内容。
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 键盘操作提示底部栏 */}
            <div className="px-4 py-2 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 font-sans">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">↑</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">↓</kbd>{' '}
                  导航
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">↵</kbd>{' '}
                  选择
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">ESC</kbd>{' '}
                  关闭
                </span>
              </div>
              <div>
                共 {articles.length} 篇语料库情报
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
