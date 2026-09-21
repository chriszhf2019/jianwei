# 见微 Genway · 应用架构与功能连接关系（ARCHITECTURE RELATIONS）

> 2026-09-04　初版｜2026-09-12　按 `FUNCTION_LOGIC_AUDIT_V2.md` 同步：语料主存储改为 SQLite、新增来源核验/AI 调用记录持久化、predict 缓存 key 含模型上下文、独立来源统计与 AI 文本分离。
> 本文聚焦“**功能之间如何连接、共享什么、谁触发谁**”；分层/存储/算法详见 `DESIGN_ARCHITECTURE.md`，控件见 `UI_CONTROLS.md`。

---

## 1. 总体架构图

```
┌────────────────────────── 浏览器（React 19）──────────────────────────┐
│ App.tsx（路由/全局状态/持久化 useLocalState）                           │
│  ├─ Header（导航/身份/搜索/设置/AI提交）                                │
│  ├─ 首页 HomeView ── 详情 NewsDetailView ── 预测擂台/六页签            │
│  ├─ 情报中心 IntelligenceHubView（10+ 面板）                           │
│  ├─ 地区情报 RegionIntelligencePage（标注/预警/矩阵/下钻/导出）         │
│  ├─ 专题/我的关注/搜索；模态层（Settings/Term/Audio…）                 │
│  │    纯前端派生：语料快照/热力/密度/共振/盲区/点名/三级过滤/CSV        │
└──────────┬────────── fetch(/api/*) ───────────────────────────────────┘
┌──────────▼──────────────────────────────────────────────────────────┐
│ 服务端 server.ts（Express + 静态 dist）                              │
│  AI Provider 层（Gemini / DeepSeek；本地启发式降级）                  │
│  运行时设置 settings（热更新） · 运行时语料 serverCorpus             │
│  通用注解器（regions/entities 全量任务·断点·取消·写回）               │
│  端点群：analyze/enrich/predict/ask/strategic/conflicts/regions/    │
│         entities/feeds(corpus,status,ingest)/snapshot/settings/     │
│         corpus?region/admin(status,reset)/ai/test                    │
└───────┬─────────────────────────────────────────────────────────────┘
        ▼ 持久化
 data/settings.json（Key/信源/词库/昵称） · data/corpus.db（SQLite 主存储：语料+AI 标注+来源核验+AI 调用记录）+ corpus.json（兼容快照）
 浏览器 localStorage（jianwei:* 用户态） · launchd 常驻（进程/自愈）
```

## 2. 功能之间的连接关系（谁触发谁/共享什么）

### 2.1 数据共享的“单一事实源”
- **运行时语料 serverCorpus / data/corpus.db** 是所有“真实”统计的唯一输入：
  `快照统计 · 共振 · 热力 · 密度 · 可追溯性覆盖 · 盲区扫描 · 明日关注 · 地区/主体标注 · corpus 检索/过滤 · CSV` 均派生自它。
- **赛道词库** 是第二共享源：盲区扫描、密度“按赛道”、明日关注、地区×赛道矩阵、服务端冲突分组 **同词同步**（设置页保存 → localStorage + `/api/settings.sectorOverrides`）。
- **AI 标注字段**（`regionMentions/entityMentions`）写回 SQLite 后同时被：快照地区分布、地区情报页全部面板、三级下钻、CSV、corpus?region 复用——**一次标注、处处可查**；confidence 统一显示为“模型自评分 · 未校准”。
- **来源核验记录**（URL/SHA-256 指纹/引句上下文/核验时间）写回 SQLite，详情页证据链与可追溯性徽标共用；AI 文本列出的来源线索不计入独立来源。
- **AI 字段元数据**（provider/model/promptVersion/generatedAt/calibration）落 SQLite，可区分缓存批次、模型切换与未校准状态。

### 2.2 触发链路（功能→功能）
| 链路 | 连接 | 数据/状态 |
|---|---|---|
| 设置信源 → 摄取 → 情报真实化 | Settings(feeds) → POST /api/settings → feeds/ingest → serverCorpus↑ → snapshot/热力/可追溯性自动变化 | settings.json / corpus.db |
| 外部新闻 → 详情 → AI 补全 | 打开详情(浅层) → /api/enrich（缓存 24h） → article 深层字段 → 六页签可用 | App articles/selectedArticle |
| 详情 → 证据链 → 来源核验 | DeepSpectrumTab(逐条引用) → POST /api/verify-source → SSRF 防护+SHA-256+引句匹配 → 写回 SQLite（24h 缓存） | corpus.db |
| 详情 → 预测契约 → 我的关注 | ForecastArena(签订) → App predictionContracts(localStorage) → MyFocus 列表/回测 | useLocalState('prediction-contracts') |
| 词库 → 各面板 | Settings(saveTaxonomy) → localStorage + settings.sectorOverrides → 前端词库(刷新后) + 服务端分组 | 双端同步 |
| 全量标注 → 地区情报 | 面板按钮 → /api/regions|entities/annotate → 写回 SQLite → 快照/预警/矩阵/CSV 数据可用 | corpus.db |
| 矩阵格 → 下钻 → 详情 | RegionSectorMatrix(onCell) → drill 列表(onOpenArticleById) → NewsDetail | App 路由 |
| 身份透镜 → “影响我” | Header(persona) → useLocalState('user-persona') → 首页过滤/详情身份页 | localStorage |
| 盲区 → 补源 → 设置 | Blindspot(补源建议) → onOpenSettings → 设置 RSS → 摄取 → 盲区刷新 | 路由+接口 |

### 2.3 组件/端点/存储映射（节选）
| 功能 | 前端组件 | 服务端点 | 存储 |
|---|---|---|---|
| 信息流与统计 | HomeView / 情报中心 | /api/corpus, /api/snapshot | corpus.db |
| 深度解读 | NewsDetailView+六Tab | /api/analyze, /api/enrich, /api/ask-nuance | corpus.db(补全写回)/enrich 缓存 |
| 来源核验 | DeepSpectrumTab/EvidenceBadge | /api/verify-source, /api/verify-quote | corpus.db（核验表） |
| 预测与校准 | ForecastArenaTab/CalibrationPanel | /api/predict | localStorage 契约 + corpus.db 用量 |
| 共振/组合 | CrossEventNexus/Combo/Matrix | 无（前端派生） | corpus.db（词库） |
| 地区/主体 | RegionIntelligencePage 面板群 | /api/regions(+annotate/status), /api/entities(+…), /api/conflicts, /api/corpus?region | corpus.db 标注 |
| 设置/词库 | SettingsModal | /api/settings, /api/feeds/*, /api/ai/test | settings.json+localStorage |
| 运营 | Header/页脚/模态 | /api/admin/status, reset | 内存+corpus.db 备份 |

## 3. 关键设计取舍（关系侧）
1. **前端“读”多、服务端“写/算”少**：交互型统计在浏览器用同一语料即时算（低延迟、离线可展示口径），重型写（摄取/标注/补全/仲裁）在服务端并写回持久化 —— 读写解耦。
2. **标注一次、全端复用**：AI 结果落语料字段而不是散落各面板状态，保证“情报中心=地区页=CSV”看到同一份数字。
3. **词库单一入口**：改词一处、双端同效，避免“前端盲区词典 ≠ 服务端冲突分组”的分裂（曾有过的坑已修复）。
4. **诚实降级贯穿链路**：任一端点无 Key/离线 → 确定性算法或明确“不可用”，且前端可见状态由 /api/health.ai 统一驱动。

## 4. 端到端示例（新外部新闻的“生命旅程”）
1. 设置页保存 RSS → 摄取（382 篇运行时语料）入 serverCorpus；
2. 首页/搜索即可见（外部信源角标）；快照/热力/密度/可追溯性/盲区随之更新；
3. 打开该文：详情深度页签先占位 → /api/enrich(DeepSeek) 自动补全并缓存；AI 字段写入 SQLite 含 provider/model/promptVersion/generatedAt；
4. 证据链生成后可逐条核验 → /api/verify-source 抓取页面、SHA-256 指纹、引句精确匹配，结果写回 SQLite（24h 缓存）；
5. 全量按钮 → 通用注解器为它补 regionMentions/entityMentions（断点续跑；confidence 标为模型自评分）；
6. 地区情报页：预警/覆盖/矩阵/三级下钻都能检索到它 → CSV 导出/进详情回环。
