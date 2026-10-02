import React, { useState, useMemo } from 'react';
import { PersonaImpact, PersonaForecastItem, UserPersona, UserPersonaId, NewsArticle, ProbabilityBand } from '../../types';
import { USER_PERSONAS } from '../../data/intelligenceData';
import { localTrendModel, LOCAL_TREND_NOTE } from '../../utils/localTrendModel';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { UserCheck, Sparkles, AlertTriangle, TrendingUp, CheckCircle, ArrowRight, Loader2, RefreshCw, Crosshair, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

/** 概率带配色：bull 高=机会兑现概率高（绿），bear 高=风险兑现概率高（红） */
function bandCls(band: ProbabilityBand | string | undefined, tone: 'bull' | 'bear'): string {
  if (band === '高') {
    return tone === 'bull'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : 'bg-red-100 text-red-800 border-red-300';
  }
  if (band === '中') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-stone-100 text-stone-500 border-stone-300';
}

/** 双向情景单侧卡（bull=乐观路径 / bear=悲观路径） */
function ForecastSideCard({ tone, item }: { tone: 'bull' | 'bear'; item: PersonaForecastItem['bull'] | PersonaForecastItem['bear'] }) {
  const isBull = tone === 'bull';
  const bull = item as PersonaForecastItem['bull'];
  const bear = item as PersonaForecastItem['bear'];
  const payoffLine = isBull ? bull.payoff : bear.impact;
  return (
    <div className={`p-4 border rounded-xl space-y-2 ${isBull ? 'bg-emerald-50/70 border-emerald-300' : 'bg-red-50/70 border-red-300'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center space-x-1.5 text-xs font-serif font-bold ${isBull ? 'text-emerald-950' : 'text-red-950'}`}>
          {isBull ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{isBull ? '正向情景（乐观路径）' : '反向情景（悲观路径）'}</span>
        </div>
        {item.band && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${bandCls(item.band, tone)}`}>
            概率带：{item.band}
          </span>
        )}
      </div>

      <p className={`text-xs sm:text-sm leading-relaxed ${isBull ? 'text-emerald-950' : 'text-red-950'}`}>
        {item.scenario ? <KeyTermHighlight text={item.scenario} /> : '（情景内容缺失）'}
      </p>
      {item.horizon && <p className="text-[10px] font-mono text-stone-500">时间窗：{item.horizon}</p>}

      {payoffLine && (
        <div className={`bg-white/70 border rounded-lg px-3 py-2 text-[11px] ${isBull ? 'border-emerald-200 text-emerald-900' : 'border-red-200 text-red-900'}`}>
          <b>{isBull ? '对你最具体的受益点：' : '对你最具体的受损点：'}</b>
          {payoffLine}
        </div>
      )}

      {(item.triggers || []).length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider">触发条件（若…则…）</div>
          {item.triggers!.map((t, i) => (
            <div key={i} className="text-[11px] text-stone-600 leading-snug">✓ {t}</div>
          ))}
        </div>
      )}
      {(item.falsify || []).length > 0 && (
        <div className={`space-y-1 pt-1.5 border-t border-dashed ${isBull ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className="text-[10px] font-serif font-bold text-stone-400 uppercase tracking-wider">证伪信号（出现即此路不通）</div>
          {item.falsify!.map((f, i) => (
            <div key={i} className="text-[11px] text-stone-500 leading-snug">✕ {f}</div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RelevanceIdentityTabProps {
  article: NewsArticle;
  personaImpacts: PersonaImpact[];
  activePersona: UserPersona;
  onSelectPersona: (id: UserPersonaId) => void;
  /** 身份化「正反双向预测」：按需生成（仅服务全局默认身份） */
  onRunPersonaForecast?: (persona: UserPersona, article: NewsArticle) => Promise<NewsArticle | null>;
}

export const RelevanceIdentityTab: React.FC<RelevanceIdentityTabProps> = ({
  article,
  personaImpacts,
  activePersona,
  onSelectPersona,
  onRunPersonaForecast,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<UserPersonaId>(activePersona.id);
  const [forecastBusy, setForecastBusy] = useState(false);
  const [forecastErr, setForecastErr] = useState('');
  const [showVariableBreakdown, setShowVariableBreakdown] = useState(false);
  const [memoSynced, setMemoSynced] = useState(false);

  const currentImpact =
    personaImpacts.find((p) => p.personaId === selectedTabId) || personaImpacts[0];

  // —— 我的身份 · 正反双向预测（本地主线模型 + AI 双向情景）——
  const forecastEntry: PersonaForecastItem | undefined = (article?.personaForecasts || []).find(
    (f) => f.personaId === activePersona.id
  );
  const localTrend = useMemo(() => localTrendModel(article), [article]);

  const handleGenForecast = async () => {
    if (!onRunPersonaForecast || forecastBusy) return;
    setForecastBusy(true);
    setForecastErr('');
    try {
      const updated = await onRunPersonaForecast(activePersona, article);
      if (!updated) setForecastErr('生成失败：可能未配置 AI Key 或服务暂不可用，请稍后重试。');
    } finally {
      setForecastBusy(false);
    }
  };

  const handleSyncMemo = () => {
    if (!currentImpact) return;
    const currentMemo = localStorage.getItem('action-memo') || '';
    const personaName = USER_PERSONAS.find((p) => p.id === currentImpact.personaId)?.name || '';
    const newEntry = `\n\n【${article.title}】(${personaName}专属行动)：\n• ${currentImpact.recommendedAction}`;
    localStorage.setItem('action-memo', currentMemo + newEntry);
    setMemoSynced(true);
    setTimeout(() => setMemoSynced(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
          <UserCheck className="w-4 h-4" />
          <span>见微 · 认知透镜矩阵</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
          “与我何干？” —— 六大多维身份影响测算
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
          点击不同身份透镜，查看该新闻对不同角色产生的机会窗口、风险隐患与具体行动清单。
        </p>
      </div>

      {/* 6 Persona Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {USER_PERSONAS.map((p) => {
          const isSelected = selectedTabId === p.id;
          const isGlobalActive = activePersona.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedTabId(p.id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm font-bold'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
              }`}
            >
              <div className="text-xs font-serif">{p.name}</div>
              {isGlobalActive && (
                <span className="text-[9px] bg-red-600 text-white px-1 rounded inline-block mt-0.5">
                  我的身份
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 我的身份 · 正反双向预测（本地主线模型 + AI 双向情景） */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#E3120B]" />
            <h3 className="text-base font-serif font-bold text-stone-950">我的身份 · 正反双向预测</h3>
            <span className="px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] font-serif font-bold">{activePersona.name}</span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            {forecastEntry ? `AI 情景生成于 ${(forecastEntry.generatedAt || '').slice(5, 16).replace('T', ' ')}` : 'AI 情景未生成'}
          </span>
        </div>

        <p className="text-xs text-stone-500 leading-relaxed">
          预测分两层：<b className="text-stone-700">① 主线方向</b>由本地加权模型即时给出（透明可复核）；
          <b className="text-stone-700">② 你的双向情景</b>由在线 AI 按「{activePersona.name}」视角推演
          <b className="text-emerald-700">乐观受益路</b>与<b className="text-red-700">悲观受损路</b>，各带触发条件、证伪信号与概率带（低/中/高）。
          方向定好之后，你只需盯信号自行验证。
        </p>
        <p className="text-[10px] text-stone-400 leading-relaxed border-l-2 border-stone-200 pl-2">
          与其它预测入口的分工：事件级<b>立约概率</b>请去「人机预测擂台」（可回测）；事件多空<b>论据梳理</b>见七要素「正反方博弈」；首页卡片「趋势」为一段式 AI 文本观点；本面板只回答——<b>主线若按某方向兑现，对你（我的身份）意味着什么</b>。
        </p>

        {/* ① 本地主线方向模型 */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-serif font-bold text-stone-500 uppercase tracking-wider">① 主线方向 · 本地加权模型</span>
            {localTrend.kind === 'weights' ? (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                localTrend.direction === 'positive'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : localTrend.direction === 'negative'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {localTrend.direction === 'positive' ? '主线偏乐观' : localTrend.direction === 'negative' ? '主线偏悲观' : '主线方向不明（交织）'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-500 text-[10px] font-bold border border-stone-300">信号不足</span>
            )}
          </div>

          {localTrend.kind === 'weights' ? (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-200" role="img" aria-label={`主线正向强度 ${localTrend.pPos}/100，反向强度 ${localTrend.pNeg}/100`}>
                <div className="h-full bg-emerald-500" style={{ width: `${localTrend.pPos}%` }} title={`主线正向强度 ${localTrend.pPos}/100`} />
                <div className="h-full bg-red-500" style={{ width: `${localTrend.pNeg}%` }} title={`主线反向强度 ${localTrend.pNeg}/100`} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-stone-500">
                <span>🟢 正向强度 {localTrend.pPos}/100</span>
                <span>🔴 反向强度 {localTrend.pNeg}/100</span>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                {LOCAL_TREND_NOTE}（中性路径不在上图内）
              </p>

              {/* 查看多空胶着的核心驱动变量 */}
              <div className="pt-1 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowVariableBreakdown(!showVariableBreakdown)}
                  className="text-[11px] font-serif font-bold text-stone-700 hover:text-stone-950 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#E3120B]" />
                  <span>{showVariableBreakdown ? '收起驱动变量胶着细节' : '🔍 查看多空胶着的核心驱动变量分拆'}</span>
                  {showVariableBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showVariableBreakdown && (
                  <div className="mt-2.5 p-3 bg-white rounded-lg border border-stone-200 space-y-2 text-xs">
                    <div className="font-serif font-bold text-stone-900 border-b border-stone-200 pb-1.5 flex items-center justify-between">
                      <span>驱动变量博弈分拆 (Variable Tug-of-War)</span>
                      <span className="text-[10px] font-mono text-stone-500">总权重计：{localTrend.totalWeight}%</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 利好动能 */}
                      <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 space-y-1">
                        <div className="font-serif font-bold text-emerald-900 text-[11px] flex items-center justify-between">
                          <span>🟢 利好驱动变量 (Up Sum: {localTrend.upSum}%)</span>
                        </div>
                        <ul className="text-[11px] text-emerald-950 space-y-1 font-sans">
                          {(article.logicTree?.variableWeights || [])
                            .filter((w) => w.impactDirection === 'up')
                            .map((w, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="font-mono font-bold shrink-0">[{w.weight}%]</span>
                                <span>{w.name} - <span className="opacity-80">{w.description || '正面驱动'}</span></span>
                              </li>
                            ))}
                          {(article.logicTree?.variableWeights || []).filter((w) => w.impactDirection === 'up').length === 0 && (
                            <li className="text-stone-400 italic">暂无明确利好变量</li>
                          )}
                        </ul>
                      </div>

                      {/* 利空拖累 */}
                      <div className="p-2.5 bg-red-50/80 rounded-lg border border-red-200 space-y-1">
                        <div className="font-serif font-bold text-red-900 text-[11px] flex items-center justify-between">
                          <span>🔴 利空驱动变量 (Down Sum: {localTrend.downSum}%)</span>
                        </div>
                        <ul className="text-[11px] text-red-950 space-y-1 font-sans">
                          {(article.logicTree?.variableWeights || [])
                            .filter((w) => w.impactDirection === 'down')
                            .map((w, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="font-mono font-bold shrink-0">[{w.weight}%]</span>
                                <span>{w.name} - <span className="opacity-80">{w.description || '反向拖累'}</span></span>
                              </li>
                            ))}
                          {(article.logicTree?.variableWeights || []).filter((w) => w.impactDirection === 'down').length === 0 && (
                            <li className="text-stone-400 italic">暂无明确利空变量</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-stone-500 leading-relaxed">
              本文暂无逻辑树驱动变量，本地模型不估算主线方向强度（避免伪精确）。可直接用下方 AI 生成双向情景，或先在「七要素事实」补齐相关要素。
            </p>
          )}
        </div>

        {/* ② AI 双向情景 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-serif font-bold text-stone-500 uppercase tracking-wider">② 你的双向情景 · AI 模型</span>
            {forecastEntry && (
              <button
                type="button"
                onClick={handleGenForecast}
                disabled={forecastBusy}
                className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-stone-500 hover:text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${forecastBusy ? 'animate-spin' : ''}`} />
                {forecastBusy ? '重新推演中…' : '重新生成'}
              </button>
            )}
          </div>

          {forecastEntry ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded font-bold border ${
                  forecastEntry.directionBias === 'positive'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : forecastEntry.directionBias === 'negative'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {forecastEntry.directionBias === 'positive'
                    ? 'AI 综合判断：主线对你有望偏利好'
                    : forecastEntry.directionBias === 'negative'
                      ? 'AI 综合判断：主线对你偏利空'
                      : 'AI 综合判断：方向不明'}
                </span>
                {forecastEntry.horizon && (
                  <span className="text-stone-500">
                    主时间窗：<b className="text-stone-700">{forecastEntry.horizon}</b>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ForecastSideCard tone="bull" item={forecastEntry.bull} />
                <ForecastSideCard tone="bear" item={forecastEntry.bear} />
              </div>

              {forecastEntry.keyMonitor && (
                <div className="flex items-start gap-2.5 rounded-lg bg-stone-900 text-stone-100 px-4 py-3 text-[12px] leading-relaxed">
                  <Crosshair className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>
                    <b className="text-amber-300">建议盯盘：</b>
                    {forecastEntry.keyMonitor}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2 leading-relaxed">
                口径：双向情景与概率带为 AI 生成观点（非事实结论、不构成投资建议）；主线数值是本地加权方向强度，不是发生概率，也未经过历史校准。生成结果已写回语料持久化。
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4">
                <div className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                  <b className="text-stone-800">面向「{activePersona.name}」推演乐观 / 悲观两路</b>：
                  情景怎么展开、各需什么触发条件、出现什么信号即证伪、概率带（低/中/高）。
                  约 10-30 秒，结果写回语料、再次打开直接可见。
                </div>
                {onRunPersonaForecast ? (
                  <button
                    type="button"
                    onClick={handleGenForecast}
                    disabled={forecastBusy}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 text-xs font-serif font-bold transition-colors"
                  >
                    {forecastBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {forecastBusy ? 'AI 正在推演双向情景…' : '✨ AI 生成双向情景'}
                  </button>
                ) : (
                  <span className="text-[10px] text-stone-400 shrink-0">（AI 通道未接线）</span>
                )}
              </div>
              {forecastErr && <p className="text-[11px] text-red-600">{forecastErr}</p>}
            </>
          )}
        </div>
      </div>

      {/* Impact Breakdown Card for Selected Persona */}
      {currentImpact && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-base font-serif font-bold text-stone-950">
                【{USER_PERSONAS.find((p) => p.id === currentImpact.personaId)?.name}】专属推演报告
              </span>
            </div>
            {activePersona.id !== currentImpact.personaId && (
              <button
                onClick={() => onSelectPersona(currentImpact.personaId)}
                className="text-xs text-[#E3120B] hover:underline font-bold"
              >
                设为我的全局默认透镜
              </button>
            )}
          </div>

          {/* 1. Core Impact */}
          <div className="bg-[#FAF8F5] border-l-4 border-stone-900 p-4 rounded-r-xl">
            <div className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider mb-1">
              核心直接影响
            </div>
            <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
              <KeyTermHighlight text={currentImpact.coreImpact} />
            </p>
          </div>

          {/* 2. Opportunities vs Threats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opportunity */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-emerald-950">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>潜在机会窗口 (Opportunities)</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed font-sans">
                <KeyTermHighlight text={currentImpact.opportunity} />
              </p>
            </div>

            {/* Risk / Threat */}
            <div className="p-4 bg-red-50/70 border border-red-300 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-red-950">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>潜在风险隐患 (Threats / Risks)</span>
              </div>
              <p className="text-xs sm:text-sm text-red-950 leading-relaxed font-sans">
                <KeyTermHighlight text={currentImpact.threatRisk} />
              </p>
            </div>
          </div>

          {/* 3. Recommended Action with Checklist & Memo Sync */}
          <div className="p-5 bg-stone-900 text-white rounded-2xl border border-stone-950 space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2 text-sm font-serif font-bold text-amber-400">
                <CheckCircle className="w-4.5 h-4.5 text-amber-400" />
                <span>见微决策指引 · 本周可执行建议行动清单</span>
              </div>
              <button
                type="button"
                onClick={handleSyncMemo}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-serif font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {memoSynced ? (
                  <span className="text-stone-950 flex items-center gap-1 font-sans font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-800" />
                    <span>✓ 已成功同步至「我的行动备忘录」</span>
                  </span>
                ) : (
                  <span>📝 一键同步至「我的行动备忘录」</span>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-serif leading-relaxed text-stone-100 bg-stone-800/80 p-3.5 rounded-xl border border-stone-700">
                {currentImpact.recommendedAction}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-stone-400 font-sans border-t border-stone-800/80">
              <span>💡 提示：该行动指引已针对【{USER_PERSONAS.find((p) => p.id === currentImpact.personaId)?.name}】角色定制，建议在 7 天内完成复核。</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

