import { useState } from 'react';
import type { ServerSettings } from '../adminTypes';
import type { ShowToast } from './useAdminKeys';
import {
  QUALITY_FEED_PRESETS,
  type QualityFeedCategory,
  listPresetsByCategory,
  mergeDisableFeedUrls,
  mergeEnableFeedUrls,
  normalizeFeedUrlKey,
  presetCategoryLabel,
} from '../../../shared/qualityFeedPresets';

/** 信源列表与手动摄取；预设启用与用户自定义合并，不覆盖清空。 */
export function useAdminFeeds(deps: {
  showToast: ShowToast;
  saveWithFeeds: (feeds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const { showToast, saveWithFeeds, refresh } = deps;
  const [feedList, setFeedList] = useState<string[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const hydrateFromSettings = (setts: ServerSettings) => {
    setFeedList(setts.feeds || []);
  };

  const handleAddFeed = () => {
    if (!newFeedUrl.trim()) return;
    if (!newFeedUrl.startsWith('http://') && !newFeedUrl.startsWith('https://')) {
      showToast('error', '请输入有效的 HTTP/HTTPS RSS 地址');
      return;
    }
    const trimmed = newFeedUrl.trim();
    if (feedList.some((f) => normalizeFeedUrlKey(f) === normalizeFeedUrlKey(trimmed))) {
      showToast('error', '该信源地址已存在');
      return;
    }
    const updated = mergeEnableFeedUrls(feedList, [trimmed]);
    setFeedList(updated);
    setNewFeedUrl('');
    void saveWithFeeds(updated);
  };

  const handleTogglePresetFeed = (url: string) => {
    const key = normalizeFeedUrlKey(url);
    const exists = feedList.some((f) => normalizeFeedUrlKey(f) === key);
    const updated = exists
      ? mergeDisableFeedUrls(feedList, [url])
      : mergeEnableFeedUrls(feedList, [url]);
    setFeedList(updated);
    void saveWithFeeds(updated);
  };

  /** 一键启用某一类优质源：仅合并追加，不删除自定义或其他类已启用源。 */
  const handleEnablePresetCategory = (category: QualityFeedCategory) => {
    const urls = listPresetsByCategory(category).map((p) => p.url);
    const updated = mergeEnableFeedUrls(feedList, urls);
    const added = updated.length - feedList.length;
    setFeedList(updated);
    void saveWithFeeds(updated);
    showToast(
      'success',
      added > 0
        ? `已合并启用「${presetCategoryLabel(category)}」${added} 个优质源（自定义源保留）`
        : `「${presetCategoryLabel(category)}」优质源均已在列表中`
    );
  };

  /** 一键启用全部优质预设：合并追加，不清空自定义。 */
  const handleEnableAllQualityPresets = () => {
    const urls = QUALITY_FEED_PRESETS.map((p) => p.url);
    const updated = mergeEnableFeedUrls(feedList, urls);
    const added = updated.length - feedList.length;
    setFeedList(updated);
    void saveWithFeeds(updated);
    showToast(
      'success',
      added > 0
        ? `已合并启用 ${added} 个优质源（自定义源保留）`
        : '全部优质源均已在列表中'
    );
  };

  const handleRemoveFeed = (url: string) => {
    const updated = mergeDisableFeedUrls(feedList, [url]);
    setFeedList(updated);
    void saveWithFeeds(updated);
  };

  const handleRemoveMultipleFeeds = (urls: string[]) => {
    const updated = mergeDisableFeedUrls(feedList, urls);
    setFeedList(updated);
    void saveWithFeeds(updated);
  };

  const handleTriggerIngest = async () => {
    setIngesting(true);
    try {
      const res = await fetch('/api/feeds/ingest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '摄取失败');
      showToast('success', `RSS 摄取成功完成！新增 ${data.newItemsCount || 0} 篇情报条目`);
      await refresh();
    } catch (e: any) {
      showToast('error', e.message || '手动摄取失败');
    } finally {
      setIngesting(false);
    }
  };

  return {
    feedList,
    setFeedList,
    newFeedUrl,
    setNewFeedUrl,
    ingesting,
    hydrateFromSettings,
    handleAddFeed,
    handleTogglePresetFeed,
    handleEnablePresetCategory,
    handleEnableAllQualityPresets,
    handleRemoveFeed,
    handleRemoveMultipleFeeds,
    handleTriggerIngest,
  };
}
