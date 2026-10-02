import React, { useState } from 'react';
import { EnhancedTopicDossier } from './TopicsView';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  X,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Target,
} from 'lucide-react';

interface InvalidationAlertBannerProps {
  topics: EnhancedTopicDossier[];
  onSelectTopic: (topicId: string) => void;
}

export const InvalidationAlertBanner: React.FC<InvalidationAlertBannerProps> = ({ topics, onSelectTopic }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [selectedAlertTopic, setSelectedAlertTopic] = useState<EnhancedTopicDossier | null>(null);

  // 筛选出处于高博弈或证伪警戒状态的专题
  const alertTopics = React.useMemo(() => {
    return topics.filter((t) => t.stage === 'debate' || t.stage === 'breakout').slice(0, 2);
  }, [topics]);

  if (dismissed || alertTopics.length === 0) return null;

  const topAlert = alertTopics[0];

  return (
    <>
      <div className="bg-rose-950/90 text-white border-2 border-rose-600 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 bg-rose-900/80 px-1.5 py-0.2 rounded border border-rose-700">
                🚨 核心专题假设证伪预警系统 (Invalidation Monitor)
              </span>
              <span className="text-[10px] font-mono text-stone-400">实时监听中</span>
            </div>
            <p className="text-xs sm:text-sm font-serif font-bold text-white mt-0.5">
              专题【{topAlert.title}】检测到关键博弈白热化，正接近预设假设证伪红线！
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => setSelectedAlertTopic(topAlert)}
            className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-950 text-xs font-serif font-bold rounded-lg transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
          >
            <span>排查证伪证据</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-900 transition-colors cursor-pointer"
            title="关闭此提醒"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 证伪详情抽屉弹窗 (Invalidation Drawer Modal) */}
      {selectedAlertTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 border-2 border-rose-500 rounded-2xl w-full max-w-xl text-stone-100 shadow-2xl p-6 space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-serif font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>战略假设证伪风险排查 · 专题【{selectedAlertTopic.title}】</span>
              </div>
              <button
                onClick={() => setSelectedAlertTopic(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-950/50 border border-rose-800 rounded-xl space-y-1">
                <strong className="text-rose-300 font-serif">🛑 预设证伪触发红线：</strong>
                <p className="text-stone-300 leading-relaxed">
                  {selectedAlertTopic.invalidationTrigger}
                </p>
              </div>

              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-2">
                <strong className="text-amber-400 font-serif flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>当前必须持续盯防的前瞻指标：</span>
                </strong>
                <ul className="space-y-1 text-stone-300">
                  {selectedAlertTopic.keyWatchpoints.map((wp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{wp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <span className="text-[11px] text-stone-400">
                建议：若证伪红线被触及，请及时在个人预测台账中调整胜率与持仓敞口。
              </span>
              <button
                onClick={() => {
                  onSelectTopic(selectedAlertTopic.id);
                  setSelectedAlertTopic(null);
                }}
                className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white font-serif font-bold rounded-xl text-xs flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <span>直达专题全景深潜</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
