import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, RotateCcw, Volume2, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { NewsArticle } from '../types';
import { articleSortTime } from '../utils/articleTime';
import { detectBreaking } from '../utils/todayBrief';

interface AudioBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
}

export const AudioBriefingModal: React.FC<AudioBriefingModalProps> = ({ isOpen, onClose, articles }) => {
  useEscapeClose(isOpen, onClose);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const briefing = useMemo(() => {
    const latest = [...articles].sort((a, b) => articleSortTime(b) - articleSortTime(a)).slice(0, 6);
    return {
      date: new Date().toLocaleDateString('zh-CN'),
      totalNewsCount: articles.length,
      crucialSignalsCount: detectBreaking(latest).length,
      transcript: latest.map((article, index) => {
        const minute = Math.floor(index * 0.5);
        const second = index % 2 === 0 ? '00' : '30';
        return {
          timecode: `${String(minute).padStart(2, '0')}:${second}`,
          section: `${index + 1}. ${article.title}`,
          text: article.summary || article.subtitle || article.oneSentenceVerdict || article.title,
        };
      }),
    };
  }, [articles]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Stop audio on close
  useEffect(() => {
    if (!isOpen && synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  }, [isOpen]);

  const startPlayingFromIndex = (index: number) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    if (index >= briefing.transcript.length) {
      setIsPlaying(false);
      setActiveSectionIndex(0);
      return;
    }

    setActiveSectionIndex(index);
    const item = briefing.transcript[index];
    const textToSpeak = `${item.section}。${item.text}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsPlaying(false);
    } else {
      startPlayingFromIndex(activeSectionIndex);
    }
  };

  const handleRestart = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setActiveSectionIndex(0);
    startPlayingFromIndex(0);
  };


  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#E3120B] flex items-center justify-center text-white font-serif font-black text-sm shadow-xs">
                微
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-serif font-bold tracking-wide">见微 · 今日早间智能简报</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono">
                    AI 语音播报
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-sans">
                  {briefing.date} · 聚合 {briefing.totalNewsCount} 篇情报 · 已识别 {briefing.crucialSignalsCount} 个重大信号
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Player Controls Bar */}
          <div className="bg-stone-100 px-6 py-4 border-b border-stone-300 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                disabled={briefing.transcript.length === 0}
                className="w-12 h-12 rounded-full bg-[#E3120B] disabled:opacity-40 text-white flex items-center justify-center shadow-md hover:bg-red-700 active:scale-95 transition-all"
                aria-label={isPlaying ? "暂停" : "播放"}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-2 text-stone-600 hover:text-stone-950 hover:bg-stone-200 rounded-full transition-colors"
                title="重新播放"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Animated Waveform */}
              <div className="flex items-center space-x-1 h-6 px-3 bg-stone-200/80 rounded-full">
                <Volume2 className="w-3.5 h-3.5 text-stone-600 mr-1" />
                {[40, 75, 55, 90, 60, 85, 45, 95, 65, 50].map((height, i) => (
                  <motion.div
                    key={i}
                    animate={
                      isPlaying
                        ? { height: [4, (height / 100) * 18, 4] }
                        : { height: 4 }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + (i % 4) * 0.15,
                      ease: 'easeInOut',
                    }}
                    className="w-0.75 bg-[#E3120B] rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center space-x-2 text-xs text-stone-600 font-sans">
              <span>语速:</span>
              {[1.0, 1.15, 1.3].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded font-mono transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-stone-900 text-white font-bold'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Transcript List with Active Tracking */}
          <div className="p-6 overflow-y-auto space-y-4 font-sans flex-1">
            <div className="text-xs font-serif text-stone-500 uppercase tracking-widest flex items-center justify-between border-b border-stone-300 pb-2">
              <span>来自当前语料的简报（共 {briefing.transcript.length} 条）</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>预计耗时 3 分钟</span>
              </span>
            </div>

            {briefing.transcript.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-500">
                当前没有真实语料，无法生成语音简报。
              </div>
            ) : briefing.transcript.map((item, idx) => {
              const isActive = activeSectionIndex === idx;
              return (
                <motion.div
                  key={idx}
                  onClick={() => startPlayingFromIndex(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-50/90 border-[#E3120B] shadow-sm'
                      : 'bg-white border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {item.timecode}
                      </span>
                      <h4 className={`text-sm font-serif font-bold ${
                        isActive ? 'text-[#E3120B]' : 'text-stone-900'
                      }`}>
                        {item.section}
                      </h4>
                    </div>
                    {isActive && (
                      <span className="text-xs text-[#E3120B] flex items-center space-x-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>正在播报</span>
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    isActive ? 'text-stone-950 font-medium' : 'text-stone-700'
                  }`}>
                    {item.text}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="bg-stone-100 px-6 py-3 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500">
            <span>脚本由当前语料摘要生成 · 浏览器语音合成（TTS）播放</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-900 text-stone-100 hover:bg-stone-800 rounded font-medium transition-colors"
            >
              完成收听
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
