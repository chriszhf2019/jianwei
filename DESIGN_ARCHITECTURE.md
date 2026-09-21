# 见微 Genway · 程序设计与数据架构（DESIGN / ARCHITECTURE）

> 2026-09-04　初版｜2026-09-12　按 `FUNCTION_LOGIC_AUDIT_V2.md` 同步：移除内置演示文章/综合健康分/静态星级/共振加权公式等已作废表述，反映 SQLite 主存储 + 真实语料派生 + 不可外推边界现状。
> 配套：`PROJECT_STATUS.md`（状态/运维）、`README.md`（使用）、`FUNCTION_LOGIC_AUDIT_V2.md`（功能逻辑与可信度审计）、`FUNCTION_SCIENTIFIC_REVIEW.md`（逐功能科学性判定）、`SCIENCE_EVALUATION_PROTOCOL.md`（评测协议）、`DATA_PIPELINE_DESIGN.md`（演进蓝图）
> 本文回答三件事：**为什么这样设计**（设计思路）、**做了什么**（功能）、**数据怎么组织与流动**（数据架构）。

***

## 1. 程序设计思路

### 1.1 产品理念

“于细微处，读懂新闻背后；报刊为骨，数据为翼，光谱拆解为记。”

- 目标用户：严肃决策者/投资/产业人士——需要的是**可复核的认知增量**，而非标题流。

- 认知闭环：**信源验真 → 事实解构（七要素/光谱）→ 因果拓扑（逻辑树/涟漪/共振）→ 决策行动（身份影响/预测契约/雷达）**。

- 阅读节奏光谱：同一内容提供 报刊/对话/数据/杂志/沉浸 五种排版范式（现统一收敛在详情页 DeepSpectrum 内联实现）。

### 1.2 三条设计原则（贯穿全部实现）

1. **数据真实优先**：能由语料派生的指标一律派生并展示公式；无法派生的要么移除、要么明确标注“示例/编辑口径”。
2. **AI 诚实标注**：所有在线模型输出带“AI 判断，非事实结论”与置信度/引句；无 Key/离线自动降级为**确定性本地算法**并标注；绝不编造内容。
3. **可复核优于炫技**：共振、净情绪、覆盖率等派生指标均公开算法与词表；地区/主体标注落库可回查原文；不再合成单一“综合健康分”或“可信度分数”。

### 1.3 渐进式真实化（本仓库的演化主线）

真实 RSS 摄取（382 篇运行时语料）→ 面板逐项真实化（快照/热力/密度/可追溯性/盲区/明日关注）→ AI 全量标注（涉事地区/主体，断点续跑写回 SQLite）→ 组合下钻与导出。默认零演示数据；`JIANWEI_ENABLE_DEMO_DATA=1` 才允许加载历史演示语料供开发回归。

***

## 2. 技术架构

```
[浏览器] React19 + Vite + Tailwind4(motion)
   │  fetch(/api/*)                     [服务端] Node + Express（server.ts）
   │                                    ├─ 静态托管（dist/，生产）
   │                                    ├─ AI Provider 抽象（Gemini / DeepSeek 双通道）
   │                                    ├─ 运行时设置（settings.json，热更新）
   │                                    ├─ 运行时语料（SQLite 主存储，摄取+标注+核验持久化）
   │                                    └─ 通用注解器（分页/断点/取消/写回）
[本地数据] data/settings.json · data/corpus.db（SQLite 主存储）+ data/corpus.json（兼容快照）· 浏览器 localStorage（用户态）
[调度/常驻] launchd com.user.news-jianwei（KeepAlive）或 scripts/start-server.sh
```

- **前后端一仓**：`server.ts` = Express + Vite 中间件/静态；`src/` = React 前端；`src/server/feeds.ts` = RSS 摄取；服务端可 import 前端纯工具（赛道词库/时间解析）保持口径一致。

- **AI 通道层**（`server.ts: activeProvider/runAI/callAI(WithReasoning)`）：Gemini（@google/genai）与 DeepSeek（OpenAI 兼容，支持 `deepseek-reasoner` 思考链）；默认 Gemini→DeepSeek，`AI_PROVIDER` 可强制；未配置 Key → 全站本地兜底。

- **持久化**：运行时语料以 `data/corpus.db`（SQLite）为主存储，事务写入、自动迁移；`corpus.json` 仅作兼容快照；用户态偏好/契约/备忘录经 `useLocalState`（`jianwei:*` 前缀 + 版本化）写入浏览器 localStorage；服务端设置存 `data/settings.json`（Key 脱敏，不入库）。

- **抗外部依赖**：RSS 解析（正则）、中文时间解析、字符二元组相似度、词典情感均为零第三方依赖实现，可离线运行。

***

## 3. 主要功能模块（导航视角）

| 模块        | 主要功能                                                                               | 关键组件/端点                                      |
| --------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| 全局壳       | 顶栏（ticker/搜索/身份/设置/AI分析）、页脚、模态（Esc/退场动画）                                           | Header/App/SettingsModal/hooks               |
| 首页        | 三态阅读（标准/通俗/脱水）、分类+雷达+内容口径筛选、监控词真实命中、词典净情绪                                          | HomeView/\*Feed/MyRadarWidget/HomeHeroStatus |
| 新闻详情      | 六页签认知路径、五节奏排版、人机预测擂台、契约、微观探针、浅层条目懒补全                                               | NewsDetailView/六 Tab/ForecastArenaTab        |
| 情报中心      | 语料快照、跨事件共振、到达热力（来源/地区/涉事地区×时段/7天）、密度曲线（总量/来源/赛道）、信源健康、盲区扫描、明日热度点名、冲突仲裁、地区/主体 AI 标注 | intelligence/\*（9+ 面板）                       |
| 地区情报（Tab） | 涉事地区依赖预警、覆盖/去重/趋势、地区×赛道矩阵下钻、地区×主体×赛道三级下钻、组合聚合、CSV 导出                               | RegionIntelligencePage + 面板群                 |
| 专题档案      | 长周期专题与时间轴                                                                          | TopicsView                                   |
| 我的关注      | 契约档案与回测（Brier）、监控雷达、收藏、行动备忘录                                                       | MyFocusView + useLocalState                  |
| 搜索        | 文章/专题/雷达 客户端检索（150ms 防抖）                                                           | SearchModal                                  |

**标志性交互链路**：RSS 设置摄取 → 语料快照/热力真实化 → 浅层条目详情自动 DeepSeek 补全 → 全量地区/主体标注 → 三级下钻到原文 → CSV 导出。

***

## 4. 数据架构

### 4.1 核心数据契约（src/types.ts）

- `NewsArticle`：标题/摘要/定性 + `tongsuSummary` + `dehydratedItems` + `sevenElements` + `logicTree` + `personaImpacts`(6) + `rippleEffect` + `spectrumLayers`(5) + `evidenceChain`；外部摄取增强字段：`sourceUrl/publishedAt/isExternal/regionMentions/entityMentions`。

- 聚合响应：`SnapshotResponse`（派生统计+地区标注）、`PairAnalysis`（共振）、`PredictionContract`（人机契约）、`Settings`（脱敏）等。

- 用户态（浏览器）：收藏/关注/雷达/契约/备忘录/身份/引擎偏好 —— 经 `useLocalState`（`jianwei:` 前缀 + 版本化）持久化。

### 4.2 数据流

```
外部 RSS(NEWS_FEED_URLS) ──POST /api/feeds/ingest──▶ 运行时语料 serverCorpus
      │ parseRSS(零依赖)                              │ 规范 URL + 规范标题双键去重；同题跨媒体
      ▼ 派生（同一语料实时计算）                        ▼ 写回
 /api/snapshot 语料统计 /api/corpus?region=…        data/corpus.db（SQLite 事务，重启不丢）
 AI 层：enrich(浅层懒补全·缓存) / predict(双轨) /
        regions·entities（通用注解器→regionMentions/entityMentions→persist）
        sourceVerification(页面核验→SHA-256 指纹+引句匹配→缓存 24h)
 前端：App 启动拉取 /api/corpus 合并进信息流 → 各面板/页面派生渲染
```

### 4.3 存储矩阵

| 数据                | 位置                                  | 说明                                               |
| ----------------- | ----------------------------------- | ------------------------------------------------ |
| 设置/Key/信源/词库覆盖    | `data/settings.json`                | 服务端热更新；接口脱敏（不回传 Key）                             |
| 运行时语料+AI 标注       | `data/corpus.db`（SQLite 主存储）        | 摄取、注解、来源核验结果、AI 调用记录均事务写入；JSON 兼容快照              |
| 来源核验缓存            | `data/corpus.db`                    | URL/页面 SHA-256 指纹/引句上下文/文本偏移/核验时间，默认 24h         |
| AI 调用记录           | `data/corpus.db`                    | provider/model/真实 token usage/状态/错误，默认每日 500 次上限 |
| 用户态偏好/契约/备忘录      | localStorage（`jianwei:*`，带 version） | 前端                                               |
| enrich/predict 缓存 | 服务端内存 LRU                           | enrich 24h；predict 10min 且 key 含文章+命题+模型上下文      |
| 限流                | 内存滑动窗口                              | 默认 300 次/分/IP，429                                |

### 4.4 派生算法汇总（公式公开）

- **净情绪（词典代理）**：`净=(正向-负向)/(正+负)×100`，逐篇唯一归类为正向/负向/中性/交织，修复正负重复计数（词表 `corpusMetrics.ts`）

- **跨事件共振**：共享标签 + 字符二元组文本相似度（文本信号，非因果；详见 `CrossEventNexus`）

- **数据源完整度**：原文链接、发布时间、来源构成、已知来源集团覆盖（不再合成综合健康分）

- **覆盖/盲区、明日关注**：赛道词典命中计数 / 最近窗口按真实发布时间排序（不再取数组尾部；词库双端同步）

- **重大突发**：标题强/弱信号词 + 否定语境过滤；非官方来源需 ≥2 独立来源，已收录官方媒体允许单源

- **多源印证**：7 天内不同发布方、标题相似度 ≥46% 聚合；AI 文本列出的媒体不计入独立来源

- **来源集团归一**：新华社系/人民网系/央视总台系/光明日报系按集团合并；未登记域名保留为“集团未知”

- **热力/密度**：外部条目 publishedAt → 4h/2h/自然日分桶的真实条数

- **AI 标注**：DeepSeek 逐条 JSON（confidence 标为模型自评分），写回字段供一切面板复用

- **来源页面核验**：SSRF 防护（拒本机/内网/保留地址）+ SHA-256 指纹 + 引句精确匹配；只验证引句是否逐字出现，不验证整篇报道为真

- **预测校准**：Brier、Log Loss、20 个百分点分桶；样本 <20 只累计不评判优劣

### 4.5 诚实/降级矩阵

| 能力                                                              | 有 Key（在线）                    | 无 Key/离线             |
| --------------------------------------------------------------- | ---------------------------- | -------------------- |
| analyze/predict/enrich/advisor/probe/conflicts/regions/entities | 真实模型（部分含缓存）                  | 本地确定性算法或明确“不可用”，绝不造假 |
| 语料派生统计/热力/密度/可追溯性/盲区/明日关注                                       | 同一语料实时派生（无 Key 也成立）          | 同左                   |
| 媒体档案 A/B/C                                                      | 人工维护域名表（A=官方/B=主流商业/C=泛科技观点） | 同左；未收录来源标“来源未收录”，不虚标 |

***

## 5. 目录结构速览

```
server.ts                      Express + 静态 + AI Provider + 设置/语料/注解器 + 全部 /api
src/App.tsx                    状态编排/路由/持久化(useLocalState)
src/types.ts                   契约中心
src/utils/{dateUtils,publishedAt,corpusMetrics,sectorTaxonomy,mentionRegion,sourceRegion,intelExport}
src/hooks/{useLocalState,useEscapeClose,useSnapshot,useAIProvider}
src/components/{home,intelligence,detail,focus,topics}+modals+RegionIntelligencePage
src/server/feeds.ts            零依赖 RSS 抓取/解析
src/data/*.ts                  术语/兜底数据（演示文章仅在 JIANWEI_ENABLE_DEMO_DATA=1 加载）
scripts/{start-server,release-check,smoke,functional-test,com.news.jianwei.server.plist,fixtures}
data/{settings.json,corpus.db,corpus.json}    （本地，gitignore）
```

## 6. 测试与发布

- `pnpm lint`（tsc --noEmit）、`pnpm test:unit`（28 例核心算法）、`pnpm smoke`（19 项 API 冒烟）、`pnpm test:func`（30 项功能级，需 RSS 夹具:3211）

- `pnpm release-check`：tsc → vite → esbuild → **纯净实例**（`JIANWEI_NO_SETTINGS=1`，无 Key 不写盘）→ smoke + functional —— 全绿

- 在线通道实测：DeepSeek（chat/reasoner）、地区/主体全量 382 条（实体有结果 367 条）、限流 429 实证；来源核验 387 条记录、381/382 可访问

## 7. 扩展点（下一步候选）

1. `strict` 类型收口（先补 @types/react/react-dom）
2. 通用注解器新增维度（机构关系/实体属性）只加 `kind`
3. 真实日历事件 → 概率化明早点名；逐源 tier/立场 → 仲裁与星级细化
4. 定时调度（launchd StartCalendarInterval 触发 ingest/annotate）；组合聚合页共享/订阅（URL 快照）
5. 密钥保管/多用户鉴权（离开单机演示前必须处理）

