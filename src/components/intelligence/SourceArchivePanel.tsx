import React, { useEffect, useState } from 'react';
import { Archive, Info } from 'lucide-react';

interface SourceArchiveEntry {
  checkKey: string;
  sourceUrl: string;
  status: string;
  contentHash: string | null;
  checkedAt: string;
  claimReviewCount: number;
}

interface SourceArchiveResponse {
  entries?: SourceArchiveEntry[];
  note?: string;
}

export const SourceArchivePanel: React.FC = () => {
  const [data, setData] = useState<SourceArchiveResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/source/archive')
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as SourceArchiveResponse | null;
        return { ok: response.ok, payload };
      })
      .then(({ ok, payload }) => {
        if (!alive) return;
        if (!payload || !Array.isArray(payload.entries)) {
          setFailed(true);
          return;
        }
        setData(payload);
        setFailed(!ok);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const entries = data?.entries || [];

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-sky-700" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">来源页面档案</h3>
            <p className="text-xs text-stone-500">
              只列出已经抓取并保存正文的页面。ClaimReview 只在页面自带 schema.org 标记时记入。
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-stone-500">{entries.length} 条快照</span>
      </div>

      {failed ? (
        <p className="text-xs text-amber-800">{data?.note || '来源页面档案暂时读不出来。'}</p>
      ) : !data ? (
        <p className="py-6 text-center text-xs text-stone-400">正在读取来源页面档案。</p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-stone-400">
          {data.note || '还没有已保存的来源页面。'}
        </p>
      ) : (
        <div className="space-y-2">
          {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
          {entries.map((entry) => (
            <a
              key={entry.checkKey}
              href={entry.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-stone-200 bg-stone-50 p-3 hover:border-sky-400"
            >
              <div className="text-xs font-mono text-stone-700 truncate">{entry.sourceUrl}</div>
              <div className="mt-1 text-[10px] font-mono text-stone-500">
                {entry.checkedAt.slice(0, 16).replace('T', ' ')}
                {entry.contentHash ? ` · 指纹 ${entry.contentHash.slice(0, 12)}` : ''}
                {entry.claimReviewCount > 0 ? ` · ClaimReview ${entry.claimReviewCount} 条` : ' · 无 ClaimReview 标记'}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>这里是已抓取页面的快照索引，不是政府或公司原始文件库。没有 ClaimReview 标记时不补结论。</span>
      </div>
    </div>
  );
};
