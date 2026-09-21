import React, { useState } from 'react';
import { NewsArticle, SpectrumLayerType, ReadingMode, SourceInspectionResult } from '../../types';
import { 
  Sparkles, 
  Layers, 
  MessageSquare, 
  BarChart3, 
  BookOpen, 
  Compass, 
  Quote,
  CheckCircle2,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { MethodBadge } from '../common/MethodBadge';

interface DeepSpectrumTabProps {
  article: NewsArticle;
}

export const DeepSpectrumTab: React.FC<DeepSpectrumTabProps> = ({ article }) => {
  const [readingRhythm, setReadingRhythm] = useState<ReadingMode>('classic');
  const [activeLayer, setActiveLayer] = useState<SpectrumLayerType | 'all'>('all');
  const [sourceChecks, setSourceChecks] = useState<Record<string, {
    loading: boolean;
    result?: SourceInspectionResult;
    error?: string;
  }>>({});

  const layers = article.spectrumLayers || [];

  const verifySource = async (
    evidenceId: string,
    sourceUrl: string,
    quote?: string,
    force = false
  ) => {
    setSourceChecks((current) => ({
      ...current,
      [evidenceId]: { loading: true },
    }));
    try {
      const response = await fetch('/api/source/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl, quote: quote || '', force }),
      });
      const data = await response.json() as SourceInspectionResult;
      setSourceChecks((current) => ({
        ...current,
        [evidenceId]: { loading: false, result: data },
      }));
    } catch {
      setSourceChecks((current) => ({
        ...current,
        [evidenceId]: { loading: false, error: '核验请求失败' },
      }));
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 说明：本页为通读排版（浓缩事实/利益/因果/数据/推演各层）；完整交互在对应 Tab */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-2.5 text-[11px] text-amber-900 leading-relaxed">
        本页是<b>五层通读</b>：用不同排版把 事实 → 利益 → 因果 → 数据 → 推演 连贯讲一遍；
        其中<b>因果</b>与<b>利益</b>可回「因果与涟漪」页做交互推演，<b>推演(终局)</b>可回「人机预测擂台」下注验证。
      </div>

      {/* 5-Rhythm Mode Switcher */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-serif font-bold text-stone-700">
          <Layers className="w-4 h-4 text-[#E3120B]" />
          <span>阅读排版节奏：</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'classic', label: '经典报刊版', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'fast_dialogue', label: '极速对话版', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: 'data_driven', label: '数据驱动版', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'magazine', label: '现代杂志版', icon: <Compass className="w-3.5 h-3.5" /> },
            { id: 'immersive', label: '沉浸叙事版', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setReadingRhythm(mode.id as ReadingMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif flex items-center space-x-1.5 transition-all ${
                readingRhythm === mode.id
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Ribbon Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveLayer('all')}
          className={`px-3 py-1 rounded-full text-xs font-serif transition-colors ${
            activeLayer === 'all'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
          }`}
        >
          全部五层色带
        </button>
        {layers.map((l) => {
          const isSelected = activeLayer === l.layer;
          return (
            <button
              key={l.layer}
              onClick={() => setActiveLayer(l.layer)}
              className={`px-3 py-1 rounded-full text-xs font-serif transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                isSelected
                  ? 'text-white font-bold'
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
              }`}
              style={{ backgroundColor: isSelected ? l.color : undefined }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span>{l.name}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Classic Mode (Classic 5-layer spectrum dissection) */}
      {readingRhythm === 'classic' && (
        <div className="space-y-6">
          {layers
            .filter((l) => activeLayer === 'all' || activeLayer === l.layer)
            .map((layer) => (
              <div
                key={layer.layer}
                className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <h3 className="text-lg font-serif font-bold text-stone-950">
                      {layer.name}
                    </h3>
                  </div>
                  <span className="text-xs font-serif font-bold text-stone-500">
                    {layer.headline}
                  </span>
                </div>

                <p className="text-base font-serif text-stone-900 leading-relaxed max-w-3xl">
                  <KeyTermHighlight text={layer.content} entities={(article.entityMentions || []).map((e) => e.name)} />
                </p>

                {layer.keyIndicators && layer.keyIndicators.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                    <span className="text-xs font-serif font-bold text-stone-500">
                      核心指标/线索：
                    </span>
                    {layer.keyIndicators.map((ind, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* 2. Fast Dialogue Mode */}
      {readingRhythm === 'fast_dialogue' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="text-xs font-serif font-bold text-stone-500 uppercase border-b border-stone-200 pb-2">
            见微 · 记者与首席分析师极速问答对拆
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="px-2 py-1 bg-stone-200 text-stone-800 text-xs font-bold rounded font-serif shrink-0">
                追问 1
              </span>
              <p className="text-sm font-bold text-stone-950 font-serif">
                “这件事表面上只是常规财报或新闻，为什么被见微评为重大微观异动？”
              </p>
            </div>
            <div className="ml-8 p-4 bg-stone-50 border-l-4 border-[#E3120B] rounded-r-xl text-sm font-serif text-stone-800 leading-relaxed">
              {layers[0]?.content || article.summary}
            </div>

            <div className="flex items-start space-x-3 pt-4">
              <span className="px-2 py-1 bg-stone-200 text-stone-800 text-xs font-bold rounded font-serif shrink-0">
                追问 2
              </span>
              <p className="text-sm font-bold text-stone-950 font-serif">
                “幕后最核心的利益博弈方是谁？谁在借此获取超额护城河？”
              </p>
            </div>
            <div className="ml-8 p-4 bg-stone-50 border-l-4 border-[#0284C7] rounded-r-xl text-sm font-serif text-stone-800 leading-relaxed">
              {layers[1]?.content || '头部厂商正在利用前置资本开支锁定稀缺产能配额。'}
            </div>

            <div className="flex items-start space-x-3 pt-4">
              <span className="px-2 py-1 bg-stone-200 text-stone-800 text-xs font-bold rounded font-serif shrink-0">
                追问 3
              </span>
              <p className="text-sm font-bold text-stone-950 font-serif">
                “未来 6-18 个月的终局推演结论是什么？”
              </p>
            </div>
            <div className="ml-8 p-4 bg-stone-50 border-l-4 border-[#E3120B] rounded-r-xl text-sm font-serif text-stone-800 leading-relaxed">
              {layers[4]?.content || article.oneSentenceVerdict}
            </div>
          </div>
        </div>
      )}

      {/* 3. Data-driven Mode */}
      {readingRhythm === 'data_driven' && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="text-xs font-serif font-bold text-stone-500 uppercase border-b border-stone-200 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span>量化事实信号与证据链查验</span>
              <MethodBadge methodId="source_page_verification" compact />
            </div>
          </div>

          <div className="space-y-4">
            {article.evidenceChain && article.evidenceChain.length > 0 ? (
              article.evidenceChain.map((ev) => (
                <div key={ev.id} className="p-4 bg-stone-50 rounded-xl border border-stone-300 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-stone-950">{ev.claim}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono px-2 py-0.5 rounded border ${
                        ev.verificationNote?.includes('精确匹配')
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : ev.verificationStatus === 'linked'
                            ? 'text-sky-700 bg-sky-50 border-sky-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {ev.verificationNote?.includes('精确匹配')
                          ? '引句已匹配'
                          : ev.verificationStatus === 'linked'
                            ? '模型附链接 · 待核验'
                            : ev.quote
                              ? '未附来源链接'
                              : '引句未匹配'}
                      </span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        模型自评 {ev.confidenceScore}/100 · 未校准
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-700">
                    <strong>事实依据：</strong>{ev.sourceFact}
                  </p>
                  {ev.quote && (
                    <blockquote className="border-l-2 border-stone-300 pl-2 text-[11px] text-stone-600 italic">
                      “{ev.quote}”
                    </blockquote>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 font-mono">
                    <span>模型自述可靠性依据：{ev.reliability}</span>
                    {ev.sourceName && <span>来源：{ev.sourceName}</span>}
                    {ev.publishedAt && <span>发布时间：{ev.publishedAt}</span>}
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline"
                        title="链接由模型提供，请打开原文核验"
                      >
                       打开来源 ↗
                      </a>
                    )}
                  </div>
                  {ev.verificationNote && (
                    <p className="text-[10px] text-stone-500">
                      核验：{ev.verificationNote}
                      {typeof ev.matchedOffset === 'number' ? `（正文偏移 ${ev.matchedOffset}）` : ''}
                    </p>
                  )}
                  {ev.sourceUrl && (
                    <div className="pt-1 border-t border-stone-200 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => void verifySource(ev.id, ev.sourceUrl!, ev.quote)}
                        disabled={sourceChecks[ev.id]?.loading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-sky-300 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-[11px] font-bold text-sky-800"
                      >
                        {sourceChecks[ev.id]?.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        核验链接与引句
                      </button>
                      {sourceChecks[ev.id]?.error && (
                        <p className="text-[10px] text-red-700">{sourceChecks[ev.id].error}</p>
                      )}
                      {sourceChecks[ev.id]?.result && (() => {
                        const result = sourceChecks[ev.id].result!;
                        const label =
                          result.status === 'verified_quote' ? '页面可访问，引句匹配' :
                          result.status === 'quote_not_found' ? '页面可访问，但未找到该引句' :
                          result.status === 'quote_too_short' ? '引句过短，无法可靠匹配' :
                          result.status === 'reachable_unverified' ? '页面可访问，但无引句可校验' :
                          result.status === 'blocked' ? '安全策略已阻止该地址' :
                          result.status === 'timeout' ? '抓取超时' :
                          result.status === 'too_large' ? '页面超过抓取大小限制' :
                          result.status === 'http_error' ? `目标站返回 HTTP ${result.httpStatus || '错误'}` :
                          result.status === 'unsupported' ? '页面类型或地址不受支持' :
                          '网络抓取失败';
                        const good = result.status === 'verified_quote';
                        const warn = result.status === 'quote_not_found' || result.status === 'reachable_unverified';
                        return (
                          <div className={`px-2.5 py-2 rounded border text-[10px] leading-relaxed ${
                            good
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : warn
                                ? 'border-amber-200 bg-amber-50 text-amber-900'
                                : 'border-red-200 bg-red-50 text-red-800'
                          }`}>
                            <div className="font-bold">
                              {label}
                              {result.cached ? ' · 使用 24 小时内缓存结果' : ' · 本次实时核验'}
                            </div>
                            {result.matchedContext && (
                              <div className="mt-1 bg-white/60 border border-current/10 rounded px-2 py-1">
                                <div className="font-bold">命中上下文</div>
                                <div>…{result.matchedContext}…</div>
                                {typeof result.matchedOffset === 'number' && (
                                  <div className="font-mono mt-0.5">页面文本偏移：{result.matchedOffset}</div>
                                )}
                              </div>
                            )}
                            {result.title && <div className="mt-0.5 truncate">页面标题：{result.title}</div>}
                            {result.contentHash && (
                              <div className="font-mono mt-0.5">
                                页面指纹：{result.contentHash.slice(0, 16)}… · 抓取于 {new Date(result.fetchedAt).toLocaleString('zh-CN')}
                              </div>
                            )}
                            {result.reason && <div className="mt-0.5">原因：{result.reason}</div>}
                            <button
                              type="button"
                              onClick={() => void verifySource(ev.id, ev.sourceUrl!, ev.quote, true)}
                              className="mt-1 text-[10px] underline underline-offset-2 hover:no-underline"
                            >
                              忽略缓存，重新核验
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                本条尚未提供逐项证据链，不能据此声称核心数据已经全部核验。请回到原文或官方发布核对。
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Modern Magazine Mode */}
      {readingRhythm === 'magazine' && (
        <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl p-8 space-y-8 shadow-sm">
          {/* Pull quote */}
          <div className="p-6 bg-white border border-stone-300 rounded-xl text-center space-y-2">
            <Quote className="w-8 h-8 text-[#E3120B] mx-auto opacity-50" />
            <p className="text-lg sm:text-xl font-serif font-black text-stone-950 italic">
              “{article.coreQuote || article.oneSentenceVerdict}”
            </p>
            <div className="text-xs text-stone-500 font-mono">— {article.quoteAuthor || '见微·特约深度观察'}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-serif text-stone-800 leading-relaxed">
            <div>
              <h4 className="font-bold text-base text-stone-950 mb-2 border-b border-stone-200 pb-1">
                微澜之处
              </h4>
              <p>{layers[0]?.content}</p>
            </div>
            <div>
              <h4 className="font-bold text-base text-stone-950 mb-2 border-b border-stone-200 pb-1">
                深层推演
              </h4>
              <p>{layers[4]?.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Immersive Narrative Story Mode */}
      {readingRhythm === 'immersive' && (
        <div className="bg-stone-950 text-stone-200 rounded-2xl p-8 sm:p-12 space-y-8 shadow-xl border border-stone-800">
          <div className="max-w-2xl mx-auto space-y-6 font-serif">
            <div className="text-xs text-red-400 font-mono tracking-widest uppercase">
              CHAPTER I · 见微沉浸调查
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {article.title}
            </h2>
            <div className="h-0.5 w-16 bg-[#E3120B]" />
            <p className="text-base sm:text-lg text-stone-300 leading-loose">
              {article.summary}
            </p>
            <div className="p-5 bg-stone-900 border border-stone-800 rounded-xl text-sm leading-relaxed text-stone-400">
              {layers[0]?.content}
            </div>
            <p className="text-base sm:text-lg text-stone-300 leading-loose">
              {layers[4]?.content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
