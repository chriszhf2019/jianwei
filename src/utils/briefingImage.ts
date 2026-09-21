// 简报 PNG 生成：用 Canvas 2D 直接绘制“七要素简报卡”并下载（无第三方依赖，简单可靠）。
// 版式与页内简报卡一致但为轻量版；中文用系统字体；2x 缩放保证清晰度。
import { NewsArticle } from '../types';
import { composeModel } from './sevenElementsBrief';

const W = 820; // 逻辑宽（CSS px），画布按 2x 输出
const PAD = 36;
const INNER = W - PAD * 2;
const FONT_STACK = '-apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 贪心换行：按字符切分（CJK 逐字；连续 ASCII 尽量不断开） */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    const w = ctx.measureText(test).width;
    if (w > maxWidth && cur) {
      out.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

/** 生成简报 PNG 并触发下载 */
export function downloadBriefingPng(article: NewsArticle): void {
  const scale = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = W * scale;
  canvas.height = (W * 0.72) * scale; // 初始高度，实际布局后会按需增加
  ctx.scale(scale, scale);

  // —— 第一步：预布局，统计需要的高度 ——
  const se = article.sevenElements as any;
  const titleLines = (() => {
    ctx.font = font(800, 26);
    return wrapLines(ctx, article.title || '', INNER);
  })();
  const verdictLines = (() => {
    ctx.font = font(400, 14);
    const v = se?.aiVerdict?.verdictSummary ? String(se.aiVerdict.verdictSummary) : '';
    return wrapLines(ctx, v, INNER - 48);
  })();
  const modelLines = (() => {
    ctx.font = font(700, 17);
    const m = se ? composeModel(se) : '';
    return m ? wrapLines(ctx, m, INNER - 48) : [];
  })();

  // 7W 网格条目布局（两列）
  const cols = (() => {
    const colW = (INNER - 16) / 2; // 两列 + 16 gap
    ctx.font = font(400, 13);
    const textMax = colW - 40; // 行内 dot + 缩进
    const items: Array<{ label: string; value: string; lines: string[]; color: string }> = [];
    const map: Array<[string, string, string]> = [
      ['发生了什么', se?.what, '#E3120B'],
      ['涉及主体', se?.who, '#0284C7'],
      ['时间', se?.when, '#f59e0b'],
      ['空间', se?.where, '#059669'],
      ['动因', se?.why, '#7c3aed'],
      ['路径', se?.how, '#2563eb'],
      ['格局影响', se?.soWhat, '#dc2626'],
    ];
    for (const [label, value, color] of map) {
      const v = value ? String(value).trim() : '';
      if (!v) continue;
      const first = `${label}：${v}`;
      items.push({ label, value: v, lines: wrapLines(ctx, first, textMax), color });
    }
    return { colW, textMax, items };
  })();

  const headH = 30;
  const titleH = titleLines.length * 38;
  const verdictH = se?.aiVerdict?.verdictSummary ? 24 + verdictLines.length * 22 : 0;
  const modelH = modelLines.length ? 30 + modelLines.length * 26 : 0;
  const footLines = wrapLines(
    ctx,
    '口径：七要素为事实整理，AI 解读与模型自评分均为辅助推断（非事实裁决）；本卡为速读简化版。',
    INNER
  );
  // 网格高度：把 items 依次放进两列，各自累高
  const colL = [PAD, PAD];
  const rowPad = 8;
  cols.items.forEach((it, i) => {
    const ci = i % 2;
    const linesH = it.lines.length * 20 + 6;
    const slot = Math.max(it.value.length > 0 ? linesH + rowPad : 0, 0);
    colL[ci] += slot;
  });
  const gridH = Math.max(colL[0], colL[1]) - PAD;

  const totalH =
    PAD + headH + 16 + titleH + 14 +
    verdictH + (verdictH ? 14 : 0) +
    modelH + (modelH ? 14 : 0) +
    (cols.items.length ? gridH + 14 : 0) +
    footLines.length * 18 + 20 + PAD;

  canvas.height = Math.ceil(totalH * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // —— 第二步：绘制 ——
  const T_STONE = '#1c1917';
  const T_MUTED = '#78716c';
  const BG = '#ffffff';
  // 背景 + 外框
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, totalH);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 3;
  rr(ctx, 2, 2, W - 4, totalH - 4, 14);
  ctx.stroke();

  let y = PAD;

  // 头部
  ctx.fillStyle = '#E3120B';
  rr(ctx, PAD, y, 24, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = font(800, 15);
  ctx.textBaseline = 'middle';
  ctx.fillText('微', PAD + 24 / 2, y + 12, 24);
  ctx.fillStyle = T_STONE;
  ctx.font = font(800, 17);
  ctx.fillText('见微 Genway · 七要素简报卡', PAD + 34, y + 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = T_MUTED;
  ctx.font = font(400, 11);
  ctx.fillText(
    `${article.sourceName || ''} · ${new Date().toLocaleDateString('zh-CN')}`,
    W - PAD,
    y + 6
  );
  ctx.textAlign = 'left';
  y += headH + 16;

  // 标题
  ctx.textBaseline = 'top';
  ctx.fillStyle = T_STONE;
  ctx.font = font(800, 26);
  for (const ln of titleLines) {
    ctx.fillText(ln, PAD, y);
    y += 38;
  }
  y += 14;

  // AI 解读
  if (verdictLines.length) {
    const boxH = verdictLines.length * 22 + 24;
    ctx.fillStyle = '#1c1917';
    rr(ctx, PAD, y, INNER, boxH, 10);
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = font(700, 13);
    ctx.fillText('AI 解读：', PAD + 16, y + 12);
    ctx.fillStyle = '#e7e5e4';
    ctx.font = font(400, 13);
    const xText = PAD + 16 + ctx.measureText('AI 解读：').width;
    let yy = y + 12;
    for (const ln of verdictLines) {
      ctx.fillText(ln, xText, yy);
      yy += 22;
    }
    y += boxH + 14;
  }

  // 事件模型卡
  if (modelLines.length) {
    const boxH = 18 + 30 + modelLines.length * 26;
    ctx.fillStyle = '#f5f5f4';
    rr(ctx, PAD, y, INNER, boxH, 10);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    rr(ctx, PAD, y + 6, 4, boxH - 12, 2);
    ctx.fill();
    ctx.fillStyle = T_MUTED;
    ctx.font = font(700, 11);
    ctx.fillText('事件模型 · 一页看懂（7W 整合）', PAD + 18, y + 12);
    ctx.fillStyle = '#292524';
    ctx.font = font(700, 17);
    let yy = y + 32;
    for (const ln of modelLines) {
      ctx.fillText(ln, PAD + 18, yy);
      yy += 26;
    }
    y += boxH + 14;
  }

  // 7W 网格
  if (cols.items.length) {
    const colW = cols.colW;
    const colX = [PAD, PAD + colW + 16];
    const cursors = [y, y];
    ctx.font = font(400, 13);
    cols.items.forEach((it, i) => {
      const ci = i % 2;
      const x = colX[ci];
      const top = cursors[ci];
      // dot
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(x + 14, top + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#44403c';
      let ty = top;
      for (const ln of it.lines) {
        ctx.fillText(ln, x + 24, ty);
        ty += 20;
      }
      cursors[ci] = top + it.lines.length * 20 + 12;
    });
    y = Math.max(cursors[0], cursors[1]) + 4;
    y += 10;
  } else {
    ctx.fillStyle = T_MUTED;
    ctx.font = font(400, 13);
    ctx.fillText('（该文尚无七要素数据，AI 深度解读后自动生成完整版）', PAD, y);
    y += 26;
  }

  // 页脚
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.fillStyle = T_MUTED;
  ctx.font = font(400, 10.5);
  y += 10;
  for (const ln of footLines) {
    ctx.fillText(ln, PAD, y);
    y += 16;
  }

  // 下载
  const a = document.createElement('a');
  const safe = (article.id || 'brief').replace(/[^\w\-]/g, '_');
  a.download = `见微简报-${safe}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
