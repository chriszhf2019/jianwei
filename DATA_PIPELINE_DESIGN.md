# 见微 Genway · 真实数据与 AI 管道接入方案（DESIGN）

> 2026-09-04　初版｜2026-09-12　按 `FUNCTION_LOGIC_AUDIT_V2.md` 同步：本文为演进蓝图，部分里程碑已落地（SQLite 主存储、真实 RSS 摄取、AI 全量标注、来源核验），部分仍为未来工作（日历事件基准率、通讯社传播图）。文中 `DEMO_MODE` 在实现中已改为 `JIANWEI_ENABLE_DEMO_DATA` 环境变量，默认零演示数据。
> 配套文档：功能总评见 `FUNCTION_LOGIC_AUDIT_V2.md`；逐文件整改见 `REMEDIATION_CHECKLIST.md`。
> 本文解决“产品演示 → 真实产品”的最大缺口：**静态数据 → 派生/实时数据，演示 AI → 真实模型调用**。

---

## 1. 目标与设计原则

1. **诚实优先**：无法实时/真实的能力要么不做，要么显式标注“演示口径”。全站统一 `DEMO_MODE` 开关与“示例数据”角标，杜绝“假实时”文案回潮。
2. **schema 先行**：`src/types.ts` 的 `NewsArticle` 已是相当完整的数据契约，采集端只做“映射填充”，UI 层不改。
3. **渐进替换**：每条静态常量→派生逻辑可独立灰度；每个 AI 功能保留“无 Key/离线 → 本地启发式 fallback”，且 fallback 文案必须带“演示推断”字样。
4. **可复核**：每条 AI 结论都输出 `evidenceChain`/来源 URL，与 `RippleEffectTab` 的“已核验/待复核”打通。

---

## 2. 现状差距盘点

| 层 | 现状 | 目标 |
|---|---|---|
| 内容 | 仅 4 篇手写“2026 虚构”文章（`newsData.ts`） | 真实新闻源，按需注入；保留 4 篇作为 DEMO 兜底 |
| 情报中心 | `intelligenceData.ts` 全套静态常量（雷达/热力/密度/健康度/冲突/盲区/明日预测） | 由文章数据集在服务端派生，定期快照 |
| 专题/共振 | `TOPIC_CLUSTERS`/`CROSS_EVENT_SYNERGIES` 手写 | 聚类/共现引擎生成草稿 + 编辑确认 |
| AI | 3 个 Gemini 代理（analyze/strategic-advisor/ask-nuance）+ 预测擂台本地启发式 | 代理接口生产化；新增 `/api/predict` 真模型接口 |
| 持久化 | 仅行动备忘录 localStorage | 用户态全量本地持久化（收藏/雷达/契约/关注标签），可选服务端 |
| 前端时间 | 已动态化（`dateUtils`） | 保持，采集端统一注入 `publishedAt` |

---

## 3. 总体架构

```
[采集适配器]                 [派生/分析服务]                 [见微前端]
RSS/新闻API/官方源  ──►  清洗+去重+分级 ──► NewsArticle[]   首页三态 feed
        │                       │  (含 tier/stance/url)       详情页 6 页签
        │                       ▼                            情报中心面板
        │              Snapshot DB (SQLite/JSON) ◄── 派生器
        │                       │  雷达计数/24H热力/健康度/共振
        ▼                       ▼                            预测擂台
[事件日历]        ──►  [AI 编排网关]  (Gemini/DeepSeek)
                         analyze / ask-nuance / strategic-advisor / predict
                         │ 无 Key/超时 → 本地 fallback（标注“演示推断”）
```

- 采集与派生跑在服务端（`server.ts` 侧新增模块或独立 worker），前端只消费 `/api/*`；
- `DEMO_MODE=true` 时（无外部配置）走 `intelligenceData.ts` 快照，与现在行为一致，保证开箱可演示。

---

## 4. 数据采集层（M1）

1. **源适配器**（每种实现 `SourceAdapter` 接口：`fetchLatest(): RawItem[]`）
   - 候选：RSS（Reuters/路透中文、日经、公司 IR/财报页）、NewsAPI/Bing News、目标站公开 JSON；
   - 每源配置 `tier`（Tier1 官方/权威 → Tier3 自媒）与默认 stance，用于健康度统计。
2. **标准化映射**（关键字段）：
   - `title/subtitle/date/publishedAt/sourceName/sourceUrl/category/tags`
   - `credibilityStars` 初始按 tier 给分 → 人工/信号加权修正（废弃“恒 5 星”）；
   - `changeVelocity/sourceCount/impactScope` 由关联数/变化率派生。
3. **清洗与去重**：simhash/标题归一化去重；正文抽取（首段+要点），不追求全文。
4. **深度字段降级策略**：七要素/逻辑树/光谱等强 AI 字段**不实时全量生成**：
   - 命中关键词/事件模板 → 生成初稿；
   - 用户打开详情页时按需调用 `/api/analyze` 生成并缓存（懒加载，省成本）；
   - 生成失败 → 详情页各 Tab 显示“暂无结构化数据”占位（各 Tab 已有空态）。

## 5. 派生分析层（把静态常量改派生，M1/M2）

| 现常量（`intelligenceData.ts`） | 派生逻辑（建议放 `/api/snapshot`） |
|---|---|
| `INITIAL_RADAR_KEYWORDS` | 对近 24h 文章做关键词频率/增量/情感统计（可用 Gemini 打标或词典法） |
| `HEATMAP_24H_DATA` / `INTELLIGENCE_DENSITY_POINTS` | 按 `publishedAt` 聚合 + 触发文章反链（修复“24:00”标签问题） |
| `SOURCE_HEALTH_DATA` | 由源 tier/核验结果实时统计 + 冲突案例由“同话题多源立场比对”生成 |
| `BLINDSPOT_DATA` | 覆盖率=赛道文章数/关键词热度排名，低覆盖即盲区候选 |
| `TOMORROW_FORECASTS` | 日历事件 + 近期趋势外推；概率必须本地化标注 |
| `CROSS_EVENT_SYNERGIES` | 实体/关键词共现打分（候选）→ 编辑确认（终审） |
| `TOPIC_CLUSTERS` | 聚类（embedding 或 tag 图）→ 编辑修正标题/时间轴 |

原则：**引擎给草稿，人做终审**（见微“总编”角色），保持内容质量与克制调性。

## 6. AI 接入层（M2/M3）

1. **代理接口生产化**（现有 3 个）：
   - 统一 `requestSchema` 校验、20s 超时（前端已加 `AbortController`）、`res.ok`、限流（IP/小时）、模型名入配置（当前硬编码 `gemini-2.5-flash`）；
   - 响应头部加 `X-Demo-Mode: true/false`，前端据此打“演示推断”角标。
2. **新增 `POST /api/predict`**（替换预测擂台本地启发式的“可选真 AI”路径）：
   - 入参：`{ question, directionText, confidence, premises, falsifiable, articleContext, modelChoice }`；
   - 服务端把 `AIPredictionOutput` schema 发给 Gemini/DeepSeek（按 `modelChoice` 路由，`jianwei-demo` 走本地启发式），返回同构 JSON；
   - 失败/无 Key → 本地启发式（即现引擎）并标注“演示推断”。
   - 前端：模型选择卡恢复“真实模型 vs 本地演示”双轨，调用真接口；目前无 Key 环境默认 `jianwei-demo`，UI 文案如当前“本地启发式演示”即可复用。
3. **AudioBriefing**：脚本由 `/api/analyze` 类 prompt 生成当日文稿后再 TTS；保留静态脚本为 DEMO 兜底。
4. 所有 prompt 中“样例日期”类占位已清除（见批次 1），保持动态注入。

## 7. 前端状态持久化（M1 收尾）

- 新增通用 `useLocalState<T>(key, initial, {version})`（基于 `localStorage` + JSON + 版本迁移）；
- 迁移顺序：行动备忘录（已做）→ 收藏 → 关注标签 → 雷达关键词 → 预测契约（含 resolutionDate/Brier）→ 个人备注与阅读身份；
- 契约类数据需记录 `createdAt/updatedAt`，升级冲突时以服务端时间为准（若启用同步）。

## 8. 诚实性开关与水印（贯穿）

- 常量 `DEMO_MODE`（服务端按 `GEMINI_API_KEY` 与数据源配置推导；前端按 `/api/health` 返回）；
- 全局 `<DemoBadge/>` 组件：当 `DEMO_MODE` 或 `X-Demo-Mode` 时，在雷达/热力/健康度/预测/盲区等面板角落显示“示例数据”；
- `RippleEffectTab` 的“已核验/待复核”按数据真实 `verified` 渲染（已改）；
- 上线的 UI 文案与代码引用的冲突清单，以本仓库 `REMEDIATION_CHECKLIST.md` C 区为准定期审计（可在 CI 加关键词扫描：`实时|节点/分|去噪率|API 协议就绪|已自动保存` 等）。

## 9. strict 类型收紧就绪步骤（环境级）

1. 用与 `pnpm-lock.yaml` 匹配的 pnpm 主版本执行 `pnpm install`（当前报 store 版本冲突）；
2. `pnpm add -D @types/react@^19 @types/react-dom@^19`；
3. `tsconfig.json` 打开 `"strict": true`，按 `tsc` 报错分批修复（预计 TS7006 隐式 any / 空值访问为主；JSX 类 TS7026/7016 会随 @types 安装消失）；
4. 收口后顺带开 `noUnusedLocals`，让死 import 回归红线。

## 10. 里程碑与验收

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0 | 本文定稿 + DEMO_MODE 水印 + 懒生成路由 | 无 Key 全功能演示不回归 |
| M1 | 采集适配器 ×2 源 + 快照派生（雷达/热力/健康度）+ useLocalState 全量迁移 | 情报中心数字可解释、刷新不丢 |
| M2 | `/api/predict` 双轨 + analyze 懒加载缓存 + AudioBriefing 动态文稿 | 预测擂台在 Key 存在时返回真实模型输出 |
| M3 | 聚类/共振引擎 + 编辑台终审 + strict 收口 | 可对外演示“真数据+真 AI”，文案审计零告警 |

**风险与回滚**：每个派生/AI 字段保持“快照兜底”常量可回切（保留 `intelligenceData.ts` 为 fallback 文件）；派生器失败只影响对应面板并显示空态，不影响首页与详情主流程。
