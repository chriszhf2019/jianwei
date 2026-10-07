import React, { useEffect, useState, useMemo, useRef } from 'react';
import { NewsArticle, CognitiveDetailTab, UserPersona, UserPersonaId, PrimaryNavTab, PredictionContract, KnowledgeItem, ReadingDensity, DefaultReadingRhythm } from '../../types';
import { TOPIC_CLUSTERS } from '../../data/intelligenceData';
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
import { formatArticleTime } from '../../utils/articleTime';
import { composeModel, SEVEN_W_ITEMS } from '../../utils/sevenElementsBrief';
import { downloadBriefingPng } from '../../utils/briefingImage';
import { downloadMarkdownBriefing, exportBriefingAsPdf } from '../../utils/briefingReportExport';
import { CERTIFICATION_STANDARDS } from '../../utils/methodRegistry';
import { classifyAiClientError } from '../../utils/aiClientErrors';
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
const MissingDeep: React.FC<{ feature: string; note?: string }> = ({ feature, note }) => (
  <div className="p-10 text-center bg-white border-2 border-dashed border-stone-300 rounded-2xl space-y-2">
    <p className="text-sm font-serif font-bold text-stone-700">本篇文章暂无「{feature}」深度认知数据</p>
    <p className="text-xs text-stone-500">
      {note ||
        '该条目来自外部信源浅层摄取；配置 GEMINI_API_KEY 后可通过 AI 懒加载补全（见 DATA_PIPELINE_DESIGN.md §4）。'}
    </p>
  </div>
);

// 将 /api/enrich 返回的深层字段合并进浅层文章（只取白名单字段）
type DeepMergeKeys =
  | 'sevenElements'
  | 'logicTree'
  | 'personaImpacts'
  | 'rippleEffect'
  | 'spectrumLayers'
  | 'evidenceChain'
  | 'industrySignals'
  | 'oneSentenceVerdict'
  | 'subtitle'
  | 'summary'
  | 'coreQuote'
  | 'quoteAuthor'
  | 'tongsuSummary'
  | 'dehydratedItems'
  | 'backstoryTimeline'
  | 'stakeholderImpact'
  | 'coreLogic'
  | 'bullBearDebate'
  | 'relatedNews'
  | 'personaForecasts'
  | 'aiFieldMeta';

function mergeDeep(article: NewsArticle, overrides: Record<string, unknown>): NewsArticle {
  const keys: DeepMergeKeys[] = [
    'sevenElements','logicTree','personaImpacts','rippleEffect','spectrumLayers',
    'evidenceChain','industrySignals','oneSentenceVerdict','subtitle','summary','coreQuote','quoteAuthor',
    'tongsuSummary','dehydratedItems','backstoryTimeline','stakeholderImpact','coreLogic','bullBearDebate','relatedNews','personaForecasts','aiFieldMeta',
  ];
  const next: NewsArticle = { ...article };
  for (const key of keys) {
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
  onDepositToKnowledge?: (item: KnowledgeItem) => void;
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
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProbe, setShowProbe] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [deposited, setDeposited] = useState(isDepositedInKnowledge);

  const handleDeposit = () => {
    if (!onDepositToKnowledge) return;
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

    onDepositToKnowledge(item);
    setDeposited(true);
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
  const [enrichPhase, setEnrichPhase] = useState<'idle' | 'loading' | 'done' | 'unavailable' | 'error'>('idle');
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichElapsed, setEnrichElapsed] = useState(0);
  const enrichAbortRef = useRef<AbortController | null>(null);

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

  const handleGenerateDeepAnalysis = async () => {
    if (!isShallow || enrichPhase === 'loading') return;
    enrichAbortRef.current?.abort();
    const controller = new AbortController();
    enrichAbortRef.current = controller;
    setEnrichPhase('loading');
    setEnrichError(null);
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
        onEnrichArticle(mergeDeep(article, json.overrides));
        setEnrichPhase('done');
      } else if (json?.reason === 'no_api_key') {
        setEnrichPhase('unavailable');
        setEnrichError(classifyAiClientError({ status: response.status, payload: json }));
      } else {
        setEnrichPhase('error');
        setEnrichError(classifyAiClientError({ status: response.status, payload: json }));
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setEnrichPhase('idle');
        setEnrichError('已取消深度分析请求。');
      } else {
        setEnrichPhase('error');
        setEnrichError(classifyAiClientError({ error: err }));
      }
    }
  };

  // 浅层占位提示文案随补全状态变化
  const deepNote =
    enrichPhase === 'loading'
      ? `正在请求深度分析… 已等待 ${enrichElapsed}s / 约 45s`
      : enrichPhase === 'unavailable'
        ? enrichError ||
          'AI 懒加载补全暂不可用：服务端未配置 Gemini 或 DeepSeek Key；配置后重新打开本页即可。'
        : enrichPhase === 'error'
          ? enrichError || '深度分析生成失败，请稍后重试。'
          : enrichError ||
            '深度分析尚未生成。只有点击“生成深度分析”后才会调用模型。';

  // Find related topic cluster if any
  const relatedTopic = TOPIC_CLUSTERS.find(t => 
    t.articleIds?.includes(article.id) || 
    t.tags.some(tag => article.tags?.includes(tag))
  );
  const latestAiMeta = Object.entries(article.aiFieldMeta || {})
    .sort((a, b) => String(b[1]?.generatedAt || '').localeCompare(String(a[1]?.generatedAt || '')))[0];

  // 详情认知路径（4大严谨逻辑篇章 + 1通读附录）：
  // 第一篇：事实全貌与溯源 ➔ 第二篇：底层逻辑与博弈 ➔ 第三篇：未来推演与预测 ➔ 第四篇：切身决策与行动
  const tabsList: Array<{ id: CognitiveDetailTab; label: string; icon: React.ReactNode; step: string }> = [
    { id: 'seven_elements', label: '事实全貌与溯源', icon: <Sparkles className="w-4 h-4 text-[#E3120B]" />, step: '第一篇 · 事实' },
    { id: 'logic_tree', label: '底层逻辑与博弈', icon: <GitFork className="w-4 h-4 text-purple-600" />, step: '第二篇 · 博弈' },
    { id: 'architecture_diagram', label: 'AI 架构全景图', icon: <Layers className="w-4 h-4 text-blue-600" />, step: '生成 · 架构' },
    { id: 'forecast_arena', label: '未来推演与预测', icon: <Crosshair className="w-4 h-4 text-red-600" />, step: '第三篇 · 推演' },
    { id: 'relevance_identity', label: '切身决策与行动', icon: <UserCheck className="w-4 h-4 text-emerald-600" />, step: '第四篇 · 决策' },
    { id: 'deep_spectrum', label: '五层通读全览', icon: <Layers className="w-4 h-4 text-amber-600" />, step: '附录 · 通读' },
  ];

  const tabFeatureId: Record<CognitiveDetailTab, FeatureSummaryId> = {
    seven_elements: 'detail-seven',
    logic_tree: 'detail-logic',
    architecture_diagram: 'detail-logic',
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

  const handleCopyQuote = () => {
    const textToCopy = `“${article.oneSentenceVerdict || article.summary}” —— 见微 Genway ·《${article.title}》`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

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

        <div className="flex items-center space-x-3">
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

          {onOpenShareCard && (

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
            onClick={handleCopyQuote}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedQuote ? '已复制金句' : '分享金句'}</span>
          </button>
        </div>
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
                <div className="text-xs font-mono text-stone-500">{formatArticleTime(article)}</div>
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
          <span className="font-serif font-bold text-[#E3120B] bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
            {article.category}
          </span>
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
            >
              阅读原文 ↗
            </a>
          )}
          {article.sourceUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('deep_spectrum')}
              className="font-mono text-[11px] px-2 py-0.5 rounded border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
              title="在通读附录中核验来源页面与引句"
            >
              去复核原文
            </button>
          )}
          <span className="text-stone-300">·</span>
          <span className="font-mono text-stone-700">{formatArticleTime(article)}</span>
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
                        '正在提炼生活化通俗比喻…'
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
                        '各方在产业周期与供需博弈下的自然选择。'
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
                        '影响下游应用成本与相关技能需求，建议保持关注。'
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

      {isShallow && enrichPhase !== 'done' && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-sm font-serif font-bold text-stone-900">深度分析</div>
            <p className="text-xs text-stone-500 mt-0.5">
              {deepNote}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleGenerateDeepAnalysis()}
              disabled={enrichPhase === 'loading'}
              className="px-4 py-2.5 bg-[#E3120B] hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-serif font-bold inline-flex items-center gap-1.5"
            >
              {enrichPhase === 'loading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {enrichPhase === 'loading' ? `生成中 ${enrichElapsed}s` : '生成深度分析'}
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
      )}

      {/* 📰 深度报道事实正文 · 语义解析层 (Article Body & Semantic Parser Layer) */}
      <ArticleBodyParserSection
        article={article}
        onOpenTermExplain={onOpenTermExplain}
      />

      {/* 事件全生命周期演变脉络 (垂直时序因果轴：前因 ➔ 当前 ➔ 未来) */}
      <EventEvolutionTimeline article={article} />

      {/* 🔗 基于 relatedNews 与上下文语料库的关系可视化 (D3 星轨图 & CSS Grid 矩阵) */}
      <RelatedNewsGraph
        article={article}
        contextArticles={contextArticles}
        onOpenArticle={onOpenArticle}
        onOpenTermExplain={onOpenTermExplain}
        onRunSkill={onRunSkill ? (skill, art) => onRunSkill(skill, art) : undefined}
      />


      {/* 4-Stage Cognitive Path Navigation Tabs */}
      <div id="detail-tabs-container" className="sticky top-28 lg:top-16 z-30 bg-[#FAF8F5]/95 backdrop-blur-md pt-2 border-b-2 border-stone-900 scroll-mt-24">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar pb-2">

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
      <div className="min-h-[400px]">
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
            <p className="text-xs font-serif font-bold text-stone-500 animate-pulse">正在为您进行模块化懒加载与深度认知研判分析…</p>
          </div>
        }>
          {/* 第一篇：事实全貌与溯源 */}
          {activeTab === 'seven_elements' && (
            <SevenElementsTab
              article={article}
              onRunSkill={onRunSkill}
              contextArticles={contextArticles}
              onOpenArticle={onOpenArticle}
              onOpenTermExplain={onOpenTermExplain}
            />
          )}


          {/* 第二篇：底层逻辑与多方博弈 */}
          {activeTab === 'logic_tree' && (
            <div className="space-y-6">
              {article.logicTree ? (
                <LogicTreeTab logicTree={article.logicTree} />
              ) : (
                <MissingDeep feature="底层逻辑与因果树" note={deepNote} />
              )}
            </div>
          )}

          {/* 🎨 架构全景与因果传导图 */}
          {activeTab === 'architecture_diagram' && (
            <div className="space-y-6">
              <ArchitectureDiagramTab article={article} />
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
              <MissingDeep feature="五层光谱深度全览" note={deepNote} />
            ))}
        </React.Suspense>
      </div>


      {/* Continuous Cognitive Progression Guide (Next-Step Journey Card) */}
      <div className="py-3.5 px-4 bg-white border-2 border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans shadow-xs">
        <div className="space-y-0.5">
          <div className="text-xs font-serif font-bold text-stone-900">
            {activeTab === 'seven_elements' && '第一篇 事实已结构化拆解完毕 ➔ 下一步：进入「第二篇 · 底层逻辑与博弈」，剖析始发根因与利益格局'}
            {activeTab === 'logic_tree' && '第二篇 因果链与博弈格局已摸清 ➔ 下一步：生成「AI 架构全景图」，研读技术传导路径、博弈变量与终局效应'}
            {activeTab === 'architecture_diagram' && '生成架构全景图并锁定临界变量 ➔ 下一步：进入「第三篇 · 未来推演与预测」，立项存证并进行对账擂台'}
            {activeTab === 'forecast_arena' && '第三篇 走势研判与预测对赌已确立 ➔ 下一步：进入「第四篇 · 切身决策与行动」，生成您的专属行动清单'}
            {activeTab === 'relevance_identity' && '第四篇 决策行动清单已生成 ➔ 下一步：查阅「附录 · 五层通读全览」或沉淀至个人备忘录'}
            {activeTab === 'deep_spectrum' && '您已完整掌握该事件的全部深度认知 ➔ 可前往「我的关注」查阅历史预测台账与备忘录'}
          </div>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'seven_elements') setActiveTab('logic_tree');
            else if (activeTab === 'logic_tree') setActiveTab('architecture_diagram');
            else if (activeTab === 'architecture_diagram') setActiveTab('forecast_arena');
            else if (activeTab === 'forecast_arena') setActiveTab('relevance_identity');
            else if (activeTab === 'relevance_identity') setActiveTab('deep_spectrum');
            else if (activeTab === 'deep_spectrum' && onNavigateTab) {
              onNavigateTab('my_focus');
            }
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          className="px-3.5 py-2 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>
            {activeTab === 'seven_elements' && '进入第二篇：底层逻辑与博弈 ➔'}
            {activeTab === 'logic_tree' && '生成 AI 架构全景图 ➔'}
            {activeTab === 'architecture_diagram' && '进入第三篇：未来推演与预测 ➔'}
            {activeTab === 'forecast_arena' && '进入第四篇：切身决策与行动 ➔'}
            {activeTab === 'relevance_identity' && '查阅附录：五层通读全览 ➔'}
            {activeTab === 'deep_spectrum' && '前往决策与对账台账 ➔'}
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

