# 见微 Genway · 应用架构与功能连接关系（ARCHITECTURE RELATIONS）

> 2026-09-04 初版 ｜ 2026-10-08 逻辑关系全面梳理：
> 语料主存储为 SQLite（500+ 篇真实语料，涵盖 IT、科技、财经、教育四大支柱）；移除遗留伪造数据；新增新闻详情与战略知识库双向沉淀、7大战略专题母题动态关联与首页弹性时效切换。
> 本文聚焦“**功能之间如何连接、共享什么、谁触发谁**”；分层/存储/算法详见 `DESIGN_ARCHITECTURE.md`，控件见 `UI_CONTROLS.md`。

---

## 1. 总体架构图

```
┌────────────────────────── 浏览器（React 19）──────────────────────────┐
│ App.tsx（路由/全局状态/持久化 useLocalState）                           │
│  ├─ Header（导航/身份/搜索/设置/AI提交）                                │
│  ├─ 首页 HomeView ── 详情 NewsDetailView ── 预测擂台/认知光谱           │
│  ├─ 情报中心 IntelligenceHubView（10+ 面板）                           │
│  ├─ 地区情报 RegionIntelligencePage（标注/预警/矩阵/下钻/导出）         │
│  ├─ 专题档案 TopicsView（7大战略母题 / 动态时间轴 / 双专题对比）         │
│  ├─ 我的关注 MyFocusView（战略知识库 / 预测契约档案与 Brier 回测）       │
│  └─ 模态层（Settings / Term / AudioBriefing / ShareCard / Analyze）    │
│      纯前端派生：语料快照 / 热力 / 密度 / 共振 / 盲区 / 动态计数 / CSV    │
└──────────┬────────── fetch(/api/*) ───────────────────────────────────┘
┌──────────▼──────────────────────────────────────────────────────────┐
│ 服务端 server.ts（Express + 静态托管 dist/）                         │
│  AI Provider 层（Gemini / DeepSeek；本地确定性启发式降级）            │
│  运行时设置 settings（热更新） · 运行时语料 serverCorpus             │
│  通用注解器（regions/entities 全量任务·断点·取消·写回）               │
│  端点群：analyze/enrich/predict/ask/conflicts/regions/entities/     │
│         feeds(corpus,status,ingest)/snapshot/settings/ai/test        │
└───────┬─────────────────────────────────────────────────────────────┘
        ▼ 持久化
 data/settings.json（Key/信源/词库/偏好） · data/corpus.db（SQLite 主存储：真实语料+AI 标注+来源核验+AI 调用记录）
 浏览器 localStorage（jianwei:* 用户私有态：知识库/契约/雷达/备忘录）
```

---

## 2. 功能之间的连接关系（谁触发谁/共享什么）

### 2.1 数据共享的“单一事实源”
- **运行时语料 serverCorpus / data/corpus.db** 是所有“真实”统计的唯一输入：
  `分类计数 · 快照统计 · 共振 · 热力 · 密度 · 可追溯性覆盖 · 盲区扫描 · 专题动态归集 · 地区/主体标注 · 全文检索 · CSV` 均派生自它。
- **四大核心赛道规范体系（IT、科技、财经、教育）**：
  在 `categoryClassifier.ts` 集中定义，首页分类按钮、专题档案归类、地区情报赛道矩阵均共享同一判定逻辑，保证各端数据口径无缝统一。
- **AI 标注字段**（`regionMentions/entityMentions`）写回 SQLite 后同时被：快照地区分布、地区情报页全部面板、三级下钻、CSV、corpus?region 复用——**一次标注、处处可查**；confidence 统一显示为“模型自评分 · 未校准”。
- **来源核验记录**（URL/SHA-256 指纹/引句上下文/核验时间）写回 SQLite，详情页证据链与可追溯性徽标共用；AI 文本列出的来源线索不计入独立来源。

### 2.2 核心业务触发链路（功能 → 功能）
| 触发源 | 目标功能 / 面板 | 传递数据 / 触发动作 | 持久化方式 |
|---|---|---|---|
| 设置信源 | 全局语料真实化 | Settings(feeds) → POST /api/feeds/ingest → serverCorpus 增量摄取 → 快照/热力/各分类条数实时更新 | `corpus.db` |
| 首页点击文章 | 新闻详情深潜 | 点击卡片 → onSelectArticle(article) → 路由切至 Detail → 浅层文章自动请求 /api/enrich 补全深层字段 | 内存 + `corpus.db` 缓存 |
| 新闻详情顶栏 | 沉淀至战略知识库 | 点击「📥 沉淀到知识库」 → 抽取七要素、核心研判与启示 → 写入 knowledgeItems → 按钮变为「已沉淀」 | `localStorage` (`jianwei:knowledge-items`) |
| 详情预测擂台 | 签订预测契约 | ForecastArena(签订) → 记录命题、用户/AI 概率、截止日 → MyFocus 预测档案列表 → 到期核验计算 Brier 分数 | `localStorage` (`jianwei:prediction-contracts`) |
| 详情证据链条 | 来源核验沙箱 | DeepSpectrumTab(逐条引用) → POST /api/verify-source → SSRF 防护 + SHA-256 + 引句逐字匹配 | `corpus.db` (24h 缓存) |
| 专题档案 (TopicsView) | 动态聚类与时间轴 | 读取全量语料 → 7 大战略母题根据赛道及关键词动态关联真实文章 → 生成 7 天真实演化时间轴与热度火花线 | 动态计算 + Markdown 导出 |
| 首页时间/分类筛选 | 弹性状态引导 | 点击「IT/教育/财经」或雷达词 → 若当前时间窗无数据，提示历史沉淀篇数并提供「切换至全部范围」或「重置」 | 组件响应式状态 |
| 监控雷达词 | 首页信息流高亮 | Header/Settings 添加雷达词 → 首页生成「监控中」专用分类与角标 → 命中条目在 Feed 中红框警示 | `localStorage` (`jianwei:radar-keywords`) |

### 2.3 组件/端点/存储映射（速查）
| 功能模块 | 前端组件 | 服务端端点 | 存储介质 |
|---|---|---|---|
| 信息流与赛道分类 | HomeView / StandardModeFeed | `/api/corpus`, `/api/snapshot` | `data/corpus.db` |
| 深度认知解读 | NewsDetailView + 六大Tab | `/api/analyze`, `/api/enrich`, `/api/ask-nuance` | `corpus.db` + 内存 LRU |
| 战略知识库沉淀 | KnowledgeBasePanel / KnowledgeGraphView | 无（纯客户端归档管理） | `localStorage` |
| 专题长周期追踪 | TopicsView / TopicCausalGraph | 派生自 `/api/corpus` | 动态派生 |
| 来源核验与防伪 | DeepSpectrumTab / EvidenceBadge | `/api/verify-source`, `/api/verify-quote` | `data/corpus.db` |
| 预测契约与校准 | ForecastArenaTab / CalibrationPanel | `/api/predict` (在线双轨) | `localStorage` + `corpus.db` |
| 地区/主体情报 | RegionIntelligencePage 面板群 | `/api/regions`, `/api/entities`, `/api/conflicts` | `data/corpus.db` |
| 系统设置与运维 | SettingsModal / AdminConsoleView | `/api/settings`, `/api/feeds/*`, `/api/admin/*` | `data/settings.json` |

---

## 3. 关键设计取舍与闭环原则
1. **真实数据至上，拒绝静态占位**：彻底清理遗留的假知识库、假预测、假热度；只有真实用户行为和真实外部新闻才能留在库中。
2. **前后端读写解耦**：前端承载低延迟、多维度的交互型统计与筛选计算；重型计算（RSS 摄取、长文深度结构化、文本抓取与指纹校验）由服务端保证原子性落库。
3. **单一事实源与跨端一致性**：赛道定义与规范化归类在工具层统一，避免不同面板因关键词口径差异产生数据冲突。
4. **确定性降级保证可用性**：在没有配置在线模型 API Key 或网络离线时，所有页面均能基于内置算法稳定运作，并明确向用户声明为“启发式/规则推断”。
