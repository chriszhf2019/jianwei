import React from 'react';
import { SECTOR_TAXONOMY_DEFAULT } from '../../utils/sectorTaxonomy';
import { RotateCcw, Check, Layers } from 'lucide-react';

interface AdminTaxonomyPanelProps {
  sectorKeywordsState: Record<string, string>;
  setSectorKeywordsState: (state: Record<string, string>) => void;
  onSaveSettings: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminTaxonomyPanel: React.FC<AdminTaxonomyPanelProps> = ({
  sectorKeywordsState,
  setSectorKeywordsState,
  onSaveSettings,
  onShowToast,
}) => {
  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-lg font-serif font-black text-stone-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>9大行业赛道关键词规则与覆盖分类字典</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            用于全平台情报盲区扫描、热度点名、赛道密度堆叠与分类打标。修改后将即时同步至服务端。
          </p>
        </div>

        <button
          onClick={() => {
            const def: Record<string, string> = {};
            for (const sec of SECTOR_TAXONOMY_DEFAULT) def[sec.id] = sec.keywords.join(', ');
            setSectorKeywordsState(def);
            onShowToast('success', '已重置为系统默认赛道词库');
          }}
          className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置默认词典</span>
        </button>
      </div>

      {/* Sector Visual Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTOR_TAXONOMY_DEFAULT.map((sec) => {
          return (
            <div key={sec.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-stone-900">
                  {sec.name} <span className="font-mono text-stone-400 font-normal">({sec.id})</span>
                </span>
              </div>
              <textarea
                rows={3}
                value={sectorKeywordsState[sec.id] || ''}
                onChange={(e) =>
                  setSectorKeywordsState({
                    ...sectorKeywordsState,
                    [sec.id]: e.target.value,
                  })
                }
                placeholder="输入关键词，以逗号分隔"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-stone-200">
        <button
          onClick={onSaveSettings}
          className="px-6 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>保存全局赛道词典</span>
        </button>
      </div>
    </div>
  );
};
