import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FlaskConical, Info, Loader2, RefreshCw, Upload } from 'lucide-react';
import { MethodBadge } from '../common/MethodBadge';

type Task = 'sentiment' | 'event_same';

interface QueueSample {
  key: string;
  task: Task;
  payload: any;
  labelsByAnnotator?: Array<{ annotator: string; label: string }>;
}

interface Summary {
  annotations: number;
  samples: number;
  multiAnnotatedSamples: number;
  consensusSamples: number;
  unresolvedSamples: number;
  adjudicatedSamples: number;
  goldSamples: number;
  modelMacroF1: number | null;
  modelEvaluationStatus?: string;
  krippendorffAlpha: number | null;
  annotators: string[];
}

const LABELS: Record<Task, Array<{ value: string; label: string }>> = {
  sentiment: [
    { value: 'positive', label: '偏正面' },
    { value: 'negative', label: '偏负面' },
    { value: 'neutral', label: '中性' },
    { value: 'mixed', label: '正负交织' },
  ],
  event_same: [
    { value: 'yes', label: '同一事件' },
    { value: 'no', label: '不是同一事件' },
    { value: 'uncertain', label: '无法判断' },
  ],
};

export const EvaluationLabPanel: React.FC = () => {
  const [task, setTask] = useState<Task>('sentiment');
  const [mode, setMode] = useState<'annotation' | 'adjudication'>('annotation');
  const [annotator, setAnnotator] = useState(() => localStorage.getItem('jianwei:evaluation-annotator') || '');
  const [samples, setSamples] = useState<QueueSample[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ composition?: Record<string, number>; warning?: string | null } | null>(null);
  const [goldSets, setGoldSets] = useState<Array<{ task: string; version: string; sampleCount: number; dataHash: string; createdAt: string }>>([]);
  const [goldVersion, setGoldVersion] = useState(`v-${new Date().toISOString().slice(0, 10)}`);
  const importRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');

  const current = useMemo(() => samples[index] || null, [samples, index]);

  const load = async () => {
    const name = annotator.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    try {
      const [queueResponse, summaryResponse, goldResponse] = await Promise.all([
        fetch(`/api/evaluation/queue?task=${task}&mode=${mode}&annotator=${encodeURIComponent(name)}&limit=30`),
        fetch(`/api/evaluation/summary?task=${task}`),
        fetch(`/api/evaluation/gold-sets?task=${task}`),
      ]);
      const queue = await queueResponse.json();
      const stats = await summaryResponse.json();
      if (!queueResponse.ok) throw new Error(queue.error || `HTTP ${queueResponse.status}`);
      setSamples(Array.isArray(queue.samples) ? queue.samples : []);
      setSummary(stats);
      setQueueInfo({ composition: queue.composition, warning: queue.warning });
      const goldData = await goldResponse.json();
      setGoldSets(Array.isArray(goldData.goldSets) ? goldData.goldSets : []);
      setIndex(0);
    } catch (loadError: any) {
      setError(String(loadError?.message || loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, mode]);

  const save = async (label: string) => {
    if (!current || !annotator.trim()) return;
    localStorage.setItem('jianwei:evaluation-annotator', annotator.trim());
    setLoading(true);
    setError('');
    try {
      const response = await fetch(mode === 'adjudication' ? '/api/evaluation/adjudicate' : '/api/evaluation/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          sampleKey: current.key,
          [mode === 'adjudication' ? 'adjudicator' : 'annotator']: annotator.trim(),
          label,
          payload: current.payload,
        }),
      });
      if (!response.ok) throw new Error(`annotation HTTP ${response.status}`);
      if (index + 1 < samples.length) {
        setIndex((value) => value + 1);
      } else {
        await load();
      }
      const stats = await fetch(`/api/evaluation/summary?task=${task}`).then((item) => item.json());
      setSummary(stats);
    } catch (saveError: any) {
      setError(String(saveError?.message || saveError));
    } finally {
      setLoading(false);
    }
  };

  const freezeGoldSet = async () => {
    if (!summary?.goldSamples || !goldVersion.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/evaluation/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, version: goldVersion.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const goldResponse = await fetch(`/api/evaluation/gold-sets?task=${task}`).then((item) => item.json());
      setGoldSets(Array.isArray(goldResponse.goldSets) ? goldResponse.goldSets : []);
    } catch (freezeError: any) {
      setError(String(freezeError?.message || freezeError));
    } finally {
      setLoading(false);
    }
  };

  const downloadQueue = () => {
    if (samples.length === 0) return;
    const payload = {
      schemaVersion: 1,
      task,
      mode,
      generatedAt: new Date().toISOString(),
      samples: samples.map((sample) => ({
        key: sample.key,
        task: sample.task,
        payload: sample.payload,
        labelsByAnnotator: sample.labelsByAnnotator || undefined,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jianwei-evaluation-${task}-${mode}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importAnnotations = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const payload = JSON.parse(await file.text());
      const response = await fetch('/api/evaluation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      await load();
    } catch (importError: any) {
      setError(String(importError?.message || importError));
    } finally {
      setLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-serif font-bold text-stone-950">人工评测台</h3>
            <MethodBadge methodId="human_annotation" compact />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            从真实语料逐条标注。系统只保存人工答案，不生成伪标签；至少两名标注者后才能计算一致性。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={task}
            onChange={(event) => setTask(event.target.value as Task)}
            className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
          >
            <option value="sentiment">情感词典评测</option>
            <option value="event_same">同事件判断</option>
          </select>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as 'annotation' | 'adjudication')}
            className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
          >
            <option value="annotation">独立标注</option>
            <option value="adjudication">分歧裁决</option>
          </select>
          <input
            value={annotator}
            onChange={(event) => setAnnotator(event.target.value)}
            placeholder="标注者名称"
            className="w-32 px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !annotator.trim()}
            className="p-2 border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40"
            title="刷新评测队列"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={downloadQueue}
            disabled={samples.length === 0}
            className="p-2 border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40"
            title="导出当前评测队列"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importAnnotations(file);
            }}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            disabled={loading}
            className="p-2 border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40"
            title="导入离线人工标注 JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {[
            ['标注数', summary.annotations],
            ['覆盖样本', summary.samples],
            ['多人样本', summary.multiAnnotatedSamples],
            ['共识样本', summary.consensusSamples],
            ['已裁决', summary.adjudicatedSamples],
            ['Gold', summary.goldSamples],
            ['名义 α', summary.krippendorffAlpha ?? '暂无'],
            ['模型 Macro-F1', summary.modelMacroF1 ?? '暂无'],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
              <div className="font-mono font-black text-stone-900">{String(value)}</div>
              <div className="text-[10px] text-stone-500 mt-0.5">{String(label)}</div>
            </div>
          ))}
        </div>
      )}

      {queueInfo && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-stone-500">
          <span>当前抽样构成：</span>
          {Object.entries(queueInfo.composition || {}).map(([label, count]) => (
            <span key={label} className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
              {label} {count}
            </span>
          ))}
          {queueInfo.warning && (
            <span className="basis-full text-amber-700">{queueInfo.warning}</span>
          )}
        </div>
      )}

      {goldSets.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-stone-500">已冻结 Gold 集</div>
          {goldSets.map((gold) => (
            <div key={`${gold.task}-${gold.version}`} className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-stone-600 bg-stone-50 border border-stone-200 rounded px-2.5 py-1.5">
              <span>{gold.task} · {gold.version}</span>
              <span>{gold.sampleCount} 条 · {gold.dataHash.slice(0, 12)}…</span>
            </div>
          ))}
        </div>
      )}

      {summary && summary.goldSamples > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
          <span className="text-[11px] text-teal-900 font-serif font-bold">冻结当前 Gold 集</span>
          <input
            value={goldVersion}
            onChange={(event) => setGoldVersion(event.target.value)}
            className="px-2 py-1 rounded border border-teal-200 bg-white text-[11px] font-mono"
          />
          <button
            type="button"
            onClick={() => void freezeGoldSet()}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-[11px] font-bold"
          >
            冻结版本
          </button>
          <span className="text-[10px] text-teal-700">冻结后不可覆盖同一版本。</span>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}

      {!annotator.trim() ? (
        <div className="py-8 text-center text-xs text-stone-400">请输入标注者名称后开始评测。</div>
      ) : current ? (
        <div className="space-y-3">
          <div className="text-[11px] font-mono text-stone-500">
            当前 {index + 1}/{samples.length} · {current.key}
          </div>
          {mode === 'adjudication' && current.labelsByAnnotator && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="font-bold mb-1">标注分歧</div>
              <div className="flex flex-wrap gap-2">
                {current.labelsByAnnotator.map((item) => (
                  <span key={`${item.annotator}-${item.label}`} className="px-2 py-1 rounded bg-white border border-amber-200">
                    {item.annotator}：{item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {task === 'sentiment' ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-sm font-serif font-bold text-stone-950">{current.payload.title}</div>
              <p className="mt-2 text-xs text-stone-700 leading-relaxed">{current.payload.summary}</p>
              <div className="mt-2 text-[10px] text-stone-400 font-mono">
                {current.payload.sourceName || '来源未知'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[current.payload.articleA, current.payload.articleB].map((article: any, articleIndex: number) => (
                <div key={`${article.id}-${articleIndex}`} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="text-[10px] text-stone-400 font-mono">{article.sourceName}</div>
                  <div className="mt-1 text-sm font-serif font-bold text-stone-950">{article.title}</div>
                </div>
              ))}
              <div className="md:col-span-2 text-[10px] text-stone-400 font-mono">
                标题相似 {current.payload.titleSimilarity}% · 文本相似 {current.payload.textSimilarity}% · 时间差 {current.payload.timeDeltaHours ?? '未知'}h
                {typeof current.payload.entitySimilarity === 'number' ? ` · 实体相似 ${current.payload.entitySimilarity}%` : ''}
                {typeof current.payload.candidateScore === 'number' ? ` · 候选排序 ${current.payload.candidateScore}` : ''}
              </div>
              {Array.isArray(current.payload.sharedEntities) && current.payload.sharedEntities.length > 0 && (
                <div className="md:col-span-2 text-[10px] text-stone-500">
                  共同实体：{current.payload.sharedEntities.join('、')}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {LABELS[task].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => void save(option.value)}
                disabled={loading}
                className="px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-teal-50 hover:border-teal-500 disabled:opacity-50 text-xs font-serif font-bold text-stone-800"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-stone-400">
          当前任务没有待处理样本。已有标注不会重复出现，已裁决分歧不会再次进入队列。
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>单次标注不构成科学结论。需要至少两名独立标注者；分歧样本必须人工裁决后才能作为测试真值。</span>
      </div>
    </div>
  );
};
