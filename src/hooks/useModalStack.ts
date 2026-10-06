import { useState, useEffect, useCallback } from 'react';
import { NewsArticle } from '../types';

/** 全局模态开关收敛。 */
export function useModalStack() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddRadarOpen, setIsAddRadarOpen] = useState(false);
  const [isAudioBriefingOpen, setIsAudioBriefingOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isCognitiveModelOpen, setIsCognitiveModelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shareCardArticle, setShareCardArticle] = useState<NewsArticle | null>(null);
  const [activeTermExplain, setActiveTermExplain] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const openAnalyze = useCallback(() => setIsAnalyzeOpen(true), []);
  const openAudioBriefing = useCallback(() => setIsAudioBriefingOpen(true), []);
  const openAddRadar = useCallback(() => setIsAddRadarOpen(true), []);
  const openNameModal = useCallback(() => setIsNameModalOpen(true), []);
  const openCognitiveModel = useCallback(() => setIsCognitiveModelOpen(true), []);

  return {
    isSearchOpen,
    setIsSearchOpen,
    isAddRadarOpen,
    setIsAddRadarOpen,
    isAudioBriefingOpen,
    setIsAudioBriefingOpen,
    isAnalyzeOpen,
    setIsAnalyzeOpen,
    isNameModalOpen,
    setIsNameModalOpen,
    isCognitiveModelOpen,
    setIsCognitiveModelOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    shareCardArticle,
    setShareCardArticle,
    activeTermExplain,
    setActiveTermExplain,
    openSearch,
    openSettings,
    openAnalyze,
    openAudioBriefing,
    openAddRadar,
    openNameModal,
    openCognitiveModel,
  };
}
