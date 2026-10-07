import React, { useState, useEffect, useRef } from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, RefreshCw, Link2, FileText, Download } from 'lucide-react';
import { NewsArticle } from '../types';
import { todayFullZh, isoToday, nowHHmm } from '../utils/dateUtils';
import { MethodBadge } from './common/MethodBadge';
import { classifyAiClientError } from '../utils/aiClientErrors';

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (newArticle: NewsArticle) => void;
}

type InputMode = 'link' | 'text';

function buildHonestArticle(
  articleData: any,
  input: {
    title: string;
    source: string;
    sourceUrl: string;
    category: string;
    content: string;
    articleId?: string;
  }
): NewsArticle {
  const hasSource = Boolean(input.sourceUrl.trim() || input.source.trim());
  return {
    id: input.articleId || `user-${Date.now()}`,
    title: articleData.title || input.title || '用户投递',
    subtitle: articleData.subtitle || '',
    oneSentenceVerdict:
      articleData.oneSentenceVerdict || articleData.summary || input.content.slice(0, 120) || input.title,
    readTimeMinutes: typeof articleData.readTimeMinutes === 'number' ? articleData.readTimeMinutes : 4,
    category: articleData.category || input.category || '用户投递',
    tags: Array.isArray(articleData.tags)
      ? Array.from(new Set([...articleData.tags.map(String), '用户投递']))
      : ['用户投递', input.category].filter(Boolean),
    date: articleData.date || todayFullZh(),
    timeAgo: '刚刚',
    sourceName: articleData.sourceName || input.source || '见微·用户投递',
    sourceUrl: input.sourceUrl.trim() || undefined,
    publishedAt: new Date().toISOString(),
    sourceDate: articleData.sourceDate || `${isoToday()} ${nowHHmm()}`,
    sourceCount: typeof articleData.sourceCount === 'number' ? articleData.sourceCount : hasSource ? 1 : 0,
    impactScope: articleData.impactScope || '未标注',
    summary: articleData.summary || input.content.slice(0, 120) || input.title,
    coreQuote: articleData.coreQuote || articleData.oneSentenceVerdict || '',
    quoteAuthor: articleData.quoteAuthor || input.source || '',
    tongsuSummary: articleData.tongsuSummary || {
      simpleSay: input.content.slice(0, 180) || input.title,
      whyExplanation: '',
      whatItMeans: '',
      jargonTerms: [],
    },
    dehydratedItems: articleData.dehydratedItems || {
      coreEntity: input.source || '未标注',
      keyAction: input.title,
      relatedCount: 0,
      coreShifts: [],
      impactHighlights: [],
    },
    sevenElements: articleData.sevenElements,
    logicTree: articleData.logicTree,
    personaImpacts: articleData.personaImpacts || [],
    rippleEffect: articleData.rippleEffect,
    spectrumLayers: articleData.spectrumLayers || [],
    evidenceChain: articleData.evidenceChain || [],
    industrySignals: articleData.industrySignals || [],
    aiFieldMeta: articleData.aiFieldMeta || undefined,
    isCustom: true,
    isExternal: Boolean(input.sourceUrl.trim()),
  };
}

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [mode, setMode] = useState<InputMode>('link');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('科技前沿');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [fetchedPreview, setFetchedPreview] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setFetchNote(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!loading && !fetching) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const timer = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading, fetching]);

  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      fetchAbortRef.current?.abort();
    };
  }, []);

  const handleClose = () => {
    if (loading || fetching) {
      analyzeAbortRef.current?.abort();
      fetchAbortRef.current?.abort();
      setLoading(false);
      setFetching(false);
    }
    onClose();
  };

  useEscapeClose(isOpen, handleClose);

  const canAnalyze =
    mode === 'link'
      ? Boolean((title.trim() || content.trim()) && sourceUrl.trim())
      : Boolean(title.trim() || content.trim());

  const handleFetchArticle = async () => {
    const url = sourceUrl.trim();
    if (!url) {
      setSubmitError('请先粘贴新闻链接。');
      return;
    }
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setFetching(true);
    setSubmitError(null);
    setFetchNote(null);
    try {
      const res = await fetch('/api/fetch-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setSubmitError(
          classifyAiClientError({ status: res.status, payload: data }) ||
            '未能抓取可用正文。请改用「贴正文」模式，或换可公开访问的链接。'
        );
        setFetchedPreview(false);
        return;
      }
      if (data.title && !title.trim()) setTitle(String(data.title));
      else if (data.title) setTitle(String(data.title));
      if (data.sourceName) setSource(String(data.sourceName));
      if (data.finalUrl) setSourceUrl(String(data.finalUrl));
      setContent(String(data.pageText || data.excerpt || ''));
      setFetchedPreview(true);
      setFetchNote(
        data.note ||
          '已抓取页面正文。内容来自目标站点，不是平台核验过的事实摘要。'
      );
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setSubmitError('已取消抓取。');
      } else {
        console.error('fetch-article failed', err);
        setSubmitError(classifyAiClientError({ error: err }));
      }
      setFetchedPreview(false);
    } finally {
      setFetching(false);
    }
  };

  const handleCancelInFlight = () => {
    analyzeAbortRef.current?.abort();
    fetchAbortRef.current?.abort();
    setLoading(false);
    setFetching(false);
    setSubmitError('已取消请求。输入内容仍保留，可稍后再试。');
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAnalyze) return;

    if (mode === 'link' && !content.trim() && !title.trim()) {
      setSubmitError('请先抓取链接正文，或切换到「贴正文」模式。');
      return;
    }

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || content.trim().slice(0, 80),
          source,
          sourceUrl,
          category,
          content,
          persist: true,
        }),
        signal: controller.signal,
      });
      const resData = await res.json().catch(() => ({}));
      if (resData?.fallback || !res.ok) {
        setSubmitError(classifyAiClientError({ status: res.status, payload: resData }));
        return;
      }
      if (!resData?.data) {
        setSubmitError('分析未返回可用结果，输入内容已保留，请稍后重试。');
        return;
      }

      const newArticle = buildHonestArticle(resData.data, {
        title,
        source,
        sourceUrl,
        category,
        content,
        articleId: resData.articleId,
      });

      onAnalysisComplete(newArticle);
      onClose();
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setSubmitError('已取消解读。输入内容仍保留。');
      } else {
        console.error('Analysis submission failed', err);
        setSubmitError(classifyAiClientError({ error: err }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden font-sans max-h-[90vh] flex flex-col"
        >
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-2 min-w-0">
              <Sparkles className="w-5 h-5 text-[#E3120B] shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base font-serif font-bold">见微 · 读懂新闻</h3>
                <p className="text-[11px] text-stone-400 font-sans">
                  贴链接抓取正文，或直接贴新闻内容，生成结构化解读（模型推断，非已核验事实）
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded text-stone-400 hover:text-white shrink-0"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('link')}
                  className={`px-3 py-1.5 text-xs font-serif font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                    mode === 'link' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  贴链接
                </button>
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`px-3 py-1.5 text-xs font-serif font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                    mode === 'text' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  贴正文
                </button>
              </div>
              <MethodBadge methodId="model_interpretation" compact />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
              输出是 AI 综合解读（未校准、未核验）。抓取正文只代表目标页面可访问，不代表事实已核实。关键结论请回到原文或独立来源核对。
            </div>

            {mode === 'link' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    新闻链接 *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => {
                        setSourceUrl(e.target.value);
                        setFetchedPreview(false);
                      }}
                      placeholder="https://..."
                      required
                      className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                    />
                    <button
                      type="button"
                      onClick={handleFetchArticle}
                      disabled={fetching || !sourceUrl.trim()}
                      className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-serif font-bold rounded-lg flex items-center gap-1.5 shrink-0"
                    >
                      {fetching ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{fetching ? '抓取中…' : '抓取正文'}</span>
                    </button>
                  </div>
                </div>

                {fetchNote && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                    {fetchNote}
                    {fetchedPreview ? ' 可在下方核对标题与正文后再解读。' : ''}
                  </div>
                )}

                {(fetchedPreview || title || content) && (
                  <>
                    <div>
                      <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                        抓取标题（可改）
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="抓取后自动填入，也可手改"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                        抓取正文（可改）
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="抓取成功后显示页面正文；可删减后再解读"
                        rows={6}
                        className="w-full p-3.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 resize-y font-sans min-h-[120px]"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    新闻标题 / 事件概要
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：某公司发布季度业绩说明…"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    新闻正文 / 摘录 *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="粘贴原始报道、财报附注或声明全文。输入材料质量决定解读质量。"
                    rows={6}
                    required={!title.trim()}
                    className="w-full p-3.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 resize-y font-sans min-h-[120px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                    原文链接（可选，便于逐条核验）
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  新闻来源 / 机构背景
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="例如：路透社 / 官方声明 / 站点域名"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  所属赛道 / 分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  <option value="科技前沿">科技前沿</option>
                  <option value="AI 前沿">AI 前沿</option>
                  <option value="全球财经">全球财经</option>
                  <option value="产业纵深">产业纵深</option>
                  <option value="地缘与能源">地缘与能源</option>
                  <option value="用户投递">用户投递</option>
                </select>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-800">
                {submitError}
              </div>
            )}

            {(loading || fetching) && (
              <div className="bg-stone-100 border border-stone-300 rounded-lg px-3 py-2.5 text-xs text-stone-700 space-y-1">
                <div className="font-serif font-bold text-stone-900 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E3120B]" />
                  {fetching ? '正在抓取正文…' : '正在解读…'}
                  <span className="font-mono text-stone-500 font-normal">已等待 {elapsedSec}s / 约 45s</span>
                </div>
                <p className="text-stone-500">
                  {elapsedSec < 15
                    ? '模型推理中，请稍候。'
                    : elapsedSec < 35
                      ? '仍在生成；复杂稿件可能接近超时上限。'
                      : '接近超时。可取消后重试，或改贴更短正文。'}
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              {(loading || fetching) ? (
                <button
                  type="button"
                  onClick={handleCancelInFlight}
                  className="px-4 py-2 text-xs font-serif font-bold text-red-700 hover:text-red-900 border border-red-300 rounded-lg bg-red-50"
                >
                  取消请求
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
                >
                  关闭
                </button>
              )}
              <button
                type="submit"
                disabled={loading || fetching || !canAnalyze}
                className="px-6 py-2.5 bg-[#E3120B] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-serif font-bold rounded-lg transition-all flex items-center space-x-2 shadow-sm"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{loading ? `解读中 ${elapsedSec}s` : '开始解读'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
