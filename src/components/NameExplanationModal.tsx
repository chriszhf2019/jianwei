import React from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Compass, BookOpen, Layers, Check } from 'lucide-react';

interface NameExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NameExplanationModal: React.FC<NameExplanationModalProps> = ({ isOpen, onClose }) => {
  useEscapeClose(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-xl bg-[#FAF8F5] text-stone-900 border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-6 py-5 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-[#E3120B] text-white flex items-center justify-center font-serif font-black text-lg shadow-sm">
                微
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold tracking-tight">见微 · 命名与设计哲学</h3>
                <p className="text-xs text-stone-400">GeneWave ➔ Genway 发音调优与理念阐释</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* 英文名调优 */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider">
                  英文名读音调优方案
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  官方推荐：Genway
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-serif font-black text-stone-950">
                    Genway
                  </span>
                  <span className="text-sm font-mono text-stone-500">
                    [ˈdʒen-weɪ]
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
                  <strong>调优理由：</strong>原名 <em>GeneWave</em> 尾音为双辅音较重且略显生物学偏向；调整为 <strong>Genway</strong>（双音节，读音流畅顺口，兼具 <em>Gen（洞察/起源/新一代）</em> + <em>Way（路径/方法论/之道）</em>），寓意“于细微基因处，洞悉未来之途”。
                </p>
              </div>
            </div>

            {/* 中文主题与核心主张 */}
            <div className="space-y-3">
              <h4 className="text-sm font-serif font-bold text-stone-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#E3120B]" />
                <span>产品核心主张与设计纲领</span>
              </h4>

              <div className="bg-stone-100 p-4 rounded-xl space-y-2 text-xs sm:text-sm text-stone-800 font-serif">
                <div className="font-bold text-stone-950">
                  “报刊为骨，数据为翼，光谱拆解为记”
                </div>
                <p className="text-stone-600 leading-relaxed font-sans text-xs">
                  拒绝算法制造的喧嚣与信息垃圾，不搞大字报，不搞标题党。从微观财报附注、政策标点微调、供应链公差细节中，为严肃决策者还原最真实的世界脉搏。
                </p>
              </div>
            </div>

            {/* 4 层认知跃迁 */}
            <div className="space-y-2">
              <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider">
                四层认知路径架构
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <strong className="text-stone-900 font-serif">1. 首页：</strong>
                  <span className="text-stone-600">高效消费（标准/通俗/脱水）</span>
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <strong className="text-stone-900 font-serif">2. 情报中心：</strong>
                  <span className="text-stone-600">观察全网市场与情绪热力</span>
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <strong className="text-stone-900 font-serif">3. 详情页：</strong>
                  <span className="text-stone-600">7要素与因果逻辑树理解事件</span>
                </div>
                <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                  <strong className="text-stone-900 font-serif">4. 身份透镜：</strong>
                  <span className="text-stone-600">六大角色测算“与我何干”</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
