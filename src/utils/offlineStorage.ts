import localforage from 'localforage';
import { NewsArticle } from '../types';
import { useState, useEffect, useCallback } from 'react';

export const OFFLINE_CHANGE_EVENT = 'jianwei:offline-articles-changed';

/** 独立的 IndexedDB 实例，专门用于持久化离线长文、全文解析、AI解读与七要素模型 */
export const offlineArticlesDB = localforage.createInstance({
  name: 'JianWeiIntelligenceDB',
  storeName: 'offline_articles',
  description: '见微 Genway - 离线保存的全文内容、AI 解读及七要素模型',
});

/** 保存文章至本地 IndexedDB 离线存储 */
export async function saveArticleOffline(article: NewsArticle): Promise<boolean> {
  try {
    const offlinePayload: NewsArticle & { offlineSavedAt: string } = {
      ...article,
      offlineSavedAt: new Date().toISOString(),
    };
    await offlineArticlesDB.setItem(article.id, offlinePayload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OFFLINE_CHANGE_EVENT, { detail: { id: article.id, action: 'save' } }));
    }
    return true;
  } catch (err) {
    console.error('Failed to save article offline to IndexedDB:', err);
    return false;
  }
}

/** 从本地 IndexedDB 移除离线文章 */
export async function removeArticleOffline(articleId: string): Promise<boolean> {
  try {
    await offlineArticlesDB.removeItem(articleId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OFFLINE_CHANGE_EVENT, { detail: { id: articleId, action: 'remove' } }));
    }
    return true;
  } catch (err) {
    console.error('Failed to remove article from offline storage:', err);
    return false;
  }
}

/** 判断某篇文章是否已被离线持久化 */
export async function isArticleOffline(articleId: string): Promise<boolean> {
  try {
    const item = await offlineArticlesDB.getItem(articleId);
    return item !== null && item !== undefined;
  } catch {
    return false;
  }
}

/** 获取已离线存储的所有文章 ID 列表 */
export async function getOfflineArticleIds(): Promise<string[]> {
  try {
    const keys = await offlineArticlesDB.keys();
    return keys;
  } catch {
    return [];
  }
}

/** 读取已离线存储的指定完整文章对象 */
export async function getOfflineArticle(articleId: string): Promise<NewsArticle | null> {
  try {
    const item = await offlineArticlesDB.getItem<NewsArticle>(articleId);
    return item || null;
  } catch {
    return null;
  }
}

/** 读取已离线存储的全部完整文章列表 */
export async function getAllOfflineArticles(): Promise<NewsArticle[]> {
  try {
    const articles: NewsArticle[] = [];
    await offlineArticlesDB.iterate<NewsArticle, void>((value) => {
      if (value && value.id) {
        articles.push(value);
      }
    });
    return articles;
  } catch {
    return [];
  }
}

/** React Hook: 便捷订阅与响应全站文章离线状态 */
export function useOfflineArticles() {
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const keys = await offlineArticlesDB.keys();
      setOfflineIds(new Set(keys));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener(OFFLINE_CHANGE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(OFFLINE_CHANGE_EVENT, handleUpdate);
    };
  }, [refresh]);

  const isOffline = useCallback((id: string) => offlineIds.has(id), [offlineIds]);

  const toggleOffline = useCallback(
    async (article: NewsArticle): Promise<boolean> => {
      const currentlySaved = offlineIds.has(article.id);
      if (currentlySaved) {
        const ok = await removeArticleOffline(article.id);
        if (ok) {
          setOfflineIds((prev) => {
            const next = new Set(prev);
            next.delete(article.id);
            return next;
          });
        }
        return !ok;
      } else {
        const ok = await saveArticleOffline(article);
        if (ok) {
          setOfflineIds((prev) => new Set([...prev, article.id]));
        }
        return ok;
      }
    },
    [offlineIds]
  );

  return {
    offlineIds,
    isOffline,
    toggleOffline,
    loading,
    refresh,
  };
}
