import "dotenv/config";
import fs from "node:fs";
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
import { assessPublicExposure, resolveBindHost } from "./src/server/publicExposure";
import {
  PRESET_ADMIN_USER,
  PRESET_ADMIN_PASSWORD,
  resolvePresetAdmin,
} from "./src/server/presetAdmin";
import { NO_PERSIST } from "./src/server/settings";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const serverStartTime = Date.now();
const AUTH_TOKEN = process.env.JIANWEI_AUTH_TOKEN || "";
const AUTH_ENABLED = !!AUTH_TOKEN;
const BIND_HOST = resolveBindHost(process.env.JIANWEI_BIND_HOST || process.env.BIND_HOST);
const DEMO_DATA_ENABLED = ALLOW_DEMO_DATA;
const TLS_CERT_PATH = String(process.env.JIANWEI_TLS_CERT || "").trim();
const TLS_KEY_PATH = String(process.env.JIANWEI_TLS_KEY || "").trim();

function tlsMaterialReadable(): boolean {
  if (!TLS_CERT_PATH || !TLS_KEY_PATH) return false;
  try {
    fs.accessSync(TLS_CERT_PATH, fs.constants.R_OK);
    fs.accessSync(TLS_KEY_PATH, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

const exposure = assessPublicExposure({
  bindHost: BIND_HOST,
  authToken: AUTH_TOKEN,
  encryptionSecret: process.env.JIANWEI_SECRET || "",
  adminUser: PRESET_ADMIN_USER,
  adminPassword: PRESET_ADMIN_PASSWORD,
  persistDisabled: NO_PERSIST,
  tlsCertPath: TLS_CERT_PATH,
  tlsKeyPath: TLS_KEY_PATH,
  tlsMaterialReadable: tlsMaterialReadable(),
  behindTls: process.env.JIANWEI_BEHIND_TLS,
});

if (!exposure.ok) {
  console.error(exposure.note);
  for (const item of exposure.missing) console.error(`- ${item}`);
  process.exit(1);
}

if (AUTH_ENABLED) {
  const preset = resolvePresetAdmin();
  if (!preset.ok) {
    if (preset.reason === "missing") {
      console.warn(
        "[auth] 未同时设置 JIANWEI_ADMIN_USER 与 JIANWEI_ADMIN_PASSWORD，已跳过预设管理员创建。请在环境变量中配置符合密码规则的管理员账号后再启动。"
      );
    } else {
      console.warn(
        "[auth] JIANWEI_ADMIN_PASSWORD 不符合服务端密码规则，已跳过预设管理员创建。请使用更强的密码后重试。"
      );
    }
  } else {
    try {
      const boot = ensureBootstrapUser(preset.username, preset.password);
      if (boot?.created) {
        console.log(`[auth] preset admin created: ${boot.username} (must change password on first login)`);
      } else if (boot) {
        console.log(`[auth] preset admin ready: ${boot.username}`);
      } else {
        console.warn("[auth] preset admin skipped (persistence disabled or empty credentials)");
      }
    } catch (error) {
      console.error("failed to bootstrap admin user:", error);
    }
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

void startServer({
  app,
  port: PORT,
  bindHost: BIND_HOST,
  tlsCertPath: TLS_CERT_PATH,
  tlsKeyPath: TLS_KEY_PATH,
});
