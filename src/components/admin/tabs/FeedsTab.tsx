import React from 'react';
import {
  ShieldCheck, Key, Users, Rss, FileText, RefreshCw, Plus, Trash2, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Sparkles, Server, Activity, UserPlus, Edit2, Database,
  HardDrive, Zap, Cpu, RotateCcw, Sliders, Radio, Download, Search, Check, X,
  ExternalLink, Clock, BarChart3, Calendar, LogIn, BookOpen, Crosshair, Lightbulb,
  TrendingUp, Filter, ChevronLeft, ChevronRight, UserCheck, Layers, HelpCircle, Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { SECTOR_TAXONOMY_DEFAULT } from '../../../utils/sectorTaxonomy';
import { AiCostPanel } from '../AiCostPanel';
import { FeedHealthPanel } from '../FeedHealthPanel';
import type { AdminTabScope } from './scope';

const PRESET_SOURCES = [
  {
    name: '36氪 · 深度商业与科技创投',
    url: 'https://feed.36kr.com/feed',
    category: '科技 / 商业',
    desc: '前沿商业洞察、硬科技独角兽与投融资动态',
  },
  {
    name: '财联社 · 宏观与资本市场快讯',
    url: 'https://rss.cls.cn/rss/feed',
    category: '宏观 / 金融',
    desc: '国内第一手监管动向、股市流动性与宏观数据',
  },
  {
    name: '华尔街日报 WSJ · 全球资本市场 (英文原源)',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    category: '全球金融 (EN)',
    desc: 'The Wall Street Journal 全球资本市场、利率与宏观流动性',
  },
  {
    name: 'Financial Times · 全球政经要闻 (英文原源)',
    url: 'https://www.ft.com/rss/world',
    category: '全球政经 (EN)',
    desc: '英国金融时报顶级跨国地缘政经与多边贸易深度研判',
  },
  {
    name: 'TechCrunch · 硅谷前沿科技与创投 (英文原源)',
    url: 'https://techcrunch.com/feed/',
    category: '硅谷科技 (EN)',
    desc: '全球 AI 智能体、SaaS 突破与硅谷顶尖创投融资现场',
  },
  {
    name: 'The Economist · 经济学人商业与产业 (英文原源)',
    url: 'https://www.economist.com/business/rss.xml',
    category: '宏观经济 (EN)',
    desc: '经济学人商业纵深、全球供应链格局与跨国公司战略',
  },
  {
    name: 'Harvard Business Review · 战略与管理 (英文原源)',
    url: 'https://hbr.org/rss/topic/strategy',
    category: '商业战略 (EN)',
    desc: '哈佛商业评论商业模式创新、企业组织重构与领导力',
  },
  {
    name: 'IEEE Spectrum · 顶级工程与硬核科技 (英文原源)',
    url: 'https://spectrum.ieee.org/rss/index.xml',
    category: '硬核工程 (EN)',
    desc: 'IEEE 国际电气电子工程师学会半导体、量子与机器人前沿',
  },
  {
    name: 'ArXiv AI · 全球 AI 前沿学术论文 (英文原源)',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    category: '学术前沿 (EN)',
    desc: 'ArXiv 全球顶尖 AI 算法、推理大模型与 Agent 架构预印本',
  },
  {
    name: '澎湃新闻 · 特稿与政策解读',
    url: 'https://www.thepaper.cn/rss/news',
    category: '政策 / 深度',
    desc: '深度特稿、宏观治理与公共政策原文解析',
  },
  {
    name: '机器之心 · AI 前沿与学术突破',
    url: 'https://www.jiqizhixin.com/rss',
    category: '人工智能',
    desc: '大模型算法突破、智能体 Agent 架构与前沿学术动态',
  },
  {
    name: '与非网 · 半导体与芯片产业链',
    url: 'https://www.eefocus.com/rss/news.xml',
    category: '半导体 / 制造',
    desc: '晶圆代工、EDA/光刻机演进与先进封装动态',
  },
  {
    name: '联合早报 · 国际地缘与经贸',
    url: 'https://www.zaobao.com/rss/world',
    category: '地缘 / 出海',
    desc: '跨国经贸、全球供应链变局与多边外交研判',
  },
  {
    name: 'FT 中文网 · 全球财经与政经观察',
    url: 'https://www.ftchinese.com/rss/feed',
    category: '全球财经',
    desc: '英国金融时报权威全球政经评论与资本流动分析',
  },
  {
    name: '晚点 LatePost · 商业与大厂巨头战略',
    url: 'https://www.latepost.com/rss',
    category: '商业深度',
    desc: '一线大厂组织变革、创始人访谈与商业战役独家复盘',
  },
  {
    name: 'MIT 科技评论 · 突破性工程技术 (英文原源)',
    url: 'https://www.technologyreview.com/feed/',
    category: '硬核工程 (EN)',
    desc: '麻省理工科技评论全球十大突破性技术与工程前沿',
  },
  {
    name: '路透社 · 全球商业与金融要闻 (英文原源)',
    url: 'https://feeds.feedburner.com/reuters/businessNews',
    category: '国际金融 (EN)',
    desc: '路透社全球金融市场、外汇大汇率与跨国投资快讯',
  },
];

export function FeedsTab({ s }: { s: AdminTabScope }) {
  const { feedList, handleAddFeed, handleRemoveFeed, handleRemoveMultipleFeeds, handleTogglePresetFeed, handleTriggerIngest, ingesting, newFeedUrl, renderCorpusHealthModule, setNewFeedUrl, showToast } = s;
  return (
        <div className="space-y-6">
          {/* main 上新增的信源健康面板：并入 Feeds 标签，避免丢失 */}
          <FeedHealthPanel
            feedList={feedList}
            onRemoveFeed={handleRemoveFeed}
            onRemoveMultipleFeeds={handleRemoveMultipleFeeds}
            onShowToast={showToast}
          />

          {/* 语料健康度模块 */}
          {renderCorpusHealthModule()}

          <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                全局外部信源管道与实时调度中枢
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                支持一键订阅主流权威通讯社 RSS 源、管理自定义数据源，并执行定时爬取与全量语料摄取。
              </p>
            </div>

            <button
              onClick={handleTriggerIngest}
              disabled={ingesting || feedList.length === 0}
              className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
              <span>{ingesting ? '正在执行全局摄取…' : '立即触发手动摄取'}</span>
            </button>
          </div>

          {/* Preset Authoritative Sources */}
          <div className="space-y-3">
            <h3 className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>主流权威智库与通讯社预置信源 (点击一键订阅/取消)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESET_SOURCES.map((ps, idx) => {
                const isSubscribed = feedList.includes(ps.url);
                return (
                  <div
                    key={idx}
                    onClick={() => handleTogglePresetFeed(ps.url)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSubscribed
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-stone-900">{ps.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isSubscribed ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          {isSubscribed ? '✓ 已订阅' : '+ 未启用'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{ps.desc}</p>
                    </div>
                    <div className="text-[10px] font-mono text-stone-400 mt-2 truncate">{ps.url}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Feed Input */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <h3 className="text-xs font-serif font-bold text-stone-900">
              添加自定义 RSS / Atom 数据源地址
            </h3>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="输入公网 RSS 订阅地址 (例如: https://news.mit.edu/rss/feed)"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono"
              />
              <button
                onClick={handleAddFeed}
                className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加信源</span>
              </button>
            </div>
          </div>

          {/* Active Feeds List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-serif font-bold text-stone-800">
                当前活跃的数据源管道列表 ({feedList.length})
              </h3>
            </div>
            {feedList.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-stone-300 rounded-xl text-center text-xs text-stone-500">
                暂未配置外部 RSS 信源，系统将仅使用运行时内置预置情报语料。
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {feedList.map((url: string, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50">
                    <span className="font-mono text-stone-800 truncate pr-4">{url}</span>
                    <button
                      onClick={() => handleRemoveFeed(url)}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                      title="移除该信源"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
