import React, { useState, useMemo, useEffect } from 'react';
import { 
  NewsArticle, 
  PresetPredictionQuestion, 
  AIPredictionOutput, 
  UserPredictionInput, 
  PredictionContract 
} from '../../types';
import { 
  PRESET_ARTICLE_PREDICTIONS, 
  SUPERFORECASTING_LESSONS
} from '../../data/intelligenceData';
import { useLocalState } from '../../hooks/useLocalState';
import { useAIProvider } from '../../hooks/useAIProvider';
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Sliders, 
  Zap, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  FileCheck, 
  Lock, 
  Layers, 
  Cpu, 
  Scale,
  Crosshair,
  Award,
  Terminal,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Bot,
  Minus
} from 'lucide-react';
import { localTrendModel } from '../../utils/localTrendModel';
import { MethodBadge } from '../common/MethodBadge';

interface ForecastArenaTabProps {
  article: NewsArticle;
  onSaveContract?: (contract: PredictionContract) => Promise<boolean>;
  onNavigateToMyFocus?: () => void;
}


// —— 本地主线方向引擎（透明可复核；无 Key/离线/失败时的兜底口径）——
// 与「与我何干·双向预测」共用 utils/localTrendModel.ts：单一来源，保证两处口径一致。
// 不再使用已下线占位口径（信用星级/变化速度）；无逻辑树变量时诚实给中性、不装精确。
function computeLocalPrediction(
  article: NewsArticle,
  opts: { positive: string; negative: string }
): AIPredictionOutput {
  const trend = localTrendModel(article);
  const direction: 'positive' | 'negative' | 'neutral' =
    trend.kind === 'weights'
      ? trend.direction === 'mixed'
        ? trend.pPos >= trend.pNeg
          ? 'positive'
          : 'negative'
        : trend.direction
      : 'neutral';
  const directionText =
    direction === 'positive'
      ? opts.positive
      : direction === 'negative'
        ? opts.negative
        : '方向不明（暂不表态）';
  // 本地引擎输出的是方向强度指数，不是经历史样本校准的概率。
  const pBias = trend.kind === 'weights' ? Math.max(trend.pPos, trend.pNeg) : 0;
  const confidenceScore = trend.kind === 'weights' ? Math.round(Math.min(85, Math.max(25, pBias))) : 0;
  const topAssumptions = (article.logicTree?.variableWeights || []).slice(0, 3).map((w) => w.description).filter(Boolean);
  const aiVerdict =
    trend.kind === 'none'
      ? `本地引擎不估方向（本文无逻辑树驱动变量，避免伪精确）：请先生成相关要素，或切换在线引擎。`
      : `本地加权引擎判断：方向「${directionText}」，方向强度 ${confidenceScore}/100。该指数不是概率，也不能解释为事件发生几率；仅用于比较驱动变量结构的方向强弱。`;
  return {
    modelChoice: 'jianwei-local',
    modelName: '见微·本地主线加权引擎（透明可复核）',
    modelRationale:
      '不调用外部大模型：由「逻辑树驱动变量」利好/利空净动量换算方向强度（与『与我何干·双向预测』主线模型同源、单一实现）。它没有经过历史结果校准，因此不冒充概率。',
    direction,
    directionText,
    confidenceScore,
    probabilityKind: 'direction_strength',
    certificationStandard: 'heuristic',
    calibrationStatus: 'uncalibrated',
    causalLogicChain:
      trend.kind === 'weights'
        ? [
            {
              step: '1. 方向净动量测算',
              deduction: `逻辑树驱动变量上行权重合计 ${trend.upSum}、下行合计 ${trend.downSum}（总 ${trend.totalWeight}），净动量 ${trend.momentum >= 0 ? '+' : ''}${trend.momentum.toFixed(2)}，主线偏乐观 ~${trend.pPos}% / 偏悲观 ~${trend.pNeg}%。`,
            },
            {
              step: '2. 方向强度收敛',
              deduction: `按净动量得到方向强度 ${confidenceScore}/100（区间 25-85，避免把线性权重包装成极端结论）。这不是概率。`,
            },
            {
              step: '3. 收敛与证伪提示',
              deduction: `本地引擎无历史基准样本、未校准；若检验期内出现与方向相反的核心官方/供应链数据，该推演自动失效。`,
            },
          ]
        : [
            { step: '1. 数据可得性检查', deduction: '本文未提供逻辑树驱动变量，本地引擎不估计主线方向（避免伪精确）。' },
            { step: '2. 建议', deduction: '可先在详情「七要素事实」补齐底层逻辑/正反方博弈要素，或切换在线引擎做 AI 推演。' },
          ],
    keyAssumptions: topAssumptions.length > 0 ? topAssumptions : ['本文证据链与信源分级维持现状', '约定检验期内未发生突发政策或黑天鹅事件'],
    counterIntuitiveBlindspot: '本地引擎盲区提示：仅覆盖逻辑树内给出的驱动变量，未覆盖情绪面瞬间反转与突发政策冲击；请以自设可证伪指标持续跟踪。',
    falsifiableTriggers: [
      '检验期内出现与推演方向相反的官方/供应链硬数据时，该推演自动失效',
      '原文关键假设被证伪（如交付、良品率、利率口径变化）时，请立即下调方向权重',
    ],
    verdictSummary: aiVerdict,
  };
}
export const ForecastArenaTab: React.FC<ForecastArenaTabProps> = ({
  article,
  onSaveContract,
  onNavigateToMyFocus
}) => {
  // Preset questions for this article or fallback
  const presetQuestions = useMemo(() => {
    return PRESET_ARTICLE_PREDICTIONS[article.id] || [
      {
        id: `q-default-${article.id}`,
        question: `未来 90 天内，围绕《${article.title.slice(0, 18)}...》的核心预期是否会如期兑现或在财报/官方声明中得到确认？`,
        category: '行业基本面',
        horizonDays: 90,
        horizonLabel: '3 个月后验证',
        baseRateHistory: '本地引擎无历史基准样本（先验不偏不倚）；建议您先按自身经验给出一个基准概率，再与引擎对照。',
        defaultOptions: {
          positive: '如期兑现 / 突破落地',
          negative: '不及预期 / 延期调整',
          neutral: '平稳过渡 / 保持观望'
        }
      }
    ];
  }, [article]);

  // Selected question
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(presetQuestions[0].id);
  const [isCustomQuestion, setIsCustomQuestion] = useState<boolean>(false);
  const [customQuestionText, setCustomQuestionText] = useState<string>('');

  const currentQuestionObj = useMemo(() => {
    if (isCustomQuestion) {
      return {
        id: 'custom-q',
        question: customQuestionText || '自定义预测命题',
        category: '自定义命题',
        horizonDays: 90,
        horizonLabel: '3 个月后验证',
        baseRateHistory: '自定义事件请结合行业历史基准谨慎打分。',
        defaultOptions: {
          positive: '是（事件将发生/指标将达标）',
          negative: '否（事件未发生/推迟/落空）',
          neutral: '中性震荡 / 无明显变化'
        }
      };
    }
    return presetQuestions.find(q => q.id === selectedQuestionId) || presetQuestions[0];
  }, [isCustomQuestion, customQuestionText, selectedQuestionId, presetQuestions]);

  // User's Proposition Inputs
  const [userDirection, setUserDirection] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [userConfidence, setUserConfidence] = useState<number>(75);
  const [horizonDays, setHorizonDays] = useState<number>(90);
  const [userPremise1, setUserPremise1] = useState<string>(
    article.logicTree?.rootCause || '基于当前技术突破速度与大厂资本开支强度'
  );
  const [userPremise2, setUserPremise2] = useState<string>('下游行业需求旺盛且政策支持明确');
  const [userFalsifiable, setUserFalsifiable] = useState<string>(
    '若在约定时间内，官方供应链良品率数据低于预期或相关审批延期，则承认预测失效。'
  );

  // Target Verification Date
  const targetVerificationDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + horizonDays);
    return d.toISOString().split('T')[0];
  }, [horizonDays]);

  // —— 推演引擎（双轨）：本地启发式即时可算；按用户偏好调用在线模型 ——
  const [aiPrediction, setAiPrediction] = useState<AIPredictionOutput>(() =>
    computeLocalPrediction(article, currentQuestionObj.defaultOptions)
  );
  const [engineMode, setEngineMode] = useState<'local' | 'online' | 'checking'>('local');
  const [enginePreference, setEnginePreference] = useLocalState<'auto' | 'local' | 'online'>(
    'forecast-engine-preference',
    'auto',
    { version: 1 }
  );
  // 服务端 AI 通道感知：gemini | deepseek | none（供引擎标签与提示语展示）
  const { provider: aiProvider } = useAIProvider();

  useEffect(() => {
    if (enginePreference === 'local') {
      setEngineMode('local');
      return;
    }
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    setEngineMode((prev) => (prev === 'online' ? prev : 'checking'));
    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        question: currentQuestionObj.question,
        modelChoice: enginePreference === 'online' ? 'gemini-2.5-flash' : 'auto',
        userDirection,
        userConfidence,
        premises: [userPremise1, userPremise2].filter(Boolean),
        falsifiableIndicator: userFalsifiable,
        articleContext: {
          title: article.title,
          summary: article.summary,
          oneSentenceVerdict: article.oneSentenceVerdict,
          category: article.category,
          logicTree: article.logicTree
            ? { rootCause: article.logicTree.rootCause, variableWeights: article.logicTree.variableWeights }
            : null,
        },
        questionOptions: currentQuestionObj.defaultOptions,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`predict ${res.status}`))))
      .then((json) => {
        if (!alive) return;
        if (json && json.data) {
          setAiPrediction(json.data);
          setEngineMode(json.fallback ? 'local' : 'online');
        } else {
          setEngineMode('local');
        }
      })
      .catch(() => { if (alive) setEngineMode('local'); })
      .finally(() => clearTimeout(timer));
    return () => { alive = false; clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enginePreference,
    article.id,
    currentQuestionObj.question,
    currentQuestionObj.defaultOptions.positive,
    currentQuestionObj.defaultOptions.negative,
  ]);

  // Cognitive Gap Calculations
  const gapData = useMemo(() => {
    const localStrength = aiPrediction.probabilityKind === 'direction_strength';
    const delta = localStrength ? null : userConfidence - aiPrediction.confidenceScore;
    let sentiment: '过度乐观溢价' | '审慎保守折价' | '变量权重分歧' | '高度共识协同' = '过度乐观溢价';
    let diagnosis = '';

    if (localStrength && userDirection === aiPrediction.direction) {
      sentiment = '高度共识协同';
      diagnosis = `方向一致，但本地引擎输出的是“方向强度指数”而非概率，因此不能与您的主观概率直接相减。请把两者视为两种不同尺度的对照信号。`;
    } else if (localStrength) {
      sentiment = '变量权重分歧';
      diagnosis = `方向性分歧：您判断为【${userDirection === 'positive' ? '正面发生' : userDirection === 'negative' ? '负面落空' : '中性'}】，本地加权引擎更偏向【${aiPrediction.direction === 'positive' ? '正面' : aiPrediction.direction === 'negative' ? '负面' : '中性'}】。差异来自驱动变量权重，不代表哪一方已被事实验证。`;
    } else if (delta !== null && Math.abs(delta) <= 5 && userDirection === aiPrediction.direction) {
      sentiment = '高度共识协同';
      diagnosis = `您与模型估计方向一致，主观概率差异为 ${Math.abs(delta)} 个百分点。模型输出未经本地历史样本校准，不应当作正确答案。`;
    } else if (userDirection !== aiPrediction.direction) {
      sentiment = '变量权重分歧';
      diagnosis = `方向性分歧：您判断为【${userDirection === 'positive' ? '正面发生' : userDirection === 'negative' ? '负面落空' : '中性'}】，模型更偏向【${aiPrediction.direction === 'positive' ? '正面' : aiPrediction.direction === 'negative' ? '负面' : '中性'}】。请回到前提与证伪指标判断哪条证据链更硬。`;
    } else if (delta !== null && delta > 5) {
      sentiment = '过度乐观溢价';
      diagnosis = `同向但您的概率更高（+${delta} 个百分点）。模型概率未经本地结果校准，请把它当作一组对照假设，而不是客观基准。`;
    } else if (delta !== null) {
      sentiment = '审慎保守折价';
      diagnosis = `同向但您的概率更低（${delta} 个百分点）。请确认您是否掌握了模型上下文未覆盖的反向证据。`;
    }

    return {
      delta,
      comparable: !localStrength,
      sentiment,
      diagnosis
    };
  }, [userConfidence, userDirection, aiPrediction]);

  // Contract Saving state
  const [contractSaved, setContractSaved] = useState<boolean>(false);
  const [savedContractId, setSavedContractId] = useState<string>('');
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState('');

  const handleSignContract = async () => {
    const issuedAt = new Date().toISOString();
    const newContract: PredictionContract = {
      id: `contract-${article.id}-${Date.now()}`,
      articleId: article.id,
      articleTitle: article.title,
      articleCategory: article.category,
      question: currentQuestionObj.question,
      createdAt: issuedAt,
      dataCutoffAt: issuedAt,
      targetVerificationDate,
      userPred: {
        direction: userDirection,
        directionText: userDirection === 'positive' 
          ? currentQuestionObj.defaultOptions.positive 
          : currentQuestionObj.defaultOptions.negative,
        confidence: userConfidence,
        premises: [userPremise1, userPremise2].filter(Boolean),
        falsifiableIndicator: userFalsifiable
      },
      aiPred: {
        modelName: aiPrediction.modelName,
        direction: aiPrediction.direction,
        directionText: aiPrediction.directionText,
        confidence: aiPrediction.confidenceScore,
        verdict: aiPrediction.verdictSummary
      },
      gapSummary: `${gapData.sentiment}${
        gapData.comparable && gapData.delta !== null
          ? ` (主观概率差 ${gapData.delta > 0 ? '+' : ''}${gapData.delta} 个百分点)`
          : ' (方向强度与概率不直接相减)'
      }`,
      status: 'pending'
    };

    setContractSaving(true);
    setContractError('');
    try {
      const saved = onSaveContract ? await onSaveContract(newContract) : false;
      if (!saved) {
        setContractError('契约未能写入服务端存证池，本次不标记为已锁定。');
        return;
      }
      setContractSaved(true);
      setSavedContractId(newContract.id);
    } finally {
      setContractSaving(false);
    }
  };

  // Active Methodology Lesson Tab
  const [activeLessonId, setActiveLessonId] = useState<string>(SUPERFORECASTING_LESSONS[0].id);

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-stone-950 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#E3120B] text-xs font-serif font-bold uppercase tracking-wider">
              <Crosshair className="w-4 h-4" />
              <span>人机前瞻预测擂台 · 超级预测家训练场 (Forecasting Arena)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
              做出您的独立研判，与本地加权引擎对照校准
            </h3>
            <MethodBadge
              methodId={aiPrediction.probabilityKind === 'direction_strength' ? 'local_sensitivity' : 'model_forecast'}
            />
            <p className="text-xs text-stone-400 max-w-3xl">
              拒绝事后诸葛亮。在这里提出量化预测并锁定检验时间，见微本地加权引擎（透明公式，与『与我何干』主线模型同源）将输出可复核的对照研判，帮您识别过度自信并习得专业的预测方法论。
            </p>
            <p className="text-[10px] text-stone-500 leading-relaxed border-l-2 border-stone-700 pl-2">
              与其它预测入口的分工：⑦「正反方博弈」= 事件多空论据的<b>定性梳理</b>；「与我何干 · 双向预测」= 把主线翻译成<b>对你（身份）的两条路径</b>；首页卡片「趋势」= 一段式 AI 文本观点；<b>本页是唯一支持“立约 + 到期回测”的事件概率页</b>（本地/在线双引擎 + 契约档案）。
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-stone-900 px-3.5 py-2 rounded-xl border border-stone-800 shrink-0">
            <Calendar className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div className="text-[10px] text-stone-400 font-mono">约定检验基准日</div>
              <div className="text-xs font-serif font-bold text-amber-400 font-mono">
                {targetVerificationDate}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step Flow Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-serif">
          <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center space-x-2 text-stone-300">
            <span className="w-5 h-5 rounded-full bg-[#E3120B] text-white flex items-center justify-center font-mono font-bold text-[11px]">1</span>
            <span>用户独立立论</span>
          </div>
          <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center space-x-2 text-stone-300">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-mono font-bold text-[11px]">2</span>
            <span>本地基线推演</span>
          </div>
          <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center space-x-2 text-stone-300">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-[11px]">3</span>
            <span>人机认知比对</span>
          </div>
          <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center space-x-2 text-stone-300">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-[11px]">4</span>
            <span>契约留档与回测</span>
          </div>
        </div>
      </div>

      {/* 2. Step 1: User Forecaster Wizard (用户独立立论) */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-stone-900 text-white text-xs font-mono font-bold rounded">
              步骤 1 / 4
            </span>
            <h4 className="text-lg font-serif font-bold text-stone-950">
              设定预测命题与您的主观概率
            </h4>
          </div>
          <span className="text-xs text-stone-500 font-mono">立论阶段 · 严谨量化</span>
        </div>

        {/* Prediction Question Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-serif font-bold text-stone-800">
              选择或自定义前瞻预测命题：
            </label>
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setIsCustomQuestion(false)}
                className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                  !isCustomQuestion ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                推荐深度命题
              </button>
              <button
                type="button"
                onClick={() => setIsCustomQuestion(true)}
                className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                  isCustomQuestion ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                自拟命题
              </button>
            </div>
          </div>

          {!isCustomQuestion ? (
            <div className="space-y-2">
              {presetQuestions.map((q) => {
                const isSelected = q.id === selectedQuestionId;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#E3120B] bg-[#FAF8F5] shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {q.category}
                      </span>
                      <span className="font-mono text-stone-500 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{q.horizonLabel}</span>
                      </span>
                    </div>
                    <h5 className="font-serif font-bold text-sm text-stone-950 mt-1">
                      {q.question}
                    </h5>
                    <div className="mt-2 text-[11px] text-stone-500 font-sans">
                      <strong className="text-stone-700">先验说明：</strong>{q.baseRateHistory}
                      <span className="text-stone-400 block mt-0.5">模型口径，未接入本地历史样本库，不视为事实基准。</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              value={customQuestionText}
              onChange={(e) => setCustomQuestionText(e.target.value)}
              placeholder="例如：未来 60 天内，该公司是否会在公开场合宣布下调产品售价？"
              className="w-full p-3.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-sans focus:outline-hidden focus:border-stone-900"
            />
          )}
        </div>

        {/* Direction & Horizon Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Direction */}
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-800">
              您的明确判断方向：
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserDirection('positive')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  userDirection === 'positive'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>是 / 正面发生</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1 truncate">
                  {currentQuestionObj.defaultOptions.positive}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUserDirection('negative')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  userDirection === 'negative'
                    ? 'border-red-600 bg-red-50 text-red-950 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span>否 / 负面落空</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1 truncate">
                  {currentQuestionObj.defaultOptions.negative}
                </div>
              </button>
            </div>
          </div>

          {/* Verification Horizon */}
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-800">
              约定检验时间窗口 (Horizon)：
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 30, label: '30 天 (短期)' },
                { days: 90, label: '90 天 (季度)' },
                { days: 180, label: '180 天 (半年)' }
              ].map((h) => (
                <button
                  key={h.days}
                  type="button"
                  onClick={() => setHorizonDays(h.days)}
                  className={`p-2.5 rounded-xl border text-center font-serif text-xs font-bold transition-all ${
                    horizonDays === h.days
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div>{h.label}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              预计检验日期：<strong className="text-stone-900">{targetVerificationDate}</strong>
            </div>
          </div>
        </div>

        {/* User Confidence Slider */}
        <div className="bg-[#FAF8F5] p-5 rounded-xl border border-stone-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-[#E3120B]" />
                <span>主观概率（0-100%，不是“确定程度”口号）</span>
              </span>
              <span className="text-[11px] text-stone-500">
                超级预测法则：尽量避免 0% 或 100% 绝对论，根据确凿证据给出精细刻度
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-mono font-black text-[#E3120B]">
                {userConfidence}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="95"
            step="5"
            value={userConfidence}
            onChange={(e) => setUserConfidence(parseInt(e.target.value))}
            className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-[#E3120B]"
          />

          <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>低概率 (10%~30%)</span>
            <span>中立平衡 (50%)</span>
            <span>极高把握 (80%~95%)</span>
          </div>
        </div>

        {/* User Core Premises & Falsifiable Line */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-800">
              支撑您判断的核心前提 (Premises)：
            </label>
            <input
              type="text"
              value={userPremise1}
              onChange={(e) => setUserPremise1(e.target.value)}
              placeholder="前提 1：技术成熟度已跨越临界点..."
              className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-sans text-stone-900 focus:outline-hidden focus:border-stone-900"
            />
            <input
              type="text"
              value={userPremise2}
              onChange={(e) => setUserPremise2(e.target.value)}
              placeholder="前提 2：政策与大厂资本开支支持..."
              className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-sans text-stone-900 focus:outline-hidden focus:border-stone-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-800 flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5 text-red-600" />
              <span>自设可证伪关键触发线 (Falsifiable Line)：</span>
            </label>
            <textarea
              rows={3}
              value={userFalsifiable}
              onChange={(e) => setUserFalsifiable(e.target.value)}
              placeholder="若发生什么具体事件，您将承认自己的判断被事实推翻？"
              className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs font-sans text-stone-900 leading-relaxed focus:outline-hidden focus:border-stone-900"
            />
          </div>
        </div>
      </div>

      {/* 3. Step 2 & 3: 本地基线推演区 (Local Baseline) */}
      <div className="bg-stone-950 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-900 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-[#E3120B] text-white text-xs font-mono font-bold rounded">
                步骤 2 / 4
              </span>
              <h4 className="text-lg font-serif font-bold text-white">
                本地基线推演引擎 (Local Baseline)
              </h4>
            </div>
            <p className="text-xs text-stone-400">
              默认先由本地启发式即时出结果（透明可复核）；配置 API Key 后自动升级为在线真实模型推演。
            </p>
          </div>

        </div>

        {/* 推演引擎选择（双轨：自动在线优先 / 本地 / 强制在线） */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans">
          <span className="text-stone-400 font-mono mr-1">推演引擎：</span>
          {(
            [
              { id: 'auto', label: '自动（在线优先）' },
              {
                id: 'online',
                label:
                  aiProvider === 'deepseek'
                    ? '在线模型（DeepSeek）'
                    : aiProvider === 'gemini'
                      ? '在线模型（Gemini）'
                      : '在线模型（需 Key）',
              },
              { id: 'local', label: '本地加权引擎' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEnginePreference(opt.id)}
              disabled={engineMode === 'checking'}
              className={`px-2.5 py-1 rounded-lg border font-serif font-bold transition-all disabled:opacity-50 ${
                enginePreference === opt.id
                  ? 'bg-amber-400/20 border-amber-500 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-stone-500 font-mono hidden md:inline">
            {enginePreference === 'online'
              ? '强制在线：服务端无 Key/失败时将回落本地并提示'
              : enginePreference === 'local'
                ? '本地启发式：不发起网络请求'
                : '进入页签自动尝试在线，失败回落本地'}
          </span>
        </div>

        {enginePreference === 'online' && engineMode === 'local' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-950/50 border border-red-700/60 rounded-lg text-[11px] text-red-300 font-sans">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              在线模型暂不可用：服务端未配置 DeepSeek / Gemini API Key，已回落本地加权引擎（透明可复核，结果仅供对照参考）。
            </span>
          </div>
        )}

        {/* Model Rationale Explainer Banner */}
        <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400 font-serif font-bold">
              <Sparkles className="w-4 h-4" />
              <span>当前推演口径：{aiPrediction.modelName}</span>
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              {engineMode === 'online' ? '在线模型引擎 · 推演完成' : engineMode === 'checking' ? '正在请求在线引擎…' : '本地加权引擎 · 即时计算（无 Key/离线）'}
            </span>
          </div>
          <p className="text-stone-300 font-sans leading-relaxed">
            {aiPrediction.modelRationale}
          </p>
        </div>

        {/* AI Output Card */}
        <div className="bg-stone-900 p-6 rounded-xl border border-stone-800 space-y-6">
          {/* Top Score Comparison Dial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-stone-800 pb-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-stone-400">对照引擎结论与方向</span>
              <div className="text-base font-serif font-bold text-white flex items-center space-x-1.5">
                {aiPrediction.direction === 'positive' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : aiPrediction.direction === 'negative' ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <Minus className="w-4 h-4 text-stone-400" />
                )}
                <span>{aiPrediction.directionText}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-stone-400">
                {aiPrediction.probabilityKind === 'direction_strength' ? '方向强度指数（非概率）' : '模型估计概率（未校准）'}
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-mono font-black text-amber-400">
                  {aiPrediction.probabilityKind === 'direction_strength'
                    ? `${aiPrediction.confidenceScore}/100`
                    : `${aiPrediction.confidenceScore}%`}
                </span>
                {aiPrediction.probabilityKind !== 'direction_strength' && typeof aiPrediction.baseRatePercentage === 'number' && (
                  <span className="text-xs text-stone-400">
                    (模型先验 {aiPrediction.baseRatePercentage}%，未校准)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-stone-400">推演状态</span>
              <div className="text-xs font-serif font-bold text-emerald-400 flex items-center space-x-1 pt-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>本地引擎即时计算</span>
              </div>
            </div>
          </div>

          {/* AI 3-Step Deduction Chain */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-stone-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-stone-400" />
              <span>本地推演链条 (Deduction Chain)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiPrediction.causalLogicChain.map((chain, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1"
                >
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    {chain.step}
                  </span>
                  <p className="text-xs text-stone-300 font-sans leading-relaxed">
                    {chain.deduction}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* DeepSeek reasoner 思考链（可选展示） */}
          {aiPrediction.thinkingTrace && (
            <details className="bg-stone-950 border border-blue-900/50 rounded-xl p-3 text-xs font-mono text-blue-200/80">
              <summary className="cursor-pointer text-blue-300 font-bold">
                查看在线模型思考链（reasoning_content）
              </summary>
              <pre className="mt-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto text-[11px]">
                {aiPrediction.thinkingTrace}
              </pre>
            </details>
          )}

          {/* AI Counter-Intuitive Blindspot Alert */}
          <div className="p-4 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              <span>引擎盲区提示（启发式）</span>
            </div>
            <p className="text-xs text-amber-100/90 font-sans leading-relaxed">
              {aiPrediction.counterIntuitiveBlindspot}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Step 3: Side-by-Side Cognitive Gap Matrix (人机认知鸿沟比对) */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-stone-900 text-white text-xs font-mono font-bold rounded">
              步骤 3 / 4
            </span>
            <h4 className="text-lg font-serif font-bold text-stone-950">
              人机认知鸿沟比对与分歧诊断 (Cognitive Gap Matrix)
            </h4>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-900">
            {gapData.sentiment}
          </span>
        </div>

        {/* Visual Probability Comparison Bar */}
        <div className="bg-[#FAF8F5] p-5 rounded-xl border border-stone-300 space-y-4">
          <div className="text-xs font-serif font-bold text-stone-900">
            方向与主观概率对照（本地强度指数不与概率相减）：
          </div>

          <div className="space-y-3">
            {/* User Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E3120B]" />
                  <span>您的主观概率 (User)</span>
                </span>
                <span className="font-mono font-bold text-[#E3120B] text-sm">
                  {userConfidence}%
                </span>
              </div>
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${userConfidence}%` }}
                  className="bg-[#E3120B] h-full rounded-full transition-all"
                />
              </div>
            </div>

            {/* AI Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-stone-900 flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>{aiPrediction.probabilityKind === 'direction_strength' ? '本地方向强度（非概率）' : '模型估计概率（未校准）'}</span>
                </span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {aiPrediction.probabilityKind === 'direction_strength'
                    ? `${aiPrediction.confidenceScore}/100`
                    : `${aiPrediction.confidenceScore}%`}
                </span>
              </div>
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${aiPrediction.confidenceScore}%` }}
                  className="bg-amber-500 h-full rounded-full transition-all"
                />
              </div>
            </div>
          </div>

          {/* Diagnosis verdict */}
          <div className="p-3.5 bg-white rounded-lg border border-stone-200 text-xs text-stone-800 font-sans leading-relaxed">
            <strong className="text-stone-950 font-serif">差距诊断与认知启示：</strong>
            {gapData.diagnosis}
          </div>
        </div>

        {/* Side by Side Premise Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="text-xs font-serif font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center justify-between">
              <span>您的立论支柱 (User View)</span>
              <span className="text-[10px] font-mono text-stone-500">内部视角</span>
            </div>
            <ul className="text-xs text-stone-700 space-y-1.5 list-disc list-inside">
              <li>{userPremise1 || '主要看重技术突破速度'}</li>
              <li>{userPremise2 || '看重下游市场资本投入'}</li>
              <li className="text-stone-500">自设证伪线：{userFalsifiable.slice(0, 45)}...</li>
            </ul>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="text-xs font-serif font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center justify-between">
              <span>对照引擎的推算支柱（启发式）</span>
              <span className="text-[10px] font-mono text-stone-500">外部视角 + 本地基线</span>
            </div>
            <ul className="text-xs text-stone-700 space-y-1.5 list-disc list-inside">
              <li>
                {typeof aiPrediction.baseRatePercentage === 'number'
                  ? `模型先验估计 ${aiPrediction.baseRatePercentage}%（未接入本地历史样本校准）`
                  : '未提供可核验的历史基准率，本地引擎只输出方向强度'}
              </li>
              <li>{aiPrediction.counterIntuitiveBlindspot.slice(0, 40)}...</li>
              <li className="text-stone-500">证伪触发：{aiPrediction.falsifiableTriggers[0]?.slice(0, 40)}...</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. Superforecasting Methodology Academy (超级预测方法论研习课堂) */}
      <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-stone-300 pb-4">
          <BookOpen className="w-5 h-5 text-amber-700" />
          <div>
            <h4 className="text-lg font-serif font-bold text-stone-950">
              超级预测方法论研习课堂 (Superforecasting Methodology)
            </h4>
            <p className="text-xs text-stone-600">
              学习顶级预测大师（如菲利普·泰特洛克）如何通过概率思维克服认知偏差
            </p>
          </div>
        </div>

        {/* Lesson Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPERFORECASTING_LESSONS.map((lesson) => {
            const isActive = lesson.id === activeLessonId;
            return (
              <button
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                }`}
              >
                <div className="text-[10px] font-mono opacity-80 truncate">{lesson.authorOrOrigin}</div>
                <div className="text-xs font-serif font-bold mt-0.5">{lesson.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Lesson Content */}
        {(() => {
          const lesson = SUPERFORECASTING_LESSONS.find(l => l.id === activeLessonId) || SUPERFORECASTING_LESSONS[0];
          return (
            <div className="bg-white p-5 rounded-xl border border-stone-300 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-sm font-serif font-bold text-stone-950">
                  {lesson.title}
                </span>
                <span className="text-xs font-mono text-stone-500">
                  {lesson.authorOrOrigin}
                </span>
              </div>

              <div className="text-xs text-stone-700 space-y-2 font-sans leading-relaxed">
                <p>
                  <strong className="text-stone-900 font-serif">【核心原则】：</strong>
                  {lesson.principle}
                </p>
                <p>
                  <strong className="text-stone-900 font-serif">【认知逻辑】：</strong>
                  {lesson.explanation}
                </p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-950 space-y-1">
                <strong className="font-serif font-bold flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-red-600" />
                  <span>实战刻意练习指引：</span>
                </strong>
                <p className="font-sans leading-relaxed">
                  {lesson.actionablePractice}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. Step 4: Sign Contract & Verification Archiving (签订预测检验契约) */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-mono font-bold rounded">
                步骤 4 / 4
              </span>
              <h4 className="text-lg font-serif font-bold text-white">
                签订预测验证契约 (Seal Forecast Contract)
              </h4>
            </div>
            <p className="text-xs text-stone-400">
              锁定今日人机预测数据，系统将在约定到期日（{targetVerificationDate}）在「我的关注·决策工作台」触发回测裁决。
            </p>
          </div>

          <div className="shrink-0">
            {contractSaved ? (
              <div className="flex items-center space-x-2 text-xs font-serif font-bold text-emerald-400 bg-emerald-950/80 px-4 py-2.5 rounded-xl border border-emerald-700">
                <FileCheck className="w-4 h-4" />
                <span>契约已锁入存证池</span>
              </div>
            ) : (
              <button
                onClick={() => void handleSignContract()}
                disabled={contractSaving}
                className="px-5 py-2.5 bg-[#E3120B] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-serif font-bold rounded-xl flex items-center space-x-2 shadow-sm transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>{contractSaving ? '正在写入存证池…' : '确认并签订预测验证契约'}</span>
              </button>
            )}
          </div>
        </div>
        {contractError && (
          <div className="text-xs text-red-300 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
            {contractError}
          </div>
        )}

        {/* Contract Preview Card */}
        <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-500 font-mono">命题主体</span>
            <div className="font-serif font-bold text-stone-200 line-clamp-2">
              {currentQuestionObj.question}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-stone-500 font-mono">您的判断与主观概率</span>
            <div className="font-serif font-bold text-[#E3120B]">
              {userDirection === 'positive'
                ? '是/发生'
                : userDirection === 'negative'
                  ? '否/未发生'
                  : '中性/无明显变化'} ({userConfidence}% 主观概率)
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-stone-500 font-mono">对照引擎研判</span>
            <div className="font-serif font-bold text-amber-400">
              {aiPrediction.direction === 'positive' ? '是/发生' : aiPrediction.direction === 'negative' ? '否/落空' : '方向不明'} ({
                aiPrediction.probabilityKind === 'direction_strength'
                  ? `${aiPrediction.confidenceScore}/100 强度`
                  : `${aiPrediction.confidenceScore}% 模型估计`
              })
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-stone-500 font-mono">约定检验日</span>
            <div className="font-serif font-bold text-emerald-400 font-mono">
              {targetVerificationDate} (T+{horizonDays}天)
            </div>
          </div>
        </div>

        {contractSaved && onNavigateToMyFocus && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs text-stone-400">
            <span>契约编号：{savedContractId}</span>
            <button
              onClick={onNavigateToMyFocus}
              className="text-amber-400 hover:text-white font-serif font-bold flex items-center space-x-1 transition-colors"
            >
              <span>前往「我的关注」查看所有预测追踪与回测档案</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
