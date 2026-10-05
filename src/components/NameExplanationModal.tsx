import React, { useState } from 'react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Compass,
  BookOpen,
  Layers,
  Check,
  Copy,
  Video,
  FileText,
  Globe2,
  Target,
  Radio,
  TrendingUp,
  ShieldCheck,
  Workflow,
  Play
} from 'lucide-react';

interface NameExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NameExplanationModal: React.FC<NameExplanationModalProps> = ({ isOpen, onClose }) => {
  useEscapeClose(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<'philosophy' | 'deck' | 'video' | 'matrix'>('philosophy');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const summary = `【见微 Genway】于细微处，读懂新闻背后\n报刊为骨，数据为翼。融合五大阅读节奏光谱、四篇章逻辑证据树、全球地缘供应链阻尼拓扑与角色行动透镜的深度情报分析工作台。\n体验地址：${window.location.origin}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-4xl max-h-[92vh] bg-[#FAF8F5] text-stone-900 border-2 border-stone-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-[#E3120B] text-white flex items-center justify-center font-serif font-black text-lg shadow-sm">
                  微
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-serif font-bold tracking-tight">
                      见微 Genway · 产品说明与设计哲学
                    </h3>
                    <span className="text-[10px] bg-red-950 text-red-300 font-mono font-bold px-2 py-0.5 rounded-full border border-red-800">
                      Official Dossier
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-serif">
                    于细微处，读懂新闻背后 · 报刊为骨，数据为翼
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopySummary}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="复制官方介绍速览"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                  <span>{copied ? '已复制' : '复制速览'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center px-6 border-b border-stone-200 bg-stone-100/70 shrink-0 text-xs font-serif font-bold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('philosophy')}
                className={`px-4 py-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'philosophy'
                    ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#E3120B]" />
                <span>命名与设计哲学</span>
              </button>

              <button
                onClick={() => setActiveTab('deck')}
                className={`px-4 py-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'deck'
                    ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <FileText className="w-4 h-4 text-[#0D9488]" />
                <span>产品全景手册 (Deck)</span>
              </button>

              <button
                onClick={() => setActiveTab('video')}
                className={`px-4 py-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'video'
                    ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Video className="w-4 h-4 text-purple-600" />
                <span>90秒宣传视频分镜</span>
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'matrix'
                    ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-600" />
                <span>传统资讯 vs 见微差异</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* TAB 1: 命名与设计哲学 */}
              {activeTab === 'philosophy' && (
                <div className="space-y-6">
                  {/* 英文名调优 */}
                  <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider">
                        英文品牌读音与内涵阐释
                      </div>
                      <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        正式命名：Genway
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline space-x-3">
                        <span className="text-3xl font-serif font-black text-stone-950 tracking-tight">
                          Genway
                        </span>
                        <span className="text-sm font-mono text-stone-500">
                          [ˈdʒen-weɪ]
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
                        <strong>演化路径与调优理由：</strong>原名 <em>GeneWave</em> 尾音为双辅音且略显生物学术语偏向；调优为 <strong>Genway</strong>（双音节，发音利落朗朗上口，融合 <em>Gen（洞察/起源/新一代）</em> + <em>Way（路径/方法论/之道）</em>），寓意<strong>“于细微基因处，洞悉未来之途”</strong>。
                      </p>
                    </div>
                  </div>

                  {/* 中文核心纲领 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-serif font-bold text-stone-900 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#E3120B]" />
                      <span>产品设计纲领与核心主张</span>
                    </h4>

                    <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl space-y-3">
                      <div className="text-base sm:text-lg font-serif font-bold text-amber-300">
                        “报刊为骨，数据为翼，光谱拆解为记”
                      </div>
                      <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-sans">
                        见微拒绝算法茧房制造的喧嚣与同质快餐。我们从微观财报附注、政策标点微调、供应链公差细节中，为严肃决策者还原最真实的世界脉搏。在纷繁碎片中，找回因果逻辑的确定性。
                      </p>
                    </div>
                  </div>

                  {/* 四层认知路径 */}
                  <div className="space-y-3">
                    <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider">
                      四层逐级认知跃迁网络
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                      <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1">
                        <div className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                          <Compass className="w-3.5 h-3.5 text-stone-700" />
                          <span>1. 今日头版：节奏分层</span>
                        </div>
                        <p className="text-stone-500 text-[11px]">
                          五层节奏光谱（30秒快读至3分钟深度剖析），摆脱扁平同质化的单层信息流。
                        </p>
                      </div>

                      <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1">
                        <div className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-teal-700" />
                          <span>2. 深度剖析：逻辑证据树</span>
                        </div>
                        <p className="text-stone-500 text-[11px]">
                          提炼核心反常点，算法动态计算最敏感驱动变量与未来情景的可证伪红线。
                        </p>
                      </div>

                      <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1">
                        <div className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                          <Globe2 className="w-3.5 h-3.5 text-sky-700" />
                          <span>3. 地区情报：流动拓扑</span>
                        </div>
                        <p className="text-stone-500 text-[11px]">
                          战略产业跨境供应链阻尼、关税壁垒与通关周期量化，支持三级穿透下钻。
                        </p>
                      </div>

                      <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1">
                        <div className="font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                          <Radio className="w-3.5 h-3.5 text-emerald-700" />
                          <span>4. 我的关注：长效闭环</span>
                        </div>
                        <p className="text-stone-500 text-[11px]">
                          一键标记持续跟踪，绑定雷达关键词自动捕获增量，沉淀切身决策与研判备忘。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 图文全景白皮书 */}
              {activeTab === 'deck' && (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="p-6 bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl text-white space-y-2 shadow-sm">
                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-mono font-bold border border-red-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>见微 Genway · 产品全景架构</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight">
                      于细微处，读懂新闻背后 · 深度情报解读与切身决策引擎
                    </h2>
                    <p className="text-xs text-stone-300 font-sans leading-relaxed">
                      面向投资机构、企业核心决策者与前沿产业开拓者，将海量新闻升维为严谨的因果网络与行动指南。
                    </p>
                  </div>

                  {/* 核心功能模块 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">今日头版 · 五层光谱</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        微观信号 → 宏观背景 → 利益博弈 → 关键转折 → 预测推演，按需升维降维。
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">四篇章深度认知树</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        事实反常点核验、敏感度驱动逻辑树、推演竞技场可证伪线与博弈利益矩阵。
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                        <Globe2 className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">跨区流动与阻尼网络</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        涉事地矩阵扫描，半导体与新能源跨境供应链拓扑，量化贸易壁垒与通关天数。
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">三级下钻与组合聚合</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        地区 × 主体 × 赛道毫秒级级联收敛，内置 4 大核心产业场景胶囊一键穿透。
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">长效跟踪与雷达闭环</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        一键持续跟踪沉淀至专属工作台；配合雷达关键词库与行动待办盯防拐点。
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="font-serif font-bold text-xs text-stone-900">双通道 AI 与证据可复核</div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        核心推演与原文高亮溯源，支持 Gemini 与 DeepSeek 双通道自由切换。
                      </p>
                    </div>
                  </div>

                  {/* 适用角色 */}
                  <div className="p-4 bg-stone-100/70 border border-stone-300 rounded-xl space-y-2">
                    <div className="text-xs font-serif font-bold text-stone-900">四大专业角色定制透镜</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-emerald-700">科技投资人</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">敏感驱动变量与估值拐点</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-amber-700">企业决策者</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">供应链地缘阻尼与避险</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-blue-700">宏观分析师</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">客观反常点与多方博弈</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                        <div className="font-bold text-purple-700">技术专家</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">技术瓶颈与专利商业化边界</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 90秒视频分镜 */}
              {activeTab === 'video' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 font-serif font-bold">
                      <Play className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                      <span>90秒官方宣传短片分镜头脚本</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-800">4K 60FPS / 极简科技光影 / 理性力量感</span>
                  </div>

                  <div className="space-y-3">
                    {/* Scene 1 */}
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between font-mono text-[11px] text-red-600 font-bold border-b pb-1">
                        <span>01 · 00:00-00:15 【痛点引入：信息洪流与认知饥渴】</span>
                        <span className="text-stone-400">15s</span>
                      </div>
                      <p className="text-stone-700"><b>画面：</b>手机屏幕快滑、新闻通知弹窗红点闪烁、行情红绿跳动。人物神情疲惫揉眉心。</p>
                      <p className="text-stone-900 font-serif"><b>旁白：</b>“每天超过十万条快讯涌入屏幕。喧嚣、重复、煽情……但我们真正‘知道’了什么？海量信息，却带来了更深的认知贫乏。”</p>
                    </div>

                    {/* Scene 2 */}
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between font-mono text-[11px] text-teal-700 font-bold border-b pb-1">
                        <span>02 · 00:15-00:32 【破局登场：报刊为骨，数据为翼】</span>
                        <span className="text-stone-400">17s</span>
                      </div>
                      <p className="text-stone-700"><b>画面：</b>经典纸质报刊铅字排版三维展开，数字化粒子流光穿梭其间。「微」字红色印章铿锵落下。</p>
                      <p className="text-stone-900 font-serif"><b>旁白：</b>“是时候告别被动投喂了。欢迎来到「见微 Genway」。我们以百年严肃报刊的严谨为骨，以多智能体数据模型为翼——在纷繁碎片中，找回因果逻辑的确定性。”</p>
                    </div>

                    {/* Scene 3 */}
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between font-mono text-[11px] text-blue-700 font-bold border-b pb-1">
                        <span>03 · 00:32-00:52 【核心体验：五层光谱 × 四篇章逻辑树】</span>
                        <span className="text-stone-400">20s</span>
                      </div>
                      <p className="text-stone-700"><b>画面：</b>UI 流畅切换：五层光谱从 30 秒快览展开至四篇章，逻辑树敏感度分支生长，推演竞技场雷达转动。</p>
                      <p className="text-stone-900 font-serif"><b>旁白：</b>“首创五层阅读节奏光谱，想快读还是想深究，由你决定。进入深度认知树——每一句推演都有原文证据支撑，每一个情景都附带清晰的可证伪底线。”</p>
                    </div>

                    {/* Scene 4 */}
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between font-mono text-[11px] text-amber-700 font-bold border-b pb-1">
                        <span>04 · 00:52-01:12 【宏观闭环：流动阻尼 × 持续跟踪】</span>
                        <span className="text-stone-400">20s</span>
                      </div>
                      <p className="text-stone-700"><b>画面：</b>三维地球跨区流动阻尼网络，关税摩擦闪烁；一键点击“持续跟踪”亮起金色书签沉淀至看板。</p>
                      <p className="text-stone-900 font-serif"><b>旁白：</b>“更放眼全球地缘供应链流动——从半导体关税阻尼，到新能源出海建厂。一键加入持续跟踪档案，绑定雷达关键词，让所有重大事件演进尽在掌控之中。”</p>
                    </div>

                    {/* Scene 5 */}
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between font-mono text-[11px] text-stone-950 font-bold border-b pb-1">
                        <span>05 · 01:12-01:30 【尾声升华：决策罗盘与行动召唤】</span>
                        <span className="text-stone-400">18s</span>
                      </div>
                      <p className="text-stone-700"><b>画面：</b>决策者神情自信，全景界面优雅定格在见微 Genway 官方主页与体验入口。</p>
                      <p className="text-stone-900 font-serif"><b>旁白：</b>“新闻是历史的初稿，而见微是你的决策罗盘。于细微处，读懂新闻背后。见微 Genway，即刻开启您的深度认知之旅。”</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: 差异矩阵 */}
              {activeTab === 'matrix' && (
                <div className="space-y-4">
                  <div className="text-xs font-serif font-bold text-stone-900 pb-1 border-b border-stone-200">
                    见微 Genway 与传统资讯平台的差异矩阵
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-300 text-stone-700 font-serif">
                          <th className="p-3">对比维度</th>
                          <th className="p-3 text-stone-500">传统资讯聚合</th>
                          <th className="p-3 text-stone-500">通用大模型问答</th>
                          <th className="p-3 bg-red-50 text-red-950 font-bold border-l border-r border-red-200">见微 Genway 工作台</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-sans">
                        <tr>
                          <td className="p-3 font-serif font-bold text-stone-800">驱动逻辑</td>
                          <td className="p-3 text-stone-600">点击率/算法喂养 (茧房)</td>
                          <td className="p-3 text-stone-600">单次文本生成 (幻觉)</td>
                          <td className="p-3 bg-red-50/40 text-stone-900 font-medium border-l border-r border-red-200">
                            多智能体因果证据链与反常点核验
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-serif font-bold text-stone-800">阅读节奏</td>
                          <td className="p-3 text-stone-600">单层扁平，无法展开</td>
                          <td className="p-3 text-stone-600">依赖用户反复追问</td>
                          <td className="p-3 bg-red-50/40 text-stone-900 font-medium border-l border-r border-red-200">
                            五层节奏光谱自由升维降维 (30s~3m)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-serif font-bold text-stone-800">推演透明度</td>
                          <td className="p-3 text-stone-600">无推演机制</td>
                          <td className="p-3 text-stone-600">黑盒输出，无证伪线</td>
                          <td className="p-3 bg-red-50/40 text-stone-900 font-medium border-l border-r border-red-200">
                            逻辑证据树透明展示敏感度与可证伪线
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-serif font-bold text-stone-800">地缘与产业</td>
                          <td className="p-3 text-stone-600">仅简单标签分类</td>
                          <td className="p-3 text-stone-600">泛泛概念，缺乏阻尼</td>
                          <td className="p-3 bg-red-50/40 text-stone-900 font-medium border-l border-r border-red-200">
                            全球跨境流动拓扑、关税与备货天数量化
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-serif font-bold text-stone-800">跟踪闭环</td>
                          <td className="p-3 text-stone-600">死水收藏夹</td>
                          <td className="p-3 text-stone-600">会话后无法长效监控</td>
                          <td className="p-3 bg-red-50/40 text-stone-900 font-medium border-l border-r border-red-200">
                            切身决策清单 + 雷达增量捕获 + 拐点待办
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-stone-500">
                见微 Genway · 探索新闻与情报背后的结构性真相
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold rounded-lg transition-colors cursor-pointer"
              >
                开始体验产品
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
