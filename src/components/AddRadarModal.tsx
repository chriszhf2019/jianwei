import React, { useState } from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';import { motion, AnimatePresence } from 'motion/react';
import { X, Radio, Plus, Sparkles } from 'lucide-react';
import { RadarKeyword } from '../types';

interface AddRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRadar: (newKeyword: RadarKeyword) => void;
}

export const AddRadarModal: React.FC<AddRadarModalProps> = ({ isOpen, onClose, onAddRadar }) => {
  useEscapeClose(isOpen, onClose);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState<'red' | 'orange' | 'green'>('orange');

  const presetSuggestions = [
    '具身智能与人形机器人',
    '星链与低轨卫星通信',
    '量子计算物理拓扑',
    '跨境支付免密协议',
    '东盟自贸协定升级',
    '储能电芯循环寿命'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    const newRadar: RadarKeyword = {
      id: `rk-${Date.now()}`,
      keyword: keyword.trim(),
      count: 0,
      countChange: '',
      sentimentTrend: '',
      marketAttention: '',
      level: level,
      recentNewsTitle: ''
    };

    onAddRadar(newRadar);
    setKeyword('');
    onClose();
  };


  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-[#E3120B]" />
              <h3 className="text-base font-serif font-bold">添加关注雷达关键词</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
            <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
              监控关键词 / 公司 / 产业赛道
            </label>
            <p className="mb-2 text-[11px] text-stone-500">
              加入后会在「我的关注」中按当前语料实时统计命中与情绪，不生成演示数字。
            </p>
            <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="例如：光刻机、日元汇率、液冷连接器..."
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-stone-800 mb-1">
                预警级别偏好
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLevel('red')}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                    level === 'red'
                      ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>🔴 重大警戒</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLevel('orange')}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                    level === 'orange'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold'
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>🟠 重要异动</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLevel('green')}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                    level === 'green'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>🟢 常规关注</span>
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <div className="text-[11px] font-serif text-stone-500 mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>热门推荐关键词：</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presetSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setKeyword(s)}
                    className="px-2.5 py-1 bg-stone-200/70 hover:bg-stone-300 rounded text-xs text-stone-700 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!keyword.trim()}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>确认加入雷达</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
