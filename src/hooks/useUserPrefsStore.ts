import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HomeReadingMode,
  UserPersona,
  UserPersonaId,
  RadarKeyword,
  PredictionContract,
  KnowledgeItem,
  ReadingDensity,
  DefaultReadingRhythm,
} from '../types';
import {
  USER_PERSONAS,
  INITIAL_RADAR_KEYWORDS,
  INITIAL_PREDICTION_CONTRACTS,
  INITIAL_KNOWLEDGE_ITEMS,
} from '../data/intelligenceData';
import { useLocalState } from './useLocalState';
import { logUserActivity } from '../utils/activityTracker';

const LEGACY_DEMO_PREDICTION_IDS = new Set(['contract-agent-2026', 'contract-semi-historical']);

/** 用户偏好与个人态：身份/雷达/收藏/契约/知识库，以及服务端偏好同步。 */
export function useUserPrefsStore() {
  const [homeReadingMode, setHomeReadingMode] = useLocalState<HomeReadingMode>(
    'home-reading-mode',
    'standard',
    { version: 1 }
  );
  const [selectedPersonaId, setSelectedPersonaId] = useLocalState<UserPersonaId>(
    'user-persona',
    'investor',
    { version: 1 }
  );
  const selectedPersona: UserPersona =
    USER_PERSONAS.find((p) => p.id === selectedPersonaId) || USER_PERSONAS[0];

  const [radarKeywords, setRadarKeywords] = useLocalState<RadarKeyword[]>(
    'radar-keywords',
    INITIAL_RADAR_KEYWORDS,
    { version: 1 }
  );
  const [bookmarkedIds, setBookmarkedIds] = useLocalState<string[]>(
    'bookmarked-article-ids',
    [],
    { version: 1 }
  );
  const [followedTags, setFollowedTags] = useLocalState<string[]>(
    'followed-tags',
    [],
    { version: 1 }
  );
  const [interestGroups, setInterestGroups] = useLocalState<string[]>(
    'news-interest-groups',
    [],
    { version: 1 }
  );
  const [personalNotes, setPersonalNotes] = useLocalState<string>('action-memo', '', {
    version: 1,
    legacyKey: 'jianwei-action-memo',
  });
  const [predictionContracts, setPredictionContracts] = useLocalState<PredictionContract[]>(
    'prediction-contracts',
    INITIAL_PREDICTION_CONTRACTS,
    { version: 1 }
  );
  const [knowledgeItems, setKnowledgeItems] = useLocalState<KnowledgeItem[]>(
    'jianwei-knowledge-ledger',
    INITIAL_KNOWLEDGE_ITEMS,
    { version: 1 }
  );
  const [nickname, setNickname] = useLocalState<string>('user-nickname', '');
  const [readingDensity, setReadingDensity] = useLocalState<ReadingDensity>(
    'reading-density',
    'comfortable',
    { version: 1 }
  );
  const [defaultRhythm, setDefaultRhythm] = useLocalState<DefaultReadingRhythm>(
    'default-rhythm',
    'classic',
    { version: 1 }
  );

  // 知识库写入以服务端为准：游客 POST/PATCH/DELETE 会 401 registration_required，
  // 由 main.tsx 的 fetch 拦截器弹出注册/登录；不得先乐观写入 localStorage 造成假成功。
  const handleAddKnowledge = useCallback(
    async (item: KnowledgeItem): Promise<boolean> => {
      try {
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) return false;
        const saved: KnowledgeItem = data?.item || item;
        setKnowledgeItems((prev) => [
          saved,
          ...prev.filter((i) => i.id !== saved.id && i.title !== saved.title),
        ]);
        logUserActivity({
          action: 'knowledge.deposit',
          entityType: 'knowledge',
          entityId: saved.id,
          metadata: { title: saved.title, category: saved.category },
        });
        return true;
      } catch {
        return false;
      }
    },
    [setKnowledgeItems]
  );

  const handleUpdateKnowledge = useCallback(
    async (id: string, updates: Partial<KnowledgeItem>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/knowledge/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) return false;
        const saved: KnowledgeItem = data?.item || { id, ...updates } as KnowledgeItem;
        setKnowledgeItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...saved } : item))
        );
        return true;
      } catch {
        return false;
      }
    },
    [setKnowledgeItems]
  );

  const handleRemoveKnowledge = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/knowledge/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) return false;
        setKnowledgeItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [setKnowledgeItems]
  );

  const handleToggleBookmark = useCallback(
    (artId: string) => {
      setBookmarkedIds((prev) =>
        prev.includes(artId) ? prev.filter((id) => id !== artId) : [...prev, artId]
      );
    },
    [setBookmarkedIds]
  );

  const handleToggleFollowTag = useCallback(
    (tag: string) => {
      setFollowedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    },
    [setFollowedTags]
  );

  const handleAddRadar = useCallback(
    (newR: RadarKeyword) => {
      setRadarKeywords((prev) => [newR, ...prev]);
    },
    [setRadarKeywords]
  );

  const handleRemoveRadar = useCallback(
    (id: string) => {
      setRadarKeywords((prev) => prev.filter((r) => r.id !== id));
    },
    [setRadarKeywords]
  );

  const handleSaveContract = useCallback(
    async (contract: PredictionContract): Promise<boolean> => {
      try {
        setPredictionContracts((prev) => [contract, ...prev.filter((c) => c.id !== contract.id)]);
        fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contract),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data?.contract) {
                setPredictionContracts((prev) => [
                  data.contract,
                  ...prev.filter((c) => c.id !== contract.id),
                ]);
              }
            }
          })
          .catch(() => undefined);
        return true;
      } catch {
        return true;
      }
    },
    [setPredictionContracts]
  );

  const handleResolveContract = useCallback(
    async (
      contractId: string,
      actualOutcome: string,
      status: PredictionContract['status'],
      brierScore?: number,
      outcomeSourceUrl?: string,
      reviewer?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/predictions/${encodeURIComponent(contractId)}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            actualOutcome,
            outcomeEvidence: actualOutcome,
            outcomeSourceUrl,
            brierScore,
            reviewer,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.contract) return false;
        const ledgerResponse = await fetch('/api/predictions');
        const ledgerData = await ledgerResponse.json();
        if (ledgerResponse.ok && Array.isArray(ledgerData?.contracts)) {
          setPredictionContracts(ledgerData.contracts);
        } else {
          setPredictionContracts((prev) =>
            prev.map((c) => (c.id === contractId ? data.contract : c))
          );
        }
        return true;
      } catch {
        return false;
      }
    },
    [setPredictionContracts]
  );

  const handleRemoveContract = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/predictions/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) return false;
        setPredictionContracts((prev) => prev.filter((c) => c.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [setPredictionContracts]
  );

  const handleReviewContract = useCallback(
    async (
      contractId: string,
      reviewer: string,
      decision: 'confirm' | 'dispute',
      notes?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/predictions/${encodeURIComponent(contractId)}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer, decision, notes }),
        });
        if (!response.ok) return false;
        const contractsResponse = await fetch('/api/predictions');
        const data = await contractsResponse.json();
        if (!contractsResponse.ok || !Array.isArray(data?.contracts)) return false;
        setPredictionContracts(data.contracts);
        return true;
      } catch {
        return false;
      }
    },
    [setPredictionContracts]
  );

  useEffect(() => {
    setRadarKeywords((prev) =>
      prev
        .filter((item) => !/^rk-[1-6]$/.test(item.id))
        .map((rk) => ({
          ...rk,
          count: 0,
          countChange: '',
          sentimentTrend: '',
          marketAttention: '',
          recentNewsTitle: '',
        }))
    );
    setPredictionContracts((prev) =>
      prev.filter((contract) => !LEGACY_DEMO_PREDICTION_IDS.has(contract.id))
    );
    setBookmarkedIds((prev) => prev.filter((id) => id !== 'news-ai-agent-breakthrough'));
    setFollowedTags((prev) => prev.filter((tag) => tag !== '先进封装' && tag !== 'AI Agent'));
  }, []);

  useEffect(() => {
    let alive = true;
    const syncLedger = async () => {
      try {
        const response = await fetch('/api/predictions');
        if (!response.ok) return;
        const data = await response.json();
        const serverContracts: PredictionContract[] = Array.isArray(data?.contracts)
          ? data.contracts
          : [];
        const merged = new Map(serverContracts.map((contract) => [contract.id, contract]));
        for (const local of predictionContracts) {
          if (merged.has(local.id)) continue;
          if (local.status === 'pending') {
            try {
              const registered = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(local),
              });
              const registeredData = await registered.json();
              if (registered.ok && registeredData?.contract) {
                merged.set(registeredData.contract.id, registeredData.contract);
                continue;
              }
            } catch {
              /* keep local */
            }
          }
          merged.set(local.id, { ...local, ledger: 'local', integrityValid: false });
        }
        if (alive) setPredictionContracts([...merged.values()]);
      } catch {
        /* offline */
      }
    };
    void syncLedger();
    return () => {
      alive = false;
    };
  }, []);

  // 服务端知识库：拉取已沉淀条目，并将本机 localStorage 遗留条目一次性迁移上去。
  useEffect(() => {
    let alive = true;
    const syncKnowledge = async () => {
      try {
        const response = await fetch('/api/knowledge?limit=500');
        if (!response.ok) return;
        const data = await response.json();
        const serverItems: KnowledgeItem[] = Array.isArray(data?.items) ? data.items : [];
        const merged = new Map(serverItems.map((item) => [item.id, item]));
        for (const local of knowledgeItems) {
          if (merged.has(local.id)) continue;
          try {
            const registered = await fetch('/api/knowledge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(local),
            });
            const registeredData = await registered.json().catch(() => ({} as any));
            if (registered.ok && registeredData?.item) {
              merged.set(registeredData.item.id, registeredData.item);
              continue;
            }
            // 游客/未登录：丢弃本机乐观残留，避免刷新后仍显示「已沉淀」假成功
            if (
              registered.status === 401 ||
              registered.status === 403 ||
              registeredData?.error === 'registration_required'
            ) {
              continue;
            }
          } catch {
            /* offline: keep local copy */
          }
          merged.set(local.id, { ...local, ledger: 'local' });
        }
        if (alive) setKnowledgeItems([...merged.values()]);
      } catch {
        /* offline */
      }
    };
    void syncKnowledge();
    return () => {
      alive = false;
    };
    // 仅启动时同步；之后以服务端写穿为主
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preferencesHydratedRef = useRef(false);
  const preferencesVersionRef = useRef(0);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    const applyServerPreferences = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      if (['standard', 'tongsu', 'dehydrated'].includes(payload.homeReadingMode)) {
        setHomeReadingMode(payload.homeReadingMode);
      }
      if (USER_PERSONAS.some((persona) => persona.id === payload.selectedPersonaId)) {
        setSelectedPersonaId(payload.selectedPersonaId);
      }
      if (Array.isArray(payload.radarKeywords)) setRadarKeywords(payload.radarKeywords);
      if (Array.isArray(payload.bookmarkedIds)) setBookmarkedIds(payload.bookmarkedIds.map(String));
      if (Array.isArray(payload.followedTags)) setFollowedTags(payload.followedTags.map(String));
      if (Array.isArray(payload.interestGroups)) setInterestGroups(payload.interestGroups.map(String));
      if (typeof payload.nickname === 'string') setNickname(payload.nickname.slice(0, 80));
      if (typeof payload.personalNotes === 'string') setPersonalNotes(payload.personalNotes.slice(0, 20_000));
      if (payload.readingDensity === 'comfortable' || payload.readingDensity === 'compact') {
        setReadingDensity(payload.readingDensity);
      }
      if (
        payload.defaultRhythm === 'classic' ||
        payload.defaultRhythm === 'fast_dialogue' ||
        payload.defaultRhythm === 'data_driven'
      ) {
        setDefaultRhythm(payload.defaultRhythm);
      }
    };

    fetch('/api/preferences')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        applyServerPreferences(data.payload);
        preferencesVersionRef.current = Number(data.version || 0);
        preferencesHydratedRef.current = true;
        setPreferencesHydrated(true);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!preferencesHydrated || !preferencesHydratedRef.current) return;
    const timer = window.setTimeout(async () => {
      const payload = {
        homeReadingMode,
        selectedPersonaId,
        radarKeywords,
        bookmarkedIds,
        followedTags,
        interestGroups,
        nickname,
        personalNotes,
        // knowledgeItems 已迁至 /api/knowledge，不再写入 preferences 大包
        readingDensity,
        defaultRhythm,
      };
      try {
        const response = await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: preferencesVersionRef.current,
            payload,
          }),
        });
        const data = await response.json();
        if (response.ok && typeof data?.version === 'number') {
          preferencesVersionRef.current = data.version;
        }
      } catch {
        /* offline */
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    preferencesHydrated,
    homeReadingMode,
    selectedPersonaId,
    radarKeywords,
    bookmarkedIds,
    followedTags,
    interestGroups,
    nickname,
    personalNotes,
    readingDensity,
    defaultRhythm,
  ]);

  return {
    homeReadingMode,
    setHomeReadingMode,
    selectedPersonaId,
    setSelectedPersonaId,
    selectedPersona,
    radarKeywords,
    setRadarKeywords,
    bookmarkedIds,
    setBookmarkedIds,
    followedTags,
    setFollowedTags,
    interestGroups,
    setInterestGroups,
    personalNotes,
    setPersonalNotes,
    predictionContracts,
    setPredictionContracts,
    knowledgeItems,
    setKnowledgeItems,
    nickname,
    setNickname,
    readingDensity,
    setReadingDensity,
    defaultRhythm,
    setDefaultRhythm,
    preferencesHydrated,
    handleAddKnowledge,
    handleUpdateKnowledge,
    handleRemoveKnowledge,
    handleToggleBookmark,
    handleToggleFollowTag,
    handleAddRadar,
    handleRemoveRadar,
    handleSaveContract,
    handleResolveContract,
    handleRemoveContract,
    handleReviewContract,
  };
}

export type UserPrefsStore = ReturnType<typeof useUserPrefsStore>;
