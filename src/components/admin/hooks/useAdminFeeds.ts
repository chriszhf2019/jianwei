import { useState } from 'react';
import type { ServerSettings } from '../adminTypes';
import type { ShowToast } from './useAdminKeys';

/** 信源列表与手动摄取。 */
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
    if (feedList.includes(newFeedUrl.trim())) {
      showToast('error', '该信源地址已存在');
      return;
    }
    const updated = [...feedList, newFeedUrl.trim()];
    setFeedList(updated);
    setNewFeedUrl('');
    void saveWithFeeds(updated);
  };

  const handleTogglePresetFeed = (url: string) => {
    const updated = feedList.includes(url)
      ? feedList.filter((f) => f !== url)
      : [...feedList, url];
    setFeedList(updated);
    void saveWithFeeds(updated);
  };

  const handleRemoveFeed = (url: string) => {
    const updated = feedList.filter((f) => f !== url);
    setFeedList(updated);
    void saveWithFeeds(updated);
  };

  const handleRemoveMultipleFeeds = (urls: string[]) => {
    const drop = new Set(urls);
    const updated = feedList.filter((f) => !drop.has(f));
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
    handleRemoveFeed,
    handleRemoveMultipleFeeds,
    handleTriggerIngest,
  };
}
