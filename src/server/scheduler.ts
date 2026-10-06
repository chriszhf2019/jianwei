import { ingestAllFeeds } from "./feeds";
import { appendFeedItems, pruneExternalCorpus } from "./corpus";
import { feedMaxAgeDays, feedUrls } from "./settings";
import { recordAuditEvent } from "./database";

const FEED_INTERVAL_MS = Number(process.env.FEED_INGEST_INTERVAL_MS || 6 * 60 * 60 * 1000);

function scheduledMaxAgeDays(): number {
  const override = process.env.FEED_CLEANUP_MAX_AGE_DAYS;
  if (override != null && override.trim() !== "") {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return feedMaxAgeDays();
}

let running = false;

export async function runScheduledIngest(): Promise<{
  at: string;
  urls: string[];
  added: number;
  mergedSources: number;
  skipped: number;
  errors: string[];
  pruned: number;
  corpusSize: number;
}> {
  const urls = feedUrls();
  if (urls.length === 0) {
    return {
      at: new Date().toISOString(),
      urls,
      added: 0,
      mergedSources: 0,
      skipped: 0,
      errors: [],
      pruned: 0,
      corpusSize: 0,
    };
  }
  if (running) {
    return {
      at: new Date().toISOString(),
      urls,
      added: 0,
      mergedSources: 0,
      skipped: 0,
      errors: ["ingest already running"],
      pruned: 0,
      corpusSize: 0,
    };
  }
  running = true;
  try {
    const { items, result } = await ingestAllFeeds(urls);
    const maxAgeDays = scheduledMaxAgeDays();
    const stats = appendFeedItems(items, maxAgeDays, {
      urls: result.urls,
      errors: result.errors,
      dedupedSkipped: result.skipped,
      sourceResults: result.sourceResults,
    });
    const pruned = pruneExternalCorpus(maxAgeDays);
    recordAuditEvent({
      actor: "scheduler",
      action: "feeds.scheduled_ingest",
      entityType: "feed",
      entityId: result.urls.join(",").slice(0, 160),
      metadata: {
        added: stats.added,
        skipped: stats.skipped,
        errors: result.errors.length,
        pruned,
      },
    });
    return {
      at: result.at,
      urls: result.urls,
      added: stats.added,
      mergedSources: stats.mergedSources,
      skipped: stats.skipped,
      errors: result.errors,
      pruned,
      corpusSize: stats.corpusSize,
    };
  } finally {
    running = false;
  }
}

export function startFeedScheduler(): NodeJS.Timeout {
  // 启动即预热一次：避免打开应用时语料为空、还要等 6h 或手动摄取。
  void runScheduledIngest()
    .then((stats) => {
      console.log(
        `[feeds] boot ingest: added=${stats.added} skipped=${stats.skipped} pruned=${stats.pruned} corpus=${stats.corpusSize} errors=${stats.errors.length}`
      );
    })
    .catch((e) => console.error("boot feed ingest failed:", e));

  const timer = setInterval(() => {
    void runScheduledIngest().catch((e) =>
      console.error("scheduled feed ingest failed:", e)
    );
  }, FEED_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
