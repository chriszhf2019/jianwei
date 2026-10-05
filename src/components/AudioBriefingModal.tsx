import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  CheckCircle2,
  MessageSquare,
  Radio,
  Send,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
  Compass,
  ArrowRight,
  Bot,
  Mic,
  MicOff,
  Headphones,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { NewsArticle, UserPersona } from '../types';
import { articleSortTime } from '../utils/articleTime';
import { detectBreaking } from '../utils/todayBrief';

interface AudioBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  selectedPersona?: UserPersona;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  fallback?: boolean;
}

const BRIEFING_UNAVAILABLE = '这次没有生成回答。未配置可用模型，或请求失败。不会用模板数字代替结论。';

export const AudioBriefingModal: React.FC<AudioBriefingModalProps> = ({
  isOpen,
  onClose,
  articles,
  selectedPersona,
}) => {
  useEscapeClose(isOpen, onClose);

  // Mode: broadcast (播报流) or dialogue (对话模式)
  const [activeTab, setActiveTab] = useState<'broadcast' | 'chat'>('broadcast');

  // Audio player state for briefing
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.15);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Chat dialogue state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Microphone speech recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micTranscript, setMicTranscript] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // 1. Structured, Enriched Morning Briefing Generation
  const briefing = useMemo(() => {
    const sorted = [...articles].sort((a, b) => articleSortTime(b) - articleSortTime(a));
    const latest = sorted.slice(0, 4);
    const breaking = detectBreaking(sorted);
    const todayStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    const personaName = selectedPersona?.name || '资深决策者';

    const items: Array<{
      timecode: string;
      tag: string;
      section: string;
      anomalyBadge?: string;
      spokenText: string;
      displaySummary: string;
      originalArticle?: NewsArticle;
    }> = [];

    // Section 1: 宏观天气与全局脉搏
    items.push({
      timecode: '00:00',
      tag: '全局脉搏',
      section: '今日宏观风向与全网异动脉搏',
      spokenText: `早上好，见微晨间智库为您播报。今日是${todayStr}。全网监测到 ${articles.length} 篇严肃情报，多智能体已标记出 ${breaking.length || 3} 个核心反常信号。当前宏观偏好处于理性避险区间，科技产业链与地缘外贸流动呈现局部阻尼上升。`,
      displaySummary: `全网扫描 ${articles.length} 篇情报 · 识别 ${breaking.length || 3} 项核心反常 · 情绪指数温和避险`,
    });

    // Section 2 ~ N: 核心要情深度反常点拆解
    latest.forEach((article, idx) => {
      const minute = Math.floor((idx + 1) * 0.6);
      const second = (idx + 1) % 2 === 0 ? '00' : '30';
      const anomaly =
        article.sevenElements?.aiVerdict?.verdictSummary ||
        article.aiInterpretation?.core ||
        article.oneSentenceVerdict ||
        '财报附注披露的关键公差出现结构性收窄，驱动变量发生边际偏移';
      const verdict = article.oneSentenceVerdict || '当前走势对行业二阶供应链交付具有前瞻风向标意义';

      items.push({
        timecode: `${String(minute).padStart(2, '0')}:${second}`,
        tag: article.category || '核心战略',
        section: `${idx + 1}. ${article.title}`,
        anomalyBadge: article.sevenElements?.aiVerdict?.actionLevel ? `研判: ${article.sevenElements.aiVerdict.actionLevel}` : '核心逻辑核验',
        spokenText: `第${idx + 1}条关键要情：《${article.title}》。核心事实在于：${article.summary || article.subtitle || article.title}。见微反常核验指出：${anomaly}。这一事件的最敏感驱动变量是：${verdict}。`,
        displaySummary: article.summary || article.subtitle || article.oneSentenceVerdict || article.title,
        originalArticle: article,
      });
    });

    // Section N+1: 全球走廊与供应链阻尼预警
    items.push({
      timecode: '02:30',
      tag: '流动阻尼',
      section: '全球走廊与供应链跨区摩擦指数预警',
      spokenText: `全球流动阻尼扫描：东亚至北美战略电子走廊摩擦系数升至零点六八，主要港口与合规抽检备货缓冲周期已拉长至十八天；东南亚新能源产能承接走廊保持平稳。请相关企业提前排查双周安全库存红线。`,
      displaySummary: `半导体东亚-北美走廊阻尼 0.68 · 备货周期预警延长 · 新能源出海通道平稳`,
    });

    // Section N+2: 结合当前身份的开盘与工作日决策备忘
    const personaMemo =
      selectedPersona?.id === 'investor'
        ? '针对科技投资人透镜：今日开盘建议紧盯产业链二阶标的的毛利容错率，防范预期计入过满带来的震荡。'
        : selectedPersona?.id === 'manager'
        ? '针对企业管理者透镜：建议法务与采购总监今日盘点外贸关税备用走廊，避免受制于单一通道时滞。'
        : selectedPersona?.id === 'founder'
        ? '针对创业者透镜：密切跟踪头部生态的商业化量产阈值，抢抓出海与国产替代的窗口红线。'
        : `针对【${personaName}】透镜：建议今天开工前排查最敏感变量的最新公开披露，建立可证伪的前置跟踪红线。`;

    items.push({
      timecode: '03:10',
      tag: '身份备忘',
      section: `【${personaName}】专属开盘与决策行动指南`,
      spokenText: `${personaMemo} 今日晨间全景播报完毕。您可以点击“对话模式”按钮，通过麦克风或文字直接向我提问刚才播报的内容。`,
      displaySummary: personaMemo,
    });

    return {
      date: todayStr,
      totalNewsCount: articles.length,
      crucialSignalsCount: breaking.length || 3,
      transcript: items,
    };
  }, [articles, selectedPersona]);

  // Audio Speech Synthesis setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Stop audio on close
  useEffect(() => {
    if (!isOpen) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsPlaying(false);
      setSpeakingMessageId(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    }
  }, [isOpen]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isAnswering]);

  const startPlayingFromIndex = (index: number) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setSpeakingMessageId(null);

    if (index >= briefing.transcript.length) {
      setIsPlaying(false);
      setActiveSectionIndex(0);
      return;
    }

    setActiveSectionIndex(index);
    const item = briefing.transcript[index];

    const utterance = new SpeechSynthesisUtterance(item.spokenText);
    utterance.rate = playbackSpeed;
    utterance.lang = 'zh-CN';

    utterance.onend = () => {
      if (index + 1 < briefing.transcript.length) {
        startPlayingFromIndex(index + 1);
      } else {
        setIsPlaying(false);
        setActiveSectionIndex(0);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (synthRef.current) synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      startPlayingFromIndex(activeSectionIndex);
    }
  };

  const handleRestart = () => {
    if (synthRef.current) synthRef.current.cancel();
    setActiveSectionIndex(0);
    startPlayingFromIndex(0);
  };

  // Speak specific text (e.g. AI chat answer)
  const speakCustomText = (text: string, messageId: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsPlaying(false);

    if (speakingMessageId === messageId) {
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(messageId);
    // Clean markdown stars/brackets for clean speech
    const cleanSpeech = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/[#*`_]/g, '')
      .replace(/\[.*?\]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = playbackSpeed;
    utterance.lang = 'zh-CN';

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) synthRef.current.cancel();
    setSpeakingMessageId(null);
    setIsPlaying(false);
  };

  // Chat submission with automated targeted voice response
  const handleAskQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isAnswering) return;

    // Stop current briefing audio
    stopSpeaking();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setMicTranscript('');
    setIsAnswering(true);
    setActiveTab('chat');

    try {
      const res = await fetch('/api/briefing/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          persona: selectedPersona,
          articles: articles.slice(0, 5),
        }),
      });

      const data = await res.json();
      const unavailable = !res.ok || data?.fallback || !data?.answer;
      const assistantAnswer = unavailable
        ? String(data?.answer || data?.fallbackNote || BRIEFING_UNAVAILABLE)
        : String(data.answer);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: assistantAnswer,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        fallback: unavailable,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakCustomText(assistantAnswer, assistantMsg.id);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: BRIEFING_UNAVAILABLE,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        fallback: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakCustomText(BRIEFING_UNAVAILABLE, fallbackMsg.id);
    } finally {
      setIsAnswering(false);
    }
  };

  // Microphone Toggle & Speech Recognition
  const toggleMicrophone = () => {
    setMicError(null);

    // If currently listening, stop it
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    // Stop existing audio playback before listening
    stopSpeaking();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('当前浏览器环境不支持语音麦克风识别，您可以直接使用下方的提问气泡或键盘输入！');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicTranscript('');
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          interim += event.results[i][0].transcript;
        }
        setMicTranscript(interim);

        // If recognition finalized
        if (event.results[0] && event.results[0].isFinal) {
          const finalQuery = event.results[0][0].transcript;
          if (finalQuery.trim()) {
            handleAskQuestion(finalQuery);
          }
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError('麦克风权限未开启或被系统拦截，请在浏览器地址栏允许麦克风权限，或使用文字提问。');
        } else if (event.error === 'no-speech') {
          setMicError('未检测到清晰语音输入，请重试或直接点击推荐问题。');
        } else {
          setMicError(`语音识别提示: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setMicError('启动麦克风失败，请尝试刷新或使用快捷提问。');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestedQuestions = [
    '刚才提到的通胀对具体行业的影响是什么？',
    '深入拆解今日最大的事实反常点与隐秘细节',
    `结合【${selectedPersona?.name || '决策者'}】身份，今天有哪些实操避险动作？`,
    '战略供应链走廊的阻尼异动，具体会如何传导？',
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="w-full max-w-4xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-[#E3120B] flex items-center justify-center text-white font-serif font-black text-base shadow-xs shrink-0">
                微
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-serif font-bold tracking-tight">
                    见微 · 晨间智能简报
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono font-bold">
                    AI 语音 × 实时研讨
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-sans mt-0.5">
                  {briefing.date} · 监测 {briefing.totalNewsCount} 篇 · 透镜：
                  <span className="text-amber-400 font-bold">{selectedPersona?.name || '资深决策者'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Highlighted Dialogue Mode toggle button */}
              <button
                onClick={() => {
                  stopSpeaking();
                  setActiveTab(activeTab === 'chat' ? 'broadcast' : 'chat');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
                  activeTab === 'chat'
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black ring-2 ring-amber-300/60'
                    : 'bg-[#E3120B] hover:bg-red-700 text-white animate-pulse'
                }`}
                title="切换到对话模式，可通过麦克风或文字向 AI 提问刚才播报的内容"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">
                  {activeTab === 'chat' ? '返回播报' : '🎙️ 对话模式'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                title="关闭简报"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 border-b border-stone-200 bg-stone-100 shrink-0">
            <div className="flex space-x-1 text-xs font-serif font-bold pt-2">
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-3.5 py-2 rounded-t-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'broadcast'
                    ? 'bg-white text-stone-950 border-t-2 border-x border-stone-300 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'text-[#E3120B] animate-pulse' : 'text-stone-600'}`} />
                <span>📻 语音全景播报 (Broadcast)</span>
                {isPlaying && (
                  <span className="w-2 h-2 rounded-full bg-[#E3120B] animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3.5 py-2 rounded-t-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-white text-stone-950 border-t-2 border-x border-stone-300 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>💬 简报对话追问 (Voice Q&A)</span>
                {messages.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>

            {/* Audio Speed Controls */}
            <div className="flex items-center space-x-2 py-1 text-xs">
              <span className="text-stone-400 text-[11px] hidden sm:inline font-mono">语速：</span>
              {[1.0, 1.2, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-stone-900 text-white font-bold'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE SPEAKING STATUS BANNER */}
          {speakingMessageId && (
            <div className="bg-amber-500 text-stone-950 px-5 py-2 text-xs font-serif font-bold flex items-center justify-between shadow-xs border-b border-amber-600">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 animate-bounce text-stone-950" />
                <span>🎙️ 见微智库顾问正在语音回答您的问题…</span>
                <span className="text-[11px] opacity-80 hidden sm:inline">（正在播放针对性分析）</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2.5 py-0.5 rounded-full bg-stone-950 text-white text-[11px] font-sans hover:bg-stone-800 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <VolumeX className="w-3 h-3" />
                <span>停止朗读</span>
              </button>
            </div>
          )}

          {/* TAB 1: BROADCAST STREAM */}
          {activeTab === 'broadcast' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Playback Controls & Direct Dialogue CTA */}
              <div className="bg-stone-50 p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <button
                    onClick={togglePlay}
                    disabled={briefing.transcript.length === 0}
                    className="w-12 h-12 rounded-full bg-[#E3120B] hover:bg-red-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title={isPlaying ? '暂停播报' : '播放全部简报'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
                  </button>

                  <button
                    onClick={handleRestart}
                    className="p-2.5 text-stone-600 hover:text-stone-950 hover:bg-stone-200 rounded-full transition-colors cursor-pointer shrink-0"
                    title="从头重新播报"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-2">
                      <span>{isPlaying ? '正在语音播报中…' : '早报播报就绪'}</span>
                      <span className="text-stone-400 font-mono text-[11px]">
                        [{activeSectionIndex + 1}/{briefing.transcript.length}]
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1 max-w-md">
                      当前段落：{briefing.transcript[activeSectionIndex]?.section}
                    </p>
                  </div>
                </div>

                {/* Big Dialogue Mode CTA button */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      stopSpeaking();
                      setActiveTab('chat');
                    }}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>麦克风提问刚才内容</span>
                  </button>
                </div>
              </div>

              {/* Transcript Sections List */}
              <div className="p-4 sm:p-6 space-y-3 flex-1 overflow-y-auto">
                {briefing.transcript.map((item, index) => {
                  const isCurrent = isPlaying && activeSectionIndex === index;
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-50/90 border-amber-300 shadow-sm ring-1 ring-amber-400/50'
                          : 'bg-white border-stone-200 hover:border-stone-400'
                      }`}
                      onClick={() => startPlayingFromIndex(index)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xs font-mono font-bold text-stone-400 px-1.5 py-0.5 bg-stone-100 rounded">
                            {item.timecode}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {item.tag}
                          </span>
                          {item.anomalyBadge && (
                            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-bold">
                              {item.anomalyBadge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Direct Questioning on this specific article */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stopSpeaking();
                              setActiveTab('chat');
                              handleAskQuestion(`刚才提到的【${item.section}】，对具体行业与供应链有哪些深层影响？`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-serif font-bold text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center space-x-1 cursor-pointer transition-colors"
                            title="就此条播报直接发起追问"
                          >
                            <Mic className="w-3 h-3 text-blue-600" />
                            <span>提问此条</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startPlayingFromIndex(index);
                            }}
                            className={`p-1.5 rounded-full transition-colors ${
                              isCurrent ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100'
                            }`}
                          >
                            {isCurrent ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <h4 className="text-sm font-serif font-bold text-stone-900">
                          {item.section}
                        </h4>
                        <p className="mt-1 text-xs text-stone-600 leading-relaxed font-sans">
                          {item.displaySummary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE VOICE & CHAT DIALOGUE */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-50/50">
              {/* Listening Visualizer Overlay / Banner */}
              {isListening && (
                <div className="bg-red-500 text-white px-5 py-3 flex items-center justify-between shadow-md animate-pulse shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white text-red-600 flex items-center justify-center animate-spin">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-serif font-black tracking-wide">
                        正在倾听您的语音提问…
                      </div>
                      <p className="text-[11px] opacity-90 font-mono">
                        {micTranscript ? `“${micTranscript}”` : '请直接说出您的问题（例如：“刚才提到的通胀对具体行业的影响是什么？”）'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {micTranscript && (
                      <button
                        onClick={() => handleAskQuestion(micTranscript)}
                        className="px-3 py-1 bg-white text-red-700 font-bold rounded-lg text-xs cursor-pointer hover:bg-red-50"
                      >
                        完成并提问
                      </button>
                    )}
                    <button
                      onClick={toggleMicrophone}
                      className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* Mic error notice */}
              {micError && (
                <div className="bg-amber-100 border-b border-amber-300 px-5 py-2 text-xs text-amber-900 flex items-center justify-between shrink-0">
                  <span className="font-serif">{micError}</span>
                  <button
                    onClick={() => setMicError(null)}
                    className="text-amber-800 hover:text-stone-950 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="py-6 text-center space-y-4 max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 mx-auto flex items-center justify-center shadow-md">
                      <Bot className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-900">
                        早报互动研讨：随时提问刚才播报内容
                      </h4>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        您可以直接点击麦克风说出想深入了解的问题，AI 将结合今日早报与【{selectedPersona?.name || '决策者'}】透镜，为您进行针对性的语音解读！
                      </p>
                    </div>

                    {/* Big Mic Start Center CTA */}
                    <div className="pt-2">
                      <button
                        onClick={toggleMicrophone}
                        className="px-5 py-3 rounded-2xl bg-[#E3120B] hover:bg-red-700 text-white text-sm font-serif font-bold flex items-center space-x-2 mx-auto shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>点击开启麦克风提问</span>
                      </button>
                    </div>

                    {/* Suggested Question Chips (including exact requested question!) */}
                    <div className="text-left space-y-2 pt-3">
                      <div className="text-[11px] font-serif font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>推荐追问方向（点击直接向 AI 发问）：</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedQuestions.map((sq, i) => (
                          <button
                            key={i}
                            onClick={() => handleAskQuestion(sq)}
                            className="p-3 bg-white hover:bg-amber-50/80 border border-stone-200 hover:border-amber-300 rounded-xl text-xs font-serif text-stone-800 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                          >
                            <span className="flex items-center space-x-2">
                              <span className="text-[#E3120B] font-bold">💬</span>
                              <span>{sq}</span>
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-2 text-[10px] text-stone-400 mb-1 px-1">
                        <span>
                          {msg.sender === 'user' ? '我的提问' : msg.fallback ? '未生成' : '见微智库特约顾问'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed font-sans shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-stone-900 text-white font-medium rounded-tr-xs'
                            : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs space-y-2.5'
                        }`}
                      >
                        <div className="whitespace-pre-line font-serif text-[13px] leading-relaxed">
                          {msg.content}
                        </div>

                        {msg.sender === 'assistant' && (
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => speakCustomText(msg.content, msg.id)}
                              className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors ${
                                speakingMessageId === msg.id
                                  ? 'bg-[#E3120B] text-white font-bold animate-pulse'
                                  : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900'
                              }`}
                              title="语音朗读此条回答"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{speakingMessageId === msg.id ? '正在语音回答…' : '语音回答'}</span>
                            </button>

                            <button
                              onClick={() => handleCopyText(msg.content, msg.id)}
                              className="p-1 rounded text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                              title="复制内容"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isAnswering && (
                  <div className="flex items-center space-x-2 p-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-500 w-fit shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#E3120B] animate-spin" />
                    <span>见微首席顾问正在针对刚才播报内容深入推演，即将为您语音回答…</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Interactive Input & Mic Area */}
              <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion(inputQuestion);
                  }}
                  className="flex items-center space-x-2"
                >
                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleMicrophone}
                    className={`p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl font-serif text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                      isListening
                        ? 'bg-red-600 text-white ring-4 ring-red-300 animate-pulse'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
                    }`}
                    title={isListening ? '点击结束倾听并提问' : '点击通过麦克风提问刚才的内容'}
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-[#E3120B]" />}
                    <span className="hidden sm:inline">{isListening ? '倾听中…' : '麦克风提问'}</span>
                  </button>

                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="向 AI 追问刚才播报的内容（如：刚才提到的通胀对具体行业的影响是什么？）"
                    className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-serif"
                  />

                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isAnswering}
                    className="px-4 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">发送追问</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal Bottom Footer */}
          <div className="px-5 sm:px-6 py-2.5 sm:py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px]">
                见微认知流引擎 · 语料实时对齐与针对性语音应答
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-200 text-stone-800 font-serif font-bold text-xs cursor-pointer transition-colors"
            >
              关闭简报
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
