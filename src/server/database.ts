/** 数据库门面：按域拆到 ./db/*，此处统一再导出以保持原有 import 路径。 */
export {
  databaseCacheEpoch,
  closeDatabase,
  databaseFile,
  databasePath,
} from "./db/connection";
export {
  loadArticlesFromDatabase,
  queryArticlesPage,
  planArticlePersistence,
  articleIdsToHash,
  persistArticlesToDatabase,
  databaseStats,
} from "./db/articles";
export {
  loadSourceCheck,
  persistSourceCheck,
  loadSourcePageText,
  loadSourcePageTexts,
  listSourceArchives,
  clearTransientSourceChecks,
} from "./db/sourceChecks";
export type { SourceArchiveEntry } from "./db/sourceChecks";
export {
  createPredictionContract,
  resolvePredictionContract,
  listPredictionContracts,
  recordPredictionOutcomeReview,
  deletePendingPredictionContract,
  buildPredictionLedgerExport,
  persistPredictionLedgerSnapshot,
  listPredictionLedgerSnapshots,
  loadPredictionLedgerSnapshot,
} from "./db/predictions";
export {
  getAiUsageToday,
  getAiCostToday,
  recordAuditEvent,
  listAuditEvents,
  recordAiUsageEvent,
  checkAiBudget,
} from "./db/auditAi";
export type { UserRole, UserApprovalStatus } from "./db/users";
export {
  createUser,
  updateUser,
  resetUserPassword,
  changeUserPassword,
  revokeUserSessions,
  listUsers,
  createUserSession,
  resolveUserSession,
  revokeUserSession,
  consumeGuestDeepRead,
  cleanupExpiredUserSessions,
  ensureBootstrapUser,
  getUserPreferences,
  saveUserPreferences,
} from "./db/users";
export {
  recordEvaluationAnnotation,
  listEvaluationAnnotations,
  recordEvaluationAdjudication,
  listEvaluationAdjudications,
  importEvaluationRecords,
  persistEvaluationGoldSet,
  listEvaluationGoldSets,
  loadEvaluationGoldSet,
} from "./db/evaluation";
export {
  backupDatabase,
  verifyDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
} from "./db/backup";
export {
  generateAnalysisKey,
  getAnalysisFromDatabase,
  saveAnalysisToDatabase,
  listDatabaseAnalyses,
  getDatabaseAnalysisDetail,
  deleteDatabaseAnalysis,
  batchDeleteDatabaseAnalyses,
  getDatabaseOverview,
} from "./db/analyses";
