import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import {
  GitCompare,
  ArrowRight,
  ShieldAlert,
  Globe2,
  TrendingUp,
  Building2,
  Factory,
  Zap,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface CrossRegionFlowPanelProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
  onSelectRegionFilter?: (region: string) => void;
}

interface SupplyChainRoute {
  id: string;
  name: string;
  industry: string;
  sourceRegion: string;
  transitRegion: string;
  destRegion: string;
  tariffFriction: number; // 0-100
  localContentReq: string; // e.g. 50%
  leadTime: string; // e.g. 25-35天
  strategicStatus: 'active' | 'under_pressure' | 'expanding';
  coreMechanism: string;
  focalEntities: string[];
}

export const CrossRegionFlowPanel: React.FC<CrossRegionFlowPanelProps> = ({
  articles,
  onOpenArticleById,
  onSelectRegionFilter,
}) => {
  const routes: SupplyChainRoute[] = [
    {
      id: 'route_ev_europe',
      name: '动力电池欧洲本土化闭环链',
      industry: '新能源汽车与电池',
      sourceRegion: '中国 (长三角 / 闽南)',
      transitRegion: '中东欧 (匈牙利德布勒森)',
      destRegion: '西欧 (德国 / 法国整车厂)',
      tariffFriction: 38,
      localContentReq: '≥ 45% (欧盟原产地规则)',
      leadTime: '12-18 天 (欧亚铁路直达)',
      strategicStatus: 'expanding',
      coreMechanism: '以海外直接投资 (FDI) 在匈牙利建厂，以散件 (CKD) 结合当地采购组装，规避 35%+ 反补贴整车关税。',
      focalEntities: ['宁德时代', '比亚迪', '宝马集团', '亿纬锂能'],
    },
    {
      id: 'route_semicon_us',
      name: '先进制程晶圆封测跨太平洋链',
      industry: 'AI 算力与半导体',
      sourceRegion: '亚太 (中国台湾 / 日韩)',
      transitRegion: '东南亚 (马来西亚槟城封测)',
      destRegion: '北美 (加州硅谷 / 德州算力中心)',
      tariffFriction: 65,
      localContentReq: '严格遵守 EAR 限制清单',
      leadTime: '30-45 天 (海空联运)',
      strategicStatus: 'under_pressure',
      coreMechanism: '台积电 CoWoS 晶圆经由东南亚完成二次测试封装后直供北美云巨头机架，面临设备出口管制与交期双重挤压。',
      focalEntities: ['英伟达', '台积电', '日月光', 'AMD'],
    },
    {
      id: 'route_auto_nafta',
      name: '北美近岸外包制造与转运链',
      industry: '汽车零部件与智能制造',
      sourceRegion: '中国 (大湾区 / 长三角)',
      transitRegion: '拉美 (墨西哥蒙特雷工业园)',
      destRegion: '北美 (美国德州 / 密歇根)',
      tariffFriction: 42,
      localContentReq: '≥ 75% (USMCA 汽车价值含量)',
      leadTime: '2-4 天 (美墨陆运直达)',
      strategicStatus: 'active',
      coreMechanism: '借力 USMCA 零关税协定在墨建厂，承接北美整车厂一级供应，核心壁垒在于美墨原产地价值穿透审查。',
      focalEntities: ['特斯拉', '三花智控', '拓普集团', '均胜电子'],
    },
  ];

  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0].id);
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 font-sans">
      {/* 头部标题与定位 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Globe2 className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 flex items-center gap-2">
              <span>跨区域产业链流动与地缘关税阻尼图</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-300">
                Spatial Supply Chain Flow
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              透视全球关键制造产能与核心物料如何在不同地理大区之间流动、重构与跨越关税壁垒
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-500">
          已纳统战略主干航线：3 条
        </span>
      </div>

      {/* 路线选择器 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          return (
            <div
              key={route.id}
              onClick={() => setSelectedRouteId(route.id)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-purple-400'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isSelected ? 'bg-stone-800 text-purple-300' : 'bg-white text-stone-700 border border-stone-300'
                  }`}>
                    {route.industry}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${
                    route.strategicStatus === 'under_pressure'
                      ? 'text-rose-400'
                      : route.strategicStatus === 'expanding'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {route.strategicStatus === 'under_pressure' ? '● 承压调整' : route.strategicStatus === 'expanding' ? '● 快速扩产' : '● 稳定运行'}
                  </span>
                </div>
                <h4 className="font-serif font-black text-sm">{route.name}</h4>
              </div>

              <div className="text-[11px] font-mono text-stone-400 border-t border-stone-200/40 pt-1.5 flex items-center justify-between">
                <span>关税摩擦: {route.tariffFriction}%</span>
                <span>交期: {route.leadTime.split('(')[0].trim()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中主干流动链路的全景可视化图 (Visual Flow Diagram) */}
      <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <h4 className="text-sm sm:text-base font-serif font-black text-stone-950">
              【{activeRoute.name}】全景流动拓扑与阻尼指标
            </h4>
          </div>

          <span className="text-xs font-mono text-stone-600">
            原产地价值门槛：<strong>{activeRoute.localContentReq}</strong>
          </span>
        </div>

        {/* 3 阶地理传导卡片与阻尼流连接器 (Flow Topology) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
          {/* Step 1: 源头供给 */}
          <div className="lg:col-span-1 p-4 bg-white rounded-xl border-2 border-stone-300 shadow-2xs space-y-2 h-full flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-bold">阶段 01 · 源头</span>
                <Factory className="w-4 h-4 text-blue-600" />
              </div>
              <h5 className="font-serif font-bold text-sm text-stone-950">{activeRoute.sourceRegion}</h5>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              核心原材料、电芯或母晶圆研发与一次成型制造基底。
            </p>
          </div>

          {/* Flow Connector 1 -> 2 */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 px-1 text-center bg-white/60 rounded-xl border border-dashed border-stone-300 p-2">
            <div className="w-full flex items-center justify-center gap-1 text-[#E3120B] font-mono text-[10px] font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>关税摩擦 {activeRoute.tariffFriction}%</span>
            </div>
            <div className="relative w-full flex items-center justify-center my-1">
              <div className="h-0.5 w-full bg-purple-300 relative">
                <div className="absolute inset-0 bg-purple-600 animate-pulse" />
              </div>
              <ArrowRight className="w-4 h-4 text-purple-700 shrink-0 -ml-1 z-10" />
            </div>
            <span className="text-[10px] text-stone-600 font-mono font-medium">
              {activeRoute.leadTime.includes('(') ? activeRoute.leadTime.split('(')[1].replace(')', '') : activeRoute.leadTime}
            </span>
          </div>

          {/* Step 2: 中转组装与加工 */}
          <div className="lg:col-span-1 p-4 bg-purple-50 rounded-xl border-2 border-purple-300 shadow-2xs space-y-2 h-full flex flex-col justify-between relative">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-purple-900">
                <span className="font-mono text-[10px] bg-purple-200 px-1.5 py-0.5 rounded font-bold">阶段 02 · 枢纽/组装</span>
                <Building2 className="w-4 h-4 text-purple-700" />
              </div>
              <h5 className="font-serif font-bold text-sm text-purple-950">{activeRoute.transitRegion}</h5>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed">
              散件组装 (CKD)、二次测试封测与属地化供应链集成。
            </p>
          </div>

          {/* Flow Connector 2 -> 3 */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 px-1 text-center bg-white/60 rounded-xl border border-dashed border-stone-300 p-2">
            <div className="w-full flex items-center justify-center gap-1 text-emerald-700 font-mono text-[10px] font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>关税规避 · 本地增值</span>
            </div>
            <div className="relative w-full flex items-center justify-center my-1">
              <div className="h-0.5 w-full bg-emerald-400 relative" />
              <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0 -ml-1 z-10" />
            </div>
            <span className="text-[10px] text-stone-600 font-mono font-medium">
              门槛: {activeRoute.localContentReq.split('(')[0].trim()}
            </span>
          </div>

          {/* Step 3: 终端消费与交付 */}
          <div className="lg:col-span-1 p-4 bg-white rounded-xl border-2 border-stone-300 shadow-2xs space-y-2 h-full flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded font-bold">阶段 03 · 终端交付</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <h5 className="font-serif font-bold text-sm text-stone-950">{activeRoute.destRegion}</h5>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              主机厂整车总装、云服务机架上架与终端大客户交付。
            </p>
          </div>
        </div>

        {/* 机制剖析与核心实体 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
            <strong className="text-stone-900 font-serif flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>底层机制与避险逻辑：</span>
            </strong>
            <p className="text-stone-700 leading-relaxed">
              {activeRoute.coreMechanism}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
            <strong className="text-stone-900 font-serif flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>主要布局实体与承载企业：</span>
            </strong>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeRoute.focalEntities.map((ent) => (
                <span
                  key={ent}
                  className="px-2.5 py-1 bg-stone-100 text-stone-800 font-serif font-bold rounded-lg border border-stone-300"
                >
                  {ent}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 关联语料报道穿透 */}
        {(() => {
          const related = articles.find((a) => {
            const text = `${a.title} ${a.summary || ''}`.toLowerCase();
            return activeRoute.focalEntities.some((ent) => text.includes(ent.toLowerCase()));
          }) || articles[0];

          if (!related) return null;

          return (
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-stone-700 truncate">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[10px] font-bold shrink-0">
                  关联深度研判
                </span>
                <span className="font-serif font-bold text-stone-900 truncate">
                  《{related.title}》
                </span>
              </div>
              <button
                onClick={() => onOpenArticleById && onOpenArticleById(related.id)}
                className="text-[#0284C7] hover:text-[#0369A1] font-serif font-bold inline-flex items-center gap-1 shrink-0 hover:underline cursor-pointer"
              >
                <span>穿透分析文章</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
