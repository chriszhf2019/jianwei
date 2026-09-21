import React, { useEffect, useMemo, useState } from 'react';
import { UserPersona, UserPersonaId, RadarKeyword, NewsArticle, PredictionContract } from '../../types';
import { USER_PERSONAS } from '../../data/intelligenceData';
import { formatArticleTime } from '../../utils/articleTime';
import { keywordHits } from '../../utils/corpusMetrics';
import { PredictionCalibrationPanel } from './PredictionCalibrationPanel';
import { EvaluationLabPanel } from './EvaluationLabPanel';
import { predictionDueInfo } from '../../utils/predictionLedger';
import { FeatureSummary } from '../common/FeatureSummary';
import type { FeatureSummaryId } from '../../utils/featureSummaries';
import {
  Radio, 
  UserCheck, 
  Bookmark, 
  Tag, 
  Trash2, 
  Plus, 
  ArrowRight, 
  FileText,
  Crosshair,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Sparkles,
  Lock,
  LayoutDashboard,
  FlaskConical
} from 'lucide-react';

type FocusSection = 'overview' | 'contracts' | 'watchlist' | 'evaluation';

interface MyFocusViewProps {
  selectedPersona: UserPersona;
  onSelectPersona: (id: UserPersonaId) => void;
  radarKeywords: RadarKeyword[];
  articles: NewsArticle[];
  onRemoveRadar: (id: string) => void;
  onOpenAddRadar: () => void;
  followedTags: string[];
  onRemoveTag: (tag: string) => void;
  bookmarkedArticles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onRemoveBookmark: (articleId: string) => void;
  predictionContracts?: PredictionContract[];
  onResolveContract?: (
    contractId: string,
    actualOutcome: string,
    status: PredictionContract['status'],
    brierScore?: number,
    outcomeSourceUrl?: string,
    reviewer?: string
  ) => Promise<boolean>;
  onReviewContract?: (
    contractId: string,
    reviewer: string,
    decision: 'confirm' | 'dispute',
    notes?: string
  ) => Promise<boolean>;
  onRemoveContract?: (contractId: string) => Promise<boolean>;
  personalNotes: string;
  onPersonalNotesChange: (value: string) => void;
}

export const MyFocusView: React.FC<MyFocusViewProps> = ({
  selectedPersona,
  onSelectPersona,
  radarKeywords,
  articles,
  onRemoveRadar,
  onOpenAddRadar,
  followedTags,
  onRemoveTag,
  bookmarkedArticles,
  onSelectArticle,
  onRemoveBookmark,
  predictionContracts = [],
  onResolveContract,
  onReviewContract,
  onRemoveContract,
  personalNotes,
  onPersonalNotesChange,
}) => {
  const [section, setSection] = useState<FocusSection>('overview');

  // Verification resolving modal/drawer state
  const [resolvingContractId, setResolvingContractId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState<string>('');
  const [outcomeSourceUrl, setOutcomeSourceUrl] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewDraft, setReviewDraft] = useState<{ reviewer: string; notes: string }>({ reviewer: '', notes: '' });
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState(`ledger-${new Date().toISOString().slice(0, 10)}`);
  const [snapshots, setSnapshots] = useState<Array<{ version: string; contractCount: number; reviewCount: number; dataHash: string; createdAt: string }>>([]);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState('');
  const [resolutionError, setResolutionError] = useState<string>('');
  const [winnerStatus, setWinnerStatus] = useState<PredictionContract['status']>('verified_hit_user');

  const activeContractToResolve = predictionContracts.find(c => c.id === resolvingContractId);

  const sections: Array<{ id: FocusSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: '个人概览', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'contracts', label: '预测契约', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'watchlist', label: '关注与收藏', icon: <Radio className="w-4 h-4" /> },
    { id: 'evaluation', label: '评测中心', icon: <FlaskConical className="w-4 h-4" /> },
  ];
  const sectionFeatureId: Record<FocusSection, FeatureSummaryId> = {
    overview: 'focus-overview',
    contracts: 'focus-contracts',
    watchlist: 'focus-watchlist',
    evaluation: 'focus-evaluation',
  };

  const contractsWithDue = useMemo(() => {
    const dueRank = { overdue: 0, due_today: 1, due_soon: 2, upcoming: 3, invalid: 4, resolved: 5 } as const;
    return predictionContracts
      .map((contract) => {
        const due = predictionDueInfo(contract.targetVerificationDate, contract.status);
        return { ...contract, dueState: due.state, daysUntilDue: due.daysUntilDue, dueLabel: due.label };
      })
      .sort((a, b) => dueRank[a.dueState] - dueRank[b.dueState]);
  }, [predictionContracts]);
  const dueContractCount = contractsWithDue.filter((contract) =>
    ['overdue', 'due_today', 'due_soon'].includes(contract.dueState)
  ).length;

  const loadSnapshots = async () => {
    try {
      const response = await fetch('/api/predictions/snapshots');
      const data = await response.json();
      setSnapshots(Array.isArray(data?.snapshots) ? data.snapshots : []);
    } catch {
      setSnapshots([]);
    }
  };

  useEffect(() => {
    if (section === 'contracts') void loadSnapshots();
  }, [section]);

  const exportLedger = async () => {
    setArchiveBusy(true);
    setArchiveMessage('');
    try {
      const response = await fetch('/api/predictions/export');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'export_failed');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `jianwei-prediction-ledger-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setArchiveMessage(`已导出 ${data.summary?.contracts ?? 0} 条契约，哈希 ${String(data.dataHash || '').slice(0, 12)}…`);
    } catch {
      setArchiveMessage('导出失败，本次未生成文件。');
    } finally {
      setArchiveBusy(false);
    }
  };

  const freezeLedger = async () => {
    setArchiveBusy(true);
    setArchiveMessage('');
    try {
      const response = await fetch('/api/predictions/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: snapshotVersion.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'freeze_failed');
      setArchiveMessage(`快照 ${data.version} 已冻结，哈希 ${String(data.dataHash || '').slice(0, 12)}…`);
      await loadSnapshots();
    } catch (error: any) {
      setArchiveMessage(
        String(error?.message || error).includes('no_prediction_contracts')
          ? '当前没有可冻结的真实契约。'
          : '冻结失败，版本可能已存在。'
      );
    } finally {
      setArchiveBusy(false);
    }
  };

  const radarSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof keywordHits>>();
    for (const rk of radarKeywords) {
      map.set(rk.id, keywordHits(rk.keyword, articles));
    }
    return map;
  }, [radarKeywords, articles]);

  const handleConfirmResolve = async () => {
    if (!resolvingContractId || !onResolveContract) return;
    const evidence = outcomeText.trim();
    if (evidence.length < 20) {
      setResolutionError('请录入至少 20 个字的实际结果与核验依据。');
      return;
    }
    if (reviewerName.trim().length < 2) {
      setResolutionError('请填写至少 2 个字的独立结果录入人名称。');
      return;
    }
    const sourceUrl = outcomeSourceUrl.trim();
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol');
      } catch {
        setResolutionError('证据链接必须是有效的 HTTP 或 HTTPS 地址。');
        return;
      }
    }
    setResolutionError('');
    // 按实际判定结果计算 AI 侧布莱尔分数 Brier = (P − O)²（AI 命中的 outcome 记 1）
    const contract = predictionContracts.find((c) => c.id === resolvingContractId);
    const aiHit =
      winnerStatus === 'verified_hit_ai' || winnerStatus === 'verified_both_win' ? 1 : 0;
    const aiConf = contract?.aiPred.confidence ?? 50;
    const brier = Math.round((aiConf / 100 - aiHit) ** 2 * 100) / 100;
    const saved = await onResolveContract(
      resolvingContractId,
      evidence,
      winnerStatus,
      brier,
      sourceUrl || undefined,
      reviewerName.trim()
    );
    if (!saved) {
      setResolutionError('结果未能写入服务端存证池，本地记录未修改。');
      return;
    }
    setResolvingContractId(null);
    setOutcomeText('');
    setOutcomeSourceUrl('');
    setReviewerName('');
  };

  const handleReview = async (contractId: string, decision: 'confirm' | 'dispute') => {
    if (!onReviewContract || reviewDraft.reviewer.trim().length < 2) return;
    setReviewBusyId(contractId);
    setResolutionError('');
    const ok = await onReviewContract(
      contractId,
      reviewDraft.reviewer.trim(),
      decision,
      reviewDraft.notes.trim() || undefined
    );
    setReviewBusyId(null);
    if (!ok) {
      setResolutionError('复核记录未写入，可能该复核人已经提交过判断。');
      return;
    }
    setReviewDraft({ reviewer: '', notes: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Title */}
      <div className="border-b-2 border-stone-900 pb-4">
        <div className="flex items-center space-x-2 text-xs font-serif font-bold text-emerald-700 uppercase tracking-wider mb-1">
          <Radio className="w-4 h-4 text-emerald-600" />
          <span>个人定制认知工作台</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-950 tracking-tight">
          我的关注、前瞻契约与决策透镜
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
          根据您的决策角色定制情报过滤链，管理监控关键词、前瞻预测契约与私有备忘录。
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-200 pb-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-serif font-bold whitespace-nowrap transition-colors ${
              section === item.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <FeatureSummary featureId={sectionFeatureId[section]} compact />

      {section === 'overview' && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { id: 'contracts' as const, label: '到期待办', value: dueContractCount, icon: <Crosshair className="w-4 h-4" /> },
          { id: 'watchlist' as const, label: '监控词', value: radarKeywords.length, icon: <Radio className="w-4 h-4" /> },
          { id: 'watchlist' as const, label: '收藏', value: bookmarkedArticles.length, icon: <Bookmark className="w-4 h-4" /> },
          { id: 'evaluation' as const, label: '人工评测', value: '进入', icon: <FlaskConical className="w-4 h-4" /> },
        ].map((item, index) => (
          <button
            key={`${item.id}-${index}`}
            type="button"
            onClick={() => setSection(item.id)}
            className="p-3 bg-white border border-stone-300 rounded-lg text-left hover:border-stone-800 transition-colors"
          >
            <div className="flex items-center justify-between text-stone-500">
              {item.icon}
              <span className="text-lg font-mono font-black text-stone-900">{item.value}</span>
            </div>
            <div className="text-[11px] font-serif font-bold text-stone-600 mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      {/* 1. 认知身份透镜选择 (Persona Matrix) */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#E3120B]" />
            <div>
              <h3 className="text-base font-serif font-bold text-stone-950">
                主视角透镜（影响我）
              </h3>
              <p className="text-xs text-stone-500">
                切换后，全站新闻将优先高亮属于该身份的机会、威胁与行动清单
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            当前生效：{selectedPersona.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {USER_PERSONAS.map((p) => {
            const isSelected = selectedPersona.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPersona(p.id)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : 'bg-stone-50 text-stone-900 border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-serif font-bold">{p.name}</h4>
                  {isSelected && (
                    <span className="text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded">
                      已激活
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                  {p.tagline}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {section === 'contracts' && (
      <>
      {/* 2. 人机前瞻预测与验证契约池 (Forecast Contracts Arena) */}
      <div className="bg-stone-950 text-stone-100 border-2 border-stone-900 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Crosshair className="w-5 h-5 text-[#E3120B]" />
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                人机前瞻预测契约与验证档案 ({predictionContracts.length})
              </h3>
              <p className="text-xs text-stone-400">
                记录您与模型引擎的预测契约，在约定到期日进行事实回测与布莱尔评分；单次分数不能证明模型已校准
              </p>
            </div>
          </div>
          <div className="text-xs font-mono bg-stone-900 px-3 py-1.5 rounded-lg border border-stone-800 text-amber-400 shrink-0">
            {dueContractCount > 0 ? `${dueContractCount} 条待验证` : '暂无到期待办'}
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void exportLedger()}
              disabled={archiveBusy}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-white disabled:opacity-40 text-stone-900 text-[11px] font-serif font-bold"
            >
              导出 JSON
            </button>
            <input
              value={snapshotVersion}
              onChange={(event) => setSnapshotVersion(event.target.value)}
              placeholder="快照版本"
              className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-[11px] font-mono text-stone-100"
            />
            <button
              type="button"
              onClick={() => void freezeLedger()}
              disabled={archiveBusy || predictionContracts.length === 0}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 text-[11px] font-serif font-bold"
            >
              冻结快照
            </button>
          </div>
          {archiveMessage && <div className="text-[10px] text-stone-400">{archiveMessage}</div>}
          {snapshots.length > 0 && (
            <div className="space-y-1">
              {snapshots.slice(0, 4).map((snapshot) => (
                <div key={snapshot.version} className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-stone-400">
                  <span>{snapshot.version} · {snapshot.contractCount} 契约 · {snapshot.reviewCount} 复核</span>
                  <span>{snapshot.dataHash.slice(0, 12)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {dueContractCount > 0 && (
          <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
            有 {dueContractCount} 条预测已进入到期提醒范围。系统只标记待办，不会自动填写结果或改变契约状态。
          </div>
        )}

        <PredictionCalibrationPanel contracts={predictionContracts} />

        {predictionContracts.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs font-sans">
            您暂未签订任何预测契约。请在任意新闻详情页点击「人机预测擂台」提交并锁定您的前瞻判断。
          </div>
        ) : (
          <div className="space-y-4">
            {contractsWithDue.map((contract) => {
              const isResolved = contract.status !== 'pending';
              return (
                <div
                  key={contract.id}
                  className={`p-5 rounded-xl border-2 transition-all space-y-4 ${
                    isResolved
                      ? 'bg-stone-900/90 border-stone-800'
                      : 'bg-stone-900 border-stone-700 hover:border-stone-600'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-0.5 bg-red-600 text-white font-mono font-bold rounded text-[10px]">
                          {contract.articleCategory}
                        </span>
                        <span className="text-stone-400 font-mono text-[11px]">
                          立论于 {contract.createdAt}
                        </span>
                        {contract.dataCutoffAt && (
                          <>
                            <span className="text-stone-600">·</span>
                            <span className="text-stone-500 font-mono text-[11px]">
                              数据截止 {contract.dataCutoffAt.slice(0, 10)}
                            </span>
                          </>
                        )}
                        <span className="text-stone-600">·</span>
                        <span className="text-amber-400 font-mono text-[11px] font-bold flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>约定检验日：{contract.targetVerificationDate}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          contract.dueState === 'overdue'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : contract.dueState === 'due_today'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : contract.dueState === 'due_soon'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-stone-900 text-stone-400 border border-stone-700'
                        }`}>
                          {contract.dueLabel}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm sm:text-base text-white">
                        {contract.question}
                      </h4>
                      <p className="text-xs text-stone-400">
                        关联新闻：《{contract.articleTitle}》
                      </p>
                      <p className={`text-[10px] font-mono ${
                        contract.ledger === 'server' && contract.integrityValid
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}>
                        {contract.ledger === 'server' && contract.integrityValid
                          ? `服务端存证 ${contract.integrityHash?.slice(0, 12) || ''}`
                          : '未通过服务端完整性校验，不进入校准统计'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2 self-start sm:self-auto">
                      {!isResolved ? (
                        <button
                          onClick={() => {
                            setResolvingContractId(contract.id);
                            setOutcomeText('');
                            setOutcomeSourceUrl('');
                            setReviewerName('');
                            setResolutionError('');
                          }}
                          className="px-3.5 py-1.5 bg-[#E3120B] hover:bg-red-700 text-white rounded-lg text-xs font-serif font-bold transition-colors flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>提前录入实际结果验证</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-xs font-mono font-bold flex items-center space-x-1">
                          <Award className="w-3.5 h-3.5" />
                          <span>已完成事实回测</span>
                        </span>
                      )}

                      {onRemoveContract && !isResolved && (
                        <button
                          onClick={async () => {
                            const removed = await onRemoveContract(contract.id);
                            if (!removed) setResolutionError('已解决的契约不可删除；待处理契约也需先连接服务端。');
                          }}
                          className="p-1.5 text-stone-500 hover:text-red-400 transition-colors"
                          title="删除契约"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dual Grid: User Prediction vs AI Prediction */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-stone-950 rounded-lg border border-stone-800 space-y-1.5">
                      <div className="flex items-center justify-between text-stone-400 font-mono text-[10px]">
                        <span>您的独立研判 (User)</span>
                        <span className="text-[#E3120B] font-bold text-xs">
                          主观概率 {contract.userPred.confidence}%
                        </span>
                      </div>
                      <div className="font-serif font-bold text-white">
                        {contract.userPred.directionText}
                      </div>
                      <div className="text-stone-400 text-[11px] font-sans">
                        前提：{contract.userPred.premises.join('；') || '未填写'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-stone-950 rounded-lg border border-stone-800 space-y-1.5">
                      <div className="flex items-center justify-between text-stone-400 font-mono text-[10px]">
                        <span className="truncate max-w-[200px]">AI 对抗研判 ({contract.aiPred.modelName.split(' ')[0] || 'AI'})</span>
                        <span className="text-amber-400 font-bold text-xs">
                          模型估计 {contract.aiPred.confidence}%
                        </span>
                      </div>
                      <div className="font-serif font-bold text-amber-200">
                        {contract.aiPred.directionText}
                      </div>
                      <div className="text-stone-400 text-[11px] font-sans line-clamp-1">
                        {contract.aiPred.verdict}
                      </div>
                    </div>
                  </div>

                  {/* Resolved Result Box if Verified */}
                  {isResolved && (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-emerald-400 flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>回测裁决：{contract.actualOutcome}</span>
                        </span>
                        {contract.brierScore !== undefined && (
                          <span className="font-mono text-emerald-300 text-[11px]">
                            布莱尔分数 (Brier Score): {contract.brierScore} · 单次样本，不代表长期校准
                          </span>
                        )}
                      </div>
                      {contract.reflectionNotes && (
                        <p className="text-stone-300 font-sans">
                          {contract.reflectionNotes}
                        </p>
                      )}
                      {contract.outcomeEvidence && (
                        <p className="text-stone-300 font-sans">
                          证据：{contract.outcomeEvidence}
                        </p>
                      )}
                      {contract.outcomeSourceUrl && (
                        <a
                          href={contract.outcomeSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-[11px] text-sky-300 hover:text-sky-200 underline"
                        >
                          打开回测证据来源
                        </a>
                      )}
                      <div className="pt-2 border-t border-emerald-900 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-stone-400">
                            独立复核 {contract.reviewCount || 0} 人
                          </span>
                          <span className={`font-mono text-[10px] ${
                            contract.reviewStatus === 'confirmed'
                              ? 'text-emerald-300'
                              : contract.reviewStatus === 'disputed'
                                ? 'text-red-300'
                                : 'text-amber-300'
                          }`}>
                            {contract.reviewStatus === 'confirmed'
                              ? '双人确认'
                              : contract.reviewStatus === 'disputed'
                                ? '存在复核分歧'
                                : '待第二位复核'}
                          </span>
                        </div>
                        {Array.isArray(contract.outcomeReviews) && contract.outcomeReviews.map((review) => (
                          <div key={`${review.reviewer}-${review.createdAt}`} className="text-[10px] text-stone-400">
                            {review.reviewer} · {review.decision === 'confirm' ? '确认结果' : '提出分歧'}
                            {review.integrityValid ? '' : ' · 完整性异常'}
                            {review.notes ? ` · ${review.notes}` : ''}
                          </div>
                        ))}
                        {contract.reviewStatus !== 'confirmed' && onReviewContract && (
                          <div className="space-y-1.5">
                            <div className="flex flex-col sm:flex-row gap-1.5">
                              <input
                                value={reviewDraft.reviewer}
                                onChange={(e) => setReviewDraft((draft) => ({ ...draft, reviewer: e.target.value }))}
                                placeholder="第二位复核人"
                                className="flex-1 px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-[11px] text-stone-100"
                              />
                              <input
                                value={reviewDraft.notes}
                                onChange={(e) => setReviewDraft((draft) => ({ ...draft, notes: e.target.value }))}
                                placeholder="复核意见（可选）"
                                className="flex-1 px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-[11px] text-stone-100"
                              />
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={reviewBusyId === contract.id || reviewDraft.reviewer.trim().length < 2}
                                onClick={() => void handleReview(contract.id, 'confirm')}
                                className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-[10px] font-bold text-white"
                              >
                                确认结果
                              </button>
                              <button
                                type="button"
                                disabled={reviewBusyId === contract.id || reviewDraft.reviewer.trim().length < 2}
                                onClick={() => void handleReview(contract.id, 'dispute')}
                                className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 disabled:opacity-40 text-[10px] font-bold text-white"
                              >
                                提出分歧
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* Resolving Modal if triggered */}
      {resolvingContractId && activeContractToResolve && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-stone-900 text-stone-100 border-2 border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-serif font-bold text-white">
                  录入事实结果 · 人机裁决核验
                </h4>
              </div>
              <button
                onClick={() => setResolvingContractId(null)}
                className="text-stone-400 hover:text-white text-xs font-mono"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-stone-400 font-mono">命题：</span>
              <p className="text-stone-200 font-serif font-bold">{activeContractToResolve.question}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-serif font-bold text-stone-300">
                实际客观发生的结果与依据：
              </label>
              <textarea
                rows={3}
                value={outcomeText}
                onChange={(e) => setOutcomeText(e.target.value)}
                placeholder="请填写实际发生的结果、核验来源与关键数字；至少 20 个字。"
                className="w-full p-3 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-serif font-bold text-stone-300">
                证据链接（可选，仅在链接确实支撑判定时填写）：
              </label>
              <input
                type="url"
                value={outcomeSourceUrl}
                onChange={(e) => setOutcomeSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-serif font-bold text-stone-300">
                结果录入人（将作为第一位独立复核人）：
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="输入姓名或独立标识"
                className="w-full p-3 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {resolutionError && (
              <p className="text-[11px] text-red-300">{resolutionError}</p>
            )}

            <div className="space-y-2">
              <label className="text-xs font-serif font-bold text-stone-300">
                裁决判定结果：
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-serif">
                <button
                  type="button"
                  onClick={() => setWinnerStatus('verified_hit_user')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    winnerStatus === 'verified_hit_user'
                      ? 'bg-emerald-900/80 border-emerald-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold">用户预测胜出</div>
                  <div className="text-[10px] opacity-75">您的判断更贴合客观事实</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWinnerStatus('verified_hit_ai')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    winnerStatus === 'verified_hit_ai'
                      ? 'bg-amber-900/80 border-amber-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold">AI 预测胜出</div>
                  <div className="text-[10px] opacity-75">模型方向与可证伪依据更贴合结果</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWinnerStatus('verified_both_win')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    winnerStatus === 'verified_both_win'
                      ? 'bg-sky-900/80 border-sky-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold">双方均命中</div>
                  <div className="text-[10px] opacity-75">用户与 AI 方向一致且正确</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWinnerStatus('verified_both_miss')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    winnerStatus === 'verified_both_miss'
                      ? 'bg-rose-900/80 border-rose-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold">双方均未命中</div>
                  <div className="text-[10px] opacity-75">预期方向与事实相悖</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-800">
              <button
                onClick={() => setResolvingContractId(null)}
                className="px-4 py-2 text-stone-400 hover:text-white text-xs font-serif"
              >
                取消
              </button>
              <button
                onClick={handleConfirmResolve}
                disabled={outcomeText.trim().length < 20 || reviewerName.trim().length < 2}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-serif font-bold rounded-lg transition-colors"
              >
                保存回测裁决
              </button>
            </div>
          </div>
        </div>
      )}

      {section === 'evaluation' && <EvaluationLabPanel />}

      {section === 'watchlist' && (
      <>
      {/* 3. 关注雷达关键词库 (My Radar Management) */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-serif font-bold text-stone-950">
                监控雷达关键词 ({radarKeywords.length})
              </h3>
              <p className="text-xs text-stone-500">
                按当前语料实时匹配：命中数、今日/昨日与词典情绪均来自标题/摘要/标签，非静态数字
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAddRadar}
            className="px-3 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加关键词</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {radarKeywords.map((rk) => {
            const s = radarSummaries.get(rk.id);
            const total = s?.total ?? 0;
            const today = s?.recent24h ?? 0;
            const yesterday = s?.prev24h ?? 0;
            const moodDenom = (s?.positive24h ?? 0) + (s?.negative24h ?? 0);
            const mood = moodDenom === 0 ? null : Math.round(((s!.positive24h - s!.negative24h) / moodDenom) * 100);
            const moodText =
              mood === null
                ? '暂无情绪样本'
                : mood === 0
                  ? '情绪中性'
                  : mood > 0
                    ? `情绪偏正面 +${mood}`
                    : `情绪偏负面 ${mood}`;
            return (
              <div
                key={rk.id}
                className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className={`w-2 h-2 shrink-0 rounded-full ${
                        rk.level === 'red'
                          ? 'bg-red-500'
                          : rk.level === 'orange'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-serif font-bold text-sm text-stone-950 truncate">
                      {rk.keyword}
                    </span>
                    <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded shrink-0">
                      {total} 条命中
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveRadar(rk.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors shrink-0"
                    title="移除监控"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1.5 text-[11px] text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>今日 {today} 条</span>
                  <span>· 昨日 {yesterday} 条</span>
                  <span>· {moodText}</span>
                </div>
                <div
                  className="mt-1 text-[11px] text-stone-400 truncate"
                  title={s?.latestTitle || ''}
                >
                  {s?.latestTitle ? `最近命中：${s.latestTitle}` : '暂无实时命中'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 收藏的深度情报档案 (Bookmarked Articles) */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
          <Bookmark className="w-5 h-5 text-amber-500 fill-amber-400" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              收藏的情报档案 ({bookmarkedArticles.length})
            </h3>
            <p className="text-xs text-stone-500">
              您保存供中长期复盘与证据查验的深度拆解报告
            </p>
          </div>
        </div>

        {bookmarkedArticles.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs font-sans">
            您暂未收藏任何情报。在阅读首页或详情页时，点击书签图标即可归档。
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarkedArticles.map((art) => (
              <div
                key={art.id}
                className="p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-serif font-bold text-[#E3120B]">{art.category}</span>
                    <span className="text-stone-400 font-mono">{formatArticleTime(art)}</span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-stone-950">
                    {art.title}
                  </h4>
                  <p className="text-xs text-stone-600 line-clamp-1">
                    {art.oneSentenceVerdict || art.subtitle}
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => onRemoveBookmark(art.id)}
                    className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    title="移出收藏"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectArticle(art)}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1 transition-all"
                  >
                    <span>复盘查验</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {section === 'overview' && (
      <>
      {/* 5. 战略决策备忘录 (Private Intelligence Memo) */}
      <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
          <FileText className="w-5 h-5 text-stone-700" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              个人行动清单与战略备忘录 (Action Checklist)
            </h3>
            <p className="text-xs text-stone-500">
              记录基于今日情报做出的行动安排与跟踪事项
            </p>
          </div>
        </div>

        <textarea
          value={personalNotes}
          onChange={(e) => onPersonalNotesChange(e.target.value)}
          rows={4}
          className="w-full p-4 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-sans leading-relaxed focus:outline-hidden focus:border-stone-900"
          placeholder="输入您的待办、核验线索或决策笔记..."
        />
        <div className="text-[11px] text-stone-400 text-right">
          已自动保存在本机浏览器
        </div>
      </div>
      </>
      )}
    </div>
  );
};
