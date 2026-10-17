import React, { useMemo } from 'react';
import {
  RefreshCw, Plus, Trash2, Globe,
} from 'lucide-react';
import { FeedHealthPanel } from '../FeedHealthPanel';
import type { AdminTabScope } from './scope';
import {
  QUALITY_FEED_PRESETS,
  type QualityFeedCategory,
  presetCategoryLabel,
  normalizeFeedUrlKey,
} from '../../../shared/qualityFeedPresets';

const CATEGORY_ORDER: QualityFeedCategory[] = ['财经', '科技', 'AI'];

const CATEGORY_BADGE: Record<QualityFeedCategory, string> = {
  '财经': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  '科技': 'bg-sky-100 text-sky-800 border-sky-300',
  'AI': 'bg-violet-100 text-violet-800 border-violet-300',
};

export function FeedsTab({ s }: { s: AdminTabScope }) {
  const {
    feedList,
    handleAddFeed,
    handleRemoveFeed,
    handleRemoveMultipleFeeds,
    handleTogglePresetFeed,
    handleEnablePresetCategory,
    handleEnableAllQualityPresets,
    handleTriggerIngest,
    ingesting,
    newFeedUrl,
    renderCorpusHealthModule,
    setNewFeedUrl,
    showToast,
  } = s;

  const subscribedKeys = useMemo(
    () => new Set(feedList.map((u: string) => normalizeFeedUrlKey(u))),
    [feedList]
  );

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      presets: QUALITY_FEED_PRESETS.filter((p) => p.category === category),
      enabledCount: QUALITY_FEED_PRESETS.filter(
        (p) => p.category === category && subscribedKeys.has(normalizeFeedUrlKey(p.url))
      ).length,
    }));
  }, [subscribedKeys]);

  return (
        <div className="space-y-6">
          {/* 信源健康面板：坏链在此暴露 */}
          <FeedHealthPanel
            feedList={feedList}
            onRemoveFeed={handleRemoveFeed}
            onRemoveMultipleFeeds={handleRemoveMultipleFeeds}
            onShowToast={showToast}
          />

          {renderCorpusHealthModule()}

          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                全局外部信源管道与实时调度中枢
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                内置财经 / 科技 / AI 优质 RSS 预设（公开可达）。一键启用不清空已有自定义源；坏链由上方健康面板暴露。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleEnableAllQualityPresets?.()}
                className="px-3 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-serif font-bold cursor-pointer"
              >
                一键启用全部优质源
              </button>
              <button
                onClick={handleTriggerIngest}
                disabled={ingesting || feedList.length === 0}
                className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
                <span>{ingesting ? '正在执行全局摄取…' : '立即触发手动摄取'}</span>
              </button>
            </div>
          </div>

          {/* Quality presets by category */}
          <div className="space-y-5">
            <h3 className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>优质信源预设 · 财经 / 科技 / AI（点击单卡订阅/取消；分类按钮合并启用）</span>
            </h3>

            {grouped.map(({ category, presets, enabledCount }) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CATEGORY_BADGE[category]}`}>
                      {presetCategoryLabel(category)}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      已启用 {enabledCount}/{presets.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnablePresetCategory?.(category)}
                    className="text-[11px] font-serif font-bold px-2.5 py-1 rounded-lg border border-stone-300 hover:border-stone-800 hover:bg-stone-50 cursor-pointer"
                  >
                    一键启用本类
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {presets.map((ps) => {
                    const isSubscribed = subscribedKeys.has(normalizeFeedUrlKey(ps.url));
                    return (
                      <div
                        key={ps.id}
                        onClick={() => handleTogglePresetFeed(ps.url)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSubscribed
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                            : 'border-stone-200 hover:border-stone-400 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-serif font-bold text-xs text-stone-900">{ps.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                              {isSubscribed ? '✓ 已订阅' : '+ 未启用'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{ps.desc}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <div className="text-[10px] font-mono text-stone-400 truncate">{ps.url}</div>
                          <span className="text-[9px] font-mono text-stone-400 uppercase shrink-0">{ps.lang}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Feed Input */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <h3 className="text-xs font-serif font-bold text-stone-900">
              添加自定义 RSS / Atom 数据源地址
            </h3>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="输入公网 RSS 订阅地址 (例如: https://news.mit.edu/rss/feed)"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono"
              />
              <button
                onClick={handleAddFeed}
                className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加信源</span>
              </button>
            </div>
          </div>

          {/* Active Feeds List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-serif font-bold text-stone-800">
                当前活跃的数据源管道列表 ({feedList.length})
              </h3>
            </div>
            {feedList.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-stone-300 rounded-xl text-center text-xs text-stone-500">
                暂未配置外部 RSS 信源。可使用上方「一键启用全部优质源」，或逐条添加自定义地址。
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {feedList.map((url: string, idx: number) => {
                  const preset = QUALITY_FEED_PRESETS.find(
                    (p) => normalizeFeedUrlKey(p.url) === normalizeFeedUrlKey(url)
                  );
                  return (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-stone-800 truncate block">{url}</span>
                      {preset && (
                        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${CATEGORY_BADGE[preset.category]}`}>
                          {presetCategoryLabel(preset.category)} · {preset.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFeed(url)}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                      title="移除该信源"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
