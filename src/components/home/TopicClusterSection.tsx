import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../../types';
import { buildTopicClusters, TopicCluster } from '../../utils/topicCluster';
import { TopicSpectrumModal } from './TopicSpectrumModal';
import {
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Globe,
  Radio,
  ChevronRight,
  Scale,
} from 'lucide-react';

interface TopicClusterSectionProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onCompareArticles?: (articleA: NewsArticle, articleB: NewsArticle) => void;
}

export const TopicClusterSection: React.FC<TopicClusterSectionProps> = ({
  articles,
  onSelectArticle,
  onCompareArticles,
}) => {
  const [selectedCluster, setSelectedCluster] = useState<TopicCluster | null>(null);

  const clusters = useMemo(() => {
    return buildTopicClusters(articles, 8);
  }, [articles]);

  if (clusters.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-white border-2 border-stone-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-serif font-black flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>跨源事件聚合与叙事光谱透视</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
              {clusters.length} 个跨源聚合专题
            </span>
          </div>
          <p className="text-xs text-stone-400">
            自动聚合同一事件在官方通稿、商业财经与国际外媒间的报道脉络，打破单一渠道信息茧房。
          </p>
        </div>
      </div>

      {/* Cluster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster) => {
          const { official, commercial, global, independent } = cluster.mediaSpectrum;

          return (
            <div
              key={cluster.id}
              onClick={() => setSelectedCluster(cluster)}
              className="bg-stone-800/80 hover:bg-stone-800 border border-stone-700 hover:border-purple-500 rounded-xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs hover:shadow-md"
            >
              <div className="space-y-2">
                {/* Meta header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {cluster.articles.length} 家信源联动
                    </span>
                    <span className="text-stone-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{cluster.timeSpan.durationHours}h 演进</span>
                    </span>
                  </div>

                  {cluster.sharedEntities.length > 0 && (
                    <span className="text-stone-400 font-mono text-[10px] truncate max-w-[140px]">
                      #{cluster.sharedEntities[0]}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="font-serif font-bold text-sm text-stone-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                  {cluster.topicTitle}
                </h4>

                {/* Media Spectrum Distribution Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                  {official.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>官方 {official.length}</span>
                    </span>
                  )}
                  {commercial.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
                      <Building className="w-3 h-3 text-sky-400" />
                      <span>商业 {commercial.length}</span>
                    </span>
                  )}
                  {global.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-purple-400" />
                      <span>外媒 {global.length}</span>
                    </span>
                  )}
                  {independent.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-700 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-stone-400" />
                      <span>自媒体 {independent.length}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Prompt */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-700/60 text-xs text-purple-400 group-hover:text-purple-300 font-serif font-bold">
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>查看演进时间轴与叙事光谱</span>
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedCluster && (
        <TopicSpectrumModal
          cluster={selectedCluster}
          onClose={() => setSelectedCluster(null)}
          onSelectArticle={onSelectArticle}
          onCompareArticles={onCompareArticles}
        />
      )}
    </div>
  );
};
