import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { NewsArticle } from '../../types';
import { findRelatedArticles } from '../../utils/relatedArticles';
import { 
  Network, 
  Grid, 
  GitBranch, 
  RefreshCw, 
  Sparkles, 
  ExternalLink, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Link2, 
  CheckCircle2, 
  Compass, 
  Share2,
  Info
} from 'lucide-react';

interface RelatedNewsItem {
  title: string;
  media: string;
  why: string;
  // 若在 contextArticles 中找到匹配文章，保存其引用
  matchedArticle?: NewsArticle;
}

interface RelatedNewsGraphProps {
  article: NewsArticle;
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
  onRunSkill?: (skill: 'relatednews', article: NewsArticle) => Promise<NewsArticle | null>;
}

type ViewMode = 'd3-graph' | 'css-grid';

// D3 力导向图节点契约
interface D3GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'root' | 'bridge' | 'related-corpus' | 'related-external';
  category?: string;
  media?: string;
  why?: string;
  matchedArticle?: NewsArticle;
  radius: number;
  color: string;
}

interface D3GraphLink extends d3.SimulationLinkDatum<D3GraphNode> {
  source: string | D3GraphNode;
  target: string | D3GraphNode;
  relation: string;
  dashed?: boolean;
}

/** 启发式提取关联原因中的连接纽带（Connection Point） */
function extractConnectionHub(why: string, media: string): string {
  if (/背景|前因|起因|历史|铺垫/.test(why)) return '前置背景';
  if (/反方|争议|博弈|分歧|对立/.test(why)) return '多空博弈';
  if (/后续|进展|跟进|发酵|演进/.test(why)) return '后续演变';
  if (/产业链|上下游|生态|供应商|客户/.test(why)) return '产业协同';
  if (/政策|监管|宏观|利率|规则/.test(why)) return '政策映射';
  if (/竞品|对标|同行|竞争/.test(why)) return '竞争对标';
  return media ? `${media}报道` : '因果关联';
}

export const RelatedNewsGraph: React.FC<RelatedNewsGraphProps> = ({
  article,
  contextArticles = [],
  onOpenArticle,
  onOpenTermExplain,
  onRunSkill,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('d3-graph');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<D3GraphNode | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTransformRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // 1. 结构化解析与多源交叉匹配：将 article.relatedNews 与 contextArticles 进行关联对齐
  const combinedItems: RelatedNewsItem[] = useMemo(() => {
    const rawItems = article.relatedNews || [];
    const pool = contextArticles.filter((a) => a.id !== article.id);

    if (rawItems.length > 0) {
      return rawItems.map((item) => {
        // 在本地语料库中模糊查找最佳匹配
        const matched = pool.find((cand) => {
          if (!cand.title) return false;
          // 完全或包含匹配
          if (cand.title.includes(item.title) || item.title.includes(cand.title)) return true;
          // 标题关键词交集计算
          const cleanCand = cand.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
          const cleanItem = item.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
          let commonChars = 0;
          for (const char of cleanItem) {
            if (cleanCand.includes(char)) commonChars++;
          }
          return cleanItem.length > 4 && commonChars / cleanItem.length >= 0.45;
        });

        return {
          title: item.title,
          media: item.media || (matched?.sourceName || '综合媒体'),
          why: item.why || '涉及同题材演进与产业链上下文传导',
          matchedArticle: matched,
        };
      });
    }

    // 若 article.relatedNews 暂无，则利用 BM25 本地启发式推选出语料库中 top 4 篇相关报道作为连接候选
    const fallbackRelated = findRelatedArticles(article, pool, 4);
    return fallbackRelated.map((cand) => {
      const commonEntities = (article.entityMentions || [])
        .map((e) => e.name)
        .filter((name) => (cand.title || '').includes(name) || (cand.summary || '').includes(name));

      const bridgeDesc = commonEntities.length > 0
        ? `在当前语料库中共现关键实体「${commonEntities.slice(0, 2).join('、')}」，构成同向演变连接点`
        : `同属「${cand.category}」赛道，基于 BM25 词项相似度提取的同语境报道`;

      return {
        title: cand.title,
        media: cand.sourceName || '语料库收录',
        why: bridgeDesc,
        matchedArticle: cand,
      };
    });
  }, [article, contextArticles]);

  // 2. 统计语料库匹配度与连接点总览
  const matchedCount = useMemo(
    () => combinedItems.filter((i) => !!i.matchedArticle).length,
    [combinedItems]
  );

  // 3. 触发 AI 技能型推荐
  const handleGenerateRelatedNews = async () => {
    if (!onRunSkill || isGenerating) return;
    setIsGenerating(true);
    try {
      await onRunSkill('relatednews', article);
    } catch (err) {
      console.error('Failed to generate related news:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. 构建 D3 图数据 (Nodes & Links)
  const graphData = useMemo(() => {
    const nodes: D3GraphNode[] = [];
    const links: D3GraphLink[] = [];

    // 根节点：当前主文章
    const rootId = `root-${article.id}`;
    nodes.push({
      id: rootId,
      label: article.title.length > 18 ? `${article.title.slice(0, 18)}…` : article.title,
      type: 'root',
      radius: 26,
      color: '#E3120B',
      why: '当前焦点新闻 (Source Anchor)',
      media: article.sourceName || '本篇报道',
    });

    // 为每个连接分类构建纽带 Hub（Bridge 节点），避免所有线全挤在中心
    const bridgeMap = new Map<string, string>();

    combinedItems.forEach((item, index) => {
      const bridgeType = extractConnectionHub(item.why, item.media);
      const bridgeId = `bridge-${bridgeType}`;

      if (!bridgeMap.has(bridgeType)) {
        bridgeMap.set(bridgeType, bridgeId);
        nodes.push({
          id: bridgeId,
          label: bridgeType,
          type: 'bridge',
          radius: 16,
          color: '#1E293B',
          why: `连接纽带：${bridgeType}`,
        });

        // 根节点连到桥梁
        links.push({
          source: rootId,
          target: bridgeId,
          relation: '枢纽',
        });
      }

      // 叶子节点：关联文章
      const leafId = `leaf-${index}`;
      const isMatched = !!item.matchedArticle;
      nodes.push({
        id: leafId,
        label: item.title.length > 14 ? `${item.title.slice(0, 14)}…` : item.title,
        type: isMatched ? 'related-corpus' : 'related-external',
        media: item.media,
        why: item.why,
        matchedArticle: item.matchedArticle,
        radius: isMatched ? 20 : 17,
        color: isMatched ? '#0284C7' : '#78716C',
      });

      // 桥梁连到叶子节点
      links.push({
        source: bridgeId,
        target: leafId,
        relation: isMatched ? '语料库已匹配' : '外部线索',
        dashed: !isMatched,
      });
    });

    return { nodes, links };
  }, [article, combinedItems]);

  // 5. D3 SVG 绘制与物理力导向模拟
  useEffect(() => {
    if (viewMode !== 'd3-graph' || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 700;
    const height = 420;

    // 缩放容器
    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 2.8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomTransformRef.current = zoom;

    // 箭头定义
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#94A3B8');

    // 复制数据，防止 d3 原地修改污染 memo
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const links = graphData.links.map((d) => ({ ...d }));

    // 初始化力导向系统
    const simulation = d3
      .forceSimulation<D3GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<D3GraphNode, D3GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const isBridge = (d.target as D3GraphNode).type === 'bridge';
            return isBridge ? 85 : 125;
          })
      )
      .force('charge', d3.forceManyBody().strength(-240))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3GraphNode>().radius((d) => d.radius + 18));

    // 连线
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#CBD5E1')
      .attr('stroke-width', (d) => (d.dashed ? 1.5 : 2))
      .attr('stroke-dasharray', (d) => (d.dashed ? '4,4' : 'none'))
      .attr('marker-end', 'url(#arrow-normal)');

    // 节点分组
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('.node-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group cursor-pointer')
      .call(
        d3
          .drag<SVGGElement, D3GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_event, d) => {
        setSelectedNode(d);
        if (d.matchedArticle && onOpenArticle) {
          onOpenArticle(d.matchedArticle);
        }
      });

    // 节点外环发光/装饰
    node
      .filter((d) => d.type === 'root')
      .append('circle')
      .attr('r', (d) => d.radius + 6)
      .attr('fill', 'none')
      .attr('stroke', '#E3120B')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('class', 'animate-pulse');

    node
      .filter((d) => d.type === 'related-corpus')
      .append('circle')
      .attr('r', (d) => d.radius + 4)
      .attr('fill', 'none')
      .attr('stroke', '#0284C7')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');

    // 节点本体
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))');

    // 节点文本
    node
      .append('text')
      .text((d) => d.label)
      .attr('font-size', (d) => (d.type === 'root' ? 12 : d.type === 'bridge' ? 10 : 11))
      .attr('font-weight', (d) => (d.type === 'root' ? '900' : '700'))
      .attr('font-family', 'var(--font-serif)')
      .attr('fill', (d) => (d.type === 'bridge' ? '#FFFFFF' : '#1E293B'))
      .attr('text-anchor', (d) => (d.type === 'bridge' ? 'middle' : 'start'))
      .attr('dy', (d) => (d.type === 'bridge' ? 3.5 : d.radius + 14))
      .attr('dx', (d) => (d.type === 'bridge' ? 0 : -d.radius + 4));

    // 仿真 Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, viewMode, onOpenArticle]);

  // 控制器：重置视图
  const handleResetZoom = () => {
    if (svgRef.current && zoomTransformRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomTransformRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomTransformRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomTransformRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomTransformRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomTransformRef.current.scaleBy, 0.8);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5 font-sans">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3120B] text-white">
              <Network className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 flex items-center gap-2">
              <span>关联报道与语料全景拓扑 (Related Context Nexus)</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                {combinedItems.length} 条关联线索 · {matchedCount} 篇语料库直达
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-600 font-sans">
            基于 <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-800">relatedNews</code> 深度因果链与当前上下文语料库进行双向拓扑映射，直观呈现事件的起因溯源、产业传导与媒体多源印证。
          </p>
        </div>

        {/* View mode switcher & AI refresh */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          {onRunSkill && (
            <button
              onClick={handleGenerateRelatedNews}
              disabled={isGenerating}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
              title="调用 AI 编辑推荐员扩充更多媒体线索"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? '拓扑扩展中…' : 'AI 刷新线索'}</span>
            </button>
          )}

          <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
            <button
              onClick={() => setViewMode('d3-graph')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-serif font-bold transition-all ${
                viewMode === 'd3-graph'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>D3 星轨图</span>
            </button>
            <button
              onClick={() => setViewMode('css-grid')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-serif font-bold transition-all ${
                viewMode === 'css-grid'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>连接矩阵</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Visualization Content */}
      {viewMode === 'd3-graph' ? (
        <div className="relative border border-stone-200 rounded-xl bg-[#FAF8F5] overflow-hidden">
          {/* Zoom Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col space-y-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-stone-300 shadow-xs">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors"
              title="重置居中"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* D3 SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-[430px] block cursor-grab active:cursor-grabbing select-none"
          />

          {/* Graph Legend & Status bar */}
          <div className="p-3 bg-white/95 border-t border-stone-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-stone-700 font-serif font-bold">
                <span className="w-3 h-3 rounded-full bg-[#E3120B]" />
                <span>焦点报道</span>
              </span>
              <span className="flex items-center gap-1.5 text-stone-700 font-serif font-bold">
                <span className="w-3 h-3 rounded-full bg-stone-900" />
                <span>连接纽带 (Hub)</span>
              </span>
              <span className="flex items-center gap-1.5 text-stone-700 font-serif font-bold">
                <span className="w-3 h-3 rounded-full bg-[#0284C7] ring-2 ring-blue-200" />
                <span className="text-[#0284C7]">语料库已收录 (可点击直达)</span>
              </span>
              <span className="flex items-center gap-1.5 text-stone-700 font-serif font-bold">
                <span className="w-3 h-3 rounded-full bg-stone-500" />
                <span>外延线索</span>
              </span>
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-stone-400" />
              <span>支持鼠标滚轮缩放、节点自由拖拽及点击穿透阅读</span>
            </div>
          </div>
        </div>
      ) : (
        /* CSS Grid 结构化矩阵连接看板 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {combinedItems.map((item, idx) => {
            const isMatched = !!item.matchedArticle;
            const hubTag = extractConnectionHub(item.why, item.media);

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                  isMatched
                    ? 'bg-blue-50/20 border-blue-200 hover:border-[#0284C7] hover:shadow-sm'
                    : 'bg-[#FAF8F5] border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="space-y-2">
                  {/* Top tags */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md font-serif font-bold text-[11px] bg-stone-900 text-stone-100">
                      {hubTag}
                    </span>
                    <span className="font-mono text-[11px] text-stone-500 font-bold bg-white px-2 py-0.5 rounded border border-stone-200">
                      {item.media}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-serif font-bold text-sm text-stone-950 leading-snug line-clamp-2">
                    {item.title}
                  </h4>

                  {/* Connection logic (Why) */}
                  <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200 text-xs text-stone-700 space-y-1">
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                      <Link2 className="w-3 h-3" />
                      <span>连接点与脉络动因：</span>
                    </div>
                    <p className="leading-relaxed text-[11px] font-sans">
                      {item.why}
                    </p>
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs">
                  {isMatched ? (
                    <button
                      onClick={() => item.matchedArticle && onOpenArticle?.(item.matchedArticle)}
                      className="w-full inline-flex items-center justify-center space-x-1.5 py-1.5 bg-[#0284C7] hover:bg-blue-700 text-white rounded-lg font-serif font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>下钻阅读语料原文 ➔</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between text-stone-400 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Info className="w-3 h-3" />
                        <span>语料库外延伸线索</span>
                      </span>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(item.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-stone-600 hover:text-stone-900 underline font-mono text-[10px]"
                      >
                        <span>溯源</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Node Detailed Inspector Callout (当用户点击节点时展开) */}
      {selectedNode && selectedNode.type !== 'bridge' && (
        <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-2 border border-stone-800 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-serif font-bold text-xs text-white">
                {selectedNode.type === 'root' ? '核心锚点新闻' : '选定关联节点解析'}
              </span>
              {selectedNode.media && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-800 text-stone-300 rounded">
                  {selectedNode.media}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-stone-400 hover:text-stone-200 text-xs font-mono cursor-pointer"
            >
              ✕ 关闭
            </button>
          </div>

          <h5 className="font-serif font-bold text-sm text-amber-200">
            {selectedNode.label}
          </h5>

          {selectedNode.why && (
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              <b className="text-stone-400">连接点研判：</b>
              {selectedNode.why}
            </p>
          )}

          {selectedNode.matchedArticle && onOpenArticle && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onOpenArticle(selectedNode.matchedArticle!)}
                className="px-3 py-1.5 bg-[#0284C7] hover:bg-blue-600 text-white rounded-lg text-xs font-serif font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>直达打开此篇语料库报道</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
