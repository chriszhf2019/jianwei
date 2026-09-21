import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Copy, Check, Sparkles, Share2, Layers, AlertCircle, Eye, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { NewsArticle, UserPersona } from '../../types';
import { formatArticleTime } from '../../utils/articleTime';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { mediaProfile, tierBadge } from '../../utils/mediaAuthority';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle | null;
  selectedPersona?: UserPersona;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen,
  onClose,
  article,
  selectedPersona,
}) => {
  useEscapeClose(isOpen, onClose);
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !article) return null;

  const prof = mediaProfile(article.sourceName, article.sourceUrl);
  const badge = prof ? tierBadge(prof.tier) : null;
  const personaImpactObj = selectedPersona
    ? article.personaImpacts?.find((p) => p.personaId === selectedPersona.id)
    : null;

  const handleCopyText = () => {
    const personaSection = selectedPersona && personaImpactObj
      ? `\n👤 【${selectedPersona.name}】视角：\n- 核心影响：${personaImpactObj.coreImpact}${personaImpactObj.recommendedAction ? `\n- 建议行动：${personaImpactObj.recommendedAction}` : ''}\n`
      : '';
    const text = `【见微商业情报透镜 · 决策备忘】\n《${article.title}》\n\n📌 核心提炼 (So What)：\n${article.oneSentenceVerdict || article.summary || article.subtitle || '深度解析完成'}${personaSection}\n🔍 所属赛道：${article.category}\n🏛 信源等级：${badge ? `${badge.label} (${prof?.displayName || article.sourceName})` : article.sourceName || '公开媒体信源'}\n⏱ 记录时间：${formatArticleTime(article)}\n\n💡 更多因果树与资产传导推演：见微 Genway`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      // 动态使用 Canvas 2D 绘制精美报刊卡片并输出下载
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 2;
      const width = 640;
      const pad = 36;
      const innerW = width - pad * 2;

      // 文本折行辅助函数
      const wrapText = (text: string, maxWidth: number, font: string): string[] => {
        ctx.font = font;
        const chars = text.split('');
        const lines: string[] = [];
        let line = '';
        for (const char of chars) {
          if (char === '\n') {
            lines.push(line);
            line = '';
            continue;
          }
          if (ctx.measureText(line + char).width > maxWidth) {
            lines.push(line);
            line = char;
          } else {
            line += char;
          }
        }
        if (line) lines.push(line);
        return lines;
      };

      const titleLines = wrapText(article.title, innerW, 'bold 22px serif');
      const verdict = article.oneSentenceVerdict || article.summary || article.subtitle || '';
      const verdictLines = wrapText(verdict, innerW - 32, '15px serif');

      // 提取身份专属视角与建议行动
      const personaImpact = personaImpactObj?.coreImpact || null;
      const personaAction = personaImpactObj?.recommendedAction || null;
      const personaLines = personaImpact ? wrapText(personaImpact, innerW - 32, '13px sans-serif') : [];
      const actionLines = personaAction ? wrapText(`行动指引：${personaAction}`, innerW - 32, 'bold 12px sans-serif') : [];

      // 计算高度
      const personaBoxHeight = personaLines.length > 0 
        ? (personaLines.length * 20 + (actionLines.length > 0 ? actionLines.length * 18 + 12 : 0) + 42) 
        : 0;
      const estimatedHeight = 110 + titleLines.length * 30 + 36 + verdictLines.length * 24 + personaBoxHeight + 150;

      canvas.width = width * scale;
      canvas.height = estimatedHeight * scale;
      ctx.scale(scale, scale);

      // 背景 (经典报刊暖灰)
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, width, estimatedHeight);

      // 边框
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, width - 16, estimatedHeight - 16);

      // 顶部 Header
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(8, 8, width - 16, 52);

      // 红色微标
      ctx.fillStyle = '#E3120B';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pad, 16, 32, 32, 6);
      } else {
        ctx.rect(pad, 16, 32, 32);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px serif';
      ctx.fillText('微', pad + 8, 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px serif';
      ctx.fillText('见微 Genway · 决策情报透镜', pad + 42, 38);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#a8a29e';
      ctx.fillText(formatArticleTime(article), width - pad - 80, 38);

      // 赛道分类胶囊 + 信源权威档位胶囊
      let y = 84;
      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pad, y, 84, 24, 4);
      } else {
        ctx.rect(pad, y, 84, 24);
      }
      ctx.fill();

      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, y, 84, 24);

      ctx.fillStyle = '#E3120B';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(article.category || '商业情报', pad + 12, y + 16);

      // 信源级别胶囊
      const sourceTag = badge ? badge.label : (article.sourceName || '公开信源');
      ctx.font = 'bold 11px sans-serif';
      const sourceTagW = Math.min(180, ctx.measureText(sourceTag).width + 24);
      const sourceTagX = pad + 92;

      ctx.fillStyle = badge?.label.includes('A') ? '#ecfdf5' : '#f0f9ff';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(sourceTagX, y, sourceTagW, 24, 4);
      } else {
        ctx.rect(sourceTagX, y, sourceTagW, 24);
      }
      ctx.fill();

      ctx.strokeStyle = badge?.label.includes('A') ? '#a7f3d0' : '#bae6fd';
      ctx.strokeRect(sourceTagX, y, sourceTagW, 24);

      ctx.fillStyle = badge?.label.includes('A') ? '#065f46' : '#0369a1';
      ctx.fillText(sourceTag, sourceTagX + 10, y + 16);

      // 标题
      y += 44;
      ctx.fillStyle = '#0c0a09';
      ctx.font = 'bold 22px serif';
      for (const l of titleLines) {
        ctx.fillText(l, pad, y);
        y += 28;
      }

      // So What 解读盒子
      y += 12;
      const boxH = Math.max(76, verdictLines.length * 24 + 44);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(pad, y, innerW, boxH);
      ctx.strokeStyle = '#e7e5e4';
      ctx.strokeRect(pad, y, innerW, boxH);

      // 红色装饰竖条
      ctx.fillStyle = '#E3120B';
      ctx.fillRect(pad, y, 4, boxH);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#E3120B';
      ctx.fillText('核心提炼 · SO WHAT', pad + 16, y + 22);

      ctx.font = '14px serif';
      ctx.fillStyle = '#1c1917';
      let vy = y + 42;
      for (const vl of verdictLines) {
        ctx.fillText(vl, pad + 16, vy);
        vy += 22;
      }

      // 身份专属视角盒子 (若有)
      if (personaLines.length > 0 && selectedPersona) {
        y += boxH + 12;
        const pBoxH = personaLines.length * 20 + (actionLines.length > 0 ? actionLines.length * 18 + 12 : 0) + 40;
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(pad, y, innerW, pBoxH);
        ctx.strokeStyle = '#fde68a';
        ctx.strokeRect(pad, y, innerW, pBoxH);

        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`👤 【${selectedPersona.name}】专属应对透镜`, pad + 16, y + 20);

        ctx.fillStyle = '#78350f';
        ctx.font = '13px sans-serif';
        let py = y + 38;
        for (const pl of personaLines) {
          ctx.fillText(pl, pad + 16, py);
          py += 20;
        }

        // 行动建议渲染
        if (actionLines.length > 0) {
          ctx.fillStyle = '#92400e';
          ctx.font = 'bold 12px sans-serif';
          py += 4;
          for (const al of actionLines) {
            ctx.fillText(al, pad + 16, py);
            py += 18;
          }
        }

        y += pBoxH;
      } else {
        y += boxH;
      }

      // 底部溯源印证区
      y += 24;
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();

      y += 20;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#78716c';
      const sourceDisplay = prof ? `${prof.displayName} (${prof.type})` : (article.sourceName || '公开媒体信源');
      ctx.fillText(`出处归档：${sourceDisplay}`, pad, y);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('✓ 逻辑因果链与信源双审校', width - pad - 165, y);

      y += 18;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#a8a29e';
      ctx.fillText('见微 · 专业商业情报与因果推演 | 朋友圈 / 即刻 / 行业群决策备忘', pad, y);

      // 触发下载
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `见微情报卡-${article.title.slice(0, 16)}.png`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-lg bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-serif font-bold">生成见微情报分享卡（社交传播）</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Preview Container */}
          <div className="p-5 overflow-y-auto flex-1">
            <div
              ref={cardRef}
              className="bg-white border-2 border-stone-900 rounded-xl p-5 shadow-sm space-y-4 font-serif text-stone-900 relative"
            >
              {/* Header Bar inside card */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-[#E3120B] text-white font-serif font-black text-xs flex items-center justify-center">
                    微
                  </div>
                  <div>
                    <span className="text-sm font-black text-stone-950">见微 · 商业情报透镜</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-stone-500">
                  {formatArticleTime(article)}
                </div>
              </div>

              {/* Tag + Title + Source Tier */}
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="inline-block text-[11px] font-bold text-[#E3120B] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {article.category}
                  </span>
                  {badge && (
                    <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  {prof && (
                    <span className="text-[11px] text-stone-500 font-sans">
                      {prof.displayName}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-black text-stone-950 leading-snug">
                  {article.title}
                </h4>
              </div>

              {/* So What Verdict Box */}
              <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-3.5 rounded-r-lg">
                <div className="text-[10px] font-bold text-[#E3120B] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>核心提炼 (SO WHAT)</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed">
                  “{article.oneSentenceVerdict || article.summary || article.subtitle || '深度解读完成'}”
                </p>
              </div>

              {/* Persona specific insight box with Recommended Action */}
              {selectedPersona && personaImpactObj && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 text-stone-900 space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5 font-sans">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>【{selectedPersona.name}】专属应对透镜</span>
                  </div>
                  <p className="text-xs font-serif font-medium text-amber-950 leading-relaxed">
                    {personaImpactObj.coreImpact}
                  </p>
                  {personaImpactObj.recommendedAction && (
                    <div className="text-[11px] font-sans font-bold text-amber-900 bg-amber-100/70 border border-amber-300/60 rounded px-2 py-1 flex items-start gap-1">
                      <span className="shrink-0 text-amber-800">行动指引：</span>
                      <span>{personaImpactObj.recommendedAction}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Ripple / Transmission Preview if available */}
              {article.rippleEffect?.stages && article.rippleEffect.stages.length > 0 && (
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-600" />
                    <span>二级传导与连锁推演</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {article.rippleEffect.stages.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="bg-white p-1.5 rounded border border-stone-200">
                        <span className="text-[10px] font-mono text-purple-700 font-bold block">{s.stage}</span>
                        <span className="text-stone-700 line-clamp-1">{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500 font-sans">
                <span>出处：{prof?.displayName || article.sourceName || '权威全景信源'}</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>逻辑因果链已核验</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center mt-3">
              专为微信朋友圈、即刻与高管行业群设计：用可落地的专业因果逻辑代替浮夸信息噪音。
            </p>
          </div>

          {/* Action Bar */}
          <div className="bg-stone-100 px-5 py-3 border-t border-stone-200 flex items-center justify-between gap-3">
            <button
              onClick={handleCopyText}
              className="flex-1 py-2 px-3 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已复制决策摘要' : '复制决策备忘'}</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={downloading}
              className="flex-1 py-2 px-3 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? '正在生成…' : '保存高清长图'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
