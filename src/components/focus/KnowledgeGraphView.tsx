import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { KnowledgeItem } from '../../types';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Tag,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  GitBranch,
  X,
  Search,
  Filter,
  Info,
} from 'lucide-react';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface KnowledgeGraphViewProps {
  knowledgeItems: KnowledgeItem[];
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'item' | 'tag' | 'category';
  category?: string;
  val: number; // size
  itemData?: KnowledgeItem;
  color: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  relation: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI 与半导体': '#E3120B', // Crimson
  '新能源与出海': '#059669', // Emerald
  '宏观金融与政策': '#2563EB', // Blue
  '消费电子与数码': '#D97706', // Amber
  '商业模式与战略': '#7C3AED', // Purple
  '综合战略': '#4B5563', // Gray
};

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  knowledgeItems,
  onOpenArticleById,
  onOpenTermExplain,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [linkDistance, setLinkDistance] = useState<number>(90);
  const [chargeStrength, setChargeStrength] = useState<number>(-220);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    knowledgeItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [knowledgeItems]);

  // Build Graph Data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    const filteredItems = knowledgeItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        (item.oneSentenceVerdict || '').toLowerCase().includes(q)
      );
    });

    // 1. Add Category Nodes
    const activeCats = new Set<string>();
    filteredItems.forEach((i) => activeCats.add(i.category || '综合战略'));

    activeCats.forEach((cat) => {
      const catId = `cat-${cat}`;
      if (!nodeIds.has(catId)) {
        nodeIds.add(catId);
        nodes.push({
          id: catId,
          name: cat,
          type: 'category',
          category: cat,
          val: 28,
          color: CATEGORY_COLORS[cat] || '#4B5563',
        });
      }
    });

    // 2. Add Knowledge Item Nodes and connect to Category
    filteredItems.forEach((item) => {
      const itemId = item.id;
      if (!nodeIds.has(itemId)) {
        nodeIds.add(itemId);
        nodes.push({
          id: itemId,
          name: item.title,
          type: 'item',
          category: item.category,
          val: 20,
          itemData: item,
          color: CATEGORY_COLORS[item.category] || '#E3120B',
        });

        // Link Item -> Category
        const catId = `cat-${item.category || '综合战略'}`;
        links.push({
          source: itemId,
          target: catId,
          value: 2,
          relation: '归属赛道',
        });
      }

      // 3. Add Tag Nodes and connect to Item
      item.tags.forEach((tag) => {
        const tagId = `tag-${tag}`;
        if (!nodeIds.has(tagId)) {
          nodeIds.add(tagId);
          nodes.push({
            id: tagId,
            name: `#${tag}`,
            type: 'tag',
            category: item.category,
            val: 12,
            color: '#64748B',
          });
        }

        links.push({
          source: itemId,
          target: tagId,
          value: 1,
          relation: '包含标签',
        });
      });
    });

    // 4. Connect cross-item shared tags or related themes
    for (let i = 0; i < filteredItems.length; i++) {
      for (let j = i + 1; j < filteredItems.length; j++) {
        const itemA = filteredItems[i];
        const itemB = filteredItems[j];
        const sharedTags = itemA.tags.filter((t) => itemB.tags.includes(t));
        if (sharedTags.length > 0) {
          links.push({
            source: itemA.id,
            target: itemB.id,
            value: 3,
            relation: `共振: ${sharedTags.join(' & ')}`,
          });
        }
      }
    }

    return { nodes, links };
  }, [knowledgeItems, selectedCategory, searchQuery]);

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 560;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100% ')
      .attr('height', height);

    // Create container group for zoom/pan
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial zoom center
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
    );

    // Force Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphData.links)
          .id((d) => d.id)
          .distance((d) => (d.relation.startsWith('共振') ? linkDistance * 1.3 : linkDistance))
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.val + 14));

    // Links Render
    const link = g
      .append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', (d) => (d.relation.startsWith('共振') ? '#E3120B' : '#CBD5E1'))
      .attr('stroke-width', (d) => (d.relation.startsWith('共振') ? 2.5 : 1.2))
      .attr('stroke-dasharray', (d) => (d.relation.startsWith('共振') ? '4 2' : 'none'));

    // Link Labels (hover tooltip)
    link.append('title').text((d) => d.relation);

    // Node Drag Functions
    const drag = (sim: d3.Simulation<GraphNode, GraphLink>) => {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3
        .drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    // Nodes Render
    const node = g
      .append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', 'cursor-pointer select-none')
      .call(drag(simulation) as any);


    // Outer Glow / Ring for items
    node
      .filter((d) => d.type === 'item')
      .append('circle')
      .attr('r', (d) => d.val + 4)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.2);

    // Main Node Circle
    node
      .append('circle')
      .attr('r', (d) => d.val)
      .attr('fill', (d) => (d.type === 'tag' ? '#F1F5F9' : d.color))
      .attr('stroke', (d) => (d.type === 'tag' ? '#94A3B8' : '#1E293B'))
      .attr('stroke-width', (d) => (d.type === 'category' ? 3 : d.type === 'item' ? 2 : 1.5))
      .attr('class', 'transition-transform duration-200 hover:scale-110');

    // Icon or Label inside Node
    node
      .filter((d) => d.type === 'category')
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-serif, Georgia, serif')
      .attr('font-weight', 'bold');

    // Text Label below or beside Node
    node
      .append('text')
      .text((d) => {
        if (d.type === 'category') return '';
        return d.name.length > 14 ? `${d.name.slice(0, 13)}…` : d.name;
      })
      .attr('x', (d) => (d.type === 'item' ? 0 : 0))
      .attr('y', (d) => (d.type === 'item' ? d.val + 14 : d.val + 11))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.type === 'item' ? '#0F172A' : '#475569'))
      .attr('font-size', (d) => (d.type === 'item' ? '11px' : '9px'))
      .attr('font-weight', (d) => (d.type === 'item' ? '700' : '500'))
      .attr('font-family', 'ui-serif, Georgia, serif')
      .style('pointer-events', 'none');

    // Click handler: select node
    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    // Hover Highlight Behavior
    node
      .on('mouseenter', function (event, d) {
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(d.id);

        link.each(function (l) {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sId === d.id) connectedNodeIds.add(tId);
          if (tId === d.id) connectedNodeIds.add(sId);
        });

        node.attr('opacity', (n) => (connectedNodeIds.has(n.id) ? 1 : 0.25));
        link.attr('opacity', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return sId === d.id || tId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseleave', function () {
        node.attr('opacity', 1);
        link.attr('opacity', 0.6);
      });

    // Simulation Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, linkDistance, chargeStrength]);

  const handleResetZoom = () => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = 560;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(500)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
      );
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 border-2 border-stone-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-red-600/20 text-[#E3120B]">
              <Network className="w-4 h-4 text-red-400" />
            </span>
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
              D3 Knowledge Graph Visualizer
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight">
            知识资产因果图谱 · 拓扑脉络全景
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            基于 D3.js 力导向算法，将沉淀的研判条目、共振标签与产业赛道构建为可交互的节点关系网络。
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-serif font-bold flex items-center space-x-1 border border-stone-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置拓扑视角</span>
          </button>
        </div>
      </div>

      {/* Graph Controls & Legend Bar */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索拓扑图中的条目、标签或研判…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
            />
          </div>

          {/* Physics Adjustment Sliders */}
          <div className="flex items-center space-x-4 text-xs font-mono text-stone-600">
            <div className="flex items-center space-x-1.5">
              <span>引力间距:</span>
              <input
                type="range"
                min="50"
                max="160"
                value={linkDistance}
                onChange={(e) => setLinkDistance(Number(e.target.value))}
                className="w-20 accent-red-600 cursor-pointer"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span>斥力强度:</span>
              <input
                type="range"
                min="-400"
                max="-100"
                value={chargeStrength}
                onChange={(e) => setChargeStrength(Number(e.target.value))}
                className="w-20 accent-red-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Category Pills & Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
          <span className="font-serif font-bold text-stone-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>赛道过滤：</span>
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部赛道 ({knowledgeItems.length})
          </button>
          {categories.map((cat) => {
            const count = knowledgeItems.filter((i) => i.category === cat).length;
            const color = CATEGORY_COLORS[cat] || '#4B5563';
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
                style={{ backgroundColor: isSelected ? color : undefined }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{cat}</span>
                <span className="text-[10px] font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Graph Canvas & Sidebar Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* D3 Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-2 bg-[#FAF8F5] border-2 border-stone-800 rounded-2xl relative overflow-hidden shadow-xs min-h-[560px] flex items-center justify-center"
        >
          {knowledgeItems.length === 0 ? (
            <div className="text-center p-8 space-y-3">
              <Network className="w-10 h-10 text-stone-400 mx-auto animate-pulse" />
              <p className="text-sm font-serif font-bold text-stone-700">暂无知识节点可渲染</p>
              <p className="text-xs text-stone-500 max-w-sm">
                在新闻详情页中点击「沉淀到知识库」，系统将在此自动建立脉络图谱。
              </p>
            </div>
          ) : (
            <>
              <svg ref={svgRef} className="w-full h-[560px] cursor-grab active:cursor-grabbing" />
              {/* Canvas Overlay Tips */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-stone-200 px-3 py-1.5 rounded-lg text-[11px] font-mono text-stone-600 shadow-2xs flex items-center space-x-2 pointer-events-none">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>滚轮缩放 / 拖拽平移 / 点击节点查看全貌</span>
              </div>
            </>
          )}
        </div>

        {/* Selected Node Inspector Drawer */}
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: selectedNode.color }}
                    >
                      {selectedNode.type === 'category'
                        ? '赛道中心'
                        : selectedNode.type === 'item'
                        ? '沉淀认知'
                        : '关联标签'}
                    </span>
                    {selectedNode.category && (
                      <span className="text-[10px] font-mono text-stone-500 font-bold">
                        {selectedNode.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-serif font-black text-stone-950 leading-snug">
                    {selectedNode.name}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  title="关闭详情"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Item Specific Content */}
              {selectedNode.type === 'item' && selectedNode.itemData ? (
                <div className="space-y-3.5 text-xs">
                  {/* Verdict */}
                  <div className="bg-[#FAF8F5] border border-amber-300 rounded-xl p-3 text-stone-900 space-y-1">
                    <div className="font-serif font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>核心战略研判：</span>
                    </div>
                    <p className="leading-relaxed font-sans">
                      <KeyTermHighlight
                        text={selectedNode.itemData.oneSentenceVerdict}
                        onOpenTermExplain={onOpenTermExplain}
                      />
                    </p>
                  </div>

                  {/* Mechanisms */}
                  {selectedNode.itemData.coreMechanisms && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-purple-950 space-y-1">
                      <div className="font-serif font-bold flex items-center gap-1 text-purple-900">
                        <GitBranch className="w-3.5 h-3.5 text-purple-600" />
                        <span>逻辑传导因果链：</span>
                      </div>
                      <p className="leading-relaxed font-sans text-stone-800">
                        <KeyTermHighlight
                          text={selectedNode.itemData.coreMechanisms}
                          onOpenTermExplain={onOpenTermExplain}
                        />
                      </p>
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {selectedNode.itemData.keyTakeaways && (
                    <div className="space-y-1.5">
                      <div className="font-serif font-bold text-stone-900 flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        <span>核心要点与机制：</span>
                      </div>
                      <div className="space-y-1 pl-2">
                        {selectedNode.itemData.keyTakeaways.map((t, idx) => (
                          <div key={idx} className="text-stone-700 leading-relaxed flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Implication */}
                  {selectedNode.itemData.decisionImplication && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-950 space-y-1">
                      <div className="font-serif font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>决策启示：</span>
                      </div>
                      <p className="leading-relaxed pl-2 text-stone-800">
                        {selectedNode.itemData.decisionImplication}
                      </p>
                    </div>
                  )}

                  {/* Action Link to Article */}
                  {selectedNode.itemData.articleId && onOpenArticleById && (
                    <button
                      onClick={() => onOpenArticleById(selectedNode.itemData!.articleId!)}
                      className="w-full mt-2 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl font-serif font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>打开完整深度情报原文</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : selectedNode.type === 'category' ? (
                <div className="space-y-3 text-xs text-stone-600">
                  <p>
                    这是 <strong>{selectedNode.name}</strong> 产业赛道的枢纽节点，聚合了属于该赛道的所有战略研判与技术共振点。
                  </p>
                  <div className="font-mono text-[11px] text-stone-500">
                    共连接 {knowledgeItems.filter((i) => i.category === selectedNode.name).length} 条认知条目。
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-stone-600">
                  <p>
                    标签 <strong>{selectedNode.name}</strong> 跨越了多个产业条目，代表了关键的行业共性特征或技术机制。
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3 text-stone-400">
              <Network className="w-8 h-8 mx-auto text-stone-300" />
              <h4 className="font-serif font-bold text-stone-700 text-sm">点击左侧图谱节点</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                选择任意赛道、标签或研判节点，在此处展开其因果脉络、核心论断与决策启示。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
