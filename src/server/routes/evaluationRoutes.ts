import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { djb2 } from '../cache';
import { serverCorpus, corpusSortTime, findCorpusArticle } from '../corpus';
import {
  listEvaluationAnnotations,
  listEvaluationAdjudications,
  recordEvaluationAnnotation,
  recordEvaluationAdjudication,
  recordAuditEvent,
  persistEvaluationGoldSet,
  listEvaluationGoldSets,
  loadEvaluationGoldSet,
  importEvaluationRecords,
} from '../database';
import { deriveFromList } from '../../utils/corpusMetrics';
import { findSyndicationCandidates, textOverlap } from '../../utils/syndication';
import { headlineSimilarity } from '../../utils/evidenceProfile';
import { sourceGroupKey } from '../../utils/sourceGrouping';
import { rankEventCandidates } from '../../utils/eventCandidates';
import { krippendorffAlphaNominal, macroF1 } from '../../utils/evaluationMetrics';

export type RateLimiter = (req: Request, res: Response, next: () => void) => void;

export const EVALUATION_LABELS: Record<string, Set<string>> = {
  sentiment: new Set(['positive', 'negative', 'neutral', 'mixed']),
  event_same: new Set(['yes', 'no', 'uncertain']),
};

export function buildEvaluationGold(task: string): {
  labels: Map<string, string>;
  samples: Array<{
    sampleKey: string;
    label: string;
    source: 'consensus' | 'adjudication';
    annotators: string[];
    payload?: unknown;
  }>;
} {
  const annotations = listEvaluationAnnotations(task);
  const adjudications = listEvaluationAdjudications(task);
  const grouped = new Map<string, typeof annotations>();
  for (const annotation of annotations) {
    const items = grouped.get(annotation.sampleKey) || [];
    items.push(annotation);
    grouped.set(annotation.sampleKey, items);
  }
  const labels = new Map<string, string>();
  const samples: Array<{
    sampleKey: string;
    label: string;
    source: 'consensus' | 'adjudication';
    annotators: string[];
    payload?: unknown;
  }> = [];
  for (const [sampleKey, items] of grouped) {
    if (items.length >= 2 && new Set(items.map((item) => item.label)).size === 1) {
      labels.set(sampleKey, items[0].label);
      samples.push({
        sampleKey,
        label: items[0].label,
        source: 'consensus',
        annotators: items.map((item) => item.annotator),
        payload: items.find((item) => item.payload)?.payload,
      });
    }
  }
  const sourceByKey = new Map(samples.map((sample) => [sample.sampleKey, sample]));
  for (const adjudication of adjudications) {
    labels.set(adjudication.sampleKey, adjudication.label);
    const existing = sourceByKey.get(adjudication.sampleKey);
    const item = {
      sampleKey: adjudication.sampleKey,
      label: adjudication.label,
      source: 'adjudication' as const,
      annotators: existing?.annotators || [],
      payload: existing?.payload,
    };
    if (existing) Object.assign(existing, item);
    else samples.push(item);
  }
  samples.sort((a, b) => a.sampleKey.localeCompare(b.sampleKey));
  return { labels, samples };
}

export function stableEvaluationRank(seed: string): number {
  return parseInt(djb2(seed), 36);
}

export function stratifiedArticleSample(articles: any[], limit: number): any[] {
  const strata = new Map<string, any[]>();
  for (const article of articles) {
    const ts = corpusSortTime(article);
    const date = ts ? new Date(ts) : null;
    const month = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unknown';
    const stratum = [
      sourceGroupKey(article.sourceName, article.sourceUrl),
      article.category || '未分类',
      month,
    ].join('|');
    const list = strata.get(stratum) || [];
    list.push(article);
    strata.set(stratum, list);
  }
  const groups = [...strata.values()].map((items) =>
    items.sort((a, b) =>
      stableEvaluationRank(`sentiment:${a.id}`) - stableEvaluationRank(`sentiment:${b.id}`)
    )
  );
  const output: any[] = [];
  for (let round = 0; output.length < limit; round += 1) {
    let advanced = false;
    for (const group of groups) {
      if (group[round]) {
        output.push(group[round]);
        advanced = true;
        if (output.length >= limit) break;
      }
    }
    if (!advanced) break;
  }
  return output;
}

export function registerEvaluationRoutes(app: Express, applyRateLimit: RateLimiter): void {
  app.get('/api/evaluation/queue', applyRateLimit, (req, res) => {
    const task = String(req.query.task || 'sentiment');
    const annotator = String(req.query.annotator || '').trim();
    const mode = String(req.query.mode || 'annotation');
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    if (!EVALUATION_LABELS[task]) return res.status(400).json({ error: 'unsupported task' });
    if (!annotator) return res.status(400).json({ error: 'annotator is required' });

    if (mode === 'adjudication') {
      const annotations = listEvaluationAnnotations(task);
      const adjudicated = new Set(listEvaluationAdjudications(task).map((item) => item.sampleKey));
      const grouped = new Map<string, typeof annotations>();
      for (const annotation of annotations) {
        const items = grouped.get(annotation.sampleKey) || [];
        items.push(annotation);
        grouped.set(annotation.sampleKey, items);
      }
      const samples = [...grouped.entries()]
        .filter(([sampleKey, items]) =>
          items.length >= 2 &&
          new Set(items.map((item) => item.label)).size > 1 &&
          !adjudicated.has(sampleKey)
        )
        .slice(0, limit)
        .map(([sampleKey, items]) => ({
          key: sampleKey,
          task,
          payload: items.find((item) => item.payload)?.payload,
          labelsByAnnotator: items.map((item) => ({ annotator: item.annotator, label: item.label })),
        }));
      return res.json({ task, mode, samples, remaining: samples.length });
    }

    const annotated = new Set(
      listEvaluationAnnotations(task)
        .filter((item) => item.annotator === annotator)
        .map((item) => item.sampleKey)
    );
    if (task === 'sentiment') {
      const eligibleArticles = serverCorpus
        .filter((article) => (article.title || '').trim() && (article.summary || '').trim())
        .filter((article) => !annotated.has(`sentiment:${article.id}`));
      const samples = stratifiedArticleSample(eligibleArticles, limit)
        .flatMap((article) => {
          const key = `sentiment:${article.id}`;
          return [{
            key,
            task,
            stratum: [
              sourceGroupKey(article.sourceName, article.sourceUrl),
              article.category || '未分类',
            ],
            payload: {
              articleId: article.id,
              title: article.title,
              summary: article.summary,
              category: article.category,
              sourceName: article.sourceName,
              sourceUrl: article.sourceUrl,
              publishedAt: article.publishedAt,
            },
          }];
        });
      const composition = {
        totalEligible: eligibleArticles.length,
        sources: new Set(eligibleArticles.map((item) => sourceGroupKey(item.sourceName, item.sourceUrl))).size,
        categories: new Set(eligibleArticles.map((item) => item.category || '未分类')).size,
      };
      return res.json({
        task,
        samples,
        remaining: Math.max(0, eligibleArticles.length),
        composition,
      });
    }

    const eventPool = [...serverCorpus]
      .filter((article) => article.isExternal && article.title && article.sourceUrl)
      .sort((a, b) =>
        stableEvaluationRank(`event:${a.id}`) - stableEvaluationRank(`event:${b.id}`)
      )
      .slice(0, 120);
    const candidateSamples = findSyndicationCandidates(eventPool, 200)
      .flatMap((candidate) => {
        const key = `event:${candidate.articleA.id}:${candidate.articleB.id}`;
        if (annotated.has(key)) return [];
        return [{
          key,
          task,
          modelSignal: candidate.signal,
          payload: {
            articleA: candidate.articleA,
            articleB: candidate.articleB,
            titleSimilarity: candidate.titleSimilarity,
            textSimilarity: candidate.textSimilarity,
            timeDeltaHours: candidate.timeDeltaHours,
          },
        }];
      })
      .slice(0, limit);
    const uncertainSamples: any[] = [];
    const uncertainTarget = Math.floor(limit / 2);
    for (const candidate of rankEventCandidates(eventPool, uncertainTarget * 5, 0.08)) {
      if (uncertainSamples.length >= uncertainTarget) break;
      const key = candidate.id;
      if (
        annotated.has(key) ||
        candidateSamples.some((sample) => sample.key === key) ||
        uncertainSamples.some((sample) => sample.key === key)
      ) continue;
      uncertainSamples.push({
        key,
        task,
        modelSignal: 'similarity_candidate',
        payload: {
          articleA: {
            id: candidate.articleA.id,
            title: candidate.articleA.title,
            sourceName: candidate.articleA.sourceName,
            sourceUrl: candidate.articleA.sourceUrl,
          },
          articleB: {
            id: candidate.articleB.id,
            title: candidate.articleB.title,
            sourceName: candidate.articleB.sourceName,
            sourceUrl: candidate.articleB.sourceUrl,
          },
          titleSimilarity: candidate.titleSimilarity,
          textSimilarity: candidate.textSimilarity,
          entitySimilarity: candidate.entitySimilarity,
          sharedEntities: candidate.sharedEntities,
          candidateScore: candidate.score,
          timeDeltaHours: candidate.timeDeltaHours,
        },
      });
    }
    const neededNegative = Math.max(0, limit - candidateSamples.length - uncertainSamples.length);
    const negativeSamples: any[] = [];
    if (neededNegative > 0) {
      const articles = eventPool;
      for (let i = 0; i < articles.length && negativeSamples.length < neededNegative; i += 1) {
        for (let j = i + 1; j < articles.length && negativeSamples.length < neededNegative; j += 1) {
          const a = articles[i];
          const b = articles[j];
          if (sourceGroupKey(a.sourceName, a.sourceUrl) === sourceGroupKey(b.sourceName, b.sourceUrl)) continue;
          const titleSimilarity = headlineSimilarity(a.title || '', b.title || '');
          const bodySimilarity = textOverlap(
            `${a.title || ''}${a.summary || ''}`,
            `${b.title || ''}${b.summary || ''}`
          );
          if (titleSimilarity >= 0.2 || bodySimilarity >= 0.2) continue;
          const ids = [a.id, b.id].sort();
          const key = `event:${ids[0]}:${ids[1]}`;
          if (
            annotated.has(key) ||
            candidateSamples.some((sample) => sample.key === key) ||
            uncertainSamples.some((sample) => sample.key === key)
          ) continue;
          negativeSamples.push({
            key,
            task,
            modelSignal: 'negative_control',
            payload: {
              articleA: { id: a.id, title: a.title, sourceName: a.sourceName, sourceUrl: a.sourceUrl },
              articleB: { id: b.id, title: b.title, sourceName: b.sourceName, sourceUrl: b.sourceUrl },
              titleSimilarity: Math.round(titleSimilarity * 100),
              textSimilarity: Math.round(bodySimilarity * 100),
              timeDeltaHours: null,
            },
          });
        }
      }
    }
    const samples = [...candidateSamples, ...uncertainSamples, ...negativeSamples].slice(0, limit);
    const composition = {
      yes: candidateSamples.filter((sample) =>
        ['duplicate_url', 'known_same_group'].includes(String(sample.modelSignal))
      ).length,
      no: negativeSamples.length,
      uncertain:
        candidateSamples.filter((sample) =>
          !['duplicate_url', 'known_same_group'].includes(String(sample.modelSignal))
        ).length + uncertainSamples.length,
    };
    res.json({
      task,
      samples,
      remaining: samples.length,
      composition,
      warning: composition.yes === 0
        ? '当前语料没有可确认的同事件正例，只能评测反例和不确定样本；不能据此估计同事件召回率。'
        : null,
    });
  });

  app.post('/api/evaluation/adjudicate', applyRateLimit, (req, res) => {
    const task = String(req.body?.task || '');
    const sampleKey = String(req.body?.sampleKey || '').trim();
    const adjudicator = String(req.body?.adjudicator || '').trim();
    const label = String(req.body?.label || '').trim();
    if (!EVALUATION_LABELS[task] || !sampleKey || !adjudicator || !EVALUATION_LABELS[task].has(label)) {
      return res.status(400).json({ error: 'invalid adjudication payload' });
    }
    recordEvaluationAdjudication({
      task,
      sampleKey,
      adjudicator,
      label,
      notes: typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 1000) : undefined,
    });
    recordAuditEvent({
      actor: adjudicator,
      action: 'evaluation.adjudicate',
      entityType: 'evaluation',
      entityId: sampleKey,
      metadata: { task, label },
    });
    res.json({ ok: true });
  });

  app.post('/api/evaluation/annotate', applyRateLimit, (req, res) => {
    const task = String(req.body?.task || '');
    const sampleKey = String(req.body?.sampleKey || '').trim();
    const annotator = String(req.body?.annotator || '').trim();
    const label = String(req.body?.label || '').trim();
    if (!EVALUATION_LABELS[task] || !sampleKey || !annotator || !EVALUATION_LABELS[task].has(label)) {
      return res.status(400).json({ error: 'invalid annotation payload' });
    }
    recordEvaluationAnnotation({
      task,
      sampleKey,
      annotator,
      label,
      payload: req.body?.payload,
    });
    recordAuditEvent({
      actor: annotator,
      action: 'evaluation.annotate',
      entityType: 'evaluation',
      entityId: sampleKey,
      metadata: { task, label },
    });
    res.json({ ok: true });
  });

  app.get('/api/evaluation/summary', applyRateLimit, (req, res) => {
    const task = String(req.query.task || 'sentiment');
    if (!EVALUATION_LABELS[task]) return res.status(400).json({ error: 'unsupported task' });
    const annotations = listEvaluationAnnotations(task);
    const adjudications = listEvaluationAdjudications(task);
    const bySample = new Map<string, string[]>();
    for (const annotation of annotations) {
      const labels = bySample.get(annotation.sampleKey) || [];
      labels.push(annotation.label);
      bySample.set(annotation.sampleKey, labels);
    }
    const multi = [...bySample.values()].filter((labels) => labels.length >= 2);
    const consensus = multi.filter((labels) => new Set(labels).size === 1).length;
    const alpha = krippendorffAlphaNominal([...bySample.values()]);
    const gold = buildEvaluationGold(task);
    const goldLabels = gold.labels;

    let modelMacroF1: number | null = null;
    if (goldLabels.size > 0) {
      const predictions: Array<{ expected: string; predicted: string }> = [];
      const eventConfirmedKeys =
        task === 'event_same'
          ? new Set(findSyndicationCandidates(serverCorpus, 500).map((item) => item.id))
          : new Set<string>();
      const eventUncertainKeys =
        task === 'event_same'
          ? new Set(rankEventCandidates(serverCorpus, 500, 0.08).map((item) => item.id))
          : new Set<string>();
      for (const [sampleKey, expected] of goldLabels) {
        if (task === 'sentiment') {
          const articleId = sampleKey.replace(/^sentiment:/, "");
          const article = findCorpusArticle(articleId);
          if (!article) continue;
          const derived = deriveFromList([article]);
          const predicted =
            derived.mixed > 0 ? 'mixed' :
            derived.positive > derived.negative ? 'positive' :
            derived.negative > derived.positive ? 'negative' :
            'neutral';
          predictions.push({ expected, predicted });
        } else {
          const predicted = eventConfirmedKeys.has(sampleKey)
            ? 'yes'
            : eventUncertainKeys.has(sampleKey)
              ? 'uncertain'
              : 'no';
          predictions.push({ expected, predicted });
        }
      }
      const observedLabels = [...new Set(predictions.map((item) => item.expected))];
      if (predictions.length > 0 && observedLabels.length >= 2) {
        modelMacroF1 = Math.round(macroF1(predictions, observedLabels) * 1000) / 1000;
      }
    }
    res.json({
      task,
      annotations: annotations.length,
      samples: bySample.size,
      multiAnnotatedSamples: multi.length,
      consensusSamples: consensus,
      unresolvedSamples: multi.length - consensus,
      adjudicatedSamples: adjudications.length,
      goldSamples: goldLabels.size,
      modelMacroF1,
      modelEvaluationStatus:
        modelMacroF1 == null
          ? 'insufficient_class_coverage'
          : 'computed_on_gold_samples',
      krippendorffAlpha: alpha == null ? null : Math.round(alpha * 1000) / 1000,
      annotators: [...new Set(annotations.map((item) => item.annotator))],
    });
  });

  app.post('/api/evaluation/freeze', applyRateLimit, (req, res) => {
    const task = String(req.body?.task || '');
    const version = String(req.body?.version || '').trim();
    if (!EVALUATION_LABELS[task] || !/^[a-zA-Z0-9._-]{1,40}$/.test(version)) {
      return res.status(400).json({ error: 'task and safe version are required' });
    }
    const gold = buildEvaluationGold(task);
    if (gold.samples.length === 0) {
      return res.status(409).json({ error: 'no_gold_samples_to_freeze' });
    }
    const payload = {
      schemaVersion: 1,
      task,
      version,
      frozenAt: new Date().toISOString(),
      labels: [...gold.labels.entries()].map(([sampleKey, label]) => ({ sampleKey, label })),
      samples: gold.samples,
    };
    const dataHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    try {
      const result = persistEvaluationGoldSet({ task, version, dataHash, payload });
      recordAuditEvent({
        actor: 'local',
        action: 'evaluation.freeze',
        entityType: 'gold_set',
        entityId: `${task}:${version}`,
        metadata: { dataHash, sampleCount: result.sampleCount },
      });
      res.json({ ok: true, task, version, dataHash, ...result });
    } catch (error: any) {
      if (String(error?.message || error).includes('UNIQUE')) {
        return res.status(409).json({ error: 'gold_set_version_exists' });
      }
      res.status(500).json({ error: 'failed_to_freeze_gold_set' });
    }
  });

  app.get('/api/evaluation/gold-sets', applyRateLimit, (req, res) => {
    const task = typeof req.query.task === 'string' && req.query.task ? req.query.task : undefined;
    res.json({ goldSets: listEvaluationGoldSets(task) });
  });

  app.get('/api/evaluation/gold-sets/:task/:version', applyRateLimit, (req, res) => {
    const payload = loadEvaluationGoldSet(String(req.params.task), String(req.params.version));
    if (!payload) return res.status(404).json({ error: 'gold_set_not_found' });
    res.json(payload);
  });

  app.post('/api/evaluation/import', applyRateLimit, (req, res) => {
    const annotations = Array.isArray(req.body?.annotations) ? req.body.annotations.slice(0, 5000) : [];
    const adjudications = Array.isArray(req.body?.adjudications) ? req.body.adjudications.slice(0, 1000) : [];
    if (annotations.length === 0 && adjudications.length === 0) {
      return res.status(400).json({ error: 'no records to import' });
    }
    const cleanAnnotations = annotations.map((item: any) => ({
      task: String(item?.task || ''),
      sampleKey: String(item?.sampleKey || '').trim().slice(0, 240),
      annotator: String(item?.annotator || '').trim().slice(0, 80),
      label: String(item?.label || '').trim(),
      payload: item?.payload === undefined ? undefined : JSON.parse(JSON.stringify(item.payload)),
    }));
    const cleanAdjudications = adjudications.map((item: any) => ({
      task: String(item?.task || ''),
      sampleKey: String(item?.sampleKey || '').trim().slice(0, 240),
      adjudicator: String(item?.adjudicator || '').trim().slice(0, 80),
      label: String(item?.label || '').trim(),
      notes: typeof item?.notes === 'string' ? item.notes.slice(0, 1000) : undefined,
    }));
    const invalidAnnotation = cleanAnnotations.some((item: any) =>
      !EVALUATION_LABELS[item.task] ||
      !item.sampleKey ||
      !item.annotator ||
      !EVALUATION_LABELS[item.task].has(item.label) ||
      (item.payload !== undefined && JSON.stringify(item.payload).length > 50_000)
    );
    const invalidAdjudication = cleanAdjudications.some((item: any) =>
      !EVALUATION_LABELS[item.task] ||
      !item.sampleKey ||
      !item.adjudicator ||
      !EVALUATION_LABELS[item.task].has(item.label)
    );
    if (invalidAnnotation || invalidAdjudication) {
      return res.status(400).json({ error: 'invalid import record' });
    }
    try {
      const result = importEvaluationRecords({
        annotations: cleanAnnotations,
        adjudications: cleanAdjudications,
      });
      recordAuditEvent({
        actor: 'local',
        action: 'evaluation.import',
        entityType: 'evaluation',
        entityId: 'transaction',
        metadata: result,
      });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) });
    }
  });
}
