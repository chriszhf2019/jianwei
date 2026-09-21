import React, { useMemo, useState } from 'react';
import { NewsArticle } from '../../types';
import { Flame, Clock, CalendarDays } from 'lucide-react';
import { parseLocalHour } from '../../utils/publishedAt';
import { regionOf } from '../../utils/sourceRegion';
import { primaryMentionRegion } from '../../utils/mentionRegion';

interface ContentArrivalHeatmapProps {
  articles: NewsArticle[];
  onSelectArticleTitle?: (title: string) => void;
}

type Mode = 'hour' | 'day';
type GroupBy = 'source' | 'region' | 'mention';

const SLOTS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function localDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 周${WEEK[d.getDay()]}`;
}

interface Timed {
  article: NewsArticle;
  hour: number | null;
  dateKey: string | null;
}

const COLOR: Record<number, string> = {
  5: 'bg-[#E3120B] text-white font-bold',
  4: 'bg-amber-500 text-stone-950 font-bold',
  3: 'bg-amber-200 text-stone-900 font-medium',
  2: 'bg-stone-200 text-stone-800',
  1: 'bg-stone-100 text-stone-500',
};

interface Cell {
  row: string;
  colRaw: string;
  colLabel: string;
  count: number;
  intensity: number;
  samples: string[];
}

export const SentimentHeatmap24h: React.FC<ContentArrivalHeatmapProps> = ({
  articles,
  onSelectArticleTitle,
}) => {
  const [mode, setMode] = useState<Mode>('hour');
  const [groupBy, setGroupBy] = useState<GroupBy>('source');
  const [selected, setSelected] = useState<Cell | null>(null);

  const { timed, rows, columns, cells } = useMemo(() => {
    const timed: Timed[] = [];
    const now = Date.now();
    // 只统计近 30 天内带真实发布时刻的外部条目，避免历史旧文污染“24h/近7天”到达分布
    for (const a of articles) {
      if (!a.publishedAt) continue;
      const t = new Date(a.publishedAt).getTime();
      if (Number.isNaN(t)) continue;
      if (now - t > 30 * 24 * 3600 * 1000) continue;
      const hour = parseLocalHour(a.publishedAt);
      timed.push({ article: a, hour, dateKey: localDateKey(t) });
    }
    if (timed.length === 0) return { timed, rows: [], columns: [], cells: [] };

    // 行分组：来源站点 或 来源地区（配置表见 src/utils/sourceRegion.ts）
    const groupKeyOf = (article: NewsArticle) =>
      groupBy === 'region'
        ? regionOf(article.sourceName)
        : groupBy === 'mention'
          ? primaryMentionRegion(`${article.title || ''} ${article.summary || ''}`) || '未标注'
          : article.sourceName || '其他';
    const byKey = new Map<string, number>();
    for (const { article } of timed) {
      const s = groupKeyOf(article);
      byKey.set(s, (byKey.get(s) || 0) + 1);
    }
    const top = [...byKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
    const rows = top.length < byKey.size ? [...top, '其他'] : top;
    const rowOf = (s: string) => (top.includes(s) ? s : '其他');

    let columns: string[] = [];
    if (mode === 'hour') {
      columns = SLOTS;
    } else {
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        columns.push(localDateKey(d.getTime()));
      }
    }
    const colOf = (t: Timed): string | null => {
      if (mode === 'hour') {
        if (t.hour === null) return null;
        const s = Math.floor(t.hour / 4) * 4;
        return `${String(s).padStart(2, '0')}:00`;
      }
      return t.dateKey;
    };

    const counts = new Map<string, number>();
    const samples = new Map<string, string[]>();
    for (const t of timed) {
      const c = colOf(t);
      if (!c) continue;
      const key = `${rowOf(groupKeyOf(t.article))}|${c}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      const arr = samples.get(key) || [];
      if (t.article.title && arr.length < 2) arr.push(t.article.title);
      samples.set(key, arr);
    }
    const max = Math.max(...counts.values(), 1);

    const cells: Cell[] = [];
    for (const row of rows) {
      for (const col of columns) {
        const key = `${row}|${col}`;
        const count = counts.get(key) || 0;
        cells.push({
          row,
          colRaw: col,
          colLabel: mode === 'hour' ? col : dayLabel(col),
          count,
          intensity: count === 0 ? 0 : Math.max(1, Math.round((count / max) * 5)),
          samples: samples.get(key) || [],
        });
      }
    }
    return { timed, rows, columns, cells };
  }, [articles, mode, groupBy]);

  const active = useMemo(() => {
    if (selected && cells.some((c) => c.row === selected.row && c.colRaw === selected.colRaw)) {
      return selected;
    }
    const top = cells.reduce<Cell | null>((best, c) => (best === null || c.count > best.count ? c : best), null);
    return top || null;
  }, [selected, cells]);

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              内容到达热力（真实统计）
            </h3>
            <p className="text-xs text-stone-500">
              基于近 30 天内带真实发布时刻的外部条目（{timed.length} 条，历史旧文已排除）；行=来源站点/来源地区/内容涉事地区，列=24h 时段或近 7 天，格内为真实“到达条数”的归一热度。
            </p>
          </div>
        </div>

        {/* Mode switch */}
        <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-300 text-xs font-serif font-bold shrink-0">
          <button
            onClick={() => setMode('hour')}
            className={`px-3 py-1 rounded-md flex items-center space-x-1 transition-all ${
              mode === 'hour' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>24h 时段</span>
          </button>
          <button
            onClick={() => setMode('day')}
            className={`px-3 py-1 rounded-md flex items-center space-x-1 transition-all ${
              mode === 'day' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>近 7 天</span>
          </button>
          <span className="text-stone-300 mx-0.5 hidden sm:inline">|</span>
          <button
            onClick={() => setGroupBy('source')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              groupBy === 'source' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
            title="行=来源站点"
          >
            行：来源
          </button>
          <button
            onClick={() => setGroupBy('region')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              groupBy === 'region' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
            title="行=来源地区（配置表口径）"
          >
            行：地区
          </button>
          <button
            onClick={() => setGroupBy('mention')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              groupBy === 'mention' ? 'bg-stone-900 text-white' : 'text-stone-600'
            }`}
            title="行=内容涉事地区（词典启发式）"
          >
            行：涉事地区
          </button>
        </div>
      </div>

      {timed.length === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs">
          当前语料没有带发布时间戳的条目：请先在设置页配置 RSS 并执行“立即摄取”。
        </div>
      ) : (
        <>
          {/* Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[11px] border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left font-serif font-bold text-stone-600 px-2 py-1">
                    来源 \ {mode === 'hour' ? '时段' : '日期'}
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="font-mono font-bold text-stone-500 px-1 py-1 whitespace-nowrap">
                      {mode === 'hour' ? col : dayLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <td className="text-left font-serif font-bold text-stone-800 px-2 py-1 whitespace-nowrap max-w-[150px] truncate">
                      {row}
                    </td>
                    {cells
                      .filter((c) => c.row === row)
                      .map((c) => (
                        <td key={c.colRaw}>
                          <button
                            onClick={() => setSelected(c)}
                            className={`w-full min-w-[54px] h-10 rounded-lg transition-all ${
                              active && active.row === c.row && active.colRaw === c.colRaw
                                ? 'ring-2 ring-stone-900 scale-[1.03]'
                                : ''
                            } ${COLOR[c.intensity] || 'bg-stone-100 text-stone-500'}`}
                            title={c.count > 0 ? `${c.colLabel} · ${row} 到达 ${c.count} 条` : '无'}
                          >
                            {c.count}
                          </button>
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-stone-500">
            <span>热度分级（按全表峰值归一）：</span>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="flex items-center space-x-1">
                <span className={`w-4 h-4 rounded ${COLOR[i]}`} />
                <span>{i === 5 ? '峰值' : `级${i}`}</span>
              </span>
            ))}
          </div>

          {active && active.count > 0 && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="text-xs font-serif font-bold text-stone-800 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>
                  {active.row} · {active.colLabel}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                  到达 {active.count} 条
                </span>
              </div>
              {active.samples.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {active.samples.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectArticleTitle && onSelectArticleTitle(t)}
                      className="text-[11px] px-2 py-0.5 bg-white border border-stone-300 hover:border-stone-500 rounded-full text-stone-700 text-left"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2">
        意义：观察各来源到达节律与异常高峰（如一次性大批量摄取），用于评估链路稳定性/调度与突发窗口，属可复核口径而非“情绪”类主观指标。
        “来源地区”=信源所在地配置口径（sourceRegion.ts）；“涉事地区”=标题/摘要词典命中启发式（mentionRegion.ts，非实体识别，含误判可能）。
      </p>
    </div>
  );
};
