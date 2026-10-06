import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { parseArticleDate } from "../../utils/articleTime";
import { summarizeListedSpend, type ListedSpend } from "../../utils/aiPriceTable";
import { predictionDueInfo } from "../../utils/predictionLedger";
import { NO_PERSIST } from "../settings";
import {
  openDatabase,
  closeDatabase,
  databasePath,
  databaseFile,
  databaseCacheEpoch,
  articleSearchEnabled,
  articleSearchBody,
  articleSortTime,
  noopStatement,
} from "./connection";

export function recordEvaluationAnnotation(input: {
  task: string;
  sampleKey: string;
  annotator: string;
  label: string;
  payload?: unknown;
}): void {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO evaluation_annotations (
        task, sample_key, annotator, label, payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task, sample_key, annotator) DO UPDATE SET
        label = excluded.label,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run(
      input.task,
      input.sampleKey,
      input.annotator,
      input.label,
      input.payload === undefined ? null : JSON.stringify(input.payload),
      now,
      now
    );
}

export function listEvaluationAnnotations(task: string): Array<{
  task: string;
  sampleKey: string;
  annotator: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  payload?: unknown;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT task, sample_key AS sampleKey, annotator, label, payload,
           created_at AS createdAt, updated_at AS updatedAt
    FROM evaluation_annotations
    WHERE task = ?
    ORDER BY sample_key, annotator
  `).all(task) as any[]).map((row) => ({
    task: String(row.task),
    sampleKey: String(row.sampleKey),
    annotator: String(row.annotator),
    label: String(row.label),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    payload: row.payload ? JSON.parse(String(row.payload)) : undefined,
  }));
}

export function recordEvaluationAdjudication(input: {
  task: string;
  sampleKey: string;
  adjudicator: string;
  label: string;
  notes?: string;
}): void {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO evaluation_adjudications (
        task, sample_key, adjudicator, label, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task, sample_key) DO UPDATE SET
        adjudicator = excluded.adjudicator,
        label = excluded.label,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(
      input.task,
      input.sampleKey,
      input.adjudicator,
      input.label,
      input.notes || null,
      now,
      now
    );
}

export function listEvaluationAdjudications(task: string): Array<{
  task: string;
  sampleKey: string;
  adjudicator: string;
  label: string;
  notes?: string;
  updatedAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  return (db.prepare(`
    SELECT task, sample_key AS sampleKey, adjudicator, label, notes, updated_at AS updatedAt
    FROM evaluation_adjudications
    WHERE task = ?
    ORDER BY sample_key
  `).all(task) as any[]).map((row) => ({
    task: String(row.task),
    sampleKey: String(row.sampleKey),
    adjudicator: String(row.adjudicator),
    label: String(row.label),
    notes: row.notes ? String(row.notes) : undefined,
    updatedAt: String(row.updatedAt),
  }));
}

export function importEvaluationRecords(input: {
  annotations: Array<{
    task: string;
    sampleKey: string;
    annotator: string;
    label: string;
    payload?: unknown;
  }>;
  adjudications: Array<{
    task: string;
    sampleKey: string;
    adjudicator: string;
    label: string;
    notes?: string;
  }>;
}): { annotations: number; adjudications: number } {
  const db = openDatabase();
  const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      const annotationStatement = db.prepare(`
        INSERT INTO evaluation_annotations (
          task, sample_key, annotator, label, payload, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task, sample_key, annotator) DO UPDATE SET
          label = excluded.label,
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `);
      const adjudicationStatement = db.prepare(`
        INSERT INTO evaluation_adjudications (
          task, sample_key, adjudicator, label, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task, sample_key) DO UPDATE SET
          adjudicator = excluded.adjudicator,
          label = excluded.label,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `);
      for (const item of input.annotations) {
        annotationStatement.run(
          item.task,
          item.sampleKey,
          item.annotator,
          item.label,
          item.payload === undefined ? null : JSON.stringify(item.payload),
          now,
          now
        );
      }
      for (const item of input.adjudications) {
        adjudicationStatement.run(
          item.task,
          item.sampleKey,
          item.adjudicator,
          item.label,
          item.notes || null,
          now,
          now
        );
      }
      db.exec("COMMIT");
      return {
        annotations: input.annotations.length,
        adjudications: input.adjudications.length,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
}

export function persistEvaluationGoldSet(input: {
  task: string;
  version: string;
  dataHash: string;
  payload: unknown;
}): { sampleCount: number; createdAt: string } {
  const db = openDatabase();
  const createdAt = new Date().toISOString();
  const sampleCount = Array.isArray((input.payload as any)?.samples)
    ? (input.payload as any).samples.length
    : 0;
    db.prepare(`
      INSERT INTO evaluation_gold_sets (
        task, version, sample_count, data_hash, payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.task,
      input.version,
      sampleCount,
      input.dataHash,
      JSON.stringify(input.payload),
      createdAt
    );
  return { sampleCount, createdAt };
}

export function listEvaluationGoldSets(task?: string): Array<{
  task: string;
  version: string;
  sampleCount: number;
  dataHash: string;
  createdAt: string;
}> {
  if (!fs.existsSync(databasePath())) return [];
  const db = openDatabase();
  const rows = task
    ? db.prepare(`
        SELECT task, version, sample_count AS sampleCount, data_hash AS dataHash, created_at AS createdAt
        FROM evaluation_gold_sets
        WHERE task = ?
        ORDER BY created_at DESC
      `).all(task)
    : db.prepare(`
        SELECT task, version, sample_count AS sampleCount, data_hash AS dataHash, created_at AS createdAt
        FROM evaluation_gold_sets
        ORDER BY created_at DESC
      `).all();
  return (rows as any[]).map((row) => ({
    task: String(row.task),
    version: String(row.version),
    sampleCount: Number(row.sampleCount),
    dataHash: String(row.dataHash),
    createdAt: String(row.createdAt),
  }));
}

export function loadEvaluationGoldSet(task: string, version: string): any | null {
  if (!fs.existsSync(databasePath())) return null;
  const db = openDatabase();
  const row = db.prepare(`
    SELECT payload FROM evaluation_gold_sets WHERE task = ? AND version = ?
  `).get(task, version) as { payload?: string } | undefined;
  return row?.payload ? JSON.parse(row.payload) : null;
}

