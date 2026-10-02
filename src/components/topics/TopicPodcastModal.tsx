import React, { useState, useEffect, useRef } from 'react';
import { EnhancedTopicDossier } from './TopicsView';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Sparkles,
  Headphones,
  User,
  ShieldAlert,
  Download,
  Share2,
} from 'lucide-react';

interface TopicPodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: EnhancedTopicDossier;
}

interface PodcastDialogue {
  speaker: 'host_a' | 'host_b';
  speakerName: string;
  role: string;
  avatarColor: string;
  avatarBg: string;
  text: string;
}

export const TopicPodcastModal: React.FC<TopicPodcastModalProps> = ({ isOpen, onClose, topic }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // 动态构建双人对谈脚本
  const dialogues = React.useMemo<PodcastDialogue[]>(() => {
    return [
      {
        speaker: 'host_a',
        speakerName: '林工 (战略分析师)',
        role: '理性建构 · 产业全景',
        avatarColor: 'text-blue-400',
        avatarBg: 'bg-blue-900 border-blue-500',
        text: `大家好，欢迎收听见微·专题深度对谈。今天我们要穿透拆解的主题是——《${topic.title}》。当前这个专题已进入「${topic.stageLabel}」，市场讨论度极高。`,
      },
      {
        speaker: 'host_b',
        speakerName: '江老师 (反思质疑者)',
        role: '批判审视 · 物理阻尼',
        avatarColor: 'text-amber-400',
        avatarBg: 'bg-amber-900 border-amber-500',
        text: `市场狂热的时候，更要小心确认偏误。大家都在盯着利好吹泡泡，但很多人忽略了这个专题的核心结构性冲突：${topic.coreConflict}`,
      },
      {
        speaker: 'host_a',
        speakerName: '林工 (战略分析师)',
        role: '理性建构 · 产业全景',
        avatarColor: 'text-blue-400',
        avatarBg: 'bg-blue-900 border-blue-500',
        text: `确实，从多方博弈矩阵来看，${topic.stakeholders[0]?.camp || '领军企业'} 正在采取 ${topic.stakeholders[0]?.stance || '激进扩张'} 策略，核心诉求是“${topic.stakeholders[0]?.coreDemand || '抢占主导权'}”。`,
      },
      {
        speaker: 'host_b',
        speakerName: '江老师 (反思质疑者)',
        role: '批判审视 · 物理阻尼',
        avatarColor: 'text-amber-400',
        avatarBg: 'bg-amber-900 border-amber-500',
        text: `但别忘了对手方的底线反制！监管与挑战者可不是坐以待毙的。我们要密切盯防这个硬指标：${topic.keyWatchpoints[0] || '关键良品率与合规进展'}。`,
      },
      {
        speaker: 'host_a',
        speakerName: '林工 (战略分析师)',
        role: '理性建构 · 产业全景',
        avatarColor: 'text-blue-400',
        avatarBg: 'bg-blue-900 border-blue-500',
        text: `同意。而且见微系统已经设立了明确的可证伪红线：${topic.invalidationTrigger}`,
      },
      {
        speaker: 'host_b',
        speakerName: '江老师 (反思质疑者)',
        role: '批判审视 · 物理阻尼',
        avatarColor: 'text-amber-400',
        avatarBg: 'bg-amber-900 border-amber-500',
        text: `对！做决策切忌非黑即白，只要盯死这几个定量信号，就能在喧嚣的行业新闻中保持清醒的战略定力。`,
      },
    ];
  }, [topic]);

  // 语音合成播报 (Web Speech API)
  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setCurrentLineIndex(0);
      setProgress(0);
      return;
    }
  }, [isOpen]);

  // 播放当前行
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    if (currentLineIndex >= dialogues.length) {
      setIsPlaying(false);
      setCurrentLineIndex(0);
      setProgress(100);
      return;
    }

    const currentLine = dialogues[currentLineIndex];
    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentLine.text);
      utterance.lang = 'zh-CN';
      utterance.rate = playbackSpeed;
      utterance.pitch = currentLine.speaker === 'host_a' ? 1.0 : 0.85; // 区分两人的音调

      utterance.onend = () => {
        if (currentLineIndex < dialogues.length - 1) {
          setCurrentLineIndex((prev) => prev + 1);
          setProgress(((currentLineIndex + 1) / dialogues.length) * 100);
        } else {
          setIsPlaying(false);
          setProgress(100);
        }
      };

      utterance.onerror = () => {
        // Fallback timer if speech API fails or is blocked
        const timer = setTimeout(() => {
          if (currentLineIndex < dialogues.length - 1) {
            setCurrentLineIndex((prev) => prev + 1);
            setProgress(((currentLineIndex + 1) / dialogues.length) * 100);
          } else {
            setIsPlaying(false);
          }
        }, 5000 / playbackSpeed);
        return () => clearTimeout(timer);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // 纯视觉模拟定时播放
      const timer = setTimeout(() => {
        if (currentLineIndex < dialogues.length - 1) {
          setCurrentLineIndex((prev) => prev + 1);
          setProgress(((currentLineIndex + 1) / dialogues.length) * 100);
        } else {
          setIsPlaying(false);
        }
      }, 4500 / playbackSpeed);
      return () => clearTimeout(timer);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, isPlaying, currentLineIndex, playbackSpeed, isMuted, dialogues]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentLineIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-stone-700 rounded-3xl w-full max-w-2xl text-stone-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#E3120B] text-white flex items-center justify-center shadow-lg">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  见微 · AI 专题双人对谈播客
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  3.5 分钟深度浓缩
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-serif font-black text-white line-clamp-1">
                {topic.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Host Banner */}
        <div className="grid grid-cols-2 gap-2 p-3.5 bg-stone-950/40 border-b border-stone-800 text-xs">
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-blue-950/40 border border-blue-900/60">
            <div className="w-7 h-7 rounded-lg bg-blue-900 text-blue-300 border border-blue-700 flex items-center justify-center font-bold text-xs">
              林
            </div>
            <div className="min-w-0">
              <div className="font-serif font-bold text-blue-300 text-xs">林工 · 资深战略分析师</div>
              <div className="text-[10px] text-stone-400 truncate">剖析底层逻辑与产业全景</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-amber-950/40 border border-amber-900/60">
            <div className="w-7 h-7 rounded-lg bg-amber-900 text-amber-300 border border-amber-700 flex items-center justify-center font-bold text-xs">
              江
            </div>
            <div className="min-w-0">
              <div className="font-serif font-bold text-amber-300 text-xs">江老师 · 敏锐反思挑刺者</div>
              <div className="text-[10px] text-stone-400 truncate">探测物理阻尼与证伪红线</div>
            </div>
          </div>
        </div>

        {/* Synchronized Script Stream */}
        <div
          ref={transcriptContainerRef}
          className="flex-1 p-5 overflow-y-auto space-y-4 no-scrollbar bg-stone-900/60"
        >
          {dialogues.map((item, idx) => {
            const isCurrent = idx === currentLineIndex && isPlaying;
            const isPast = idx < currentLineIndex;

            return (
              <div
                key={idx}
                onClick={() => {
                  setCurrentLineIndex(idx);
                  setProgress((idx / dialogues.length) * 100);
                  setIsPlaying(true);
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-stone-800/90 border-amber-400 shadow-xl scale-[1.01]'
                    : isPast
                    ? 'bg-stone-950/40 border-stone-800/80 opacity-70 hover:opacity-100'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-serif font-black ${item.avatarColor}`}>
                      {item.speakerName}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      [{item.role}]
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center space-x-1 text-[10px] font-mono text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>正在朗读</span>
                    </span>
                  )}
                </div>

                <p className={`text-xs sm:text-sm font-serif leading-relaxed ${
                  isCurrent ? 'text-white font-medium' : 'text-stone-300'
                }`}>
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Audio Player Controls Bar */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-[#E3120B] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={cycleSpeed}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold rounded-lg border border-stone-700 cursor-pointer"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Play / Pause / Restart */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRestart}
                className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors cursor-pointer"
                title="重新开始"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-stone-950" /> : <Play className="w-6 h-6 fill-stone-950 ml-0.5" />}
              </button>
            </div>

            <div className="text-[11px] font-mono text-stone-400">
              {currentLineIndex + 1} / {dialogues.length} 段
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
