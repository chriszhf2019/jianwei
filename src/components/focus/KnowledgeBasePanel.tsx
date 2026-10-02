import React, { useState, useMemo } from 'react';
import { KnowledgeItem } from '../../types';
import {
  BookOpen,
  Search,
  Tag,
  Download,
  Trash2,
  Edit3,
  Check,
  Plus,
  Sparkles,
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  Layers,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from 'lucide-react';

import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface KnowledgeBasePanelProps {
  knowledgeItems: KnowledgeItem[];
  onAddKnowledge?: (item: KnowledgeItem) => void;
  onUpdateKnowledge?: (id: string, updates: Partial<KnowledgeItem>) => void;
  onRemoveKnowledge?: (id: string) => void;
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({
  knowledgeItems,
  onAddKnowledge,
  onUpdateKnowledge,
  onRemoveKnowledge,
  onOpenArticleById,
  onOpenTermExplain,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('AI 与半导体');
  const [newVerdict, setNewVerdict] = useState('');
  const [newTakeaways, setNewTakeaways] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState('战略, 核心沉淀');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    knowledgeItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [knowledgeItems]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return knowledgeItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inVerdict = (item.oneSentenceVerdict || '').toLowerCase().includes(q);
      const inNote = (item.personalNote || '').toLowerCase().includes(q);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
      return inTitle || inVerdict || inNote || inTags;
    });
  }, [knowledgeItems, selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartEditNote = (item: KnowledgeItem) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.personalNote || '');
  };

  const handleSaveNote = (id: string) => {
    if (onUpdateKnowledge) {
      onUpdateKnowledge(id, { personalNote: noteDraft });
    }
    setEditingNoteId(null);
  };

  // Export as Markdown
  const handleExportMarkdown = () => {
    const md = [
      `# 见微 · 战略决策知识库沉淀简报`,
      `导出时间: ${new Date().toLocaleString('zh-CN')}`,
      `共收录 ${filteredItems.length} 条高价值战略认知资产`,
      `\n---\n`,
      ...filteredItems.map((item, idx) => `
### ${idx + 1}. ${item.title}
- **赛道领域**: ${item.category}
- **标签**: ${item.tags.join(', ')}
- **沉淀时间**: ${item.createdAt}
- **一句话研判**: ${item.oneSentenceVerdict}

**核心认知与机制要点**:
${item.keyTakeaways.map((t) => `- ${t}`).join('\n')}

${item.decisionImplication ? `**决策行动指引**:\n${item.decisionImplication}\n` : ''}
${item.personalNote ? `**个人备忘批注**:\n> ${item.personalNote}\n` : ''}
---
`),
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jianwei-knowledge-base-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Submit manual creation
  const handleCreateKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVerdict.trim()) return;

    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      tags: newTags.split(/[,， ]+/).filter(Boolean),
      oneSentenceVerdict: newVerdict.trim(),
      keyTakeaways: newTakeaways.split('\n').filter((t) => t.trim().length > 0),
      personalNote: newNote.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (onAddKnowledge) onAddKnowledge(newItem);
    setShowAddModal(false);
    // Reset
    setNewTitle('');
    setNewVerdict('');
    setNewTakeaways('');
    setNewNote('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 sm:p-7 border-2 border-stone-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-300">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
              Knowledge Ledger
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight">
            个人与企业战略知识库
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            从深度资讯与事实推演中沉淀关键认知、底层机制与决策启示，构建跨周期认知资产。
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>手动录入认知</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            disabled={filteredItems.length === 0}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 border border-stone-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 Markdown</span>
          </button>
        </div>
      </div>

      {/* Stats and Filter Bar */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索知识标题、研判金句、标签或个人备忘…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 transition-colors"
            />
          </div>

          <div className="text-xs font-mono text-stone-500 flex items-center space-x-3">
            <span>
              共沉淀 <strong>{knowledgeItems.length}</strong> 条资产
            </span>
            <span>·</span>
            <span>
              已过滤 <strong>{filteredItems.length}</strong> 条
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-stone-100">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-serif font-bold transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部赛道 ({knowledgeItems.length})
          </button>
          {categories.map((cat) => {
            const count = knowledgeItems.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-serif font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Knowledge Cards List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-stone-300 rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-sm font-serif font-bold text-stone-800">
            {searchQuery || selectedCategory !== 'all' ? '未找到符合条件的知识条目' : '知识库暂未沉淀内容'}
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            在浏览新闻详情时，点击顶部的「📥 沉淀到知识库」按钮，即可将关键事实、推演逻辑与决策启示永久归档至此。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const isEditingNote = editingNoteId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white border-2 border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:shadow-md"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        {item.category}
                      </span>
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200"
                        >
                          #{t}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono text-stone-400 ml-auto sm:ml-0">
                        沉淀于 {item.createdAt}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-serif font-black text-stone-950 leading-snug">
                      <KeyTermHighlight text={item.title} onOpenTermExplain={onOpenTermExplain} />
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-start shrink-0">
                    {item.articleId && onOpenArticleById && (
                      <button
                        onClick={() => onOpenArticleById(item.articleId!)}
                        className="p-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-serif flex items-center gap-1 cursor-pointer"
                        title="查看原始情报"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">原文</span>
                      </button>
                    )}

                    {onRemoveKnowledge && (
                      <button
                        onClick={() => {
                          if (window.confirm(`确定从知识库中移除《${item.title}》吗？`)) {
                            onRemoveKnowledge(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="删除该条目"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
                      title={isExpanded ? '收起详情' : '展开详情'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Verdict Box */}
                <div className="bg-[#FAF8F5] border border-amber-200/80 rounded-xl p-3.5 text-xs text-stone-800 leading-relaxed font-sans flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-950 font-serif font-bold mr-1.5">
                      核心战略研判：
                    </strong>
                    <KeyTermHighlight
                      text={item.oneSentenceVerdict}
                      onOpenTermExplain={onOpenTermExplain}
                    />
                  </div>
                </div>

                {/* Expanded Content: Key Takeaways & Mechanisms */}
                {isExpanded && (
                  <div className="space-y-4 pt-2 border-t border-stone-100 animate-in fade-in duration-200">
                    {/* Key Takeaways */}
                    {item.keyTakeaways && item.keyTakeaways.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                          <span>沉淀认知与机制要点</span>
                        </h4>
                        <div className="space-y-1.5 pl-2">
                          {item.keyTakeaways.map((takeaway, i) => (
                            <div key={i} className="text-xs text-stone-700 flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span className="leading-relaxed">
                                <KeyTermHighlight
                                  text={takeaway}
                                  onOpenTermExplain={onOpenTermExplain}
                                />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Mechanisms & Logic Tree */}
                    {item.coreMechanisms && (
                      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-xs text-purple-950 space-y-1">
                        <span className="font-serif font-bold flex items-center gap-1.5 text-purple-900">
                          <GitBranch className="w-3.5 h-3.5 text-purple-600" />
                          <span>底层逻辑图谱与因果机制：</span>
                        </span>
                        <p className="leading-relaxed pl-4 font-sans text-stone-800">
                          <KeyTermHighlight
                            text={item.coreMechanisms}
                            onOpenTermExplain={onOpenTermExplain}
                          />
                        </p>
                      </div>
                    )}

                    {/* Decision Implication */}
                    {item.decisionImplication && (

                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                        <span className="font-serif font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>战略决策与行动启示：</span>
                        </span>
                        <p className="leading-relaxed pl-4">
                          <KeyTermHighlight
                            text={item.decisionImplication}
                            onOpenTermExplain={onOpenTermExplain}
                          />
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Personal Note & Annotation Footer */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
                      <Edit3 className="w-3 h-3 text-stone-500" />
                      <span>个人决策备忘与批注</span>
                    </span>
                    {!isEditingNote && (
                      <button
                        onClick={() => handleStartEditNote(item)}
                        className="text-[11px] font-serif text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                      >
                        {item.personalNote ? '编辑批注' : '+ 添加批注'}
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="记录您的投资策略、操作假设或后续复盘思考…"
                        rows={3}
                        className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded-md font-serif"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveNote(item.id)}
                          className="px-3 py-1 text-xs bg-stone-900 text-white rounded-md font-serif font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>保存批注</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-600 font-sans leading-relaxed text-[11px] italic">
                      {item.personalNote || '暂无个人批注。点击上方“+ 添加批注”记录此项认知的行动计划。'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border-2 border-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif font-black text-base text-stone-950 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>手动沉淀战略认知条目</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKnowledge} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">认知标题 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：晶圆级封装对未来两年算力集群毛利的实质约束"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-serif font-bold text-stone-800">所属赛道</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                  >
                    <option value="AI 与半导体">AI 与半导体</option>
                    <option value="新能源与出海">新能源与出海</option>
                    <option value="宏观金融与政策">宏观金融与政策</option>
                    <option value="消费电子与数码">消费电子与数码</option>
                    <option value="商业模式与战略">商业模式与战略</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-serif font-bold text-stone-800">标签 (逗号分隔)</label>
                  <input
                    type="text"
                    placeholder="算力, CoWoS, 供应链"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">一句话核心研判 *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="提炼最核心的因果结论或规律判断…"
                  value={newVerdict}
                  onChange={(e) => setNewVerdict(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">
                  关键认知要点 (每行一条)
                </label>
                <textarea
                  rows={3}
                  placeholder="• 瓶颈在封测机台而非单纯晶圆制造&#10;• 价格溢价将持续至2027年"
                  value={newTakeaways}
                  onChange={(e) => setNewTakeaways(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="font-serif font-bold text-stone-800">个人决策备忘</label>
                <textarea
                  rows={2}
                  placeholder="我的操作备忘与应对策略…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-serif font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-serif font-bold shadow-xs cursor-pointer"
                >
                  确认沉淀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
