import React, { useEffect, useState, useMemo, useRef } from 'react';
import { NewsArticle, CognitiveDetailTab, UserPersona, UserPersonaId, PrimaryNavTab, PredictionContract, KnowledgeItem, ReadingDensity, DefaultReadingRhythm, ArticleCrossCheck } from '../../types';
import { findRelatedUiTopic } from '../../utils/topicDossiers';
import { SevenElementsTab } from './SevenElementsTab';
const LogicTreeTab = React.lazy(() => import('./LogicTreeTab').then(m => ({ default: m.LogicTreeTab })));
const RelevanceIdentityTab = React.lazy(() => import('./RelevanceIdentityTab').then(m => ({ default: m.RelevanceIdentityTab })));
const RippleEffectTab = React.lazy(() => import('./RippleEffectTab').then(m => ({ default: m.RippleEffectTab })));
const DeepSpectrumTab = React.lazy(() => import('./DeepSpectrumTab').then(m => ({ default: m.DeepSpectrumTab })));
const ForecastArenaTab = React.lazy(() => import('./ForecastArenaTab').then(m => ({ default: m.ForecastArenaTab })));
const ArchitectureDiagramTab = React.lazy(() => import('./ArchitectureDiagramTab').then(m => ({ default: m.ArchitectureDiagramTab })));

import { EventEvolutionTimeline } from './EventEvolutionTimeline';
import { SidebarEvolutionNav } from './SidebarEvolutionNav';
import { ArticleBodyParserSection } from './ArticleBodyParserSection';
import { RelatedNewsGraph } from './RelatedNewsGraph';
import { ButterflyEffectGraph } from './ButterflyEffectGraph';
import { ArticleCompareView } from './ArticleCompareView';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell 
} from 'recharts';

import { KeyTermNote, KeyTermHighlight } from '../common/KeyTermHighlight';
import { FeatureSummary } from '../common/FeatureSummary';
import { EditorialNotice } from '../common/EditorialNotice';
import type { FeatureSummaryId } from '../../utils/featureSummaries';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { MethodBadge } from '../common/MethodBadge';
import { FrameworkOverviewCard } from '../common/FrameworkOverviewCard';
import { mergeDeepAnalysisFields } from '../../shared/analysisFramework';
import { formatArticlePublishedMeta } from '../../utils/articleTime';
import { getArticleCanonicalCategory, CATEGORY_THEMES } from '../../utils/categoryClassifier';
import { composeModel, SEVEN_W_ITEMS } from '../../utils/sevenElementsBrief';
import { downloadBriefingPng } from '../../utils/briefingImage';
import { downloadMarkdownBriefing, exportBriefingAsPdf } from '../../utils/briefingReportExport';
import { CERTIFICATION_STANDARDS } from '../../utils/methodRegistry';
import { classifyAiClientError } from '../../utils/aiClientErrors';
import {
  ENRICH_ETA_SECONDS,
  enrichDeepNote,
  enrichProgressLabel,
  enrichProgressPercent,
  formatGuestQuotaHint,
  formatPostEnrichQuotaNote,
  POST_ENRICH_LANDING_TAB,
  shouldShowShallowEnrichCta,
  type EnrichPhase,
} from '../../utils/enrichDetailUx';
import { useAuth } from '../../state/AuthContext';
import { saveArticleOffline, removeArticleOffline, isArticleOffline } from '../../utils/offlineStorage';

import { 
  ArrowLeft, 
  Bookmark, 
  Share2, 
  Bot, 
  Send, 
  RefreshCw,
  Sparkles,
  Printer,
  Check,
  CheckCircle2,
  Download,
  FileImage,
  HelpCircle,
  Clock,
  Layers,
  Flame,
  BookOpen,
  GitFork,
  UserCheck,
  Waves,
  ArrowRight,
  Radio,
  Network,
  GitMerge,
  Crosshair,
  ChevronDown,
  Activity,
  Columns,
  Scale,
  ArrowUp
} from 'lucide-react';


// 浅层外部信源条目缺少深度认知字段时的优雅占位
const MissingDeep: React.FC<{ feature: string; note?: string; collapsed?: boolean }> = ({
  feature,
  note,
  collapsed,
}) => (
  <div
    className={`text-center bg-white border border-dashed border-stone-300 rounded-xl space-y-1 ${
      collapsed ? 'px-4 py-3' : 'p-8 border-2 rounded-2xl space-y-2'
    }`}
  >
    <p className="text-sm font-serif font-bold text-stone-700">
      {collapsed ? `「${feature}」尚未生成` : `本篇文章暂无「${feature}」深度认知数据`}
    </p>
    <p className="text-xs text-stone-500">
      {note || '深度分析尚未生成。请点击上方「生成深度分析」后再查看本模块。'}
    </p>
  </div>
);

// 将 /api/enrich 返回的深层字段合并进浅层文章（统一框架白名单 + 详情扩展字段）
function mergeDeep(article: NewsArticle, overrides: Record<string, unknown>): NewsArticle {
  const next = mergeDeepAnalysisFields({ ...article }, overrides);
  // 详情页扩展字段（不在框架核心白名单内，但 enrich/skill 仍可能写回）
  for (const key of ['relatedNews', 'personaForecasts', 'aiFieldMeta', 'contentBasis'] as const) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      (next as any)[key] = value;
    }
  }
  return next;
}

interface LogicWeightItem {
  name: string;
  weight: number;
  color: string;
  verdict: string;
}

const CURATED_LOGIC_WEIGHT_IDS = new Set([
  'news-anthropic-claude37',
  'news-tsmc-2nm-yield',
  'news-pboc-liquidity-tool',
  'news-catl-solid-state-pilot',
  'news-deepseek-enterprise-deployment',
  'news-quantum-topological-qubit',
]);

const getArticleLogicWeights = (id: string, _title: string): LogicWeightItem[] => {
  if (!CURATED_LOGIC_WEIGHT_IDS.has(id)) return [];
  switch (id) {
    case 'news-anthropic-claude37':
      return [
        { name: '混合推理算力弹性分配', weight: 35, color: '#0284c7', verdict: '支持通过 API 自适应控制思考预算与执行时长，优化核心 ROI' },
        { name: '自主错误修正与思考链反思', weight: 25, color: '#4f46e5', verdict: '显式推理链（Thinking Chain）公开可调，提升高复杂工程正确性' },
        { name: 'API 控制参数与响应延迟', weight: 20, color: '#ca8a04', verdict: '思考延迟对即时高频场景的体验衰减与博弈阻尼' },
        { name: '研发范式重构与程序员转型', weight: 20, color: '#16a34a', verdict: '推动开发周期向小时级收缩，程序员重构为架构审核员' }
      ];
    case 'news-tsmc-2nm-yield':
      return [
        { name: 'GAAFET 纳米片重构控漏电', weight: 35, color: '#0284c7', verdict: '4面栅极全包裹纳米片架构，突破物理隧穿漏电死角' },
        { name: '高雄高雄 P1 试产良品率突破', weight: 25, color: '#4f46e5', verdict: '首批产品良率提前冲上 75% 商业化量产分水岭' },
        { name: 'ASML 尖端光刻与折旧沉淀', weight: 20, color: '#ca8a04', verdict: 'High-NA EUV 光刻设备调试及昂贵工艺折旧的资金占位' },
        { name: '巨头抢跑预付包厂垄断', weight: 20, color: '#16a34a', verdict: '苹果、英伟达超级预付金形成独家排他垄断，锁死份额' }
      ];
    case 'news-pboc-liquidity-tool':
      return [
        { name: '买断式质押流动性滴灌', weight: 35, color: '#0284c7', verdict: '买断质押解决抵押品摩擦，向实体直接注入定向中长期资金' },
        { name: '硬科技中长期耐心资本补充', weight: 25, color: '#4f46e5', verdict: '对冲公开市场到期洪峰，为战略性新兴高科技研发稳固底座' },
        { name: '商业银行信贷传导阻力', weight: 20, color: '#ca8a04', verdict: '考验银行在宏观环境下的风险厌恶偏好与信贷实际穿透率' },
        { name: '宏观股债防线及汇率平滑', weight: 20, color: '#16a34a', verdict: '平滑中长期利率波动，为红利资产估值提供中长期资本底座' }
      ];
    case 'news-catl-solid-state-pilot':
      return [
        { name: '硫化物电解质与干法极片工艺', weight: 35, color: '#0284c7', verdict: '攻克固固界面传导瓶颈与连续卷对卷高精度极片薄膜成膜' },
        { name: '低空经济 eVTOL 载重爆发', weight: 25, color: '#4f46e5', verdict: '单体密度超 500Wh/kg，高安全零热失控，赋能低空商飞' },
        { name: '上游纯硫化锂特种材料定价', weight: 20, color: '#ca8a04', verdict: '特种锆、高电导硫化锂合成成本昂贵，构成大众级普及阻尼' },
        { name: '高端车 1200km 续航轻量化', weight: 20, color: '#16a34a', verdict: '车身免去笨重热控外壳，实现能量密度翻倍与电池安全脱钩' }
      ];
    case 'news-deepseek-enterprise-deployment':
      return [
        { name: 'FP8/INT4 本地极限损失量化', weight: 35, color: '#0284c7', verdict: '量化技术使中端算力显存消耗降低 80%，极佳对齐大众硬件' },
        { name: '敏感高合规数据物理不出域', weight: 25, color: '#4f46e5', verdict: '满足金融、医疗零数据泄密及零公有云调用合规红线' },
        { name: '国产异构算力多卡适配调度', weight: 20, color: '#ca8a04', verdict: '解决非主流大牌芯片在私有集群的高效通信与负载平衡' },
        { name: '企业局域网本地知识微调', weight: 20, color: '#16a34a', verdict: '私有语料微调技术，让大模型完美融合进真实生产业务线' }
      ];
    case 'news-quantum-topological-qubit':
      return [
        { name: '拓扑表面码监督校验纠错', weight: 35, color: '#0284c7', verdict: '引入表面码拓扑保护，通过物理比特多重冗余解决退相干' },
        { name: '逻辑比特存活寿命超物理极限', weight: 25, color: '#4f46e5', verdict: '合成长相干逻辑比特，使得计算保真度跨越 10 万门槛' },
        { name: '极低温稀释制冷微波线路扩展', weight: 20, color: '#ca8a04', verdict: '微波信号同轴线排布和超低阻抗控制在极低温下的封装极值' },
        { name: '后量子密码重构与生物模拟', weight: 20, color: '#16a34a', verdict: '提速生物靶向药研发周期，倒逼全球抗量子安全加密改造' }
      ];
    default:
      return [];
  }
};

/** 计算长文总字数与预计阅读时长（基于中文严肃深度研报与图表思维模型，按380字/分钟测算） */
function calculateArticleStats(article: NewsArticle): { totalChars: number; totalMinutes: number } {
  let text = `${article.title || ''} ${article.subtitle || ''} ${article.summary || ''} ${article.oneSentenceVerdict || ''}`;
  
  if ((article as any).fullContent) text += ` ${(article as any).fullContent}`;
  if ((article as any).articleBody) text += ` ${(article as any).articleBody}`;
  if ((article as any).content) text += ` ${(article as any).content}`;
  
  if (article.tongsuSummary) {
    text += ` ${article.tongsuSummary.simpleSay || ''} ${article.tongsuSummary.whyExplanation || ''} ${article.tongsuSummary.whatItMeans || ''}`;
  }
  if (article.dehydratedItems) {
    text += ` ${(article.dehydratedItems.coreShifts || []).join(' ')} ${(article.dehydratedItems.impactHighlights || []).join(' ')}`;
  }
  if (article.coreLogic) {
    text += ` ${article.coreLogic.essence || ''} ${(article.coreLogic.points || []).join(' ')} ${article.coreLogic.counterIntuitive || ''}`;
  }
  if (article.bullBearDebate) {
    text += ` ${article.bullBearDebate.coreDispute || ''} ${(article.bullBearDebate.bull || []).map((b) => b.point).join(' ')} ${(article.bullBearDebate.bear || []).map((b) => b.point).join(' ')}`;
  }
  if (article.sevenElements) {
    text += ` ${article.sevenElements.what || ''} ${article.sevenElements.why || ''} ${article.sevenElements.how || ''} ${article.sevenElements.soWhat || ''}`;
  }
  if (article.spectrumLayers) {
    for (const layer of article.spectrumLayers) {
      text += ` ${layer.content || ''}`;
    }
  }

  const cleanedText = text.replace(/\s+/g, '');
  const count = Math.max(350, cleanedText.length);
  const minutes = Math.max(1, Math.round(count / 380));
  return { totalChars: count, totalMinutes: minutes };
}

interface NewsDetailViewProps {
  article: NewsArticle;
  initialTab?: CognitiveDetailTab;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activePersona: UserPersona;
  onSelectPersona: (id: UserPersonaId) => void;
  onOpenTermExplain: (term: string) => void;
  onNavigateTab?: (tab: PrimaryNavTab) => void;
  onSaveContract?: (contract: PredictionContract) => Promise<boolean>;
  onEnrichArticle?: (updated: NewsArticle) => void;
  /** 按需技能（timeline 等） */
  onRunSkill?: (skill: import('../home/HomeView').NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 身份化「正反双向预测」 */
  onRunPersonaForecast?: (persona: UserPersona, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 相关新闻：语料池与打开其它文章 */
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenShareCard?: (article: NewsArticle) => void;
  isDepositedInKnowledge?: boolean;
  onDepositToKnowledge?: (item: KnowledgeItem) => boolean | Promise<boolean>;
  predictionContracts?: PredictionContract[];
  onAppendActionMemo?: (entry: string) => void;
  readingDensity?: ReadingDensity;
  defaultRhythm?: DefaultReadingRhythm;
}

export const NewsDetailView: React.FC<NewsDetailViewProps> = ({
  article,
  initialTab = 'seven_elements',
  onBack,
  isBookmarked,
  onToggleBookmark,
  activePersona,
  onSelectPersona,
  onOpenTermExplain,
  onNavigateTab,
  onSaveContract,
  onEnrichArticle,
  onRunSkill,
  onRunPersonaForecast,
  contextArticles,
  onOpenArticle,
  onOpenShareCard,
  isDepositedInKnowledge = false,
  onDepositToKnowledge,
  predictionContracts = [],
  onAppendActionMemo,
  readingDensity = 'comfortable',
  defaultRhythm = 'classic',
}) => {
  const [activeTab, setActiveTab] = useState<CognitiveDetailTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, article.id]);

  const [probeQuestion, setProbeQuestion] = useState('');
  const [probeAnswer, setProbeAnswer] = useState<string | null>(null);
  const [probeFallback, setProbeFallback] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [quoteFeedback, setQuoteFeedback] = useState<string | null>(null);
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProbe, setShowProbe] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [deposited, setDeposited] = useState(isDepositedInKnowledge);

  useEffect(() => {
    setDeposited(isDepositedInKnowledge);
  }, [isDepositedInKnowledge, article.id]);

  const handleDeposit = async () => {
    if (!onDepositToKnowledge || deposited) return;
    const item: KnowledgeItem = {
      id: `kb-${article.id}`,
      articleId: article.id,
      title: article.title,
      category: article.category || '综合战略',
      tags: Array.isArray(article.tags) && article.tags.length > 0 ? article.tags : ['深度研判'],
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      oneSentenceVerdict: article.oneSentenceVerdict || article.summary || article.subtitle || article.title,
      keyTakeaways: [
        ...(article.dehydratedItems?.coreShifts || []),
        ...(article.dehydratedItems?.impactHighlights || []),
        ...(article.evidenceChain?.slice(0, 3).map((e) => e.claim) || []),
        article.sevenElements ? `【事实锚点】${article.sevenElements.what}` : '',
      ].filter(Boolean),
      coreMechanisms: article.coreLogic?.points?.join('；') || article.coreLogic?.essence || '',
      decisionImplication: Array.isArray(article.personaImpacts) && article.personaImpacts.length > 0
        ? article.personaImpacts[0]?.recommendedAction
        : '',
      personalNote: `沉淀自《${article.title}》(${article.sourceName || '见微'})`,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const ok = await onDepositToKnowledge(item);
    if (ok !== false) setDeposited(true);
  };

  // 离线持久化状态（存储至 IndexedDB）
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    isArticleOffline(article.id).then((saved) => {
      if (alive) setIsOfflineSaved(saved);
    });
    return () => {
      alive = false;
    };
  }, [article.id]);

  const handleToggleOffline = async () => {
    setSavingOffline(true);
    try {
      if (isOfflineSaved) {
        await removeArticleOffline(article.id);
        setIsOfflineSaved(false);
      } else {
        await saveArticleOffline(article);
        setIsOfflineSaved(true);
      }
    } finally {
      setSavingOffline(false);
    }
  };



  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showLogicHeatmap, setShowLogicHeatmap] = useState(false);
  const [verdictViewMode, setVerdictViewMode] = useState<'pro' | 'tongsu'>('pro');
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    setShowLogicHeatmap(false);
    const updateProgress = () => {
      const root = document.documentElement;
      const total = root.scrollHeight - window.innerHeight;
      setReadingProgress(total > 0 ? Math.max(0, Math.min(100, (window.scrollY / total) * 100)) : 0);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [article.id]);

  // 计算全文预估阅读时长与动态剩余阅读时长
  const articleStats = useMemo(() => calculateArticleStats(article), [article]);
  const remainingMinutes = useMemo(() => {
    if (readingProgress >= 96) return 0;
    const rem = Math.ceil((articleStats.totalMinutes * (100 - readingProgress)) / 100);
    return Math.max(1, rem);
  }, [articleStats.totalMinutes, readingProgress]);

  // 简报卡“下载 / 打印 PDF”：临时给 body 挂 printing 类，打印样式只保留 #briefing-sheet
  const handlePrintBriefing = () => {
    setShowPrintCard(true);
    const cleanup = () => {
      document.body.classList.remove('printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // 等渲染出卡片后挂上打印类再触发打印（打印样式只保留 #briefing-sheet）
    setTimeout(() => {
      document.body.classList.add('printing');
      window.print();
      // 兜底清理：个别浏览器不派发 afterprint
      setTimeout(cleanup, 60000);
    }, 120);
  };

  // —— 浅层外部信源条目：深层认知 AI 懒加载补全 ——
  const isShallow = !article.spectrumLayers || article.spectrumLayers.length === 0;
  const { authUser, applyGuestQuota } = useAuth();
  const [enrichPhase, setEnrichPhase] = useState<EnrichPhase>(
    article.deepAnalysisError ? 'error' : 'idle'
  );
  const [enrichError, setEnrichError] = useState<string | null>(article.deepAnalysisError || null);
  const [enrichElapsed, setEnrichElapsed] = useState(0);
  const [postEnrichQuotaNote, setPostEnrichQuotaNote] = useState<string | null>(null);
  /** enrich 质量报告（缺字段/未核实引句/未接地数字），来自服务端。 */
  const [enrichQuality, setEnrichQuality] = useState<{
    retriedGroups?: string[];
    missingGroups?: string[];
    discardedQuotes?: number;
    ungroundedEvidence?: number;
    ungroundedNumbers?: string[];
    ungroundedSentences?: Array<{ field: string; sentence: string; numbers: string[] }>;
    audit?: { unsupportedClaims?: string[]; contradictions?: string[] };
  } | null>(null);
  /** 后台原文核验结果（轮询回填）。 */
  const [evidenceVerifyNote, setEvidenceVerifyNote] = useState<string | null>(null);
  /** 跨模型复核结果（轮询回填；仅双通道时产生）。 */
  const [crossCheck, setCrossCheck] = useState<ArticleCrossCheck | null>(null);
  const enrichAbortRef = useRef<AbortController | null>(null);
  const enrichCtaRef = useRef<HTMLDivElement | null>(null);

  const guestQuotaHint = formatGuestQuotaHint(
    authUser?.isGuest ? authUser?.guestQuota : null
  );

  const landOnUnlockedModules = () => {
    setActiveTab(POST_ENRICH_LANDING_TAB);
    window.requestAnimationFrame(() => {
      document
        .getElementById('detail-tabs-container')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // 文章切换时，用写回文章状态的深度分析错误恢复提示，避免静默回到「尚未生成」。
  // 只监听 article.id：写回 deepAnalysisError 会换新对象但 id 不变，此处不应再次覆盖。
  useEffect(() => {
    setEnrichPhase(article.deepAnalysisError ? 'error' : 'idle');
    setEnrichError(article.deepAnalysisError || null);
    setPostEnrichQuotaNote(null);
  }, [article.id]);

  useEffect(() => {
    if (enrichPhase !== 'loading') {
      setEnrichElapsed(0);
      return;
    }
    setEnrichElapsed(0);
    const timer = window.setInterval(() => setEnrichElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [enrichPhase]);

  const handleCancelEnrich = () => {
    enrichAbortRef.current?.abort();
    setEnrichPhase('idle');
    setEnrichError('已取消深度分析请求。');
  };

  const persistEnrichError = (message: string) => {
    setEnrichError(message);
    if (onEnrichArticle) {
      onEnrichArticle({ ...article, deepAnalysisError: message });
    }
  };

  /** enrich 响应后，后台会抓原文核验引句；这里最多轮询 3 次把结果回填到页面。 */
  const pollEvidenceVerification = (articleId: string, attempt = 0) => {
    if (attempt >= 3) return;
    window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/corpus/item/${encodeURIComponent(articleId)}`);
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          const fetched = data?.article;
          const evidence = Array.isArray(fetched?.evidenceChain) ? fetched.evidenceChain : [];
          const evidenceDone = evidence.some(
            (ev: any) =>
              ev?.verificationNote === '原文引句匹配' ||
              String(ev?.verificationNote || '').includes('原文页面未找到')
          );
          const crossDone = !!fetched?.crossCheck;
          if (evidenceDone) {
            const verified = evidence.filter((ev: any) => ev?.verificationStatus === 'linked').length;
            setEvidenceVerifyNote(`原文核验：${verified}/${evidence.length} 条引句在原文页面匹配`);
          }
          if (crossDone) setCrossCheck(fetched.crossCheck as ArticleCrossCheck);
          if (fetched && onEnrichArticle) onEnrichArticle(fetched as NewsArticle);
          if (evidenceDone && crossDone) return;
        }
      } catch {
        /* 轮询失败时静默，不影响主流程 */
      }
      pollEvidenceVerification(articleId, attempt + 1);
    }, 4000);
  };

  const handleGenerateDeepAnalysis = async () => {
    if (!isShallow || enrichPhase === 'loading') return;
    enrichAbortRef.current?.abort();
    const controller = new AbortController();
    enrichAbortRef.current = controller;
    setEnrichPhase('loading');
    setEnrichError(null);
    setPostEnrichQuotaNote(null);
    setEnrichQuality(null);
    setEvidenceVerifyNote(null);
    setCrossCheck(null);
    enrichCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          title: article.title,
          content: article.summary || article.subtitle || article.title,
          source: article.sourceName,
          sourceUrl: article.sourceUrl || '',
          publishedAt: article.publishedAt || '',
          category: article.category,
        }),
        signal: controller.signal,
      });
      const json = await response.json().catch(() => ({}));
      if (json?.enriched && json.overrides && onEnrichArticle) {
        onEnrichArticle({ ...mergeDeep(article, json.overrides), deepAnalysisError: undefined });
        if (json.guestQuota) {
          applyGuestQuota(json.guestQuota);
          setPostEnrichQuotaNote(formatPostEnrichQuotaNote(json.guestQuota));
        }
        setEnrichPhase('done');
        setEnrichError(null);
        setEnrichQuality(json.quality && typeof json.quality === 'object' ? json.quality : null);
        pollEvidenceVerification(article.id);
        // 成功后直接落到已解锁的第一篇，避免用户停在空深 Tab / MissingDeep
        landOnUnlockedModules();
      } else if (json?.reason === 'no_api_key') {
        setEnrichPhase('unavailable');
        persistEnrichError(classifyAiClientError({ status: response.status, payload: json }));
      } else {
        setEnrichPhase('error');
        persistEnrichError(classifyAiClientError({ status: response.status, payload: json }));
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setEnrichPhase('idle');
        setEnrichError('已取消深度分析请求。');
      } else {
        setEnrichPhase('error');
        persistEnrichError(classifyAiClientError({ error: err }));
      }
    }
  };

  // 浅层占位提示文案随补全状态变化（done 不再误说「尚未生成」）
  const deepNote = enrichDeepNote({
    phase: enrichPhase,
    error: enrichError,
    elapsedSec: enrichElapsed,
  });

  // 语料驱动：从 contextArticles 派生所属专题（无命中则为 null）
  const relatedTopic = findRelatedUiTopic(article, contextArticles || []);
  const latestAiMeta = Object.entries(article.aiFieldMeta || {})
    .sort((a, b) => String(b[1]?.generatedAt || '').localeCompare(String(a[1]?.generatedAt || '')))[0];

  // 详情核心认知路径（4大严谨逻辑篇章）：
  // 第一篇：事实全貌与溯源 ➔ 第二篇：底层逻辑与因果 ➔ 第三篇：未来推演与预测 ➔ 第四篇：切身决策与行动
  const tabsList: Array<{ id: CognitiveDetailTab; label: string; icon: React.ReactNode; step: string }> = [
    { id: 'seven_elements', label: '事实全貌与溯源', icon: <Sparkles className="w-4 h-4 text-[#E3120B]" />, step: '第一篇 · 事实' },
    { id: 'logic_tree', label: '底层逻辑与因果', icon: <GitFork className="w-4 h-4 text-purple-600" />, step: '第二篇 · 逻辑' },
    { id: 'butterfly_effect', label: '蝴蝶效应关联网', icon: <GitMerge className="w-4 h-4 text-amber-500" />, step: '深度 · 拓扑' },
    { id: 'forecast_arena', label: '未来推演与预测', icon: <Crosshair className="w-4 h-4 text-red-600" />, step: '第三篇 · 预测' },
    { id: 'relevance_identity', label: '切身决策与行动', icon: <UserCheck className="w-4 h-4 text-emerald-600" />, step: '第四篇 · 行动' },
  ];

  const tabFeatureId: Record<CognitiveDetailTab, FeatureSummaryId> = {
    seven_elements: 'detail-seven',
    logic_tree: 'detail-logic',
    architecture_diagram: 'detail-logic',
    butterfly_effect: 'detail-logic',
    relevance_identity: 'detail-identity',
    forecast_arena: 'detail-forecast',
    deep_spectrum: 'detail-spectrum',
  };

  const handleAskProbe = async (q: string) => {
    if (!q.trim()) return;
    setProbeLoading(true);
    try {
      const res = await fetch('/api/ask-nuance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          articleContext: {
            title: article.title,
            oneSentenceVerdict: article.oneSentenceVerdict,
            sevenElements: article.sevenElements,
            logicTree: article.logicTree,
            spectrumLayers: article.spectrumLayers,
          },
        }),
      });
      const data = await res.json();
      setProbeAnswer(data.answer || '未能获取微观探针答复，请重试。');
      setProbeFallback(!!data.fallback);
    } catch (e) {
      console.error(e);
      setProbeFallback(false);
      setProbeAnswer('⚠ 未能获取答复：网络或服务异常（未生成内容），请稍后重试。');
    } finally {
      setProbeLoading(false);
    }
  };

  const handleCopyQuote = async () => {
    const snippet = (article.oneSentenceVerdict || article.summary || '').trim();
    if (!snippet) {
      setQuoteFeedback('暂无可分享金句（需正文摘要或一句话判读）');
      setCopiedQuote(false);
      setTimeout(() => setQuoteFeedback(null), 2800);
      return;
    }
    const textToCopy = `“${snippet}” —— 见微 Genway ·《${article.title}》`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('execCommand copy failed');
      }
      setCopiedQuote(true);
      setQuoteFeedback('已复制到剪贴板');
      setTimeout(() => {
        setCopiedQuote(false);
        setQuoteFeedback(null);
      }, 2500);
    } catch {
      setCopiedQuote(false);
      setQuoteFeedback('复制失败：浏览器未授权剪贴板，请手动选择正文金句');
      setTimeout(() => setQuoteFeedback(null), 3200);
    }
  };

  // 核验与质量摘要：用于详情页顶部的紧凑状态条。
  const qualityIssueCount =
    (enrichQuality?.missingGroups?.length ? 1 : 0) +
    (enrichQuality?.discardedQuotes ? 1 : 0) +
    (enrichQuality?.ungroundedEvidence ? 1 : 0) +
    (enrichQuality?.ungroundedNumbers?.length ? 1 : 0) +
    (enrichQuality?.ungroundedSentences?.length ? 1 : 0) +
    ((enrichQuality?.audit?.unsupportedClaims?.length || 0) > 0 ? 1 : 0) +
    ((enrichQuality?.audit?.contradictions?.length || 0) > 0 ? 1 : 0);
  const crossCheckLabel = crossCheck
    ? crossCheck.verdict === 'consistent'
      ? '核心结论一致'
      : crossCheck.verdict === 'partial'
        ? '部分不一致'
        : '与原文矛盾'
    : '';

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans ${readingDensity === 'compact' ? 'py-4' : 'py-8'}`}>
      {/* 顶部与滚动同步的高精度渐变色阅读进度条 (Top Synchronous Gradient Progress Bar) */}
      <div className="fixed top-0 left-0 right-0 h-1 sm:h-1.5 bg-stone-200/60 backdrop-blur-xs z-[70] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#E3120B] via-red-500 to-amber-500 shadow-[0_0_12px_rgba(227,18,11,0.8)] transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, readingProgress))}%` }}
          aria-hidden="true"
        />
      </div>

      {/* 悬浮长文掌控条 (Sticky Reading HUD - 滚动时展现阅读进度与基于字数的预计剩余时间) */}
      <div
        className={`fixed top-3.5 right-3 sm:right-6 z-[65] transition-all duration-300 pointer-events-auto ${
          readingProgress > 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-stone-900/95 text-stone-100 backdrop-blur-md border border-stone-800 rounded-full px-3.5 py-1.5 shadow-xl flex items-center space-x-2.5 text-xs font-mono">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E3120B] animate-pulse" />
            <span className="font-bold text-white font-serif">阅读进度</span>
            <span className="font-bold text-red-400">{Math.round(readingProgress)}%</span>
          </span>
          <span className="text-stone-600">|</span>
          <span className="flex items-center space-x-1 text-stone-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {readingProgress >= 96 ? '已读完' : `预计 ${articleStats.totalMinutes} 分钟 · 余 ${remainingMinutes} 分钟`}
            </span>
          </span>
          <span className="text-stone-600 hidden sm:inline">|</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-stone-400 hover:text-white transition-colors flex items-center space-x-0.5 cursor-pointer hidden sm:flex"
            title="返回文章顶部"
          >
            <span>顶部</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Main Article Reading & Deep Cognitive Content Area */}
        <div className="flex-1 min-w-0 space-y-8 max-w-5xl">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-4 flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-xs font-serif font-bold text-stone-700 hover:text-stone-950 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回全景情报列表</span>
              </button>

              {/* 基于字数的预计阅读时长预期徽章 */}
              <div 
                className="inline-flex items-center space-x-1.5 text-xs font-mono bg-stone-100/90 text-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs"
                title={`全文结构化内容与正文共计约 ${articleStats.totalChars.toLocaleString()} 字，按 380字/分钟 标准测算`}
              >
                <Clock className="w-3.5 h-3.5 text-[#E3120B]" />
                <span className="font-serif font-bold text-stone-900">预计阅读 {articleStats.totalMinutes} 分钟</span>
                <span className="text-stone-400 text-[11px] hidden sm:inline">(约 {articleStats.totalChars.toLocaleString()} 字)</span>
              </div>
            </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <button
            onClick={onToggleBookmark}
            className={`p-2 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-100'
            }`}
            title={isBookmarked ? '取消收藏' : '收藏本篇'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

          {/* 下载离线阅读按钮 (IndexedDB 持久化存储全文、AI 解读与七要素模型) */}
          <button
            onClick={handleToggleOffline}
            disabled={savingOffline}
            className={`px-3 py-2 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-2xs border cursor-pointer ${
              isOfflineSaved
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-200'
                : 'bg-white hover:bg-emerald-50/50 border-stone-300 hover:border-emerald-500 text-stone-800'
            }`}
            title={
              isOfflineSaved
                ? '已将全文内容、AI 解读及七要素模型保存至 IndexedDB（离线可用），点击可移出离线存储'
                : '下载当前文章全文正文、AI深度解读及七要素模型至本地 IndexedDB，离线环境下亦可完整查阅'
            }
          >
            {savingOffline ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : isOfflineSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{isOfflineSaved ? '已离线 (IndexedDB)' : '下载离线阅读'}</span>
          </button>

          {/* 沉淀到知识库按钮 */}
          {onDepositToKnowledge && (
            <button
              onClick={handleDeposit}
              className={`px-3 py-2 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-2xs border ${
                deposited
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-white hover:bg-amber-50 border-stone-300 hover:border-amber-400 text-stone-800'
              }`}
              title="将关键事实、推演因果链与决策启示一键沉淀到个人战略知识库"
            >
              <BookOpen className={`w-3.5 h-3.5 ${deposited ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>{deposited ? '已沉淀至知识库' : '沉淀到知识库'}</span>
            </button>
          )}

          {/* 浅层空态：不与唯一主 CTA「生成深度分析」抢注意力；深析完成（有 spectrumLayers）后再露出 */}
          {onOpenShareCard && !isShallow && (
            <button
              onClick={() => onOpenShareCard(article)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors shadow-2xs"
              title="生成社交裂变金句长图（带见微认证水印）"
            >
              <FileImage className="w-3.5 h-3.5 text-amber-700" />
              <span>生成洞察金句卡</span>
            </button>
          )}

          {/* 双文并排对比模式开关 */}
          <button
            onClick={() => setIsCompareMode((prev) => !prev)}
            className={`px-3 py-2 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-2xs border cursor-pointer ${
              isCompareMode
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs ring-2 ring-blue-200'
                : 'bg-white hover:bg-blue-50 border-stone-300 hover:border-[#0284C7] text-stone-800'
            }`}
            title="开启双文并排对比模式，剖析逻辑异同与视角偏差"
          >
            <Columns className={`w-3.5 h-3.5 ${isCompareMode ? 'text-white' : 'text-[#0284C7]'}`} />
            <span>{isCompareMode ? '退出对比' : '开启对比模式'}</span>
          </button>

          {/* 导出情报简报按钮 (PDF / Markdown / 长图) */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            title="导出包含前因后果、AI深度解读与时间轴演变的决策简报"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出情报简报</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyQuote()}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            title={quoteFeedback || '复制一句话判读到剪贴板'}
            aria-live="polite"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedQuote ? '已复制金句' : quoteFeedback && !copiedQuote ? quoteFeedback : '分享金句'}</span>
          </button>
        </div>
        {quoteFeedback && !copiedQuote && (
          <div className="mt-2 text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            {quoteFeedback}
          </div>
        )}
      </div>

      {/* 导出情报简报 Modal 对话框 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-[#E3120B] text-white">
                  <Download className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
                  导出结构化战略情报简报
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              将当前事件的<strong>前因溯源、核心事实突破、潜在未来触发点、因果逻辑树、多空分歧及角色行动建议</strong>一键整理为标准格式文档，方便您进行线下晨会决策与企业知识库归档。
            </p>

            {/* Export Options Grid */}
            <div className="space-y-3">
              {/* Option 1: Markdown */}
              <div
                onClick={() => {
                  downloadMarkdownBriefing(article);
                  setShowExportModal(false);
                }}
                className="p-4 border-2 border-stone-200 hover:border-stone-900 hover:bg-[#FAF8F5] rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start space-x-3">
                  <span className="p-2 rounded-lg bg-stone-100 text-stone-800 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    <FileImage className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="font-serif font-bold text-sm text-stone-950 flex items-center gap-1.5">
                      <span>导出 Markdown 简报 (.md)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                        结构化归档
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      原生支持导入 Notion、Obsidian、飞书文档、语雀等企业知识库
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>

              {/* Option 2: PDF / Print */}
              <div
                onClick={() => {
                  exportBriefingAsPdf(article);
                  setShowExportModal(false);
                }}
                className="p-4 border-2 border-stone-200 hover:border-[#E3120B] hover:bg-red-50/20 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start space-x-3">
                  <span className="p-2 rounded-lg bg-red-50 text-[#E3120B] group-hover:bg-[#E3120B] group-hover:text-white transition-colors">
                    <Printer className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="font-serif font-bold text-sm text-stone-950 flex items-center gap-1.5">
                      <span>导出 / 打印高保真 PDF 简报 (.pdf)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                        A4 高管排版
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      标准 A4 报纸版心，带见微认证水印，适合高管晨会汇报与线下传阅
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#E3120B] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>

              {/* Option 3: PNG Long Image */}
              <div
                onClick={() => {
                  downloadBriefingPng(article);
                  setShowExportModal(false);
                }}
                className="p-4 border-2 border-stone-200 hover:border-amber-600 hover:bg-amber-50/20 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start space-x-3">
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="font-serif font-bold text-sm text-stone-950 flex items-center gap-1.5">
                      <span>生成长图简报卡片 (PNG)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        移动端分享
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      即时渲染为高清图片，适合微信群、钉钉或社交媒体即时交流
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-serif font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 七要素简报卡 · 可下载（打印/另存 PDF） */}
      {showPrintCard && (
        <div className="space-y-3">
          <div
            id="briefing-sheet"
            className="bg-white border-4 border-stone-900 rounded-xl p-5 sm:p-8 font-serif shadow-2xl space-y-4"
          >
            {/* 头 */}
            <div className="brief-flex flex items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-6 h-6 rounded bg-[#E3120B] text-white text-xs font-black flex items-center justify-center shrink-0">微</span>
                <span className="text-base font-black tracking-tight text-stone-950">见微 Genway · 七要素简报卡</span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono text-stone-500">{formatArticlePublishedMeta(article)}</div>
                <div className="text-[10px] font-mono text-stone-400">{article.sourceName || ''}</div>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-stone-950 leading-tight">{article.title}</h2>

            {article.sevenElements?.aiVerdict && (
              <div className="bg-stone-950 text-stone-100 rounded-xl px-4 py-3 border border-stone-800 text-xs leading-relaxed">
                <b className="text-red-500">AI 解读：</b>{article.sevenElements.aiVerdict.verdictSummary}
                <span className="ml-2 font-mono text-[10px] text-stone-400">
                  模型自评 {article.sevenElements.aiVerdict.confidenceScore}/100（未校准） · 波动 {article.sevenElements.aiVerdict.volatility} · 行动 {article.sevenElements.aiVerdict.actionLevel}
                </span>
              </div>
            )}

            {article.sevenElements ? (
              <div className="bg-stone-50 border-l-4 border-stone-900 rounded-r-xl p-3.5">
                <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider mb-1">
                  事件模型 · 一页看懂（7W 整合）
                </div>
                <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
                  {composeModel(article.sevenElements)}
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 border-l-4 border-amber-500 rounded-r-xl p-3.5">
                <div className="text-[10px] font-serif font-bold text-amber-700 uppercase tracking-wider mb-1">
                  尚未深度解读
                </div>
                <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
                  {article.oneSentenceVerdict || article.summary}
                </p>
                <p className="text-[10px] text-stone-400 mt-1">深度解读不会自动开始。点击「生成深度分析」后才会调用模型，完成后这里显示七要素。</p>
              </div>
            )}

            {article.sevenElements && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 brief-grid">
                {SEVEN_W_ITEMS.map((w) => {
                  const v = (article.sevenElements as any)?.[w.key];
                  if (!v || !String(v).trim()) return null;
                  return (
                    <div key={w.key} className="flex items-start gap-2 text-xs font-sans bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                      <span className={`mt-1 w-2 h-2 rounded-full ${w.color} shrink-0`} />
                      <span>
                        <b className="text-stone-700">{w.label}：</b>
                        <span className="text-stone-800">{v}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2 leading-relaxed">
              口径：七要素为事实整理，AI 解读与模型自评分均为辅助推断（非事实裁决）；本卡为速读简化版，完整分析见站内详情。生成：见微 Genway · {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>

          {/* 操作条（打印/下载时不显示） */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={() => downloadBriefingPng(article)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-serif font-bold transition-colors"
            >
              <FileImage className="w-4 h-4" />
              下载 PNG 图片
            </button>
            <button
              onClick={handlePrintBriefing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-serif font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              下载 / 打印 PDF
            </button>
            <button
              onClick={() => setShowPrintCard(false)}
              className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-serif font-bold"
            >
              ✕ 收起卡片
            </button>
            <span className="text-[10px] text-stone-400 font-sans">
              PNG 为画布直绘的简化图卡；PDF 走打印（可选“另存为 PDF”）。
            </span>
          </div>

          {/* 打印样式：只输出简报卡本身 */}
          <style>{`
            @media print {
              body.printing #root * { display: none !important; }
              body.printing #briefing-sheet,
              body.printing #briefing-sheet * { display: block !important; }
              body.printing #briefing-sheet {
                position: absolute !important;
                top: 0; left: 0; width: 100%;
                box-shadow: none !important;
                border-width: 2px !important;
              }
              body.printing #briefing-sheet .brief-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
              body.printing #briefing-sheet .brief-flex { display: flex !important; align-items: center !important; justify-content: space-between !important; }
              #briefing-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}</style>
        </div>
      )}

{/* Article Header & Meta */}
      <div className="space-y-4">
        {/* Linked Topic Cluster Banner */}
        {relatedTopic && onNavigateTab && (
          <div 
            onClick={() => onNavigateTab('topics')}
            className="p-3 bg-stone-900 text-stone-200 hover:text-white rounded-xl flex items-center justify-between cursor-pointer transition-all border border-stone-800 group shadow-xs"
          >
            <div className="flex items-center space-x-2 text-xs">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-serif font-bold text-amber-400">所属长周期专题：</span>
              <span className="font-serif font-bold text-white group-hover:underline">
                【{relatedTopic.title}】
              </span>
            </div>
            <span className="text-[11px] font-serif font-bold text-amber-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>查看宏观演进时间轴</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 break-words">
          {(() => {
            const canonical = getArticleCanonicalCategory(article);
            const theme = CATEGORY_THEMES[canonical] || CATEGORY_THEMES['科技'];
            return (
              <span
                className={`font-serif font-bold px-2.5 py-0.5 rounded border ${theme.badgeCls}`}
                title={article.category && article.category !== canonical ? `原始标注：${article.category}` : theme.desc}
              >
                {canonical}
              </span>
            );
          })()}
          {article.isCustom && (
            <span
              className="font-mono text-[11px] px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900"
              title="由用户贴链接或贴正文投递，解读为模型推断"
            >
              用户投递 · 读懂新闻
            </span>
          )}
          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] px-2 py-0.5 rounded border border-stone-300 text-[#0284C7] hover:bg-blue-50 transition-colors"
              title="在新标签打开信源原文以复核"
            >
              阅读原文 ↗
            </a>
          )}
          <span className="text-stone-300">·</span>
          <span
            className="font-mono text-stone-700"
            title={article.publishedAt || article.sourceDate || article.date || ''}
          >
            {formatArticlePublishedMeta(article)}
          </span>
          <span className="text-stone-300">·</span>
          <EvidenceBadge article={article} corpus={contextArticles} />
          <MethodBadge methodId="model_interpretation" />
          <span className="text-stone-300">·</span>
          <span
            className="inline-flex items-center gap-1 font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200"
            title={`全文预估约 ${articleStats.totalChars.toLocaleString()} 字，按 380字/分钟 深度精读模型测算`}
          >
            <Clock className="w-3 h-3 text-stone-500" />
            <span>约 {articleStats.totalChars.toLocaleString()} 字 · 需 {articleStats.totalMinutes} 分钟</span>
          </span>
          {isOfflineSaved && (
            <>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                <span>已离线收录 (IndexedDB)</span>
              </span>
            </>
          )}
        </div>

        <h1 className="text-[26px] sm:text-4xl font-serif font-black text-stone-950 tracking-tight leading-tight break-words">
          {article.title}
        </h1>

        <p className="text-base sm:text-lg font-serif text-stone-700 leading-relaxed max-w-3xl break-words">
          <KeyTermHighlight
            text={article.subtitle}
            entities={(article.entityMentions || []).map((e) => e.name)}
            onOpenTermExplain={onOpenTermExplain}
          />
        </p>

        {/* 状态徽章行：来源 / 原文链接 / 解读深度 / 多源转载 / 证据条数，先给读者一个整体判断 */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 whitespace-nowrap">
            信源：{article.sourceName || '未知'}
          </span>
          <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
            article.sourceUrl
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            {article.sourceUrl ? '有原文链接' : '无原文链接'}
          </span>
          <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${
            isShallow
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-sky-50 text-sky-800 border-sky-300'
          }`}>
            {isShallow ? '浅层 · 未深度解读' : '已深度解读'}
          </span>
          {(article.sourceOccurrences?.length || 0) > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap">
              多源转载 ×{article.sourceOccurrences!.length}
            </span>
          )}
          {Array.isArray(article.evidenceChain) && article.evidenceChain.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 whitespace-nowrap">
              证据链 {article.evidenceChain.length} 条
            </span>
          )}
        </div>

        {/* High Contrast Verdict Box */}
        <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-5 sm:p-6 rounded-r-2xl shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
            <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" />
              <span>
                {verdictViewMode === 'tongsu'
                  ? '通俗大白话速读 (30秒懂)'
                  : String(article.oneSentenceVerdict || '').trim()
                    ? article.isExternal
                      ? 'AI 解读 · 一句话提炼 (So What)'
                      : '见微解读 · 一句话提炼 (So What)'
                    : '原文摘要 · 尚未生成 AI 解读'}
              </span>
            </div>

            {/* 视角切换器：专业提炼 vs 大白话通俗 */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-serif font-bold">
              <button
                type="button"
                onClick={() => setVerdictViewMode('pro')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  verdictViewMode === 'pro'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🧠 专业提炼
              </button>
              <button
                type="button"
                onClick={() => setVerdictViewMode('tongsu')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  verdictViewMode === 'tongsu'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-amber-900'
                }`}
              >
                <span>💡 大白话说人话</span>
              </button>
            </div>
          </div>

          {verdictViewMode === 'pro' ? (
            <div>
              <div className={`text-base sm:text-xl font-serif font-black text-stone-950 leading-snug break-words ${
                !summaryExpanded ? 'line-clamp-4' : ''
              }`}>
                “<KeyTermHighlight
                  text={article.oneSentenceVerdict || article.summary || ''}
                  entities={(article.entityMentions || []).map((e) => e.name)}
                  onOpenTermExplain={onOpenTermExplain}
                />”
              </div>

              {!article.oneSentenceVerdict && String(article.summary || '').length > 180 && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((value) => !value)}
                  className="mt-2 text-[11px] font-serif font-bold text-stone-600 hover:text-stone-950 underline underline-offset-2 animate-pulse"
                >
                  {summaryExpanded ? '收起摘要' : '展开全文摘要'}
                </button>
              )}
            </div>
          ) : (
            /* 通俗大白话模式内容 */
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
                  <div className="text-[11px] font-serif font-black text-amber-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>大白话说 (发生了什么)</span>
                  </div>
                  <p className="text-xs text-stone-800 leading-relaxed font-sans">
                    <KeyTermHighlight
                      text={
                        article.tongsuSummary?.simpleSay ||
                        article.oneSentenceVerdict ||
                        article.summary ||
                        '暂无大白话讲解。'
                      }
                      entities={(article.entityMentions || []).map((e) => e.name)}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
                  <div className="text-[11px] font-serif font-black text-amber-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>为什么发生 (根本动因)</span>
                  </div>
                  <p className="text-xs text-stone-800 leading-relaxed font-sans">
                    <KeyTermHighlight
                      text={
                        article.tongsuSummary?.whyExplanation ||
                        article.sevenElements?.why ||
                        article.coreLogic?.essence ||
                        '暂无解释。'
                      }
                      entities={(article.entityMentions || []).map((e) => e.name)}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
                  <div className="text-[11px] font-serif font-black text-amber-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>对我意味着什么 (切身影响)</span>
                  </div>
                  <p className="text-xs text-stone-800 leading-relaxed font-sans">
                    <KeyTermHighlight
                      text={
                        article.tongsuSummary?.whatItMeans ||
                        (Array.isArray(article.personaImpacts) && article.personaImpacts.length > 0
                          ? article.personaImpacts[0]?.coreImpact || article.personaImpacts[0]?.recommendedAction
                          : article.sevenElements?.soWhat) ||
                        '暂无说明。'
                      }
                      entities={(article.entityMentions || []).map((e) => e.name)}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Recharts Content Weights Heatmap */}
          <div className="mt-4 pt-3 border-t border-stone-200/60">
            <button
              type="button"
              onClick={() => setShowLogicHeatmap(!showLogicHeatmap)}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-red-500 ${showLogicHeatmap ? 'animate-spin' : ''}`} />
              <span>{showLogicHeatmap ? '隐藏核心论点权重热力图 ✕' : '📊 展开核心论点权重热力图 ↗'}</span>
            </button>

            {showLogicHeatmap && (
              <div className="mt-4 p-4 bg-white border border-stone-200 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-2 gap-1.5">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-serif font-black text-stone-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>新闻事实 & 论点逻辑权重热力分布 (Weight Map)</span>
                    </h4>
                    <EditorialNotice title={CURATED_LOGIC_WEIGHT_IDS.has(article.id) ? '编辑预设权重' : '无预设权重'}>
                      {CURATED_LOGIC_WEIGHT_IDS.has(article.id)
                        ? '这组权重只写给少数示范稿，不是对本文的语义模型。'
                        : '当前文章没有编辑预设权重，不绘制伪热力图。'}
                    </EditorialNotice>
                  </div>
                  {CURATED_LOGIC_WEIGHT_IDS.has(article.id) && (
                    <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded shrink-0 self-start sm:self-center">归一化总重: 100%</span>
                  )}
                </div>

                {CURATED_LOGIC_WEIGHT_IDS.has(article.id) ? (
                  <>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getArticleLogicWeights(article.id, article.title)}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#78716c" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        width={130}
                        tick={{ fill: '#1c1917', fontWeight: 600 }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(28, 25, 23, 0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-stone-900 border border-stone-800 text-stone-100 p-3 rounded-xl text-[11px] font-sans max-w-xs shadow-lg space-y-1">
                                <p className="font-serif font-black text-white">{data.name}</p>
                                <p className="text-red-400 font-mono font-bold">逻辑权重比：{data.weight}%</p>
                                <p className="text-stone-300 leading-relaxed">{data.verdict}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="weight" 
                        radius={[0, 8, 8, 0]} 
                        barSize={16}
                      >
                        {getArticleLogicWeights(article.id, article.title).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend & Insight Brief */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
                  {getArticleLogicWeights(article.id, article.title).map((entry, idx) => (
                    <div key={idx} className="p-2 bg-stone-50 rounded-lg space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-bold text-stone-900 font-serif truncate max-w-[120px]">{entry.name}</span>
                        <span className="text-[10px] font-mono text-stone-500 font-bold ml-auto">{entry.weight}%</span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-snug line-clamp-2">{entry.verdict}</p>
                    </div>
                  ))}
                </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* 核心研判区一键沉淀操作条 */}
          {onDepositToKnowledge && (
            <div className="mt-4 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs font-serif text-stone-600">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>沉淀当前深度解读、事实锚点与因果图谱至决策库</span>
              </div>
              <button
                type="button"
                onClick={handleDeposit}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer ${
                  deposited
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-900 hover:bg-[#E3120B] text-white'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${deposited ? 'opacity-100' : 'hidden'}`} />
                <span>{deposited ? '已存入个人战略知识库' : '沉淀到知识库'}</span>
              </button>
            </div>
          )}
        </div>


        {latestAiMeta && (
          <details className="text-[10px] text-stone-400">
            <summary className="cursor-pointer hover:text-stone-700">分析版本</summary>
            <p className="mt-1 font-mono">
              {latestAiMeta[1].method === 'legacy_unknown'
                ? '旧版 AI 字段 · 生成元数据缺失'
                : `${latestAiMeta[1].provider}/${latestAiMeta[1].model} · ${latestAiMeta[1].promptVersion} · ${
                    CERTIFICATION_STANDARDS[latestAiMeta[1].certificationStandard]?.label || '未认证'
                  }`}
            </p>
          </details>
        )}
      </div>

      {/* 统一分析框架总览：详情 enrich 与贴链 analyze 共用 */}
      <FrameworkOverviewCard article={article} />

      {/* ⚖️ 左右分栏双文并排对比模式 */}
      {isCompareMode && (
        <ArticleCompareView
          primaryArticle={article}
          contextArticles={contextArticles || []}
          onClose={() => setIsCompareMode(false)}
          onSelectPrimaryArticle={(newPrimary) => {
            if (onOpenArticle) onOpenArticle(newPrimary);
          }}
          onOpenTermExplain={onOpenTermExplain}
        />
      )}

      {/* AI 技能条：一句话解读 / 趋势预测 / 风险挑刺 / 大白话 / 脱水 / 关联背景 */}
      {/*（7W/趋势/风险入口已整合进首页卡片分析盒，见 StandardModeFeed/CardInsightBox）*/}

      {enrichPhase === 'done' && (
        <div
          id="enrich-success-banner"
          className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-serif font-bold text-stone-900">深度分析已完成</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {evidenceVerifyNote && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                    {evidenceVerifyNote}
                  </span>
                )}
                {crossCheck && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      crossCheck.verdict === 'consistent'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : crossCheck.verdict === 'partial'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    交叉复核（{crossCheck.provider}）：{crossCheckLabel}
                  </span>
                )}
                {qualityIssueCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    质量/自审提示 {qualityIssueCount} 项
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    已通过具体性与接地检查
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600">
                已解锁事实全貌、框架总览与深度篇章。
                {postEnrichQuotaNote ? ` ${postEnrichQuotaNote}。` : ''}
                {onDepositToKnowledge
                  ? deposited
                    ? ' 本篇已写入服务端知识库。'
                    : ' 可存入服务端知识库（登录后可跨设备检索）。'
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={landOnUnlockedModules}
                className="px-4 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-lg text-xs font-serif font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>查看已解锁模块</span>
              </button>
              {onDepositToKnowledge && (
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={deposited}
                  className={`px-4 py-2.5 rounded-lg text-xs font-serif font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    deposited
                      ? 'bg-emerald-600 text-white opacity-90'
                      : 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{deposited ? '已存入知识库' : '存入知识库'}</span>
                </button>
              )}
            </div>
          </div>

          <details className="rounded-lg border border-emerald-200 bg-white/70">
            <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-serif font-bold text-stone-700 hover:bg-emerald-50/60 rounded-lg">
              <span>查看核验与质量详情</span>
              <span className="text-[10px] font-mono text-stone-400">点击展开</span>
            </summary>
            <div className="px-3 pb-3 space-y-2">
              {enrichQuality && (() => {
                const notes: string[] = [];
                if (enrichQuality.missingGroups?.length) {
                  notes.push(`仍有 ${enrichQuality.missingGroups.length} 组要素未生成（${enrichQuality.missingGroups.join('、')}）`);
                }
                if (enrichQuality.discardedQuotes) {
                  notes.push(`移除 ${enrichQuality.discardedQuotes} 条未在原文找到的引句`);
                }
                if (enrichQuality.ungroundedEvidence) {
                  notes.push(`${enrichQuality.ungroundedEvidence} 条事实依据含原文未出现的数字，已标待核验`);
                }
                if (enrichQuality.ungroundedNumbers?.length) {
                  notes.push(`另有 ${enrichQuality.ungroundedNumbers.length} 个数字未在原文出现`);
                }
                const sentences = enrichQuality.ungroundedSentences || [];
                const auditClaims = enrichQuality.audit?.unsupportedClaims || [];
                const auditContradictions = enrichQuality.audit?.contradictions || [];
                if (notes.length === 0 && sentences.length === 0 && auditClaims.length === 0 && auditContradictions.length === 0) return null;
                return (
                  <div className="space-y-1">
                    {notes.length > 0 && (
                      <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        质量检查：{notes.join('；')}。
                      </p>
                    )}
                    {sentences.length > 0 && (
                      <ul className="text-[10px] text-amber-900 bg-amber-50/60 border border-amber-200 rounded-lg px-2.5 py-1.5 space-y-0.5 leading-relaxed">
                        <li className="font-bold">以下句子含原文未出现的数字，请回原文核对：</li>
                        {sentences.slice(0, 3).map((s, i) => (
                          <li key={i}>· {s.field}「{s.sentence}」（{s.numbers.join('、')}）</li>
                        ))}
                      </ul>
                    )}
                    {(auditClaims.length > 0 || auditContradictions.length > 0) && (
                      <ul className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 space-y-0.5 leading-relaxed">
                        <li className="font-bold">模型自审提示（请重点核对）：</li>
                        {auditClaims.slice(0, 3).map((claim, i) => (
                          <li key={`u${i}`}>· 无依据：{claim}</li>
                        ))}
                        {auditContradictions.slice(0, 2).map((item, i) => (
                          <li key={`c${i}`}>· 与原文矛盾：{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
              {crossCheck && (
                <div
                  className={`text-[10px] rounded-lg px-2.5 py-1.5 leading-relaxed border ${
                    crossCheck.verdict === 'consistent'
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : crossCheck.verdict === 'partial'
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-rose-800 bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="font-bold">
                    交叉复核（{crossCheck.provider} · {crossCheck.model}）：{crossCheckLabel}
                  </div>
                  {crossCheck.unsupportedClaims.slice(0, 3).map((claim, i) => (
                    <div key={`cu${i}`}>· 无依据：{claim}</div>
                  ))}
                  {crossCheck.issues.slice(0, 3).map((issue, i) => (
                    <div key={`ci${i}`}>· 问题：{issue}</div>
                  ))}
                </div>
              )}
              {!qualityIssueCount && !crossCheck && (
                <p className="text-[10px] text-stone-500">本次未发现需要额外提示的问题。</p>
              )}
            </div>
          </details>
        </div>
      )}

      {shouldShowShallowEnrichCta(isShallow, enrichPhase) && (
        <div
          ref={enrichCtaRef}
          id="enrich-cta-banner"
          className={`rounded-xl px-4 py-3 flex flex-col gap-2 border ${
            enrichPhase === 'loading'
              ? 'bg-amber-50 border-amber-300'
              : enrichPhase === 'error' || enrichPhase === 'unavailable'
                ? 'bg-red-50/70 border-red-200'
                : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-serif font-bold text-stone-900">深度分析</div>
              <p className="text-xs text-stone-600 mt-0.5">
                {deepNote}
              </p>
              {guestQuotaHint && enrichPhase !== 'loading' && (
                <p className="text-[11px] text-stone-500 mt-1 font-mono">{guestQuotaHint}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleGenerateDeepAnalysis()}
                disabled={enrichPhase === 'loading'}
                className="px-4 py-2.5 bg-[#E3120B] hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-serif font-bold inline-flex items-center gap-1.5"
              >
                {enrichPhase === 'loading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {enrichPhase === 'loading'
                  ? `生成中 ${enrichElapsed}s`
                  : enrichPhase === 'error' || enrichPhase === 'unavailable'
                    ? '重试深度分析'
                    : '生成深度分析'}
              </button>
              {enrichPhase === 'loading' && (
                <button
                  type="button"
                  onClick={handleCancelEnrich}
                  className="px-3 py-2.5 border border-red-300 bg-red-50 text-red-800 rounded-lg text-xs font-serif font-bold"
                >
                  取消
                </button>
              )}
            </div>
          </div>
          {enrichPhase === 'loading' && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                <span>{enrichProgressLabel(enrichElapsed)}</span>
                <span>
                  {enrichElapsed}s / 约 {ENRICH_ETA_SECONDS}s
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full bg-[#E3120B]/80 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${enrichProgressPercent(enrichElapsed)}%` }}
                />
              </div>
              {guestQuotaHint && (
                <p className="text-[11px] text-stone-500">生成成功后才会扣次 · {guestQuotaHint}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📰 深度报道事实正文 · 语义解析层 (Article Body & Semantic Parser Layer) */}
      <ArticleBodyParserSection
        article={article}
        onOpenTermExplain={onOpenTermExplain}
      />


      {/* 4-Stage Cognitive Path Navigation Tabs */}
      <div id="detail-tabs-container" className="sticky top-28 lg:top-16 z-30 bg-[#FAF8F5]/95 backdrop-blur-md pt-2 border-b-2 border-stone-900 scroll-mt-24">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">

          {tabsList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-serif font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-700 border border-stone-300 hover:border-stone-500 hover:bg-stone-100'
                }`}
              >
                <span className={`text-[10px] font-mono px-1 rounded ${
                  isActive ? 'bg-stone-800 text-red-400' : 'bg-stone-100 text-stone-500'
                }`}>
                  {tab.step}
                </span>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* 附录快捷入口：五层阅读光谱 */}
          <button
            key="deep_spectrum"
            type="button"
            onClick={() => setActiveTab('deep_spectrum')}
            className={`px-3 py-2 rounded-xl text-xs font-serif font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ml-auto cursor-pointer ${
              activeTab === 'deep_spectrum'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-300 hover:border-stone-500 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>五层阅读光谱</span>
          </button>
        </div>
      </div>

      <FeatureSummary featureId={tabFeatureId[activeTab]} compact />

      {/* Render Active Cognitive Tab Content */}
      {(activeTab === 'seven_elements' || activeTab === 'relevance_identity' || activeTab === 'deep_spectrum') && (
        <div className="mb-3 text-[10px] text-stone-400">
          <details>
            <summary className="cursor-pointer hover:text-stone-700">颜色标记说明</summary>
            <div className="mt-1">
              <KeyTermNote />
            </div>
          </details>
        </div>
      )}
      <div className={isShallow ? 'min-h-0' : 'min-h-[400px]'}>
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
            <p className="text-xs font-serif font-bold text-stone-500 animate-pulse">正在为您进行模块化懒加载与深度认知研判分析…</p>
          </div>
        }>
          {/* 第一篇：事实全貌与溯源（含事件演变脉络） */}
          {activeTab === 'seven_elements' && (
            <div className="space-y-6">
              <SevenElementsTab
                article={article}
                onRunSkill={onRunSkill}
                contextArticles={contextArticles}
                onOpenArticle={onOpenArticle}
                onOpenTermExplain={onOpenTermExplain}
                shallowMode={isShallow}
              />
              <details className="rounded-xl border border-stone-200 bg-white">
                <summary className="cursor-pointer list-none px-5 py-3 text-sm font-serif font-bold text-stone-800 hover:bg-stone-50 rounded-xl flex items-center justify-between gap-2">
                  <span>事件演变脉络（前因 → 当前 → 后续）</span>
                  <span className="text-[10px] font-mono text-stone-400">点击展开/收起</span>
                </summary>
                <div className="px-3 pb-4 sm:px-4">
                  <EventEvolutionTimeline article={article} />
                </div>
              </details>
            </div>
          )}


          {/* 第二篇：底层逻辑与因果推演（含可选架构全景视图） */}
          {(activeTab === 'logic_tree' || activeTab === 'architecture_diagram') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-xs font-serif font-bold text-stone-600">逻辑呈现模式：</span>
                <div className="inline-flex rounded-lg border border-stone-300 p-0.5 bg-stone-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('logic_tree')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      activeTab === 'logic_tree' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    因果树分析
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('architecture_diagram')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      activeTab === 'architecture_diagram' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    AI 架构全景图
                  </button>
                </div>
              </div>
              {activeTab === 'architecture_diagram' ? (
                <ArchitectureDiagramTab article={article} />
              ) : article.logicTree ? (
                <LogicTreeTab logicTree={article.logicTree} />
              ) : (
                <MissingDeep feature="底层逻辑与因果树" note={deepNote} collapsed={isShallow} />
              )}
            </div>
          )}

          {/* 🦋 蝴蝶效应：D3.js 连带认知关联网（含相关报道图） */}
          {activeTab === 'butterfly_effect' && (
            <div className="space-y-6">
              <ButterflyEffectGraph
                article={article}
                contextArticles={contextArticles}
                onOpenArticle={onOpenArticle}
                onOpenTermExplain={onOpenTermExplain}
                onNavigateTab={onNavigateTab}
                onSelectTab={(tab) => setActiveTab(tab)}
              />
              <RelatedNewsGraph
                article={article}
                contextArticles={contextArticles}
                onOpenArticle={onOpenArticle}
                onOpenTermExplain={onOpenTermExplain}
                shallowMode={isShallow}
                onRunSkill={onRunSkill ? (skill, art) => onRunSkill(skill, art) : undefined}
              />
            </div>
          )}

          {/* 第三篇：未来推推演与走势研判（宏观三阶涟漪 + 人机走势预测对赌） */}
          {activeTab === 'forecast_arena' && (
            <div className="space-y-8">
              {/* 上半部：AI 宏观三阶涟漪效应与产业链演变 */}
              {article.rippleEffect ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#0284C7] uppercase tracking-wider">
                      <Waves className="w-4 h-4" />
                      <span>宏观演变沙盘 · 1-3月 / 3-12月 / 1-3年 级联反应与失效条件</span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500">AI 客观推演基准</span>
                  </div>
                  <RippleEffectTab
                    rippleEffect={article.rippleEffect}
                    contextArticles={contextArticles}
                    onOpenArticle={onOpenArticle}
                    onOpenTermExplain={onOpenTermExplain}
                  />
                </div>
              ) : null}

              {/* 下半部：人机独立预测研判与对账擂台 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-red-700 uppercase tracking-wider">
                    <Crosshair className="w-4 h-4" />
                    <span>独立研判与人机对账 · 设定验证日期与客观标准，立项存证</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500">超级预测学 (Superforecasting)</span>
                </div>
                <ForecastArenaTab
                  article={article}
                  onSaveContract={onSaveContract}
                  onNavigateToMyFocus={() => onNavigateTab && onNavigateTab('my_focus')}
                  predictionContracts={predictionContracts}
                />
              </div>
            </div>
          )}

          {/* 第四篇：切身决策与行动指南 */}
          {activeTab === 'relevance_identity' && (
            <RelevanceIdentityTab
              article={article}
              personaImpacts={article.personaImpacts || []}
              activePersona={activePersona}
              onSelectPersona={onSelectPersona}
              onRunPersonaForecast={onRunPersonaForecast}
              onAppendActionMemo={onAppendActionMemo}
            />
          )}

          {/* 附录：五层通读全览 */}
          {activeTab === 'deep_spectrum' &&
            ((article.spectrumLayers && article.spectrumLayers.length > 0) ? (
              <DeepSpectrumTab article={article} initialRhythm={defaultRhythm} />
            ) : (
              <MissingDeep feature="五层光谱深度全览" note={deepNote} collapsed={isShallow} />
            ))}
        </React.Suspense>
      </div>


      {/* Continuous Cognitive Progression Guide — 浅层不宣称「已拆解完毕」 */}
      <div className="py-3.5 px-4 bg-white border-2 border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans shadow-xs">
        <div className="space-y-0.5">
          <div className="text-xs font-serif font-bold text-stone-900">
            {isShallow ? (
              <>
                {activeTab === 'seven_elements' &&
                  '本篇仍为浅层条目：事实框架待生成 ➔ 请先点击「生成深度分析」，再进入后续篇章'}
                {(activeTab === 'logic_tree' || activeTab === 'architecture_diagram') &&
                  '底层逻辑模块尚未生成 ➔ 完成深度分析后可查看因果树与架构全景'}
                {activeTab === 'butterfly_effect' &&
                  '蝴蝶效应关联网依赖深度字段 ➔ 请先生成深度分析'}
                {activeTab === 'forecast_arena' &&
                  '预测与推演模块尚未就绪 ➔ 请先生成深度分析'}
                {activeTab === 'relevance_identity' &&
                  '切身决策清单需深度研判支撑 ➔ 请先生成深度分析'}
                {activeTab === 'deep_spectrum' &&
                  '五层光谱尚未生成 ➔ 请先完成深度分析，或通过「阅读原文」复核信源'}
              </>
            ) : (
              <>
                {activeTab === 'seven_elements' &&
                  '第一篇 事实已结构化拆解完毕 ➔ 下一步：进入「第二篇 · 底层逻辑与因果」，剖析始发根因与变量关系'}
                {(activeTab === 'logic_tree' || activeTab === 'architecture_diagram') &&
                  '第二篇 因果链与博弈格局已摸清 ➔ 下一步：查阅「蝴蝶效应关联网」或「第三篇 · 未来推演与预测」'}
                {activeTab === 'butterfly_effect' &&
                  '蝴蝶效应关联网为您拆解了多阶连锁影响与连带认知网 ➔ 下一步：进入「第三篇 · 未来推演与预测」'}
                {activeTab === 'forecast_arena' &&
                  '第三篇 走势研判与预测对赌已确立 ➔ 下一步：进入「第四篇 · 切身决策与行动」，生成您的专属行动清单'}
                {activeTab === 'relevance_identity' &&
                  '第四篇 决策行动清单已生成 ➔ 您已完成全部核心认知阶段拆解，可沉淀至「我的关注」'}
                {activeTab === 'deep_spectrum' &&
                  '您正在查阅五层通读全览 ➔ 可随时切回核心逻辑拆解或前往「我的关注」'}
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            // 浅层：不推进空深 Tab，引导回到唯一主 CTA
            if (isShallow && enrichPhase !== 'done') {
              if (enrichPhase === 'loading') {
                enrichCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                enrichCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              return;
            }
            if (activeTab === 'seven_elements') setActiveTab('logic_tree');
            else if (activeTab === 'logic_tree' || activeTab === 'architecture_diagram') setActiveTab('butterfly_effect');
            else if (activeTab === 'butterfly_effect') setActiveTab('forecast_arena');
            else if (activeTab === 'forecast_arena') setActiveTab('relevance_identity');
            else if (activeTab === 'relevance_identity' && onNavigateTab) {
              onNavigateTab('my_focus');
            } else if (activeTab === 'deep_spectrum' && onNavigateTab) {
              onNavigateTab('my_focus');
            }
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          className="px-3.5 py-2 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>
            {isShallow && enrichPhase !== 'done'
              ? enrichPhase === 'loading'
                ? '深度分析生成中…'
                : '先生成深度分析 ➔'
              : (
                <>
                  {activeTab === 'seven_elements' && '进入第二篇：底层逻辑与因果 ➔'}
                  {(activeTab === 'logic_tree' || activeTab === 'architecture_diagram') && '进入蝴蝶效应认知关联网 ➔'}
                  {activeTab === 'butterfly_effect' && '进入第三篇：未来推演与预测 ➔'}
                  {activeTab === 'forecast_arena' && '进入第四篇：切身决策与行动 ➔'}
                  {activeTab === 'relevance_identity' && '完成认知拆解 · 沉淀至我的关注 ➔'}
                  {activeTab === 'deep_spectrum' && '前往决策与对账台账 ➔'}
                </>
              )}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>


      {/* Nuance In-depth Probe ("微观探针 / 针对本篇新闻向 AI 追问") */}
      <div className="bg-white border border-stone-300 rounded-xl overflow-hidden font-sans">
        <button
          type="button"
          onClick={() => setShowProbe((value) => !value)}
          aria-expanded={showProbe}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-stone-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-bold text-stone-800">
            <Bot className="w-4 h-4 text-[#E3120B]" />
            对本文继续追问
          </span>
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showProbe ? 'rotate-180' : ''}`} />
        </button>

        {showProbe && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-100 space-y-4">

        <p className="text-xs text-stone-600">
          输入问题，AI 将基于本文已有内容作答。
        </p>

        {/* Preset quick probe questions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            '文中提到的良品率公差对下游交付有何实质影响？',
            '为什么各方在财报附注中披露而非在正文宣讲？',
            '未来 3 个月可能出现反转的关键指标是什么？'
          ].map((pq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setProbeQuestion(pq);
                handleAskProbe(pq);
              }}
              disabled={probeLoading}
              className="text-xs px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-800 transition-colors"
            >
              ❓ {pq}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={probeQuestion}
            onChange={(e) => setProbeQuestion(e.target.value)}
            placeholder="输入您的追问..."
            className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:border-stone-900 font-sans"
          />
          <button
            onClick={() => handleAskProbe(probeQuestion)}
            disabled={probeLoading || !probeQuestion.trim()}
            className="px-5 py-2.5 bg-stone-900 hover:bg-[#E3120B] disabled:opacity-40 text-white text-xs font-serif font-bold rounded-xl transition-all flex items-center space-x-1.5 shrink-0"
          >
            {probeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>探针追问</span>
          </button>
        </div>

        {/* Probe Answer */}
        {probeAnswer && (
          <div className="bg-white p-4 rounded-xl border border-stone-300 text-sm font-serif text-stone-800 leading-relaxed space-y-2">
            <div className="text-xs font-bold text-stone-900 font-sans flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
              <span>探针解析：</span>
            </div>
            {probeFallback && (
              <p className="mb-1.5 text-[11px] font-bold text-amber-700">
                本次未生成在线内容
              </p>
            )}
            <p>{probeAnswer}</p>
          </div>
        )}
        </div>
        )}
      </div>
      </div>

      {/* SVG Linked Interactive Sidebar Evolution Timeline Navigation */}
      <SidebarEvolutionNav
        article={article}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
    </div>
  </div>
);
};

