import express from "express";
import { registerAnnotationRoutes } from "./src/server/annotations";
import { registerDeepEndpoints } from "./src/server/deepEndpoints";
import { registerAnalysisRoutes } from "./src/server/routes/analysisRoutes";
import { registerEvaluationRoutes } from "./src/server/routes/evaluationRoutes";
import { registerAuthRoutes } from "./src/server/routes/authRoutes";
import { registerPredictionRoutes } from "./src/server/routes/predictionRoutes";
import { registerAiChatRoutes } from "./src/server/routes/aiChatRoutes";
import { registerAdminRoutes } from "./src/server/routes/adminRoutes";
import { registerCorpusRoutes } from "./src/server/routes/corpusRoutes";
import { registerSourceRoutes } from "./src/server/routes/sourceRoutes";
import { registerArticleTimelineRoutes } from "./src/server/routes/articleTimelineRoutes";
import { registerConflictsRoutes } from "./src/server/routes/conflictsRoutes";
import { registerHealthRoutes } from "./src/server/routes/healthRoutes";
import { repairEvidenceQuoteChecks } from "./src/server/repairEvidenceQuoteChecks";
import {
  mountAuthMiddleware,
  mountDestructiveLocalOnlyGuard,
  safeTokenEqual,
} from "./src/server/authMiddleware";
import { mountHttpMiddleware } from "./src/server/httpMiddleware";
import { startServer } from "./src/server/startServer";
import { ensureBootstrapUser } from "./src/server/database";
import { ALLOW_DEMO_DATA } from "./src/server/corpus";
import { applyRateLimit } from "./src/server/cache";

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST = "0.0.0.0";
const DEMO_DATA_ENABLED = ALLOW_DEMO_DATA;
const BOOTSTRAP_ADMIN_USER = process.env.JIANWEI_ADMIN_USER || "";
const BOOTSTRAP_ADMIN_PASSWORD = process.env.JIANWEI_ADMIN_PASSWORD || "";

if (AUTH_ENABLED && BOOTSTRAP_ADMIN_USER && BOOTSTRAP_ADMIN_PASSWORD) {
  try {
    ensureBootstrapUser(BOOTSTRAP_ADMIN_USER, BOOTSTRAP_ADMIN_PASSWORD);
  } catch (error) {
    console.error("failed to bootstrap admin user:", error);
  }
}

repairEvidenceQuoteChecks();
mountHttpMiddleware(app);
mountAuthMiddleware(app, { authToken: AUTH_TOKEN, authEnabled: AUTH_ENABLED });
mountDestructiveLocalOnlyGuard(app, AUTH_ENABLED);

registerAnnotationRoutes(app, applyRateLimit);
registerDeepEndpoints(app, applyRateLimit);
registerAnalysisRoutes(app, applyRateLimit);
registerEvaluationRoutes(app, applyRateLimit);
registerAuthRoutes(app, applyRateLimit, { authToken: AUTH_TOKEN, safeTokenEqual });
registerPredictionRoutes(app, applyRateLimit);
registerHealthRoutes(app, {
  authToken: AUTH_TOKEN,
  authEnabled: AUTH_ENABLED,
  serverStartTime,
});
registerAiChatRoutes(app, applyRateLimit);
registerCorpusRoutes(app, applyRateLimit);
registerAdminRoutes(app, applyRateLimit, {
  serverStartTime,
  demoDataEnabled: DEMO_DATA_ENABLED,
});
registerSourceRoutes(app, applyRateLimit);
registerArticleTimelineRoutes(app, applyRateLimit);
registerConflictsRoutes(app, applyRateLimit);

void startServer({ app, port: PORT, bindHost: BIND_HOST });
