import { useMemo } from 'react';
import { useCorpus } from '../state/CorpusContext';
import { useUserPrefs } from '../state/UserPrefsContext';
import { mergeSkillArticle } from './useCorpusStore';

/**
 * 兼容层：组合 Corpus + UserPrefs。
 * 新代码请直接使用 useCorpus() / useUserPrefs()。
 */
export function useAppStorage() {
  const corpus = useCorpus();
  const prefs = useUserPrefs();

  const bookmarkedArticles = useMemo(
    () => corpus.articles.filter((a) => prefs.bookmarkedIds.includes(a.id)),
    [corpus.articles, prefs.bookmarkedIds]
  );

  return {
    ...prefs,
    ...corpus,
    bookmarkedArticles,
  };
}

export { mergeSkillArticle };
