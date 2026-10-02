import { NewsArticle } from '../types';
import { formatArticleTime } from './articleTime';
import { detectSectors } from './sectorTaxonomy';

/**
 * 将单篇新闻的结构化事实、因果树、演变时序、博弈及建议整合为标准的 Markdown 决策简报
 */
export function generateStructuredMarkdown(article: NewsArticle): string {
  const timeStr = formatArticleTime(article);
  const sectors = detectSectors(article).join(', ') || article.category || '综合宏观';
  const plainTongsu = typeof article.tongsuSummary === 'string'
    ? article.tongsuSummary
    : article.tongsuSummary?.simpleSay || '';

  let md = `# 【见微战略情报简报】${article.title}\n\n`;
  md += `> **生成时间**：${new Date().toLocaleString('zh-CN')}  \n`;
  md += `> **权威信源**：${article.sourceName || '公开权威信源'} ｜ **发布时间**：${timeStr} ｜ **所属赛道**：${sectors}  \n`;
  md += `> **原文链接**：${article.sourceUrl || '内部语料库'}  \n\n`;

  md += `---\n\n`;

  // 1. 一句话核心结论与定性
  md += `## 🎯 核心定性与一句话结论\n\n`;
  md += `**【战略裁决】** ${article.oneSentenceVerdict || article.summary || '暂无战略裁决'}\n\n`;
  if (article.subtitle) {
    md += `*副标题/关键补充：${article.subtitle}*\n\n`;
  }

  // 2. 事实全貌与摘要
  md += `## 📰 事实全貌与内容摘要\n\n`;
  md += `${article.summary || plainTongsu || '暂无详细摘要内容。'}\n\n`;

  if (article.coreQuote) {
    md += `> 💬 **核心原话**：“${article.coreQuote}” —— ${article.quoteAuthor || '涉事方发言人'}\n\n`;
  }

  // 3. 事件全生命周期演变脉络 (前因 ➔ 当前 ➔ 未来)
  md += `## ⏳ 事件全生命周期演变脉络 (Evolution Timeline)\n\n`;
  
  if (article.backstoryTimeline && article.backstoryTimeline.length > 0) {
    md += `### 📜 1. 前因与溯源 (Antecedents & Historical Context)\n`;
    article.backstoryTimeline.forEach((item, idx) => {
      md += `- **[${item.date || `节点 ${idx + 1}`}] ${item.event}**：${item.relevance || ''}\n`;
    });
    md += `\n`;
  } else {
    md += `### 📜 1. 前因与溯源 (Antecedents & Historical Context)\n`;
    md += `- **前序发酵期 (T-180D ~ T-30D)**：底层技术专利预研与地缘经贸规则前期酝酿，上下游提前锁定供应链关键产能。\n\n`;
  }

  md += `### ⚡ 2. 当前核心突破与关键节点 (Current Milestones & Pivots)\n`;
  md += `- **当前实质突破 (T0)**：${article.title}。${article.summary || ''}\n\n`;

  if (article.rippleEffect && article.rippleEffect.stages && article.rippleEffect.stages.length > 0) {
    md += `### 🔮 3. 潜在未来触发点与级联推演 (Future Triggers & Ripple Effects)\n`;
    article.rippleEffect.stages.forEach((stage) => {
      md += `- **${stage.stage} (${stage.timeframe} · 严重度：${stage.severity})**：${stage.title}\n`;
      stage.items.forEach((it) => {
        md += `  * ${it}\n`;
      });
    });
    md += `\n`;
  }

  // 4. 底层逻辑与多方博弈 (Logic Tree & Stakeholders)
  if (article.logicTree) {
    md += `## 🌲 底层因果逻辑树 (Core Logic Tree)\n\n`;
    md += `- **始发根因 (Root Cause)**：${article.logicTree.rootCause}\n`;
    if (article.logicTree.nodes && article.logicTree.nodes.length > 0) {
      article.logicTree.nodes.forEach((n) => {
        md += `- **[${n.category === 'cause' ? '根因' : n.category === 'mid_effect' ? '传导' : '影响'}] ${n.label}**：${n.description} ${n.dataPoint ? `(数据支撑: ${n.dataPoint})` : ''}\n`;
      });
    }
    md += `\n`;
  }

  if (article.bullBearDebate) {
    md += `## ⚖️ 多空博弈与分歧论战 (Bull vs Bear Debate)\n\n`;
    if (article.bullBearDebate.coreDispute) {
      md += `> **核心争议焦点**：${article.bullBearDebate.coreDispute}\n\n`;
    }
    if (article.bullBearDebate.bull && article.bullBearDebate.bull.length > 0) {
      md += `### 🟢 多方观点 (Bullish Perspective)\n`;
      article.bullBearDebate.bull.forEach((b) => {
        md += `- ${b.point} ${b.basis ? `*(依据: ${b.basis})*` : ''}\n`;
      });
      md += `\n`;
    }
    if (article.bullBearDebate.bear && article.bullBearDebate.bear.length > 0) {
      md += `### 🔴 空方/风险观点 (Bearish & Risk Perspective)\n`;
      article.bullBearDebate.bear.forEach((b) => {
        md += `- ${b.point} ${b.basis ? `*(依据: ${b.basis})*` : ''}\n`;
      });
      md += `\n`;
    }
  }

  // 5. 分角色行动建议
  if (article.personaImpacts && article.personaImpacts.length > 0) {
    md += `## 📋 专属决策行动建议 (Action Recommendations)\n\n`;
    article.personaImpacts.forEach((pi) => {
      md += `### 👤 视角：${String(pi.personaId).toUpperCase()}\n`;
      md += `- **核心冲击**：${pi.coreImpact}\n`;
      md += `- **机会敞口**：${pi.opportunity}\n`;
      md += `- **风险防线**：${pi.threatRisk}\n`;
      md += `- **建议行动**：${pi.recommendedAction}\n\n`;
    });
  }

  md += `---\n`;
  md += `*本简报由【见微 · 深度战略情报研判系统】自动结构化生成，供高管决策与线下归档参考。*\n`;

  return md;
}

/**
 * 触发浏览器下载 Markdown 简报
 */
export function downloadMarkdownBriefing(article: NewsArticle): void {
  const mdContent = generateStructuredMarkdown(article);
  const blob = new Blob(['\ufeff' + mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (article.title || '情报简报').slice(0, 30).replace(/[\\/:*?"<>|]/g, '_');
  link.href = url;
  link.download = `见微情报简报_${safeTitle}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 触发高保真 PDF 打印或导出窗口
 */
export function exportBriefingAsPdf(article: NewsArticle): void {
  const timeStr = formatArticleTime(article);
  const sectors = detectSectors(article).join(', ') || article.category || '综合宏观';
  const plainTongsu = typeof article.tongsuSummary === 'string'
    ? article.tongsuSummary
    : article.tongsuSummary?.simpleSay || '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>见微战略情报简报 - ${article.title}</title>
  <style>
    @page {
      size: A4;
      margin: 1.8cm 1.5cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      color: #1C1917;
      background: #FFFFFF;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 20px;
    }
    .header {
      border-bottom: 3px solid #E3120B;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand {
      color: #E3120B;
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .title {
      font-size: 18pt;
      font-weight: 900;
      color: #0C0A09;
      margin: 10px 0 6px 0;
      line-height: 1.3;
    }
    .meta {
      font-size: 9pt;
      color: #78716C;
      font-family: monospace;
    }
    .verdict-box {
      background: #FAF8F5;
      border-left: 4px solid #E3120B;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .verdict-title {
      font-weight: bold;
      color: #E3120B;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 13pt;
      font-weight: 800;
      color: #1C1917;
      border-bottom: 1px solid #E7E5E4;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
    }
    .timeline-item {
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 2px solid #D6D3D1;
    }
    .timeline-tag {
      font-weight: bold;
      color: #0C0A09;
      font-size: 10pt;
    }
    .quote-box {
      background: #F5F5F4;
      padding: 10px 14px;
      border-radius: 6px;
      font-style: italic;
      color: #44403C;
      margin: 12px 0;
      font-size: 10pt;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }
    .card {
      border: 1px solid #E7E5E4;
      padding: 10px 12px;
      border-radius: 6px;
      background: #FAFAFA;
      font-size: 9.5pt;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E7E5E4;
      padding-top: 10px;
      font-size: 8pt;
      color: #A8A29E;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">JIANWEI INTELLIGENCE · 见微战略情报简报</div>
    <div class="title">${article.title}</div>
    <div class="meta">
      信源：${article.sourceName || '公开权威信源'} ｜ 时间：${timeStr} ｜ 赛道：${sectors} ｜ 归档编号：#${article.id.slice(0, 8)}
    </div>
  </div>

  <div class="verdict-box">
    <div class="verdict-title">🎯 核心战略裁决 (Executive Verdict)</div>
    <div>${article.oneSentenceVerdict || article.summary || '暂无定性裁决'}</div>
  </div>

  <div class="section-title">📰 内容事实与背景全貌</div>
  <p>${article.summary || plainTongsu || '暂无详细正文摘要。'}</p>

  ${article.coreQuote ? `<div class="quote-box">“${article.coreQuote}” —— ${article.quoteAuthor || '涉事方发言人'}</div>` : ''}

  <div class="section-title">⏳ 全生命周期演变脉络 (Evolution Timeline)</div>
  <div class="timeline-item">
    <div class="timeline-tag">📜 1. 前因与溯源 (Antecedents & Roots)</div>
    <div style="font-size: 9.5pt; color: #57534E; margin-top: 2px;">
      ${article.backstoryTimeline?.[0]?.event || '前期技术预研积累与地缘经贸规则前期酝酿，上下游提前布局产能。'}
    </div>
  </div>

  <div class="timeline-item" style="border-left-color: #E3120B;">
    <div class="timeline-tag" style="color: #E3120B;">⚡ 2. 当前核心关键节点 (Current Milestone)</div>
    <div style="font-size: 9.5pt; color: #1C1917; margin-top: 2px;">
      ${article.title}。${article.summary || ''}
    </div>
  </div>

  <div class="timeline-item" style="border-left-color: #8B5CF6;">
    <div class="timeline-tag" style="color: #6D28D9;">🔮 3. 潜在未来触发点 (Future Triggers & Ripple Effects)</div>
    <div style="font-size: 9.5pt; color: #57534E; margin-top: 2px;">
      ${article.rippleEffect?.stages?.[0]?.items?.[0] || '未来需密切关注大客户验证反馈、量产良品率爬坡与跨国反制动作。'}
    </div>
  </div>

  ${article.logicTree ? `
  <div class="section-title">🌲 底层因果逻辑树 (Core Logic Tree)</div>
  <div class="card">
    <div><strong>始发根因：</strong>${article.logicTree.rootCause}</div>
    ${article.logicTree.nodes?.slice(0, 2).map((n) => `<div style="margin-top: 4px;"><strong>${n.label}：</strong>${n.description}</div>`).join('') || ''}
  </div>
  ` : ''}

  ${article.bullBearDebate ? `
  <div class="section-title">⚖️ 多空分歧与博弈论战 (Bull vs Bear Debate)</div>
  <div class="grid-2">
    <div class="card" style="border-color: #A7F3D0; background: #ECFDF5;">
      <strong style="color: #065F46;">🟢 多方利好论点：</strong>
      <p style="margin: 4px 0 0 0;">${article.bullBearDebate.bull?.[0]?.point || '技术突破确立市场优势'}</p>
    </div>
    <div class="card" style="border-color: #FECDD3; background: #FFF1F2;">
      <strong style="color: #9F1239;">🔴 空方风险论点：</strong>
      <p style="margin: 4px 0 0 0;">${article.bullBearDebate.bear?.[0]?.point || '警惕良品率与商业化不及预期'}</p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    见微 · 深度战略情报研判系统 ｜ 内部绝密决策归档文件 ｜ 打印生成时间：${new Date().toLocaleString('zh-CN')}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
