import React, { lazy, Suspense, useEffect, useCallback } from 'react';
import { NewsArticle } from './types';

import { TOPIC_CLUSTERS } from './data/intelligenceData';
import { Header } from './components/Header';
import { HomeView } from './components/home/HomeView';
import { AuthGate } from './components/AuthGate';
import { useAppStorage } from './hooks/useAppStorage';
import { useAppRouter } from './hooks/useAppRouter';
import { useModalStack } from './hooks/useModalStack';
import { useSnapshot } from './hooks/useSnapshot';
import { useAuth } from './state/AuthContext';
import { Sparkles } from 'lucide-react';

const IntelligenceHubView = lazy(() =>
  import('./components/intelligence/IntelligenceHubView').then((module) => ({ default: module.IntelligenceHubView }))
);
const TopicsView = lazy(() =>
  import('./components/topics/TopicsView').then((module) => ({ default: module.TopicsView }))
);
const MyFocusView = lazy(() =>
  import('./components/focus/MyFocusView').then((module) => ({ default: module.MyFocusView }))
);
const RegionIntelligencePage = lazy(() =>
  import('./components/RegionIntelligencePage').then((module) => ({ default: module.RegionIntelligencePage }))
);
const NewsDetailView = lazy(() =>
  import('./components/detail/NewsDetailView').then((module) => ({ default: module.NewsDetailView }))
);
const TermExplainModal = lazy(() =>
  import('./components/TermExplainModal').then((module) => ({ default: module.TermExplainModal }))
);
const AudioBriefingModal = lazy(() =>
  import('./components/AudioBriefingModal').then((module) => ({ default: module.AudioBriefingModal }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((module) => ({ default: module.SearchModal }))
);
const AddRadarModal = lazy(() =>
  import('./components/AddRadarModal').then((module) => ({ default: module.AddRadarModal }))
);
const NameExplanationModal = lazy(() =>
  import('./components/NameExplanationModal').then((module) => ({ default: module.NameExplanationModal }))
);
const AnalyzeModal = lazy(() =>
  import('./components/AnalyzeModal').then((module) => ({ default: module.AnalyzeModal }))
);
const CognitiveModelModal = lazy(() =>
  import('./components/CognitiveModelModal').then((module) => ({ default: module.CognitiveModelModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal }))
);
const ShareCardModal = lazy(() =>
  import('./components/common/ShareCardModal').then((module) => ({ default: module.ShareCardModal }))
);
const AdminConsoleView = lazy(() =>
  import('./components/admin/AdminConsoleView').then((module) => ({ default: module.AdminConsoleView }))
);
const IntelligenceToolModal = lazy(() =>
  import('./components/modals/IntelligenceToolModal').then((module) => ({ default: module.IntelligenceToolModal }))
);
import type { IntelligenceToolType } from './components/modals/IntelligenceToolModal';

const ViewLoading = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-xs text-stone-400">
    正在加载页面…
  </div>
);

/** 屏幕顶部微细红色进度条指示器 (Top Loading Bar) */
const TopLoadingBar: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 sm:h-1 bg-stone-200/30 pointer-events-none overflow-hidden">
      <div className="h-full bg-gradient-to-r from-red-600 via-[#E3120B] to-amber-500 animate-pulse transition-all duration-300 w-full shadow-[0_0_10px_rgba(227,18,11,0.9)]" />
    </div>
  );
};

export const App: React.FC = () => {
  const {
    homeReadingMode,
    setHomeReadingMode,
    setSelectedPersonaId,
    selectedPersona,
    articles,
    articlesRef,
    radarKeywords,
    bookmarkedIds,
    bookmarkedArticles,
    followedTags,
    setFollowedTags,
    interestGroups,
    setInterestGroups,
    personalNotes,
    setPersonalNotes,
    predictionContracts,
    knowledgeItems,
    nickname,
    setNickname,
    readingDensity,
    setReadingDensity,
    defaultRhythm,
    setDefaultRhythm,
    derived,
    activeRequests,
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
    handleEnrichArticle: storageHandleEnrichArticle,
    handleAnalysisComplete: storageHandleAnalysisComplete,
    runNewsSkill,
    runPersonaForecast,
  } = useAppStorage();

  const {
    activeTab,
    setActiveTab,
    selectedArticle,
    setSelectedArticle,
    detailInitialTab,
    handleSelectArticle,
    handleSelectArticleWithTab,
    handleBackToList,
    goTab,
  } = useAppRouter(articles, articlesRef);

  const modals = useModalStack();
  const { authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin' && !authUser?.isGuest;
  const [activeIntelligenceTool, setActiveIntelligenceTool] = React.useState<IntelligenceToolType | null>(null);

  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      goTab('home');
    }
  }, [activeTab, isAdmin, goTab]);

  useEffect(() => {
    const preloadLazyViews = () => {
      import('./components/detail/NewsDetailView');
      import('./components/intelligence/IntelligenceHubView');
      import('./components/topics/TopicsView');
      import('./components/focus/MyFocusView');
      import('./components/SearchModal');
      import('./components/AnalyzeModal');
      import('./components/AudioBriefingModal');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        preloadLazyViews,
        { timeout: 1500 }
      );
    } else {
      setTimeout(preloadLazyViews, 800);
    }
  }, []);

  const handleEnrichArticle = useCallback(
    (updated: NewsArticle) => {
      storageHandleEnrichArticle(updated);
      setSelectedArticle((prev) => (prev && prev.id === updated.id ? updated : prev));
    },
    [storageHandleEnrichArticle, setSelectedArticle]
  );

  const handleAnalysisComplete = useCallback(
    (newArticle: NewsArticle) => {
      storageHandleAnalysisComplete(newArticle);
      setSelectedArticle(newArticle);
      setActiveTab('detail');
    },
    [storageHandleAnalysisComplete, setSelectedArticle, setActiveTab]
  );

  const { snapshot, status: snapshotStatus, refresh: refreshSnapshot } = useSnapshot();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans flex flex-col selection:bg-red-100 selection:text-red-950">
      <TopLoadingBar loading={activeRequests > 0} />
      <Header
        activeTab={activeTab === 'detail' ? 'home' : activeTab}
        onSelectTab={goTab}
        selectedPersona={selectedPersona}
        onSelectPersona={setSelectedPersonaId}
        onOpenSearch={modals.openSearch}
        onOpenAnalyzeModal={modals.openAnalyze}
        onOpenNameModal={modals.openNameModal}
        onOpenCognitiveModel={modals.openCognitiveModel}
        optimistic={derived.value.net}
        negative={derived.value.scanned > 0 ? derived.value.negativeHits : null}
        sentimentScope={derived.scope}
        nickname={nickname}
        onOpenSettings={modals.openSettings}
        onOpenAudioBriefing={modals.openAudioBriefing}
        onOpenSupplyChainSimulator={() => setActiveIntelligenceTool('simulator')}
        onOpenCompetitorRadar={() => setActiveIntelligenceTool('radar')}
        onOpenArchitectureDiagram={() => setActiveIntelligenceTool('architecture')}
        isAdmin={isAdmin}
      />

      <AuthGate />

      <main className="flex-1">
        <Suspense fallback={<ViewLoading />}>
          {activeTab === 'detail' && selectedArticle && (
            <NewsDetailView
              article={selectedArticle}
              initialTab={detailInitialTab}
              onBack={handleBackToList}
              isBookmarked={bookmarkedIds.includes(selectedArticle.id)}
              onToggleBookmark={() => handleToggleBookmark(selectedArticle.id)}
              activePersona={selectedPersona}
              onSelectPersona={setSelectedPersonaId}
              onOpenTermExplain={(term) => modals.setActiveTermExplain(term)}
              onNavigateTab={goTab}
              onSaveContract={handleSaveContract}
              onEnrichArticle={handleEnrichArticle}
              onRunSkill={runNewsSkill}
              onRunPersonaForecast={runPersonaForecast}
              contextArticles={articles}
              onOpenArticle={handleSelectArticle}
              onOpenShareCard={(art) => modals.setShareCardArticle(art)}
              isDepositedInKnowledge={knowledgeItems.some((k) => k.articleId === selectedArticle.id)}
              onDepositToKnowledge={handleAddKnowledge}
              predictionContracts={predictionContracts}
              readingDensity={readingDensity}
              defaultRhythm={defaultRhythm}
              onAppendActionMemo={(entry) =>
                setPersonalNotes((prev) => (prev ? `${prev.trim()}\n${entry}` : entry))
              }
            />
          )}

          {activeTab === 'home' && (
            <HomeView
              articles={articles}
              readingMode={homeReadingMode}
              onSelectReadingMode={setHomeReadingMode}
              selectedPersona={selectedPersona}
              radarKeywords={radarKeywords}
              bookmarkedIds={bookmarkedIds}
              followedTags={followedTags}
              interestGroups={interestGroups}
              onSelectArticle={handleSelectArticle}
              onSelectArticleWithTab={handleSelectArticleWithTab}
              onToggleBookmark={handleToggleBookmark}
              onToggleFollowTag={handleToggleFollowTag}
              onRunSkill={runNewsSkill}
              onOpenAudioBriefing={modals.openAudioBriefing}
              onOpenAnalyze={modals.openAnalyze}
              onOpenAddRadar={modals.openAddRadar}
              onRemoveRadar={handleRemoveRadar}
              onOpenTermExplain={(term) => modals.setActiveTermExplain(term)}
              onOpenSettings={modals.openSettings}
              onOpenShareCard={(art) => modals.setShareCardArticle(art)}
              readingDensity={readingDensity}
            />
          )}

          {activeTab === 'intelligence' && (
            <IntelligenceHubView
              selectedPersona={selectedPersona}
              contextArticles={articles}
              snapshot={snapshot}
              snapshotStatus={snapshotStatus}
              onRefreshSnapshot={refreshSnapshot}
              onOpenSettings={modals.openSettings}
              onSelectArticleTitle={(title) => {
                const matched = articles.find((a) => a.title.includes(title));
                if (matched) handleSelectArticle(matched);
              }}
              onOpenArticleById={(artId) => {
                const matched = articles.find((a) => a.id === artId);
                if (matched) handleSelectArticle(matched);
              }}
              onGoRegion={() => goTab('region')}
            />
          )}

          {activeTab === 'topics' && (
            <TopicsView articles={articles} onSelectArticle={handleSelectArticle} />
          )}

          {activeTab === 'region' && (
            <RegionIntelligencePage
              articles={articles}
              onOpenArticleById={(artId) => {
                const matched = articles.find((a) => a.id === artId);
                if (matched) handleSelectArticle(matched);
              }}
            />
          )}

          {activeTab === 'my_focus' && (
            <MyFocusView
              selectedPersona={selectedPersona}
              onSelectPersona={setSelectedPersonaId}
              radarKeywords={radarKeywords}
              articles={articles}
              onRemoveRadar={handleRemoveRadar}
              onOpenAddRadar={modals.openAddRadar}
              followedTags={followedTags}
              onRemoveTag={handleToggleFollowTag}
              bookmarkedArticles={bookmarkedArticles}
              onSelectArticle={handleSelectArticle}
              onRemoveBookmark={handleToggleBookmark}
              predictionContracts={predictionContracts}
              onResolveContract={handleResolveContract}
              onReviewContract={handleReviewContract}
              onRemoveContract={handleRemoveContract}
              personalNotes={personalNotes}
              onPersonalNotesChange={setPersonalNotes}
              knowledgeItems={knowledgeItems}
              onAddKnowledge={handleAddKnowledge}
              onUpdateKnowledge={handleUpdateKnowledge}
              onRemoveKnowledge={handleRemoveKnowledge}
              onOpenArticleById={(artId) => {
                const matched = articles.find((a) => a.id === artId);
                if (matched) handleSelectArticle(matched);
              }}
              onOpenTermExplain={(term) => modals.setActiveTermExplain(term)}
            />
          )}

          {activeTab === 'admin' && isAdmin && <AdminConsoleView />}
        </Suspense>
      </main>

      <footer className="bg-stone-900 text-stone-300 border-t-2 border-stone-950 mt-16 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 bg-[#E3120B] rounded text-white flex items-center justify-center font-serif font-black text-sm">
                  微
                </span>
                <span className="text-xl font-serif font-bold text-white tracking-tight">
                  见微 Genway
                </span>
                <span className="text-xs font-serif text-stone-400">
                  · 于细微处，读懂新闻背后
                </span>
              </div>
              <p className="text-xs text-stone-400 font-serif max-w-lg">
                报刊为骨，数据为翼，光谱拆解为记。服务于严肃决策者、投资机构与产业开拓者的 AI 新闻情报与认知分析平台。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
              <button
                onClick={modals.openNameModal}
                className="px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="查看见微产品全景图文白皮书、命名与设计哲学及 90 秒发布视频分镜"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
                <span>产品说明与设计哲学 (Genway)</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-stone-500 font-mono">
            <div>© 2026 见微 Genway Intelligence Platform. All rights reserved.</div>
            <div className="mt-2 sm:mt-0">
              {articles.some((a) => a.isExternal)
                ? '运行时语料 · 外部信源条目保留原文链接；AI 解读与自评分未校准'
                : '当前没有真实语料；请在设置中配置 RSS 源并摄取'}
            </div>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        {modals.isSettingsOpen && (
          <SettingsModal
            isOpen
            onClose={() => modals.setIsSettingsOpen(false)}
            nickname={nickname}
            onNicknameChange={setNickname}
            radarKeywords={radarKeywords}
            articles={articles}
            interestGroups={interestGroups}
            onInterestGroupsChange={setInterestGroups}
            followedTags={followedTags}
            onFollowedTagsChange={setFollowedTags}
            onRemoveRadar={handleRemoveRadar}
            onAddRadarOpen={modals.openAddRadar}
            selectedPersona={selectedPersona}
            readingDensity={readingDensity}
            onReadingDensityChange={setReadingDensity}
            defaultRhythm={defaultRhythm}
            onDefaultRhythmChange={setDefaultRhythm}
          />
        )}

        {modals.isCognitiveModelOpen && (
          <CognitiveModelModal
            isOpen
            onClose={() => modals.setIsCognitiveModelOpen(false)}
            onNavigateTab={goTab}
          />
        )}

        {modals.activeTermExplain && (
          <TermExplainModal
            term={modals.activeTermExplain}
            onClose={() => modals.setActiveTermExplain(null)}
          />
        )}

        {modals.isAudioBriefingOpen && (
          <AudioBriefingModal
            isOpen
            onClose={() => modals.setIsAudioBriefingOpen(false)}
            articles={articles}
            selectedPersona={selectedPersona}
          />
        )}

        {modals.isSearchOpen && (
          <SearchModal
            isOpen
            onClose={() => modals.setIsSearchOpen(false)}
            articles={articles}
            radarKeywords={radarKeywords}
            topics={TOPIC_CLUSTERS}
            onSelectArticle={handleSelectArticle}
            onSelectTopic={() => {
              goTab('topics');
            }}
          />
        )}

        {modals.isAddRadarOpen && (
          <AddRadarModal
            isOpen
            onClose={() => modals.setIsAddRadarOpen(false)}
            onAddRadar={handleAddRadar}
          />
        )}

        {modals.isNameModalOpen && (
          <NameExplanationModal isOpen onClose={() => modals.setIsNameModalOpen(false)} />
        )}

        {modals.isAnalyzeOpen && (
          <AnalyzeModal
            isOpen
            onClose={() => modals.setIsAnalyzeOpen(false)}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {modals.shareCardArticle && (
          <ShareCardModal
            isOpen={!!modals.shareCardArticle}
            onClose={() => modals.setShareCardArticle(null)}
            article={modals.shareCardArticle}
            selectedPersona={selectedPersona}
          />
        )}

        {activeIntelligenceTool !== null && (
          <IntelligenceToolModal
            isOpen={activeIntelligenceTool !== null}
            activeTool={activeIntelligenceTool}
            onClose={() => setActiveIntelligenceTool(null)}
            onChangeTool={(tool) => setActiveIntelligenceTool(tool)}
            articles={articles}
            selectedArticle={selectedArticle}
            onSelectArticle={(art) => {
              handleSelectArticle(art);
              setActiveIntelligenceTool(null);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;
