import React, { useState } from 'react';
import { RippleEffectData, NewsArticle } from '../../types';
import {
  Waves, Network, ShieldCheck, ArrowRight, AlertTriangle,
  Eye, Compass, BookOpen, Sparkles
} from 'lucide-react';

interface RippleEffectTabProps {
  rippleEffect: RippleEffectData;
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
}

export const RippleEffectTab: React.FC<RippleEffectTabProps> = ({
  rippleEffect,
  contextArticles,
  onOpenArticle,
  onOpenTermExplain,
}) => {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);
  const [showFalsification, setShowFalsification] = useState(false);
  const [blackSwanSimulated, setBlackSwanSimulated] = useState(false);
  const [selectedKgId, setSelectedKgId] = useState<string | null>(null);

  if (!rippleEffect) {
    return <div className="p-8 text-center text-stone-500 font-sans">暂无涟漪效应数据</div>;
  }

  // 各阶段固化的专业 KPI 与战术策略参考
  const stageMeta = [
    {
      kpis: ['SOFR 隔夜拆借利率', '美元指数 DXY', '短端掉期隐含波动率'],
      tacticalStrategy: '短端利率互换 Long / 外汇套期保值敞口重估',
      falsification: '美联储劳动力市场超预期偏紧，通胀率反弹突破 3.5%，降息预期提前中断。',
    },
    {
      kpis: ['新兴市场 Sovereign Spread 利差', '央行黄金储备占比', '主要外贸企业结汇率'],
      tacticalStrategy: '增配新兴市场高评级主权债 / 布局大宗商品与黄金现货',
      falsification: '地缘贸易壁垒加剧，关税大幅上调挤压企业外汇结汇意愿。',
    },
    {
      kpis: ['全球制造业 PMI 补库系数', '跨国公司 CapEx 增速', '商业银行信贷扩张速度'],
      tacticalStrategy: '看多全球资本品龙头 / 布局工业自动化与核心供应链',
      falsification: '银行业信贷紧缩引发流动性陷阱，低利率无法传导至实体借贷。',
    },
  ];

  // 为选中实体匹配语料库报道
  const getMatchedArticlesForKg = (entityName: string) => {
    if (!contextArticles || contextArticles.length === 0) return [];
    return contextArticles.filter((art) => art.title.includes(entityName) || art.summary?.includes(entityName));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 极简清晰的时序传导流程图 (Simple & Clean Cascading Pipeline) */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Waves className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-base font-serif font-black text-stone-950">
              涟漪效应三阶时序图示 (3-Stage Ripple Pipeline)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFalsification((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer border ${
                showFalsification
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-900 shrink-0" />
              <span>{showFalsification ? '隐藏推演失效条件' : '查看推演失效与黑天鹅条件'}</span>
            </button>
            <span className="text-xs text-stone-500 font-mono hidden sm:inline">
              1-3月 ➔ 3-12月 ➔ 1-3年
            </span>
          </div>
        </div>

        {/* 顶部交互式图解连接器 */}
        <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-serif font-bold">
          {['① 1阶 · 直接冲击 (1-3月)', '② 2阶 · 产业传导 (3-12月)', '③ 3阶 · 生态重塑 (1-3年)'].map((label, idx) => {
            const isSelected = selectedStageIdx === idx;
            const themeCls =
              idx === 0
                ? isSelected
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                : idx === 1
                ? isSelected
                  ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                  : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200'
                : isSelected
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200';

            return (
              <React.Fragment key={idx}>
                <button
                  onClick={() => setSelectedStageIdx(isSelected ? null : idx)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border w-full sm:w-auto justify-center transition-all cursor-pointer ${themeCls}`}
                >
                  <span>{label}</span>
                  {isSelected && <span className="text-[10px] font-mono bg-white/30 px-1 rounded">已聚焦</span>}
                </button>
                {idx < 2 && <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* 三阶卡片明细 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rippleEffect.stages.map((st, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isFocused = selectedStageIdx === idx;

            const badgeBg = isFirst ? 'bg-red-500 text-white' : isSecond ? 'bg-sky-600 text-white' : 'bg-indigo-600 text-white';
            const cardBorder = isFocused
              ? 'border-stone-900 ring-2 ring-stone-900/20 shadow-md bg-white'
              : isFirst
              ? 'bg-red-50/40 border-red-200 hover:border-red-400'
              : isSecond
              ? 'bg-sky-50/40 border-sky-200 hover:border-sky-400'
              : 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-400';

            const meta = stageMeta[idx] || stageMeta[0];

            return (
              <div
                key={st.stage}
                onClick={() => setSelectedStageIdx(isFocused ? null : idx)}
                className={`p-4.5 rounded-xl border-2 transition-all cursor-pointer ${cardBorder} space-y-3 flex flex-col justify-between`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                      第 {idx + 1} 阶段 · {st.timeframe}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500 font-medium">
                      强度: <b className={st.severity === '高' ? 'text-red-600' : 'text-stone-700'}>{st.severity}</b>
                    </span>
                  </div>

                  <h4 className="text-sm font-serif font-black text-stone-950 leading-snug">
                    {st.title}
                  </h4>

                  <ul className="space-y-1.5 text-xs text-stone-700 font-sans">
                    {st.items.map((it, i) => (
                      <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                        <span className="text-stone-400 font-bold shrink-0">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 核心观测指标 */}
                  <div className="mt-3 pt-2 border-t border-stone-200/80 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1 text-stone-500 font-serif font-bold">
                      <Eye className="w-3 h-3 text-stone-600" />
                      <span>核心监控指标:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {meta.kpis.map((kpi, kIdx) => (
                        <span key={kIdx} className="px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded text-[10px] font-mono">
                          {kpi}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 战术配置参考 */}
                  <div className="pt-1.5 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1 text-stone-500 font-serif font-bold">
                      <Compass className="w-3 h-3 text-stone-600" />
                      <span>买方战术策略:</span>
                    </div>
                    <p className="text-xs text-stone-800 font-sans leading-tight">
                      {meta.tacticalStrategy}
                    </p>
                  </div>
                </div>

                {blackSwanSimulated && (
                  <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded text-[10px] text-amber-900 space-y-0.5">
                    <span className="font-serif font-bold">⚠️ 黑天鹅模拟触发：</span>
                    <p>{meta.falsification}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. 推演失效条件与黑天鹅压力测试 (Falsification Criteria Drawer) */}
        {showFalsification && (
          <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-serif font-bold text-amber-950">
                  宏观沙盘推演失效条件 (Falsification Criteria / 黑天鹅预警)
                </h4>
              </div>
              <button
                onClick={() => setBlackSwanSimulated((v) => !v)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                  blackSwanSimulated
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white text-stone-700 border-amber-300 hover:border-amber-500'
                }`}
              >
                {blackSwanSimulated ? '取消模拟压力测试' : '🧪 模拟黑天鹅压力测试'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-amber-950 font-sans">
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-1">
                <span className="font-serif font-bold text-red-700 block">1阶失效阻断：</span>
                <p className="text-stone-700 leading-relaxed">{stageMeta[0].falsification}</p>
              </div>
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-1">
                <span className="font-serif font-bold text-sky-700 block">2阶失效阻断：</span>
                <p className="text-stone-700 leading-relaxed">{stageMeta[1].falsification}</p>
              </div>
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-1">
                <span className="font-serif font-bold text-indigo-700 block">3阶失效阻断：</span>
                <p className="text-stone-700 leading-relaxed">{stageMeta[2].falsification}</p>
              </div>
            </div>
            <p className="text-[10px] text-amber-800/80 font-mono">
              口径：推演基准基于历史概率，若出现上述否定性黑天鹅事件，需立即修正宏观久期与久期配置。
            </p>
          </div>
        )}
      </div>

      {/* 2. 知识图谱关联实体 (Entity Topology with Interactive Drill-down) */}
      {rippleEffect.knowledgeGraph && rippleEffect.knowledgeGraph.length > 0 && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-serif font-bold text-stone-950">
                关联实体与产业图谱 (Knowledge Topology)
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-mono">点击实体卡片穿透检索</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {rippleEffect.knowledgeGraph.map((kg) => {
              const isSelected = selectedKgId === kg.id;
              const matchedArts = getMatchedArticlesForKg(kg.name);

              return (
                <div
                  key={kg.id}
                  onClick={() => setSelectedKgId(isSelected ? null : kg.id)}
                  className={`p-3.5 border rounded-xl space-y-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-100 border-purple-600 ring-2 ring-purple-600/30 shadow-xs'
                      : 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-purple-950">{kg.name}</span>
                    <span className="text-[10px] font-mono bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded font-medium shrink-0">
                      {kg.type === 'company' ? '🏢 企业机构' : kg.type === 'tech' ? '🔬 核心技术' : '🌐 关联赛道'}
                    </span>
                  </div>

                  <p className="text-xs text-purple-900 font-sans leading-relaxed">
                    <strong className="text-purple-950 font-serif">传导定位：</strong>{kg.relationToMain}
                  </p>

                  {/* 展开实体词条穿透与站内相关报道 */}
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-purple-300 space-y-2 animate-fadeIn">
                      {/* AI 名词详解调阅 */}
                      {onOpenTermExplain && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTermExplain(kg.name);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-serif font-bold transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>调阅「{kg.name}」AI 知识图谱百科</span>
                        </button>
                      )}

                      {/* 关联站内报道 */}
                      {matchedArts.length > 0 && onOpenArticle ? (
                        <div className="space-y-1 text-[11px]">
                          <span className="text-stone-500 font-serif font-bold block">关联站内历史报道：</span>
                          {matchedArts.slice(0, 2).map((art) => (
                            <button
                              key={art.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenArticle(art);
                              }}
                              className="w-full text-left truncate px-2 py-1 bg-white hover:bg-purple-50 border border-purple-200 rounded text-purple-950 font-serif transition-all cursor-pointer flex items-center justify-between"
                            >
                              <span className="truncate">《{art.title}》</span>
                              <BookOpen className="w-3 h-3 text-purple-600 shrink-0 ml-1" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-400 font-mono">该实体可点击进行词条智能释义</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
