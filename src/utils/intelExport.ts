// 情报导出：把筛选后的文章组合（涉事地区/主体/赛道）生成 CSV。
import { detectSectors } from './sectorTaxonomy';
import type { NewsArticle } from '../types';

function esc(v: unknown): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

export function buildIntelCsv(articles: NewsArticle[]): string {
  const header = ['title', 'source', 'publishedAt', 'primaryRegion', 'regions', 'entities', 'sectors', 'url'];
  const rows = articles.map((a) => {
    const rms = (a.regionMentions || []).slice().sort((x, y) => y.confidence - x.confidence);
    const primary = rms[0]?.region || '';
    return [
      a.title || '',
      a.sourceName || '',
      a.publishedAt || '',
      primary,
      rms.map((r) => `${r.region}:${r.scope}:${Math.round(r.confidence * 100)}%`).join('|'),
      (a.entityMentions || []).map((e) => `${e.name}:${e.type}`).join('|'),
      detectSectors(a).join('|'),
      a.sourceUrl || '',
    ];
  });
  return [header, ...rows].map((row) => row.map(esc).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
