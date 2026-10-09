import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { NewsArticle, PrimaryNavTab } from '../../types';
import { 
  GitMerge, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ExternalLink, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Compass, 
  Clock, 
  AlertTriangle, 
  Search, 
  Info, 
  CheckCircle2, 
  Radio, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  Share2,
  Maximize2,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

export interface RippleItem {
  horizon: string;
  title: string;
  description: string;
  affectedSectors?: string[];
  confidenceScore?: number;
}

export interface ButterflyNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'root' | 'cause' | 'ripple1' | 'ripple2' | 'ripple3' | 'entity' | 'related_news';
  tierLabel: string;
  timeWindow?: string;
  confidence?: number;
  description: string;
  category?: string;
  matchedArticle?: NewsArticle;
  term?: string;
  radius: number;
  color: string;
  borderColor: string;
  iconSymbol?: string;
}

export interface ButterflyLink extends d3.SimulationLinkDatum<ButterflyNode> {
  source: string | ButterflyNode;
  target: string | ButterflyNode;
  label: string;
  weight?: number;
  dashed?: boolean;
}

interface ButterflyEffectGraphProps {
  article: NewsArticle;
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
  onNavigateTab?: (tab: PrimaryNavTab) => void;
  onSelectTab?: (tab: import('../../types').CognitiveDetailTab) => void;
}

type FilterType = 'all' | 'cause' | 'ripple1' | 'ripple2' | 'ripple3' | 'entity' | 'related_news';

export const ButterflyEffectGraph: React.FC<ButterflyEffectGraphProps> = ({
  article,
  contextArticles = [],
  onOpenArticle,
  onOpenTermExplain,
  onNavigateTab,
  onSelectTab,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [selectedNode, setSelectedNode] = useState<ButterflyNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  const [graphDimensions, setGraphDimensions] = useState({ width: 960, height: 560 });

  // 监听容器宽度自适应
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 960;
        setGraphDimensions({ width: w, height: Math.max(520, Math.min(680, w * 0.58)) });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1. 构建以当前文章 E0 为圆心的“蝴蝶效应”多阶演进网络节点与连线
  const { rawNodes, rawLinks } = useMemo(() => {
    const nodes: ButterflyNode[] = [];
    const links: ButterflyLink[] = [];

    // 0. 种子根节点 (E0 - 当前核心新闻)
    const rootId = `node-root-${article.id}`;
    const rootNode: ButterflyNode = {
      id: rootId,
      label: article.title.length > 18 ? `${article.title.slice(0, 18)}…` : article.title,
      type: 'root',
      tierLabel: '始发种子事件 (E₀)',
      timeWindow: 'T₀ 现时触发',
      confidence: 99,
      description: article.oneSentenceVerdict || article.summary || article.subtitle || article.title,
      category: article.category || '核心新闻',
      matchedArticle: article,
      radius: 34,
      color: '#E3120B',
      borderColor: '#990000',
      iconSymbol: '🦋',
    };
    nodes.push(rootNode);

    // 1. 根本动因与事实锚点节点 (Cause Nodes)
    const whyText = article.sevenElements?.why || article.coreLogic?.essence || '产业周期与供给侧结构调整';
    const causeId = `node-cause-${article.id}`;
    nodes.push({
      id: causeId,
      label: '底层根因：博弈结构性调整',
      type: 'cause',
      tierLabel: '始发驱动因素',
      timeWindow: '前置因果',
      confidence: 95,
      description: `【始发根因】${whyText}`,
      category: '始发因果',
      radius: 24,
      color: '#7c3aed', // Purple
      borderColor: '#5b21b6',
      iconSymbol: '⚡',
    });
    links.push({
      source: causeId,
      target: rootId,
      label: '驱动触发',
      weight: 2,
    });

    // 2. 解析 rippleEffect 及其 stages/firstOrder
    const rippleData = article.rippleEffect as any;
    const stages = article.rippleEffect?.stages || [];
    const stage1 = stages.find((s) => s.stage === '一阶影响' || s.stage?.includes('一阶'));
    const stage2 = stages.find((s) => s.stage === '二阶影响' || s.stage?.includes('二阶'));
    const stage3 = stages.find((s) => s.stage === '三阶影响' || s.stage?.includes('三阶'));

    const r1List: RippleItem[] = rippleData?.firstOrder || (stage1 ? stage1.items.map((itemStr: string) => ({
      horizon: stage1.timeframe || '1-3个月',
      title: itemStr.length > 18 ? `${itemStr.slice(0, 18)}…` : itemStr,
      description: itemStr,
      affectedSectors: ['直接产业'],
      confidenceScore: 88,
    })) : [
      {
        horizon: '1-3个月',
        title: '核心供给侧变动与成本传导',
        description: '直接影响上游核心元器件交付周期与采购协议定价。',
        affectedSectors: ['上游硬件', '核心技术供应链'],
        confidenceScore: 88,
      },
    ]);

    r1List.forEach((r1: RippleItem, idx: number) => {
      const r1Id = `node-r1-${idx}`;
      nodes.push({
        id: r1Id,
        label: r1.title.length > 14 ? `${r1.title.slice(0, 14)}…` : r1.title,
        type: 'ripple1',
        tierLabel: '一阶直接传导 (1st Ripple)',
        timeWindow: r1.horizon || '1-3个月',
        confidence: r1.confidenceScore || 85,
        description: `【一阶直接影响】${r1.description} (受影响领域：${(r1.affectedSectors || []).join('、') || '行业中游'})`,
        category: '直接冲击',
        radius: 22,
        color: '#0284c7', // Cyan / Blue
        borderColor: '#0369a1',
        iconSymbol: '🌊',
      });
      links.push({
        source: rootId,
        target: r1Id,
        label: '一阶波及',
        weight: 1.8,
      });
    });

    // 3. 二阶间接发酵节点 (2nd Order Ripples - 3-12个月)
    const r2List: RippleItem[] = rippleData?.secondOrder || (stage2 ? stage2.items.map((itemStr: string) => ({
      horizon: stage2.timeframe || '3-12个月',
      title: itemStr.length > 18 ? `${itemStr.slice(0, 18)}…` : itemStr,
      description: itemStr,
      affectedSectors: ['下游生态'],
      confidenceScore: 82,
    })) : [
      {
        horizon: '3-12个月',
        title: '竞争格局重构与跨界替代',
        description: '倒逼同行加速国产化研发，引发竞争对手战略转向。',
        affectedSectors: ['竞争对手', '替换供应链'],
        confidenceScore: 82,
      },
    ]);

    r2List.forEach((r2: RippleItem, idx: number) => {
      const r2Id = `node-r2-${idx}`;
      const parentR1Id = `node-r1-${idx % Math.max(1, r1List.length)}`;
      nodes.push({
        id: r2Id,
        label: r2.title.length > 14 ? `${r2.title.slice(0, 14)}…` : r2.title,
        type: 'ripple2',
        tierLabel: '二阶间接发酵 (2nd Ripple)',
        timeWindow: r2.horizon || '3-12个月',
        confidence: r2.confidenceScore || 80,
        description: `【二阶连锁发酵】${r2.description} (受影响领域：${(r2.affectedSectors || []).join('、') || '产业生态'})`,
        category: '竞争与替代',
        radius: 20,
        color: '#ca8a04', // Amber / Gold
        borderColor: '#a16207',
        iconSymbol: '⚡',
      });
      links.push({
        source: parentR1Id,
        target: r2Id,
        label: '级联衍生',
        weight: 1.5,
      });
    });

    // 4. 三阶远期级联节点 (3rd Order Ripples - 1-3年)
    const r3List: RippleItem[] = rippleData?.thirdOrder || (stage3 ? stage3.items.map((itemStr: string) => ({
      horizon: stage3.timeframe || '1-3年',
      title: itemStr.length > 18 ? `${itemStr.slice(0, 18)}…` : itemStr,
      description: itemStr,
      affectedSectors: ['宏观终局'],
      confidenceScore: 75,
    })) : [
      {
        horizon: '1-3年',
        title: '宏观法规与产业终局演变',
        description: '重塑全球科技合规标准与跨国资本重新配置。',
        affectedSectors: ['全球宏观', '监管合规'],
        confidenceScore: 75,
      },
    ]);

    r3List.forEach((r3: RippleItem, idx: number) => {
      const r3Id = `node-r3-${idx}`;
      const parentR2Id = `node-r2-${idx % Math.max(1, r2List.length)}`;
      nodes.push({
        id: r3Id,
        label: r3.title.length > 14 ? `${r3.title.slice(0, 14)}…` : r3.title,
        type: 'ripple3',
        tierLabel: '三阶远期级联 (3rd Order Horizon)',
        timeWindow: r3.horizon || '1-3年',
        confidence: r3.confidenceScore || 75,
        description: `【三阶远期终局】${r3.description} (受影响领域：${(r3.affectedSectors || []).join('、') || '宏观格局'})`,
        category: '宏观终局',
        radius: 18,
        color: '#dc2626', // Red
        borderColor: '#991b1b',
        iconSymbol: '🌀',
      });
      links.push({
        source: parentR2Id,
        target: r3Id,
        label: '长效余波',
        weight: 1.2,
      });
    });

    // 5. 核心实体与认知概念节点 (Entities & Key Concepts)
    const entities = (article.entityMentions || []).slice(0, 4);
    const tags = (article.tags || []).slice(0, 3);
    const combinedTerms = Array.from(
      new Set([
        ...entities.map((e) => e.name),
        ...tags,
        ...(article.sevenElements?.who ? [article.sevenElements.who] : []),
      ])
    ).slice(0, 5);

    combinedTerms.forEach((term, idx) => {
      const entId = `node-entity-${idx}`;
      nodes.push({
        id: entId,
        label: term,
        type: 'entity',
        tierLabel: '认知实体/核心概念',
        timeWindow: '常态认知',
        confidence: 90,
        description: `【核心认知实体】${term}：本文关联的主体实体与战略认知节点，点击可调阅概念图谱或词条释义。`,
        category: '实体词条',
        term: term,
        radius: 17,
        color: '#059669', // Emerald
        borderColor: '#047857',
        iconSymbol: '💡',
      });
      links.push({
        source: rootId,
        target: entId,
        label: '包含实体',
        dashed: true,
        weight: 1.0,
      });
    });

    // 6. 关联上下文新闻条目节点 (Related Corpus Articles)
    const relatedList = article.relatedNews || [];
    const pool = contextArticles.filter((a) => a.id !== article.id);

    relatedList.slice(0, 4).forEach((rel, idx) => {
      const relId = `node-rel-${idx}`;
      const matched = pool.find(
        (cand) => cand.title.includes(rel.title) || rel.title.includes(cand.title)
      ) || pool[idx % Math.max(1, pool.length)];

      nodes.push({
        id: relId,
        label: rel.title.length > 14 ? `${rel.title.slice(0, 14)}…` : rel.title,
        type: 'related_news',
        tierLabel: '跨新闻连带事件',
        timeWindow: '跨时空关联',
        confidence: 85,
        description: `【连带相关新闻】《${rel.title}》— 关联原因：${rel.why || '涉及相同产业链或宏观政策背景'}。点击可跳转至该完整深度简报。`,
        category: '关联情报',
        matchedArticle: matched || ({ id: `ext-${idx}`, title: rel.title, sourceName: rel.media } as NewsArticle),
        radius: 19,
        color: '#2563eb', // Royal Blue
        borderColor: '#1d4ed8',
        iconSymbol: '📰',
      });

      // 智能连接：根据关联原因，连至 Root 或对应的 Ripple 节点
      const targetRId = idx % 2 === 0 ? `node-r1-0` : rootId;
      links.push({
        source: targetRId,
        target: relId,
        label: '跨事件勾连',
        dashed: true,
        weight: 1.1,
      });
    });

    return { rawNodes: nodes, rawLinks: links };
  }, [article, contextArticles]);

  // 根据 Filter 与 SearchTerm 过滤节点
  const { filteredNodes, filteredLinks } = useMemo(() => {
    let nodes = rawNodes;
    if (activeFilter !== 'all') {
      nodes = nodes.filter((n) => n.type === 'root' || n.type === activeFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      nodes = nodes.filter(
        (n) =>
          n.type === 'root' ||
          n.label.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          (n.term && n.term.toLowerCase().includes(q))
      );
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = rawLinks.filter((l) => {
      const sId = typeof l.source === 'string' ? l.source : l.source.id;
      const tId = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(sId) && nodeIds.has(tId);
    });

    return { filteredNodes: nodes, filteredLinks: links };
  }, [rawNodes, rawLinks, activeFilter, searchTerm]);

  // 默认选中 Root 节点
  useEffect(() => {
    if (!selectedNode && rawNodes.length > 0) {
      setSelectedNode(rawNodes[0]);
    }
  }, [rawNodes, selectedNode]);

  // 2. 使用 D3 渲染力导向图 (D3 Simulation & SVG Rendering)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // 清除上一轮 DOM

    const { width, height } = graphDimensions;

    // 创建主 Group 支持 Zoom / Pan
    const g = svg.append('g').attr('class', 'butterfly-graph-content');

    // 配置 Zoom 行为
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // 箭头标记定义 (SVG Markers for links)
    const defs = svg.append('defs');

    // 渐变与阴影 Filter
    const filter = defs.append('filter').attr('id', 'glow-butterfly').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    ['#E3120B', '#0284c7', '#ca8a04', '#dc2626', '#059669', '#2563eb', '#7c3aed'].forEach((color, i) => {
      defs
        .append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // 节点副本浅拷贝深克隆，供 Simulation 使用
    const simNodes: ButterflyNode[] = filteredNodes.map((n) => ({ ...n }));
    const simLinks: ButterflyLink[] = filteredLinks.map((l) => ({
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
      label: l.label,
      dashed: l.dashed,
      weight: l.weight,
    }));

    // 初始化节点位置（以 Root 为中心按层级分布）
    simNodes.forEach((node) => {
      if (node.type === 'root') {
        node.fx = width / 2;
        node.fy = height / 2;
      }
    });

    // 创建 D3 力导向引擎
    const simulation = d3
      .forceSimulation<ButterflyNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<ButterflyNode, ButterflyLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => {
            if (d.weight) return 130 / d.weight;
            return 110;
          })
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('collide', d3.forceCollide<ButterflyNode>().radius((d) => d.radius + 18))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('radial', d3.forceRadial<ButterflyNode>((d) => {
        if (d.type === 'root') return 0;
        if (d.type === 'cause') return 80;
        if (d.type === 'ripple1') return 140;
        if (d.type === 'ripple2') return 210;
        if (d.type === 'ripple3') return 270;
        return 170;
      }, width / 2, height / 2).strength(0.4));

    // 1. 绘制连接线 (Links)
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup
      .selectAll<SVGLineElement, ButterflyLink>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const targetNode = simNodes.find((n) => n.id === (typeof d.target === 'object' ? d.target.id : d.target));
        return targetNode?.color || '#94a3b8';
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => (d.weight ? d.weight * 1.5 : 1.5))
      .attr('stroke-dasharray', (d) => (d.dashed ? '4,4' : 'none'))
      .attr('marker-end', (d, idx) => `url(#arrow-${idx % 7})`);

    // 2. 绘制连接线上的文字标签 (Link Labels)
    const linkLabelGroup = g.append('g').attr('class', 'link-labels');
    const linkText = linkLabelGroup
      .selectAll<SVGTextElement, ButterflyLink>('text')
      .data(simLinks)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .attr('dy', -4);

    // 3. 绘制节点容器 Group (Node Group)
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup
      .selectAll<SVGGElement, ButterflyNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'butterfly-node-item')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, ButterflyNode>()
          .on('start', (event, d) => {
            if (!event.active && isPhysicsActive) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && isPhysicsActive) simulation.alphaTarget(0);
            if (d.type !== 'root') {
              d.fx = null;
              d.fy = null;
            }
          })
      )
      .on('click', (_event, d) => {
        // 查找原始节点契约（含正向数据引用）
        const orig = rawNodes.find((n) => n.id === d.id);
        if (orig) setSelectedNode(orig);
      });

    // Root 节点外发光波纹环 (Pulsing Ripple for Root Event)
    node
      .filter((d) => d.type === 'root')
      .append('circle')
      .attr('r', (d) => d.radius + 12)
      .attr('fill', 'none')
      .attr('stroke', '#E3120B')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('filter', 'url(#glow-butterfly)');

    // 节点圆圈 (Main Node Circle)
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.borderColor)
      .attr('stroke-width', (d) => (d.type === 'root' ? 3 : 2))
      .attr('box-shadow', '0 4px 12px rgba(0,0,0,0.15)');

    // 节点中心 Emoji/Icon 符号
    node
      .append('text')
      .text((d) => d.iconSymbol || '•')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => (d.type === 'root' ? '18px' : '12px'))
      .attr('pointer-events', 'none');

    // 节点下方的文字 Title
    node
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 14)
      .attr('font-size', (d) => (d.type === 'root' ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.type === 'root' ? '800' : '600'))
      .attr('fill', '#1e293b')
      .attr('pointer-events', 'none');

    // 节点上方的时间/层级 Badge
    node
      .append('text')
      .text((d) => d.timeWindow || '')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => -d.radius - 6)
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('fill', '#64748b')
      .attr('pointer-events', 'none');

    // Simulation Tick 帧驱动更新
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as ButterflyNode).x || 0)
        .attr('y1', (d) => (d.source as ButterflyNode).y || 0)
        .attr('x2', (d) => (d.target as ButterflyNode).x || 0)
        .attr('y2', (d) => (d.target as ButterflyNode).y || 0);

      linkText
        .attr('x', (d) => (((d.source as ButterflyNode).x || 0) + ((d.target as ButterflyNode).x || 0)) / 2)
        .attr('y', (d) => (((d.source as ButterflyNode).y || 0) + ((d.target as ButterflyNode).y || 0)) / 2);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    if (!isPhysicsActive) {
      simulation.stop();
    }

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredLinks, graphDimensions, isPhysicsActive, rawNodes]);

  // 重置画布 Viewport
  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs font-sans">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-500 text-stone-950 rounded-lg shadow-2xs">
              <GitMerge className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-black text-stone-950 tracking-tight flex items-center gap-2">
              <span>蝴蝶效应级联认知关联网</span>
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                D3.js 动态交互拓扑
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-serif max-w-2xl">
            以本篇新闻为始发事件 $E_0$，自动关联提取其**底层始发根因、1-3阶级联演进效应、核心认知实体**与**关联外部新闻**。支持点击节点实时跳转阅读或深调。
          </p>
        </div>

        {/* 交互统计徽章 */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="text-right text-[11px] font-mono bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
            <div className="text-stone-500">拓扑节点总数</div>
            <div className="font-bold text-stone-900 text-sm">{filteredNodes.length} 个节点 / {filteredLinks.length} 条连锁关系</div>
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
        {/* Cascade Level Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-serif font-bold text-stone-700 mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-stone-500" />
            <span>级联筛选:</span>
          </span>
          {[
            { id: 'all', label: '全部节点', icon: '🌐' },
            { id: 'cause', label: '始发因果', icon: '⚡' },
            { id: 'ripple1', label: '一阶直接 (1-3月)', icon: '🌊' },
            { id: 'ripple2', label: '二阶间接 (3-12月)', icon: '⚡' },
            { id: 'ripple3', label: '三阶级联 (1-3年)', icon: '🌀' },
            { id: 'entity', label: '认知实体', icon: '💡' },
            { id: 'related_news', label: '关联新闻', icon: '📰' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as FilterType)}
              className={`px-2.5 py-1 rounded-lg font-serif font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                activeFilter === item.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Canvas Zoom Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="搜索节点关键词…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-stone-900 w-36 sm:w-44"
            />
          </div>

          <div className="flex items-center bg-white border border-stone-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={handleZoomIn}
              className="p-1 text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded cursor-pointer"
              title="放大图谱"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded cursor-pointer"
              title="缩小图谱"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded cursor-pointer"
              title="复位视角"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. D3 SVG Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full border-2 border-stone-900 rounded-2xl bg-[#FAF8F5] overflow-hidden shadow-inner min-h-[460px]"
      >
        <svg
          ref={svgRef}
          width={graphDimensions.width}
          height={graphDimensions.height}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Floating Legend Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-stone-200 p-2.5 rounded-xl shadow-md text-[10px] space-y-1 font-serif hidden sm:block pointer-events-none">
          <div className="font-bold text-stone-900 border-b border-stone-100 pb-1 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>蝴蝶效应层级图例</span>
          </div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E3120B]" /><span>始发种子事件 E₀</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" /><span>始发因果逻辑</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /><span>一阶直接冲击 (1-3月)</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ca8a04]" /><span>二阶连锁发酵 (3-12月)</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" /><span>三阶远期终局 (1-3年)</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#059669]" /><span>认知实体 / 概念</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" /><span>关联外部新闻</span></div>
        </div>

        {/* Physics Toggle Overlay */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md border border-stone-200 px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-mono flex items-center space-x-2">
          <button
            onClick={() => setIsPhysicsActive(!isPhysicsActive)}
            className="text-stone-700 hover:text-stone-950 font-bold cursor-pointer flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isPhysicsActive ? 'animate-spin text-emerald-600' : 'text-stone-400'}`} />
            <span>{isPhysicsActive ? '引力学模拟已激活' : '已固定布局'}</span>
          </button>
        </div>
      </div>

      {/* 4. Selected Node Interactive Inspection Drawer (点击节点跳转 & 深度剖析) */}
      {selectedNode && (
        <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="text-xs font-mono font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">
                  {selectedNode.tierLabel}
                </span>
                {selectedNode.timeWindow && (
                  <span className="text-xs font-mono text-stone-600 bg-white border border-stone-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>传导时间窗：{selectedNode.timeWindow}</span>
                  </span>
                )}
                {selectedNode.confidence && (
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                    推演置信度 {selectedNode.confidence}%
                  </span>
                )}
              </div>

              <h4 className="text-lg font-serif font-black text-stone-950 tracking-tight flex items-center gap-2">
                <span>{selectedNode.iconSymbol}</span>
                <span>{selectedNode.label}</span>
              </h4>
            </div>

            {/* Actions Area - KEY REQUIREMENT: Click Node Navigation */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Option 1: Open Matched Article (Jump to related news article) */}
              {selectedNode.matchedArticle && onOpenArticle && (
                <button
                  type="button"
                  onClick={() => onOpenArticle(selectedNode.matchedArticle!)}
                  className="px-4 py-2 bg-[#E3120B] hover:bg-red-700 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer animate-pulse"
                >
                  <span>📖 立即跳转阅读此关联文章</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Option 2: Term Explanation Modal (Jump to cognitive entity graph) */}
              {selectedNode.term && onOpenTermExplain && (
                <button
                  type="button"
                  onClick={() => onOpenTermExplain(selectedNode.term!)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>🔍 调阅「{selectedNode.term}」概念图谱 ↗</span>
                </button>
              )}

              {/* Option 3: Jump to Forecast Arena or Identity Action tab */}
              {(selectedNode.type === 'ripple1' || selectedNode.type === 'ripple2' || selectedNode.type === 'ripple3') && onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab('forecast_arena')}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>🎯 前往未来推演与预测擂台 ↗</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-sm font-sans text-stone-800 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
            {selectedNode.description}
          </p>

          <div className="flex items-center justify-between text-[11px] text-stone-500 font-serif pt-1">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              <span>提示：在拓扑图上按住鼠标拖拽可调整节点位置，滚轮可放大缩小图谱。</span>
            </span>
            <span className="font-mono text-stone-400">Node ID: {selectedNode.id}</span>
          </div>
        </div>
      )}
    </div>
  );
};
