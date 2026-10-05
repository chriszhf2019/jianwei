import React, { useState, useEffect } from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, RefreshCw, Send, FileText, CheckCircle2 } from 'lucide-react';
import { NewsArticle } from '../types';
import { todayFullZh, isoToday, nowHHmm } from '../utils/dateUtils';

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (newArticle: NewsArticle) => void;
}

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('科技前沿');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 每次打开时清空上一次的错误提示
  useEffect(() => {
    if (isOpen) setSubmitError(null);
  }, [isOpen]);

  useEscapeClose(isOpen, onClose);

  const presetSamples = [
    {
      title: '全球顶尖芯片代工厂将先进封装散热公差指标转入商用量产阶段',
      source: '彭博社 / 供应链调研',
      category: '科技前沿',
      content: '台积电与日月光在最新季度财报附注中披露，针对单芯片功耗突破 1000W 的 3nm 先进封装解决方案完成良率验证，订单排期已延展至 2027 年。'
    },
    {
      title: '美联储最新 FOMC 政策纪要悄然删去“中性利率可控”关键措辞',
      source: '路透社 / 联储官方声明',
      category: '全球财经',
      content: '美联储发布会议纪要，在风险平衡段落中首次删除了对通胀中性利率的固定锚定描述，暗示流动性宽松窗口的开启节奏可能与非农就业数据深度脱钩。'
    }
  ];

  const handleApplyPreset = (sample: typeof presetSamples[0]) => {
    setTitle(sample.title);
    setSource(sample.source);
    setCategory(sample.category);
    setContent(sample.content);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          source,
          sourceUrl,
          category,
          content,
        }),
      });
      const resData = await res.json();
      if (resData?.fallback) {
        setSubmitError(
          '服务端未配置可用 AI Key，本次没有生成分析，也未加入情报流。请配置模型后重试。'
        );
        return;
      }
      const articleData = resData.data;

      const newArticle: NewsArticle = {
        id: `user-art-${Date.now()}`,
        title: articleData.title || title,
        subtitle: articleData.subtitle || '深度认知拆解完成',
        oneSentenceVerdict: articleData.oneSentenceVerdict || articleData.summary || content.slice(0, 120) || title,
        readTimeMinutes: articleData.readTimeMinutes || 4,
        category: articleData.category || category,
        tags: articleData.tags || ['用户提交', category, '深度解读'],
        date: articleData.date || todayFullZh(),
        timeAgo: '刚刚',
        sourceName: articleData.sourceName || source || '见微·用户投递',
        sourceUrl: sourceUrl.trim() || undefined,
        publishedAt: new Date().toISOString(),
        sourceDate: articleData.sourceDate || `${isoToday()} ${nowHHmm()}`,
        sourceCount: articleData.sourceCount || 1,
        impactScope: articleData.impactScope || '未标注',
        summary: articleData.summary || content.slice(0, 120),
        coreQuote: articleData.coreQuote || articleData.oneSentenceVerdict,
        quoteAuthor: articleData.quoteAuthor || source || '',
        tongsuSummary: articleData.tongsuSummary || {
          simpleSay: content.slice(0, 180) || title,
          whyExplanation: '',
          whatItMeans: '',
          jargonTerms: [],
        },
        dehydratedItems: articleData.dehydratedItems || {
          coreEntity: source || '未标注',
          keyAction: title,
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
        aiFieldMeta: articleData.aiFieldMeta || undefined
      };

      onAnalysisComplete(newArticle);
      onClose();
    } catch (err) {
      console.error('Analysis submission failed', err);
      setSubmitError('分析请求失败（网络或服务异常），输入内容已保留，请稍后重试。');
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
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#E3120B]" />
              <div>
                <h3 className="text-base font-serif font-bold">见微 · 智能认知解构引擎</h3>
                <p className="text-[11px] text-stone-400 font-sans">
                  输入任意新闻/财报/声明，AI 为您自动生成七要素、因果逻辑树与身份影响矩阵
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAnalyze} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Quick Sample Fill */}
            <div className="space-y-1.5 bg-stone-100 p-3 rounded-xl border border-stone-200">
              <div className="text-xs font-serif font-bold text-stone-700">
                💡 快速填入测试样本：
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {presetSamples.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(s)}
                    className="text-left text-xs p-2 bg-white hover:bg-stone-200 rounded border border-stone-300 transition-colors line-clamp-1 flex-1"
                  >
                    📝 {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                新闻标题 / 事件概要 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：全球光刻机龙头调整最新一代设备出货指引..."
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                  新闻来源 / 机构背景
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="例如：路透社 / 彭博 / 官方财报"
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
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                原文链接（可选，用于逐条引用与后续核验）
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                新闻正文 / 细微线索 / 财报附注摘录
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="粘贴原始报道或关键段落，见微 AI 将自动挖掘其中的利益博弈与微观信号..."
                rows={4}
                className="w-full p-3.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 resize-none font-sans"
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-800 flex items-start space-x-1.5">
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-6 py-2.5 bg-[#E3120B] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-serif font-bold rounded-lg transition-all flex items-center space-x-2 shadow-sm"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{loading ? '正在进行七要素与因果逻辑推演...' : '启动见微认知拆解'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
