import React from 'react';
import { RippleEffectData } from '../../types';
import { Waves, Network, ShieldCheck, CheckCircle2, Clock, Layers, ArrowRight, Zap, Target } from 'lucide-react';

interface RippleEffectTabProps {
  rippleEffect: RippleEffectData;
}

export const RippleEffectTab: React.FC<RippleEffectTabProps> = ({ rippleEffect }) => {
  if (!rippleEffect) {
    return <div className="p-8 text-center text-stone-500 font-sans">暂无涟漪效应数据</div>;
  }

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
          <span className="text-xs text-stone-500 font-mono">
            简单明了 · 1-3月 ➔ 3-12月 ➔ 1-3年
          </span>
        </div>

        {/* 顶部极简图解连接器 */}
        <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-serif font-bold">
          <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 w-full sm:w-auto justify-center">
            <span>① 1阶 · 直接冲击 (1-3月)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block shrink-0" />
          <div className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 w-full sm:w-auto justify-center">
            <span>② 2阶 · 产业传导 (3-12月)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block shrink-0" />
          <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 w-full sm:w-auto justify-center">
            <span>③ 3阶 · 生态重塑 (1-3年)</span>
          </div>
        </div>

        {/* 三阶卡片明细 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rippleEffect.stages.map((st, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            const badgeBg = isFirst ? 'bg-red-500 text-white' : isSecond ? 'bg-sky-600 text-white' : 'bg-indigo-600 text-white';
            const cardBg = isFirst ? 'bg-red-50/40 border-red-200' : isSecond ? 'bg-sky-50/40 border-sky-200' : 'bg-indigo-50/40 border-indigo-200';

            return (
              <div
                key={st.stage}
                className={`p-4 rounded-xl border-2 ${cardBg} space-y-2.5 flex flex-col justify-between`}
              >
                <div className="space-y-2">
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

                  <ul className="space-y-1 text-xs text-stone-700 font-sans">
                    {st.items.map((it, i) => (
                      <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                        <span className="text-stone-400 font-bold shrink-0">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 知识图谱关联实体 (Entity Topology) */}
      {rippleEffect.knowledgeGraph && rippleEffect.knowledgeGraph.length > 0 && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-serif font-bold text-stone-950">
                关联实体与产业图谱 (Knowledge Topology)
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-mono">上下游网络映射</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rippleEffect.knowledgeGraph.map((kg) => (
              <div key={kg.id} className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-serif font-bold text-purple-950">{kg.name}</span>
                  <span className="text-[10px] font-mono bg-purple-200/70 text-purple-900 px-1.5 py-0.2 rounded">
                    {kg.type === 'company' ? '企业机构' : kg.type === 'tech' ? '核心技术' : '关联赛道'}
                  </span>
                </div>
                <p className="text-xs text-purple-900 font-sans">
                  <strong>传导定位：</strong>{kg.relationToMain}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
