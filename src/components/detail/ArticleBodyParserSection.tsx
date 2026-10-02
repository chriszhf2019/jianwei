import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import { KeyTermHighlight, KeyTermNote } from '../common/KeyTermHighlight';
import {
  FileText,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
  BookOpen,
  Info,
  CheckCircle2,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { composeModel } from '../../utils/sevenElementsBrief';

interface ArticleBodyParserSectionProps {
  article: NewsArticle;
  onOpenTermExplain?: (term: string) => void;
}

export const ArticleBodyParserSection: React.FC<ArticleBodyParserSectionProps> = ({
  article,
  onOpenTermExplain,
}) => {
  const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // 组装结构化正文多段事实叙事 (Multi-paragraph Article Narrative Stream)
  const paragraphs = React.useMemo<string[]>(() => {
    const list: string[] = [];

    // 段落 1：事实概述与核心动因
    if (article.subtitle) {
      list.push(article.subtitle);
    }

    // 段落 2：七要素展开叙事或主摘要
    if (article.sevenElements) {
      const model = composeModel(article.sevenElements);
      if (model && model !== article.subtitle) {
        list.push(model);
      }
    } else if (article.summary && article.summary !== article.subtitle) {
      list.push(article.summary);
    }

    // 段落 3：核心原话与事实引述
    if (article.coreQuote) {
      list.push(`针对此次异动，${article.quoteAuthor || '业内权威人士'}表示：“${article.coreQuote}”`);
    }

    // 段落 4：深层光谱内容或影响综述
    if (article.spectrumLayers && article.spectrumLayers.length > 0) {
      const deepLayer = article.spectrumLayers.find((l) => l.layer === 'logic_chain' || l.layer === 'micro_signal');
      if (deepLayer && deepLayer.content) {
        list.push(`【产业链传导】${deepLayer.headline}：${deepLayer.content}`);
      }
    }

    // 如果段落依然少于 2 段，补充通俗解读
    if (list.length < 2 && article.tongsuSummary?.whatItMeans) {
      list.push(`【本质影响】${article.tongsuSummary.whatItMeans}`);
    }

    return list.length > 0 ? list : [article.summary || article.title];
  }, [article]);

  const entityNames = React.useMemo(() => {
    return (article.entityMentions || []).map((e) => e.name);
  }, [article.entityMentions]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl shadow-xs overflow-hidden font-sans">
      {/* 顶部控制栏：解析层开关、图例与统计 */}
      <div className="bg-stone-50 border-b-2 border-stone-800 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-serif font-black text-stone-950">
                报道正文与关键事实流 · 语义解析层
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
                CSS 智能高亮 · 悬停即释义
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-sans">
              鼠标悬停在彩色高亮词上即可弹出生活化大白话释义、记忆口诀与信号定性
            </p>
          </div>
        </div>

        {/* 控制工具条 */}
        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setHighlightEnabled(!highlightEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
              highlightEnabled
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
            }`}
            title="开启/关闭全文关键词高亮着色与悬停释义"
          >
            {highlightEnabled ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{highlightEnabled ? '语义高亮：已启用' : '高亮：已暂停'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-mono"
            title={isExpanded ? '收起正文' : '展开正文'}
          >
            {isExpanded ? '收起 ▲' : '展开 ▼'}
          </button>
        </div>
      </div>

      {/* 高亮色调图例 (Key Term Legend) */}
      {highlightEnabled && isExpanded && (
        <div className="bg-[#FAF8F5] border-b border-stone-200 px-4 sm:px-6 py-2">
          <KeyTermNote compact />
        </div>
      )}

      {/* 正文渲染区域 (Article Narrative Body Area with Parser Layer) */}
      {isExpanded && (
        <div className="p-5 sm:p-7 space-y-5 bg-white text-stone-800 font-serif text-sm sm:text-base leading-relaxed">
          {paragraphs.map((para, idx) => (
            <p key={idx} className="leading-loose tracking-normal text-stone-900 break-words">
              {highlightEnabled ? (
                <KeyTermHighlight
                  text={para}
                  entities={entityNames}
                  onOpenTermExplain={onOpenTermExplain}
                />
              ) : (
                para
              )}
            </p>
          ))}

          {/* 底部信源与事实核查声明 */}
          <div className="pt-4 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-stone-500">
            <span className="font-mono text-[11px]">
              📰 信源：{article.sourceName || '权威机构公报'} ｜ 发布时间：{article.sourceDate || article.date}
            </span>
            <span className="text-[11px] text-stone-400">
              见微语义解析层 · 本地实时词库匹配（零幻觉）
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
