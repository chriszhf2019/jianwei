# 「见微 Genway」逐文件整改清单（历史批次日志，保留追溯）

> ⚠️ **本文档为 2026-09 早期整改批次日志，保留以备追溯。** 2026-09-12 已完成新一轮全功能逻辑审计与整改，最新状态请阅读 [`FUNCTION_LOGIC_AUDIT_V2.md`](./FUNCTION_LOGIC_AUDIT_V2.md)（27 条整改结果 + 验收）与 [`FUNCTION_SCIENTIFIC_REVIEW.md`](./FUNCTION_SCIENTIFIC_REVIEW.md)。本文正文中的"待修复"项已在 V2 验收，勿据本文判断当前状态。
>
> 依据 2026-09 全量代码审阅生成（约 1.17 万行 TS/TSX，50 组件）。
> 分级：**\[P0]** 正确性/诚信问题，建议最先修　**\[P1]** 体验与一致性　**\[P2]** 清理与工程规范
> 每项给出文件、问题、建议改法。行号以审阅时为准，改前请以当前代码为准。

***

## A. 孤儿代码组（未被任何活路由 import，先统一决策）

| 文件                                            | 状态                                  | 处理建议               |
| --------------------------------------------- | ----------------------------------- | ------------------ |
| `src/components/modes/FastDialogueView.tsx`   | 无人 import                           | 决策二选一（见下），不修即删     |
| `src/components/modes/DataDrivenView.tsx`     | 无人 import                           | 同上                 |
| `src/components/modes/ModernMagazineView.tsx` | 无人 import                           | 同上                 |
| `src/components/modes/ClassicPrintView.tsx`   | 无人 import                           | 同上                 |
| `src/components/modes/ImmersiveStoryView.tsx` | 无人 import                           | 同上                 |
| `src/components/ReadingRhythmSpectrum.tsx`    | 无人 import                           | 同上                 |
| `src/components/SpectrumRibbon.tsx`           | 仅被上述死视图 import                      | 随上面一起处理            |
| `src/components/GenwayMethodologyCard.tsx`    | 仅被死视图 ClassicPrintView import       | 随上面一起处理            |
| `src/components/EvidenceTraceModal.tsx`       | 无人 import（原由死视图链打开）                 | 随上面一起处理            |
| `src/components/NuanceInquiryBar.tsx`         | 无人 import，与 `NewsDetailView` 内联追问重复 | **删**（或抽为唯一组件再接线）  |
| `src/components/PrintCardExportModal.tsx`     | 无人 import                           | **删**或改名“剪报卡复制”再接线 |

**决策建议（P0）**：五节奏阅读功能目前由 `DeepSpectrumTab` 内联实现且在线上可触达，建议：

- 方案一（省事）：**删除** `modes/*`、`ReadingRhythmSpectrum`、`SpectrumRibbon`、`GenwayMethodologyCard`、`EvidenceTraceModal` 六个文件（约 1100 行死代码），保留 `DeepSpectrumTab` 为唯一实现；

- 方案二（产品向）：把 `modes/*View` 精修后接进详情页“阅读排版节奏”，并删除 `DeepSpectrumTab` 内联五节奏重复分支。两案不可并存。

**若选方案二，必须先补空值保护（P0 崩溃风险）**：`DataDrivenView`（`evidenceChain/industrySignals`）、`ClassicPrintView`/`ModernMagazineView`/`ImmersiveStoryView`（`narrativeSections/industrySignals`）均以 `.map` 直渲可选字段；而 `AnalyzeModal` 生成的“用户投递”文章**不含** **`narrativeSections`**，一旦进入这些视图会直接抛错。需全部改 `?.` + 空态兜底，并在 `AnalyzeModal` 补齐默认 `narrativeSections`。

***

## B. 全局 / 配置层（P1/P2）

| 文件                       | 问题                                                                                                           | 建议改法                                                                    | <br />                                                                                                                               | <br />                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `tsconfig.json`          | 未开启 `strict`，类型约束很弱（未声明字段访问不报错，见 F 区 `ForecastArenaTab`）                                                     | 先加 `"strict": true` 跑 `tsc`，按报错清单逐文件收口；建议配合 `noUnusedLocals` 清理死 import | <br />                                                                                                                               | <br />                                                                      |
| `vite.config.ts`         | 注释乱码 `Do not modifyâ`                                                                                        | 改写为正常 ASCII 注释                                                          | <br />                                                                                                                               | <br />                                                                      |
| `pnpm-workspace.yaml`    | `allowBuilds:` 下是字面占位文本 `"set this to true or false"`                                                        | 改为真实布尔值或删除该块                                                            | <br />                                                                                                                               | <br />                                                                      |
| `index.html` / `public/` | 字体走 Google Fonts CDN，public 无任何本地静态资源                                                                        | 演示若需离线/内网，下载字体到 `public/fonts` 并本地 `@font-face`；至少加 `display=swap` 已具备  | <br />                                                                                                                               | <br />                                                                      |
| `src/index.css`          | 暖纸色两处并存：CSS 变量 `--paper-warm: #FAF7F2` vs 组件硬编码 `#FAF8F5`                                                    | 统一为一处（建议以 CSS 变量为准并全局替换）                                                | <br />                                                                                                                               | <br />                                                                      |
| `src/index.css`          | `.font-mono-code` 自定义类从未被使用；JetBrains Mono 等字体仅以 CSS 变量声明，未经 Tailwind v4 `@theme` 接线，`font-mono` 实际渲染的是默认等宽栈 | 删除无用类；如需定制字体族，在 CSS 用 `@theme { --font-mono: ... }` 声明                  | <br />                                                                                                                               | <br />                                                                      |
| `src/types.ts`           | 类型腐化：`ReadingMode` 联合含 8 个成员但只有 5 个真实模式（残留 \`'classic'                                                       | 'magazine'                                                              | 'immersive' ` 旧别名）；`SpectrumLayerType`以`\| string ` 收尾使联合类型失效；`READING\_MODES ` 配置色（`#D97706/#1E293B`）与各视图硬编码色（`#CA8A04/#334155\`）漂移 | 收敛为 5 个真实模式 id（与 A 区决策一致后删旧别名）；去掉 `\| string`；模式元数据只留 `READING_MODES` 单一事实源 |
| 全站日期                     | “9月1日/2026年9月1日”散落硬编码                                                                                        | 见 D 区统一“当前日期”工具函数                                                       | <br />                                                                                                                               | <br />                                                                      |
| 全局持久化                    | 全仓 0 处 `localStorage`，但 UI 出现“自动保存在本地”“契约已锁入存证池”等文案                                                          | 见 E 区单项，或引入统一 `useLocalState` hook                                      | <br />                                                                                                                               | <br />                                                                      |

***

## C. 文案“假实时 / 假 AI”批量整改（P0 诚信项）

以下字符串要么删除、要么改为客观表述、要么加“演示数据”角标。涉及 UI 中的品牌承诺，务必先过一遍产品负责人。

| 出现位置                                            | 原文                                                        | 建议                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Header.tsx` 顶部 ticker                          | “今日净乐观度 +18 / 重大信号 8 / 当前身份透镜”                            | 数字从 `marketMetrics` props 派生；无数据源时删除数字仅留文案                                                   |
| `HomeHeroStatus.tsx:44,57,59`                   | “9月1日 · 今日全景”“今日值得关注 **18** 条”“重大信号 **7** 个”              | 改为动态日期 + 由 `marketMetrics`/`articles.length` 派生（注意 7 vs `majorSignals=8` 矛盾）；“18 条”与真实 4 篇不符 |
| `HomeHeroStatus.tsx:48`                         | “全球微澜监测中”                                                 | 如无后台轮询，改为“今日全球微澜速览”                                                                          |
| `Header.tsx:46` / 多处                            | “实时”红徽章 / “实时低噪摄入”（页脚）                                    | 无实时链路时删除或改“今日”                                                                               |
| `IntelligenceHubView.tsx`                       | “2,840 节点/分”“去伪去噪率 99.4%”                                 | 删除或改为静态能力说明（“多源聚合”）                                                                          |
| `IntelligenceDensityCurve.tsx`                  | “24H 实时监控”                                                | 改“24H 密度回顾”；X 轴 `pt.hour.slice(0,2)` 把 `24:00` 显示为“24”                                       |
| `DataSourceHealthPanel.tsx`                     | “已接入 120+ 权威信息源”；引用 Reuters/Bloomberg/Gartner 具体名号 + 编造数字 | 整区加“演示数据示例”角标，或删除品牌名                                                                         |
| `TodayBlindspotWidget.tsx`                      | 盲区覆盖率/线索                                                  | 加“演示示例”角标                                                                                    |
| `ForecastArenaTab.tsx:675-677`                  | 绿色徽章 “DeepSeek / Gemini API 协议就绪”                         | 无网关则删除，或如实改为“本地推演演示”                                                                         |
| `LogicTreeTab.tsx`                              | “非线性动态权重聚合算法”“AI 沙盒实时推演结论”                                | 改“线性权重敏感性演示/前端 What-If 模拟”（当前为 `up×1.2−down×1.1×0.7` 线性公式）                                   |
| `RippleEffectTab.tsx`                           | “去伪交叉校验通过”徽章                                              | 无校验链路则删除或改“多源摘录”                                                                             |
| `SpectrumRibbon.tsx` / `EvidenceTraceModal.tsx` | “100% 交叉验证/可复核”                                           | 与逐条 `confidenceScore` 不符，删除或加条件                                                              |
| `MyFocusView.tsx`                               | “自动保存在本地”类文案                                              | 未持久化前删除，见 E 区                                                                                |
| `AudioBriefingModal.tsx:236`                    | “由平台多源事实引擎与语音合成实时驱动”                                      | 改“由预置脚本 + 浏览器语音合成播放”                                                                         |
| `server.ts` 首页横幅                                | `app: "…AI新闻情报与认知分析平台"`                                   | 无碍，可留                                                                                        |

***

## D. 数据层修复（P1）

| 文件                                  | 问题                                                                                                               | 建议                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/data/newsData.ts`              | 仅 4 篇手工文章；日期全为 2026-08\~09 未来虚构；`credibilityStars` 恒 5                                                           | 短期：加“演示世界 2026-09-01”说明或数据版本标记；中期：接真实新闻 API 生成同 schema 数据          |
| `src/data/newsData.ts`              | OpenAI 文章 `jargonTerms` 含与内容无关的“CPO光电共封装”（第 77 行）                                                                | 修正术语列表                                                             |
| `src/data/intelligenceData.ts`      | 雷达/热力/密度/健康度/冲突/盲区/明日预测全部静态常量                                                                                    | 与真实文章/时间派生或标注演示；`INITIAL_RADAR_KEYWORDS` 数字（18/12/8…）与“雷达总数”自洽但均为假 |
| `src/data/intelligenceData.ts:618+` | 预置契约含“已到期回测”虚构案例                                                                                                 | 保留为示例并加“示例”标记即可                                                    |
| `src/data/intelligenceData.ts:494`  | 模型列表含虚构 “Gemini 3.7 Flash”                                                                                       | 真接 API 前改名为“演示引擎”或删除                                               |
| 日期散点                                | `server.ts` prompt 模板样例值 `"date": "2026年9月1日"`、`"sourceDate": "2026-09-01 12:00"`、fallback 常量、`AnalyzeModal` 默认值 | 一律改为运行时生成的“今天”日期（`Intl.DateTimeFormat('zh-CN')`）                   |

***

## E. 逐组件修复表（活代码）

### 顶层 & 路由

| 文件                                | 问题                                          | 建议                                        |
| --------------------------------- | ------------------------------------------- | ----------------------------------------- |
| `src/App.tsx:45`                  | 默认收藏 `['art-1']` 匹配不到任何文章（真实 id 为 `news-*`） | 改为 `['news-ai-agent-breakthrough']` 或空数组  |
| `src/App.tsx`                     | 全部状态存于 `useState`，刷新即失                      | 引入 localStorage 持久化（至少收藏/雷达/契约/关注标签/备注五类） |
| `src/components/Header.tsx:83`    | “9月1日 星期二”硬编码                               | 动态日期                                      |
| `src/components/Header.tsx:62-68` | 净乐观 +18 / 重大信号 8 硬编码                        | 从 props 读取（需向上传 `marketMetrics`）          |

### 首页信息流

| 文件                             | 问题                                            | 建议                                          |
| ------------------------------ | --------------------------------------------- | ------------------------------------------- |
| `home/HomeView.tsx`            | 分类列表硬编码；`selectedRadarFilter` 与分类叠加后常空        | 接受（本地 demo）；“影响我”空态文案引导到 Header “AI 提交分析”即可 |
| `home/StandardModeFeed.tsx:28` | 空态提示“使用上方 AI 提交分析”，但详情页无该按钮                   | 空态文案改为中性（“换分类或去首页发起 AI 分析”）                 |
| `home/DehydratedModeFeed.tsx`  | `expandedId` 在 mount 时捕获，切分类后展开状态错位           | 改为默认展开第一项或 key 随筛选重置                        |
| `home/TongsuModeFeed.tsx`      | 术语 pills 依赖 `TermExplainModal`                | OK，无需改                                      |
| `home/MyRadarWidget.tsx`       | “实时”脚注；行是 div 无键盘可达                           | 删“实时”；行加 `role="button"`/`tabIndex`         |
| `home/MarketStatusWidget.tsx`  | “赛道动能”chips 硬编码与 metrics 无关                   | 由 `metrics` 派生或删除                           |
| `components/AddRadarModal.tsx` | 新词统计全用 `Math.random` 伪造、`recentNewsTitle` 模板串 | 改为确定性占位（如“待首轮抓取”）或删除统计列                     |

### 详情页

| 文件                                  | 问题                                                                    | 建议                                     |
| ----------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `detail/NewsDetailView.tsx`         | `onOpenTermExplain` 解构后从未使用（App 白传）                                   | 接线：让光谱层/术语可点开词典，或从 props 删除            |
| 同上                                  | “生成简报卡片”实为页内静态预览，无打印/导出                                               | 加 `window.print()` + 打印 CSS，或改名“简报卡预览” |
| 同上                                  | 分享金句 `navigator.clipboard` 无异常处理                                      | try/catch + 失败提示                       |
| 同上                                  | 追问失败 fallback 是“半导体财报”专属文案，对任何文章生效                                    | 改为通用文案或复用后端 canned 回复                  |
| `detail/DeepSpectrumTab.tsx:89-268` | 除 classic 外四种节奏硬编码取 `layers[0]/[1]/[4]`，丢弃中层且无视色带筛选；与 `modes/*` 五视图重复 | 见 A 区方案一/二；至少让各节奏尊重 `activeLayer`      |
| `detail/LogicTreeTab.tsx:41`        | “保存推演方案快照”仅置本地布尔                                                      | 实现快照列表或改名“标记已保存”                       |
| `detail/RippleEffectTab.tsx`        | “知识图谱”实为卡片网格（无连边/SVG）                                                 | 命名改“关联实体卡”，或引入真图谱渲染                    |
| `detail/SevenElementsTab.tsx`       | “AI 综合裁决”内容实为静态文章数据                                                   | 静态数据可留，但来源说明建议标“编辑推演”                  |
| `detail/RelevanceIdentityTab.tsx`   | `currentImpact` 兜底取 `personaImpacts[0]`（身份与内容可能错配）                    | 无匹配时显示“该身份暂无专属报告”占位                    |
| `detail/ForecastArenaTab.tsx`       | **最大整改对象**，见下方专节                                                      | 见专节                                    |

### 情报中心

| 文件                                          | 问题                                                   | 建议                                                                             |
| ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `intelligence/StrategicMetricsBar.tsx`      | 指标卡解说句静态，与数值解耦                                       | 用模板由数值生成或删除解说                                                                  |
| `intelligence/SentimentHeatmap24h.tsx`      | 单元格为 table/div，键盘不可达；“缺失时段”静默降级 Lv1                  | 加语义与键盘；降级格加说明                                                                  |
| `intelligence/IntelligenceDensityCurve.tsx` | 见 C 区标签/24:00 bug                                    | 修标签；数据可保留为“回顾”                                                                 |
| `intelligence/CrossEventNexusPanel.tsx`     | “自定义双事件”共振分固定 88、文案由标题截断套模板；400ms setTimeout 假“重新推演” | 删除假转圈；自定义模式改为如实“结构对比”展示，或写一个确定性打分函数                                            |
| `intelligence/DataSourceHealthPanel.tsx`    | 纯静态 + 真实品牌名（见 C 区）                                   | 加演示角标                                                                          |
| `intelligence/AIStrategicAdvisor.tsx`       | 无超时/中止、不查 `res.ok`；初始 state 预置 canned 答复误导           | ① `AbortController` 超时；② `if (!res.ok) throw`；③ 初始值置空并显示示例提示；④ 回答改 Markdown 渲染 |

### 我的关注 / 专题

| 文件                      | 问题                                                                                                           | 建议                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `focus/MyFocusView.tsx` | 备注 `personalNotes` 仅本地 state；`followedTags/onRemoveTag` props 死参数；无持久化                                       | 接 localStorage；删死 props；契约“到期待自动回测”不存在的文案改“手动回测” |
| `focus/MyFocusView.tsx` | 回测弹窗：Brier 分按胜负方硬编码伪造（0.08/0.15/0.35）、`verified_both_win/verified_both_miss` 状态 UI 不可达、`resolutionDate` 从不写入 | Brier 用真实公式 `(P−O)²` 计算并回填日期；补“双赢/双失”入口或从类型删除    |
| `focus/MyFocusView.tsx` | 行动备忘录 `personalNotes` 预填大段 CPO/液冷演示文案，且页脚写“已自动保存”                                                            | 初始为空 + 真实持久化后再显示“已保存”提示                          |
| `topics/TopicsView.tsx` | 过滤无结果回退 `articles.slice(0,2)`，且静态 `articleCount` 与实际过滤数可能不符                                                  | 用真实匹配数渲染计数，去掉魔数回退                                |

### 模态框

| 文件                                    | 问题                                                                   | 建议                                   |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `components/TermExplainModal.tsx`     | 组件在 `term===null` 时直接 `return null`，`AnimatePresence` 形同虚设（退场动画不可播放） | 由父级控制挂载 + `AnimatePresence` 包裹，或删除动画 |
| 全部模态                                  | 无 Esc 关闭、无焦点陷阱                                                       | 统一加 Esc/滚动锁定（可复用小组件）                 |
| `components/AnalyzeModal.tsx:145-148` | 请求失败仅 `console.error`，用户无感知                                          | 失败时表单内展示错误条并保留输入                     |
| `components/PrintCardExportModal.tsx` | 名不副实（只复制文本），`#print-card-target` 无用                                  | 见 A 区                                |

***

## F. 预测擂台（`detail/ForecastArenaTab.tsx`）专项整改

1. **〔P0〕去假 AI**：`aiPrediction`（useMemo，123-286 行）为按（模型 × 文章 id）写死的模板文案与固定置信度（R1 62/58、Gemini 2.5 Pro 65/62、V3 68/66、Flash 恒 68），全文件无 `fetch`。

   - 改法 A（真实化）：新增 `server.ts` 端点（如 `/api/predict`），携带命题/方向/前提/置信度/文章上下文 → 真调 Gemini/DeepSeek → 前端用返回替换 useMemo 模板；

   - 改法 B（低成本诚实化）：删除“4 模型选型/API 就绪/重新计算 400ms”整套包装，仅保留“基于基准率+用户置信度的差距分析”。
2. **〔P0〕类型错误**：124 行 `article.sentiment` 为未声明字段（运行时恒 undefined → `isPositiveArticle` 恒 false 死分支）。

   - 在 `NewsArticle` 增加 `sentiment?` 并在数据中赋值，或删掉该分支改由 `article.id` 映射。
3. **〔P1〕假状态**：`hasAIPredicted` 初始 `true`；`handleTriggerAIRecompute`（355 行）仅 `setTimeout 400ms` 转圈。

   - 随第 1 项一并处理。
4. **〔P1〕闭环缺失**：“约定到期自动回测”不存在，结果靠 `MyFocusView` 人工裁决。文案改为“到期后请在‘我的关注’手动回测”。
5. **〔P2〕死代码**：`userDirection` 类型含 `'neutral'` 但 UI 不可达；未用 icon imports（`HelpCircle/Zap/ShieldCheck/RefreshCw/Cpu/BrainCircuit/Bot`）。

***

## G. 服务端（`server.ts`）

| 问题                                                            | 建议                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| prompt 与 fallback 日期锁死 2026-09-01（含 `sourceDate/timeAgo` 样例值） | 运行期注入今天日期，删 prompt 内样例日期                                 |
| `/api/analyze` 失败也返回 `200 + fallback:true`                    | 保持现状（保证无 Key 可演示）没问题；但建议响应头加 `X-Demo-Mode: true` 便于前端打水印 |
| 3 个端点 prompt 硬编码 `gemini-2.5-flash`                           | 提为常量/环境变量                                                |
| 无任何输入长度/频率限制                                                  | 加 body 大小校验（已有 10mb）与简单限流（演示可省）                          |

***

## H. 优先级路线图

- **P0（先做，1-2 天）**：C 区全部“假实时/假 AI/编造引用”文案整改 + F 区预测擂台诚实化 + 日期动态化 + `ForecastArenaTab` 类型修复。

- **P1（1-3 天）**：E 区逐组件修复（战略顾问健壮性、AnalyzeModal 错误提示、Modal Esc、Dehydrated 展开状态、MarketStatus 派生…）+ localStorage 持久化 + 动态 ticker。

- **P2（机动）**：A 区孤儿代码删除/接线二选一、`strict` 开启、乱码/占位符清理、字体本地化、星级与数字多样化、真实数据管道设计。

***

## I. 已完成整改批次（2026-09-02，均已过 `tsc` 与 `vite build`）

### 1. 日期动态化

- 新增 `src/utils/dateUtils.ts`（`todayLabel/todayShort/todayFullZh/isoToday/nowHHmm`）；

- `server.ts`：内置等价日期助手；`/api/analyze` prompt 样例与 fallback 的 date/sourceDate 改为运行期“今天”（已实测返回当前日期）；

- `AnalyzeModal`：默认日期/来源时间改为运行期。

### 2. 首页 & 顶栏计数去硬编码

- `HomeHeroStatus`：新增 `articleCount/majorSignals/netOptimism` props，日期动态化，删除“18 条/重大信号 7”硬编码（消除 7 vs 8 矛盾）；

- `Header`：新增 `marketMetrics` props，ticker 净乐观/重大信号由数据派生，日期动态化，情报中心徽章“实时”→“今日”；

- `App.tsx` 页脚：“实时低噪摄入”→“演示版本 · 内容为静态示例快照（非实时抓取）”。

### 3. 情报中心假实时/编造引用整改

- `IntelligenceHubView` 横幅“2,840 节点/分/99.4%”→“静态示例（非实时抓取）”；

- `IntelligenceDensityCurve`：“24H 实时监控”→“24H 密度回顾（示例快照）”；小时标签不再截断（修复 24:00 显示为“24”）；

- `DataSourceHealthPanel`：“已接入 120+ 权威源”→“信源分层与仲裁示例（内置演示口径，非真实接入）”；“实时冲突检测”→“信源冲突仲裁示例”；

- `CrossEventNexusPanel`：删除 400ms 假“重新推演”按钮与 `RefreshCw` 假转圈、删除“开放模型网关/API 协议就绪”式文案，改为“即时结构比对（演示口径）+ 示例值说明”；步骤 3 不再自称“AI 暗网联合穿透推演”；

- `MarketStatusWidget`/`MyRadarWidget`：“实时”→“快照/示例口径”。

### 4. AI 战略顾问健壮性（`AIStrategicAdvisor`）

- 初始 `advisorResponse` 改为 `null`（删除预置假答复误导）；

- fetch 增加 20s `AbortController` 超时与 `res.ok` 校验；失败给出明确错误提示而非伪装成真回答；

- 增加极简 `**加粗**` 渲染（不再输出字面星号）；

- 副标题改为“基于站内示例情报…非投资建议”。

### 5. 我的关注（`MyFocusView` + `App.tsx`）

- 行动备忘录：删除预填演示文案 → 空初始 + **真实 localStorage 持久化**（key `jianwei-action-memo`），页脚改为“已自动保存在本机浏览器”；

- 回测：Brier 分由按胜负硬编码（0.08/0.15/0.35）改为按 AI 置信度计算 `(P−O)²`；补“双方均命中/双方均未命中”两个裁决入口（`verified_both_win/both_miss` 从此可达）；`App.tsx` 回测时写入 `resolutionDate`，复盘文案按四种状态区分。

### 6. 预测擂台去假 AI（`ForecastArenaTab`，最大项）

- **删除**：四“模型”（DeepSeek R1/Gemini 2.5 Pro/DeepSeek V3/Gemini 3.7 Flash）选型网格、绿色“API 协议就绪”徽章、DeepSeek `<think>` 假思维链、400ms 假“重新计算”、预置每文章固定置信度模板；

- **替换为**：`jianwei-demo` 先验基准引擎（本地启发式演示）——按“信用星级 → 变化速度 → 因果变量净动量”透明线性加权产出方向与置信度，并如实标注“非真实模型调用”；

- 文案统一：标题“先验基准推演引擎”、步骤名“先验基准推演”、结果区“引擎置信度（线性加权）”、盲区“引擎盲区提示（启发式）”、差距诊断不再引用“深度贝叶斯”；

- `types.ts`：`AIModelChoice` 增加 `'jianwei-demo'`；`ForecastArenaTab` 清理 `article.sentiment` 未声明字段访问死分支与过期 imports。

### 7. 详情页其余诚实化

- `LogicTreeTab`：“AI 沙盒实时推演结论”→“本地启发式沙盒推演结论”；“非线性动态权重聚合算法”→“演示用线性加权敏感性沙盒”；快照按钮改名“标记当前方案（未持久化）”；

- `RippleEffectTab`：“去伪交叉校验通过”→按数据 `verified` 显示“已核验/待复核”；标题改为“多源引用与交叉对比”；

- `AudioBriefingModal` 页脚：“平台多源事实引擎实时驱动”→“示例简报脚本 · 浏览器语音合成（TTS）播放”。

### 尚未执行（后续批次）

- `strict` 开启（需先补 `@types/react` + `@types/react-dom`，并处理数百个空值/隐式 any 报错，本机 pnpm store 冲突暂无法安装，见下）；

- SearchModal 防抖；首页 feed 空态文案；`index.css` 双米白统一；字体本地化；星级多样化；真实数据管道设计。

***

## J. 已完成整改批次 2（2026-09-02，A 区清理 + 工程细节，已过 `tsc` 与 `vite build`）

1. **A 区孤儿代码清理（方案一：删除，共 11 个文件 ≈1700 行死代码）**

   - 删除：`modes/FastDialogueView|DataDrivenView|ModernMagazineView|ClassicPrintView|ImmersiveStoryView`（含空目录）、`ReadingRhythmSpectrum.tsx`、`SpectrumRibbon.tsx`、`GenwayMethodologyCard.tsx`、`EvidenceTraceModal.tsx`、`NuanceInquiryBar.tsx`、`PrintCardExportModal.tsx`；

   - 连带清理：`newsData.ts` 的 `READING_MODES` 导出、`types.ts` 的 `ReadingModeConfig` 接口；`ReadingMode` 联合瘦身为 5 个实际 id（`classic/fast_dialogue/data_driven/magazine/immersive`）；`SpectrumLayerType` 去掉尾部 `| string`（联合恢复意义）。
2. **配置清理**：`vite.config.ts` 乱码注释（含不可见字符，用正则删除）；`pnpm-workspace.yaml` 移除无效占位 `allowBuilds` 块，保留 `onlyBuiltDependencies`。
3. **AnalyzeModal**：失败不再静默——新增 `submitError` 状态 + 红色错误条（保留用户输入），打开时自动清空；Esc 可关闭。
4. **DehydratedModeFeed**：展开项在筛选结果变化后自动复位（不再指向被过滤掉的卡片）。
5. **全站模态 Esc 关闭**：新增 `src/hooks/useEscapeClose.ts`，接入 7 个模态（Search/AddRadar/Analyze/AudioBriefing/CognitiveModel/NameExplanation/TermExplain，Term 以 `term !== null` 为开态）。
6. **App.tsx**：默认收藏 `['art-1']`（无匹配文章）→ `['news-ai-agent-breakthrough']`。
7. **strict 模式评估结论（已回退）**：项目从未安装 `@types/react`/`@types/react-dom`（`node_modules/@types` 仅 express/node），当前 `tsc` 0 报错是在“JSX/React 无类型”的宽松配置下得到的；开启 `strict` 后共 3513 报错，其中 **3177× TS7026 + 72× TS7016** 都源于缺少 React 声明文件，另 124× TS7006 隐式 any（多为 `setState` 回调参数）。本机 `pnpm add -D @types/react@19 @types/react-dom@19` 因 pnpm store 版本冲突失败（提示需 `pnpm install` 重建）。**后续步骤**：先用与 lockfile 匹配的 pnpm 重建依赖并补装 @types/react(-dom)，再开 strict 逐文件收口（预计剩几百个空值/类型错误，属独立工作批次）。

***

## K. 已完成收尾批次 3（2026-09-02，均已过 `tsc` 与 `vite build`）

1. **TermExplainModal 退场动画修复**：重构为组件常驻挂载 + `AnimatePresence` 包裹条件内容（此前组件在 `term===null` 时直接 `return null`，退场动画从未播放）；顺带修复此前脚本注入造成的同行双 import。
2. **暖纸色统一**：`index.css` 的 `--paper-warm` 由 `#FAF7F2` 统一为全站组件实际使用的 `#FAF8F5`（消除背景色与卡片/面板的细微色差）。
3. **SearchModal**：150ms 防抖后才执行文章/专题/雷达三路过滤（避免每次击键全量匹配）；并修复退场动画（组件常驻挂载 + `AnimatePresence` 条件包裹，不再直接 `return null`）。
4. **首页空态文案**：`StandardModeFeed` 空态不再误指“上方 AI 提交分析”不存在于详情页的问题，改为指引“切换分类/清除雷达词或点击顶部 AI 提交分析”。

> 注：本批次改动后需重启本地服务才生效（当前 :3001 上运行的仍是旧代码进程）。

> 附注：总评“功能梳理与评价”见上一轮回复；本清单与其一一对应（孤儿代码=A 区；假实时=C/G；无持久化=E/App；工程规范=B）。

***

## L. 已完成收尾批次 4（2026-09-02，均已过 `tsc` 与 `vite build`）

1. **模态退场动画补齐（4 个）**：`AddRadarModal`/`AnalyzeModal`/`AudioBriefingModal`/`NameExplanationModal` 改为组件常驻挂载 + `AnimatePresence` 条件包裹（`{isOpen && (...)}`），移除直接 `return null` 的早退，退场动画自此生效（`CognitiveModelModal` 无 motion 包装，未处理，可后续加）。
2. **字体 @theme 接线**：`index.css` 增加 Tailwind v4 `@theme` 块（`--font-sans/--font-serif/--font-mono` → Plus Jakarta Sans / Noto Serif SC+Newsreader / JetBrains Mono），`font-sans/font-serif/font-mono` 工具类自此使用站内字体栈；同步删除 `:root` 中重复的手工字体变量。
3. **数据星级多样化**：`newsData.ts` 第 3、4 篇文章（美联储流动性、新能源出海）`credibilityStars` 5→4，不再“全站 5 星”；因 `sourceCount` 仍 ≥5，不受“热门”筛选影响。

***

## M. 已完成批次 5（2026-09-02）

1. **CognitiveModelModal 退场动画**：补 `motion/react` 包裹 + `AnimatePresence` 条件渲染（遮罩淡出），并顺带修复此前脚本造成的同行双 import；组件内 `layers` 静态数据无改动。
2. **新增设计文档** **`DATA_PIPELINE_DESIGN.md`**：真实数据采集（源适配器/tier/清洗）、情报中心常量→服务端派生逻辑对照表、AI 层生产化（新增 `/api/predict` 双轨：真模型 vs `jianwei-demo` 本地启发式）、前端 `useLocalState` 持久化迁移、`DEMO_MODE` 水印与 CI 文案审计、strict 就绪步骤、M0–M3 里程碑与回滚策略。

***

## N. 已完成批次 6（2026-09-02）

1. **TopicsView 计数真实化**：专题卡片“收录 N 篇”与页头计数均由 `articles` 实际匹配计算（`countMatched`）；删除了误导性的 `articles.slice(0,2)` 兜底，改为空态提示。
2. **数据一致性微调**：OpenAI Agent 文章 `jargonTerms` 去掉张冠李戴的“CPO光电共封装” → “工作流自动化”，并在 `jargonData.ts` 补全该词条（8→9 条术语），保证通俗模式点词有词典释义。
3. **`useLocalState`** **通用 hook + 迁移**：新增 `src/hooks/useLocalState.ts`（localStorage 持久化、版本化包装、隐私模式静默降级）；`App.tsx` 的收藏 `bookmarkedIds` 与关注标签 `followedTags` 已迁移为持久化状态（刷新不再丢失）。

***

## O. 已完成批次 7（2026-09-02）

1. **雷达关键词持久化**：`App.tsx` 的 `radarKeywords` 由 `useState` 迁移为 `useLocalState('radar-keywords', INITIAL_RADAR_KEYWORDS, {version:1})`——用户添加/移除的监控词刷新后保留。
2. **预测契约持久化**：`predictionContracts` 迁移为 `useLocalState('prediction-contracts', INITIAL_PREDICTION_CONTRACTS, {version:1})`——在预测擂台签订的契约、到期裁决（Brier/resolutionDate/状态）与删除操作全部刷新不丢。
3. 至此 `useLocalState` 已覆盖：收藏、关注标签、雷达关键词、预测契约、行动备忘录（`MyFocusView` 直连 key）。个人身份/阅读模式暂保留内存态（低价值、可随时加）。

***

## P. 已完成批次 8（2026-09-02，全部过 `tsc` / `vite build`，`/api/predict` 已实测）

1. **UI 偏好持久化**：`App.tsx` 的 `homeReadingMode`（key `home-reading-mode`）与 `selectedPersonaId`（key `user-persona`）迁入 `useLocalState`——刷新保留身份透镜与阅读模式。
2. **行动备忘录统一接入**：`MyFocusView` 直连 `localStorage` 的实现替换为 `useLocalState('action-memo')`（统一 `jianwei:` 前缀与版本机制）。注意：旧 key `jianwei-action-memo` 下的历史备注不会被迁移（如需可加一次性读取迁移，见清单）。
3. **服务端** **`/api/predict`** **双轨端点**（`server.ts`）：

   - 入参：question/modelChoice/userDirection/userConfidence/premises/falsifiableIndicator/articleContext/questionOptions；

   - 有 `GEMINI_API_KEY` 且 `modelChoice!=='jianwei-demo'` → 真调 Gemini 2.5 Flash（JSON schema prompt，含 baseRate 修正与合并 modelName）；

   - 无 Key/`jianwei-demo`/异常 → 返回 `{fallback:true, data: localBaselinePrediction(...)}`（服务端与前端启发式同口径）；

   - 空 question → 400。实测：400 ✓、无 Key 返回本地基准（direction/conf/base 正常）✓。
4. **前端接线**：`ForecastArenaTab` 将预测拆为模块级 `computeLocalPrediction`（即时兜底）+ `useState` + `useEffect` 自动请求 `/api/predict`（20s AbortController）；横幅状态三态显示「在线模型引擎 · 推演完成 / 正在请求在线引擎… / 本地启发式演示（无 Key/离线）」，订阅契约与认知比对均使用在线结果。

***

## Q. 已完成批次 9（2026-09-02，全部过 `tsc` / `vite build`，端点已实测）

1. **旧 key 一次性迁移**：`useLocalState` 新增 `legacyKey` 选项——首次读取时若新 key 无数据则读取旧 key、落盘新 key 并删除旧 key；`MyFocusView` 行动备忘录声明 `legacyKey: 'jianwei-action-memo'`（历史备注自动迁入 `jianwei:action-memo`）。
2. **服务端派生骨架** **`/api/snapshot`**（`server.ts`）：导入内置演示语料（`src/data/newsData`），诚实派生 `categoryCounts / starDistribution / velocityCounts / tagFrequency / sourceStats`；`meta.demo/corpusSize/note` 明确标注“内置演示语料派生骨架”，未派生指标以 `notYetDerived` 列出（heatmap/density/sourceHealth/blindspots/tomorrow/synergies）——真实信源接入后同端点输出实时快照。实测：返回 4 篇语料的分类/星级(4:2,5:2)/速度/标签频率正常。

***

## R. 已完成批次 10（2026-09-02）

1. **情报中心统一“数据口径说明”条**：`IntelligenceHubView` 顶部横幅下新增琥珀说明条——如实说明顶部“数据底座”与各面板来自内置示例语料、`/api/snapshot` 已具备的分类/星级/标签真实统计，以及热力/健康度/盲区/明日预测/共振仍为演示口径（接入真实信源后移除）。
2. **API 冒烟脚本**：新增 `scripts/smoke.mjs`（`pnpm smoke`），对 health/首页 HTML/analyze（含动态日期断言）/snapshot/predict（400 与回落）/strategic-advisor/ask-nuance 共 11 项断言，实测全部通过。
3. **README.md**：补全项目说明（快速开始/六板块/诚实边界/目录/文档索引/已知限制）。

***

## S. 已完成批次 11（2026-09-02，全部过 `tsc` / `vite build`；冒烟 14/14 通过）

1. **前端情报数据层 + DEMO/真实双轨（方向一）**

   - `src/types.ts` 增补 `SnapshotResponse/SnapshotMeta/SnapshotDerived` 契约；

   - 新增 `src/hooks/useSnapshot.ts`（拉取 /api/snapshot，15s 超时，loading/ok/error 三态，手动刷新）；

   - `IntelligenceHubView` 新增“语料快照 · 服务端派生统计”面板：语料数/覆盖分类/平均信源/星级分布/高频标签 TOP + 生成时间；右上状态徽章三态（实时语料·在线 / 演示语料·派生真实 / 接口不可达），右上角“数据底座”框随快照显示真实语料数；接口失败时面板给空态与重试，其余演示面板保持示例口径并保留披露条。
2. **服务端可变语料库 + 真实信源接入骨架（方向二）**

   - `server.ts`：运行时语料 `serverCorpus`（内置语料深拷贝）；`/api/snapshot` 改派生于运行时语料，`meta.corpus='live'|'curated'`、`meta.demo` 按 `NEWS_FEED_URLS` 是否配置如实标注；

   - 新增 `src/server/feeds.ts`：无依赖 RSS 抓取/解析（fetch + 正则 + 实体解码/CDATA/去标签）、超时、批内按标题去重；

   - 新增端点：`GET /api/feeds/status`（enabled/urls/lastIngest/corpusSize）、`POST /api/feeds/ingest`（抓取 → 与运行时语料去重 → 并入 serverCorpus → 更新 snapshot 输入；未配置时 400）；

   - `.env.example` 增 `NEWS_FEED_URLS` 注释示例。
3. **冒烟扩充至 14 项**：新增 feeds/status 结构与 ingest(未配置) 400 断言——全部通过；实测 snapshot meta：`corpus:'curated', demo:true, corpusSize:4`。

***

## T. 已完成批次 12（2026-09-02，全部过 `tsc` / `vite build`；冒烟 15/15 通过）

1. **`/api/corpus`** **+ 首页信息流合并**：服务端新增 `GET /api/corpus`（返回运行时语料 + meta）；`App.tsx` 启动时拉取并按 id 去重并入 `articles` 状态——摄取 RSS 后首页/搜索/收藏体系立即可见新条目，无需重建。
2. **浅层文章详情降级**：`NewsDetailView` 新增 `MissingDeep` 占位；当外部信源浅层条目缺少 `logicTree/rippleEffect/spectrumLayers` 时，对应页签显示“暂无深度认知数据（配 GEMINI\_API\_KEY 后可 AI 懒加载补全）”，不再崩溃（原代码使用 `!` 非空断言直接渲染）。
3. **离线单测 RSS 解析**：`parseRSS` 对 CDATA/实体/去标签样例解析正确（2/2）。
4. 冒烟扩至 15 项（新增 `/api/corpus` 断言），全部通过；实测 corpus：size 4 / curated / demo:true。

***

## U. 已完成批次 13（2026-09-02，全部过 `tsc` / `vite build`；冒烟 17/17 通过）

1. **`/api/enrich`** **深度认知懒加载补全**（server.ts）：对浅层外部信源条目生成七要素/因果树/身份矩阵/涟漪/五层光谱/证据链等 JSON 覆盖字段；**无** **`GEMINI_API_KEY`** **时明确返回** **`{enriched:false, reason:'no_api_key'}`（不生成假内容）**；空请求 400、出错返回 `reason:'error'`。
2. **详情页自动触发 + 合并**（`NewsDetailView`）：浅层条目（无 `spectrumLayers`）打开即请求 `/api/enrich`（25s AbortController）；新增 `mergeDeep` 白名单合并与 `deepNote` 动态提示（加载中 / 未配 Key / 失败）；`App.tsx` 的 `handleEnrichArticle` 同步更新 `articles` 与当前 `selectedArticle`，补全后页签即渲染真实内容。
3. **检索覆盖服务端语料**：因 App 启动已把 `/api/corpus` 按 id 去重并入 `articles`，`SearchModal`、首页过滤、收藏体系天然覆盖摄取条目，无需额外改动。
4. 冒烟扩至 17 项（新增 enrich 400 与 no\_api\_key 断言），全部通过。

***

## V. 已完成批次 14（2026-09-02，全部过 `tsc` / `vite build`；冒烟 17/17 通过）

1. **`/api/enrich`** **服务端缓存**：同一篇文章（`articleId` 优先，否则标题 hash）只跑一次 AI；命中返回 `{enriched:true, cached:true, overrides}`，内存上限 1000 条自动清空；前端补全请求已携带 `articleId`。
2. **基础防护**：`express.json` 上限 10mb→5mb；新增滑动窗口限流（默认 300 次/分/IP，`RATE_LIMIT_MAX` 可配，超限 429），已应用于 `/api/enrich`（其余 AI 端点可按同样模式追加）。
3. **外部信源可辨识 + 首页分类**：`NewsArticle` 新增可选 `isExternal`/`sourceUrl`；RSS 摄取条目 `isExternal:true`；首页标准 feed 卡片与详情页元信息新增“外部信源”角标；`HomeView` 分类 pills 在有外部条目时动态追加“外部信源”筛选项。

***

## W. 已完成批次 15（2026-09-02，全部过 `tsc` / `vite build`；冒烟 17/17 通过）

1. **全 AI 端点限流**：滑动窗口中间件（默认 300 次/分/IP，`RATE_LIMIT_MAX` 可配）已应用于 `/api/analyze`、`/api/strategic-advisor`、`/api/ask-nuance`、`/api/predict`、`/api/feeds/ingest` 与 `/api/enrich`。
2. **enrich 缓存升级 TTL+LRU**：`cacheGet/cacheSet` 实现过期淘汰（默认 24h，`ENRICH_TTL_MS` 可配）与最近使用刷新、容量上限 1000 逐出最旧。
3. **外部条目原文跳转**：详情页在“外部信源”角标旁对含 `sourceUrl` 的条目显示“阅读原文 ↗”（新窗口外链）。
4. `.env.example` 补充 `RATE_LIMIT_MAX` / `ENRICH_TTL_MS` 说明。

***

## X. 已完成批次 16（2026-09-02，全部过 `tsc` / `vite build`；冒烟 18/18 通过）

1. **`/api/admin/status`** **可见状态**：暴露 server uptime、限流参数（max/窗口）、enrichCache/predictCache（size+TTL）、corpus（口径/demo/size）、feeds 配置与 lastIngest。
2. **`/api/predict`** **在线结果缓存**：仅缓存真实模型成功输出（question hash 键，默认 TTL 10 分钟，容量 500 LRU），命中返回 `cached:true`；本地启发式确定性结果不缓存。
3. **首页内容口径切换**：`HomeView` 新增“全部条目 / 深度解读 ·N / 外部信源 ·N”切换（深度=含光谱层，外部=RSS 摄取），与分类/雷达过滤叠加生效。
4. `.env.example` 补充 `PREDICT_TTL_MS`；冒烟新增 `/api/admin/status` 断言（现 18 项全绿）。

***

## Y. 已完成批次 17（2026-09-02，全部过 `tsc` / `vite build`）

1. **预测擂台完整双轨引擎选择**（`ForecastArenaTab`）：

   - 新增 `enginePreference: auto | local | online` 状态与 Segment UI（自动在线优先 / 在线模型 Gemini / 本地演示），“强制在线”模式下服务端无 Key 或失败会回落本地并如实提示；

   - 请求 `modelChoice` 随偏好：auto→'auto'、online→'gemini-2.5-flash'、local→'jianwei-demo'（本地不再发起网络请求）；

   - effect 依赖含偏好：切换引擎立即中止旧请求并按新偏好重算。
2. 本批无服务端改动；`:3001` 仍为含 admin/status、predict/enrich 缓存、限流的批次 16 服务。

***

## Z. 已完成批次 18（2026-09-02，全部过 `tsc` / `vite build`；冒烟 18/18 通过）

1. **AI Provider 抽象层（DeepSeek 就绪）**：`server.ts` 新增 `activeProvider()/providerModel()/callAI()`——统一文本生成入口，五条 AI 端点（analyze/strategic-advisor/ask-nuance/predict/enrich）全部迁移，不再感知厂商；

   - Gemini 通道：原 @google/genai（模型 `GEMINI_MODEL`，默认 gemini-2.5-flash，支持 responseMimeType JSON）；

   - **DeepSeek 通道**：OpenAI 兼容 `chat/completions`（`DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL`/`DEEPSEEK_MODEL`，支持 `response_format: json_object`）；

   - 路由优先级：`AI_PROVIDER` 强制 > 默认 Gemini 优先、其次 DeepSeek；`/api/health.ai` 暴露 `provider/gemini/deepseek` 状态。
2. **预测擂台前端收口**：引擎偏好 `forecast-engine-preference` 经 `useLocalState` 持久化；“强制在线”且回落本地时显示红条“在线模型暂不可用：未配置 DeepSeek/Gemini API Key…”（提示语已含 DeepSeek）。
3. `.env.example` 新增 `AI_PROVIDER / DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL / GEMINI_MODEL` 说明。

***

## AA. 已完成批次 19（2026-09-02，全部过 `tsc` / `vite build`；冒烟 18/18 通过）

1. **DeepSeek deepseek-reasoner 适配**（server.ts `callAI`）：模型名含 `reasoner` 时自动省略 `temperature`、不使用 `response_format`（DeepSeek 文档限制），JSON 依赖调用方已有的 \`\`\`json 容错解析；chat 类模型仍走 `json_object` + temperature。
2. **前端引擎标签感知服务端通道**：`ForecastArenaTab` 启动读取 `/api/health.ai.provider`，引擎按钮“在线模型”动态显示为 Gemini / DeepSeek /（需 Key）。
3. `.env.example` 补充 reasoner 注意事项（不支持 json\_object、忽略 temperature）。

***

## AB. 已完成批次 20（2026-09-02，全部过 `tsc` / `vite build`；冒烟 18/18 通过）

1. **推理链提取与展示**：`server.ts` 重构为 `runAI()`（返回 `{text, reasoning?}`）+ `callAI`/`callAIWithReasoning` 包装；DeepSeek reasoner 的 `reasoning_content` 被捕获并随 `/api/predict` 返回（`predictData.thinkingTrace`）。`AIPredictionOutput` 增加可选 `thinkingTrace`；预测擂台在盲区卡前以折叠 `<details>` 展示“在线模型思考链”。
2. **AI 通道状态进情报面板**：新增 `src/hooks/useAIProvider.ts`（读 `/api/health.ai`）；情报中心“语料快照”面板头部新增“AI 通道：Gemini / DeepSeek / 未配置”状态 chip；`ForecastArenaTab` 改用同一 hook。
3. **完整双通道配置示例**：`.env.example` 末尾补充“方案 A Gemini / 方案 B DeepSeek”可直接复制的示例与切换规则、自检命令。

***

## AC. 已完成批次 21（2026-09-02，全部过 `tsc` / `vite build`；冒烟 20/20 通过）

**新增“设置”功能（用户信息 + AI 双通道 Key + 信源，服务端热更新）**

1. 服务端运行时设置（server.ts）：`RuntimeSettings` + `data/settings.json` 持久化（自动建目录），`activeProvider/providerModel/getGeminiClient/feedUrls` 全部改读运行时设置——保存即生效，无需重启；
2. 新端点：`GET/POST /api/settings`（脱敏：只回“已配置/未配置”，永不回传密钥明文；POST 支持 Key/模型/BaseURL/信源/昵称/通道热更新与清除）、`POST /api/ai/test`（以当前通道发极小请求验证连接）；
3. 前端 `SettingsModal`：用户昵称（本机 localStorage + 同步服务端）、AI 通道选择（自动/强制 Gemini/强制 DeepSeek）、两套 Key（密码框，未改动不覆盖、可一键清除）、模型与 BaseURL、RSS 列表、保存/测试连接/反馈提示、安全说明；
4. Header 齿轮入口 + 顶栏“你好，昵称”问候（昵称经 `useLocalState`）；
5. `.gitignore` 忽略 `data/settings.json`；冒烟新增 settings 脱敏与 ai/test 无 Key 断言（20 项全绿）；实测 GET/POST 热更新（昵称写入→还原）通过。

***

## AD. 已完成批次 22（2026-09-02，全部过 `tsc` / `vite build`）

**设置页深化**：

1. **昵称即时联动**：昵称提升为 App 级受控（`useLocalState('user-nickname')`），Header“你好，昵称”与设置页输入即时同步（不再等刷新）。
2. **AI 通道面板增强**：显示“生效通道”徽章、强制选择与回退差异提示（如“强制 Gemini 但未配置 Key，已回退 DeepSeek”）、当前模型清单（通道选择/Gemini 模型/DeepSeek 模型）。
3. **密钥输入体验**：Key 密码框增加“显示/隐藏”切换。
4. **信源状态与摄取面板**：内嵌“信源状态”卡（配置源数/运行时语料/lastIngest 结果与错误）、刷新按钮与“立即摄取”按钮（未配置 RSS 时禁用并给引导提示），摄取结果与错误回显到反馈区。

***

## AE. 功能实测（2026-09-02）

1. 新增 `scripts/functional-test.mjs`（29 项断言，可重复/幂等运行，含 `/api/admin/reset` 环境复位）与 `scripts/fixtures/rss.xml` 本地样例源；`package.json` 增加 `test:func`。
2. 实测结论（当前无真实 API Key 环境）：

   - 健康/页面/动态日期/派生快照/语料/预测回落/enrich 不可用/顾问/探针/设置脱敏/热更新/信源状态/真实 RSS 摄取（2 条新增、isExternal、live 切换、不可达源错误隔离）/还原/管理状态/AI 测试：**29/29 通过（两轮幂等）**；

   - 限流实证：RATE\_LIMIT\_MAX=8 时前 8 次 200、后续 429；

   - 前端产物核对：构建 JS 包含设置/先验基准引擎/语料快照/阅读原文/外部信源/立即摄取等 11 个功能标记。
3. 修复：`.env` 占位符 `MY_GEMINI_API_KEY` 不再被持久化为“已配置”（默认值过滤 + 清理 settings 文件）。

***

## AF. 在线 DeepSeek 通道实测（2026-09-03，配置真实 DeepSeek API Key 后）

1. `/api/health`：`ai.provider='deepseek', deepseek:true`；
2. `/api/ai/test`：`ok:true`，返回样例“正常”；
3. `/api/predict`（deepseek-chat）：`fallback:false`，modelName“DeepSeek deepseek-chat · 在线推演引擎”，真实方向/置信度/因果链与裁决文案；
4. `/api/analyze`：`fallback:false`，生成完整 sevenElements/logicTree/五层光谱，日期动态（当日）；
5. `/api/enrich`：`enriched:true` 生成逻辑树/5 层光谱/6 身份；同 articleId 二次请求命中 `cached:true`；
6. `/api/strategic-advisor`、`/api/ask-nuance`：真实长答复（514/386 字）;
7. **deepseek-reasoner**：设置热切换到 `deepseek-reasoner` 后 predict 返回 `thinkingTrace`（878 字思考链），JSON 无需 response\_format 亦正确解析；随后已恢复 `deepseek-chat`；
8. 说明：密钥经 `/api/settings` 存入 gitignore 的 `data/settings.json`（不回传/不回显）；smoke/functional 以无 Key 基线为断言对象，配置 Key 的实例请用上述在线验证或另起无 Key 实例跑套件。

***

## AG. 情报面板真实化系列（2026-09-03，每步均过 tsc / vite build；launchd 常驻已加载）

1. **跨事件共振去演示**：`CrossEventNexusPanel` 重写为语料真实计算（共享标签 30% + 字符二元组文本相似 40% + 深层字段 15% + 同分类 10%，公示打分公式；TOP 自动发现 + 自由双事件）；移除详情页静态“暗线交汇”桥卡。
2. **24H 热力真实化**：`SentimentHeatmap24h` 改用语料 `publishedAt` 按 4 小时槽统计（当前 383 条外部信源）；新增共享解析 `src/utils/publishedAt.ts`。
3. **情报密度曲线真实化**：`IntelligenceDensityCurve` 改用 `publishedAt` 2 小时槽计数，峰值标记与高峰样例可点跳。
4. **信源健康真实化**：`DataSourceHealthPanel` 改为按语料逐条派生（来源构成 Top、星级真实分布、综合健康分=多样性35+外部活跃35+深度覆盖30 并公示构成）；立场冲突仲裁不再展示编造案例，改为诚实占位说明。
5. 口径：服务端 snapshot `notYetDerived` 仅剩 `sourceHealth/blindspots/tomorrowForecasts` 前的占位早已移除 heatmap/density/crossEvent；示例残留仅盲区与明日预测两项（需覆盖率/日历事件模型）。

***

## AH. 低覆盖“一键补源建议”交互（2026-09-03，过 tsc / vite build）

1. `src/utils/sectorTaxonomy.ts` 新增 `SUGGESTED_SOURCES`：9 赛道各自的方向性建议信源清单（名称+关注点，附“请自行核实官方 RSS 地址”提示，不伪造具体链接）。
2. `TodayBlindspotWidget`：低覆盖赛道条目内新增可展开“补源建议”（建议信源列表 + 说明），并提供“打开设置添加信源”按钮直达设置弹窗；`IntelligenceHubView`/`App` 已透传 `onOpenSettings`。
3. 由此形成闭环：盲区扫描 → 低覆盖赛道 → 建议信源 → 设置页添加 RSS → 摄取 → 盲区扫描随语料更新。

***

## AI. 指标真实化二期（2026-09-04，tsc/vite 通过；服务端已含 /api/conflicts）

1. **市场情绪词典代理接入**：顶栏/首页 Hero/市场卡改用 corpusMetrics 的净情绪/负向信号/正-中-负计数（实测语料：净情绪 +73、正向 121 / 中性 247 / 负向 19、9 赛道）；不可推的指标（政策敏感/技术突破）在“口径怎么来”里如实标注示例。
2. **MyRadar 真实命中**：监控词按语料标题/摘要计数 + 近24h/前日窗口变化（含“新词/持平/±%”），等级点按近24h 命中定级，展示最近命中标题。
3. **热力维度升级**：行=来源/来源地区（region 配置表 sourceRegion.ts），列=24h 时段/近 7 天；格内真实条数。地区口径为“信源所在地”，非内容涉事地区（注明）。
4. **密度曲线三维度**：总量 / 按来源堆叠 / 按赛道堆叠（赛道词典），图例与悬停可见细分计数。
5. **跨源立场冲突仲裁真实化**：POST /api/conflicts（同赛道分组 ≥2 源 → DeepSeek JSON 立场判定+引句+分歧+小结，可复核）；面板含 加载/重试/无候选/无Key 状态。实测返回 3 例（AI与软件/互联网平台/政策治理 等）。

***

## AJ. 词库可配置 + 涉事地区 + 算法查看（2026-09-04）

1. **赛道词库可覆盖**：`sectorTaxonomy.ts` 支持 localStorage「sector-taxonomy-overrides」按赛道覆盖关键词（含默认导出）；覆盖后刷新页面，盲区扫描/密度“按赛道”/明日热度点名统一按新词库重算；服务端冲突分组仍用内置默认（注明）。
2. **内容涉事地区**：新增 `mentionRegion.ts` 词典启发式（大陆/美国/欧洲/日韩/东南亚亚太/中东/拉美），热力“行：涉事地区”可看内容涉及地区（非来源地）；标注“非实体识别、含误判”。
3. **设置页“词典与算法”**：词库 JSON 编辑 + 保存（刷新生效）+ 恢复默认；并可展开查看——情绪词典词表、赛道词数、来源地区/涉事地区表、共振/健康分/净情绪全部公式（口径透明、可复核）。

***

## AK. AI 涉事地区全量标注 + 可视化词库编辑（2026-09-04）

1. **全量后台标注**：`POST /api/regions/annotate` 异步分页（20 条/批）处理全部外部条目，调用在线模型判定涉事地区并把 `regionMentions` 写回 `serverCorpus` 后 `persistCorpus()`；`GET /api/regions/status` 查看进度（processed/total/failed）。面板新增“全量后台标注”按钮、3s 轮询进度条、完成后提示“刷新页面展示缓存结果”。
2. **缓存优先展示**：`NewsArticle.regionMentions`（类型已加）；情报中心 AI 涉事地区面板若语料已有缓存标注（≥1 条）优先聚合展示（置信度合计条形），抽样按钮仍可重标注。
3. **设置页词库可视化编辑**：逐赛道关键词输入（逗号分隔，自动回填已有覆盖并合并默认），JSON 降级为只读预览；保存=写 localStorage + POST 同步服务端（冲突分组/检测同词）。

***

## AL. 全量标注任务升级 + 快照地区统计（2026-09-04，已实跑完成）

1. **断点续跑/取消**：/api/regions/annotate 跳过已有 regionMentions 的条目（重启后自动续跑）；新增 POST /api/regions/cancel；task.status ∈ idle/running/finished/cancelled。
2. **涉事地区入快照**：/api/snapshot.derived 增加 regionMentionDistribution 与 regionAnnotatedCount；情报中心“语料快照”面板在有标注后显示地区 chips。
3. **词库编辑提示**：设置页逐赛道输入框带“用默认词”按钮与“建议源”提示（复用补源清单）。
4. **实跑结果（383/383，0 失败，约 1 分钟内完成）**：regionAnnotatedCount=383；分布（置信加权）：中国大陆 225.3、美国 62.4、欧洲 23.8、其他 16.9、东南亚 10.3、日韩 9.1。已持久化到 data/corpus.json。

***

## AM. 涉事地区聚焦：依赖预警 + 语料地区过滤（2026-09-04）

1. **GET /api/corpus 支持 region 过滤**：`?region=中国大陆&limit=N`（按 regionMentions 匹配，meta.matches 返回命中数）。实测：region=中国大陆 matches=250，样本返回正常。
2. **RegionDependenceWidget**（情报中心）：

   - 单点依赖预警：涉事地区置信加权份额 ≥50% 时提示“高度集中于 X（来源 N 个，≤2 为来源单点）”，否则显示分散状态；

   - 按涉事地区浏览：Top 8 地区 chips → 拉取该地区最近 12 条语料，点击可打开对应文章（onOpenArticleById）。

***

## AN. 地区情报面板（覆盖/来源去重度/近7天，2026-09-04）

`RegionIntelligencePanel`（情报中心 5.3）：按 AI 标注 regionMentions 聚合 Top 8 地区，展示 条目数/来源数/平均置信、来源去重度条（多元度）、近 7 天到达迷你柱（自然日，左旧右新）；无标注时提示先跑全量。纯前端、基于语料即时计算。

***

## AO. 地区情报升级为一级导航（2026-09-04）

- `PrimaryNavTab` 新增 `region`；Header 导航新增“地区情报”（MapPin）；

- 新增 `RegionIntelligencePage`：组合 AI 涉事地区标注 / 依赖预警+按地区浏览 / 地区情报（覆盖-去重-近7天）三个面板为独立页面，并支持点击文章跳详情；

- App 路由按 activeTab==='region' 渲染（同 Articles 数据源）。

***

## AP. 地区情报页：筛选 + 地区×赛道交叉矩阵（2026-09-04）

- 页面级筛选：时间（全部/近7天/近30天，按 publishedAt）+ AI 置信度阈值（不限/≥0.5/≥0.7），作用于全部地区面板，实时命中计数；

- `RegionSectorMatrix`：每篇取置信最高涉事地区 × 赛道词典命中 → 交叉矩阵（计数、相对峰值着色、行列随语料动态、口径注明）。

***

## AQ. 地区×赛道下钻文章流（2026-09-04）

- `RegionSectorMatrix` 单元格可点击（有值时）：触发 onCell(region, sectorId)；

- 地区情报页：点击矩阵格后在其下方展开“下钻：地区 × 赛道（N 条）”——列出当前筛选下匹配（主涉事地区 + 赛道命中）的最新文章（含来源），点击可打开详情；带关闭与空态提示；无下钻时显示引导文案。

***

## AR. 主体/机构 AI 标注（抽样，2026-09-04）

- `POST /api/entities`：批量（≤24 条）DeepSeek 抽取每篇 ≤3 个主要涉事主体（公司/机构/人物 + 置信度）；

- `EntitySamplePanel`（地区情报页）：置信加权聚合 Top10（类型彩色标签 + 条）与逐条主体 chips（可点进详情）；

- 实测：谷歌(Gemini…) → \[谷歌·公司, Gemini 3.8 Flash Cyber·其他]；央行 → \[央行·机构]；台积电/英伟达 → 均标注公司；

- 全量+断点任务可按涉事地区任务模式扩展（注明）。AI 判断非事实结论。

***

## AS. 主体全量标注任务 + 实跑（2026-09-04）

- 端点：POST /api/entities/annotate（断点续跑/跳过已有 entityMentions）、POST /cancel、GET /status（与地区任务同模式）；

- 实跑：383/383、0 失败；语料条目写入 entityMentions 并持久化（data/corpus.json）。

- 语料抽样 Top 主体统计可经 /api/corpus 读取（如 台积电/谷歌/央行 等按名称聚合）。

***

## AT. 三级下钻：地区 × 主体 × 赛道（2026-09-04）

`ThreeLevelDrill`（地区情报页底部）：三级下拉（主涉事地区 / AI 抽取主体 Top60 / 赛道词库）逐级叠加过滤 → 实时命中数 + 文章流（点标题开详情）；空态给出引导。可精确回答如“中国大陆 × 华为 × 半导体”这类组合问题。

***

## AU. 组合情报导出 CSV（2026-09-04）

- `src/utils/intelExport.ts`：buildIntelCsv（列：标题/来源/发布时间/主涉事地区/地区置信/主体类型/赛道/原文URL）+ downloadCsv（BOM 防乱码）；

- 地区情报页筛选条新增“导出筛选 CSV”：导出当前 时间/置信度/下钻/三级筛选 结果。

***

## AV. 通用注解器重构（结构性工程 ①，2026-09-04）

- server.ts 以 Annotation Engine（createJob/JOBS/jobTodo/jobPrompt/jobAttach/runJob/registerAnnotator）统一 地区/主体 两套全量标注任务：分页 20、断点续跑（跳过已标注）、取消、状态、persistCorpus 全通用；新增维度仅注册 kind；

- 端点兼容不变（annotate/cancel/status ×2）；重启后既有 regionMentions/entityMentions 数据完好；entities/annotate 在新引擎下补跑遗留条目成功（1/1 finished），regions/annotate 返回 done:true。

***

## AW. 结构性工程 ②③（2026-09-04）

② 组合聚合与导出增强：地区情报页新增 ComboAggregate（地区×主体、主体×赛道 Top8 计数）；CSV 导出（intelExport）已含三级维度。
③ 回归/发布流程：server 支持 PORT 环境变量与 JIANWEI\_NO\_SETTINGS=1（纯净实例：不使用磁盘设置且忽略 .env 的 Key/信源、不写盘）；新增 scripts/release-check.sh（tsc→vite→esbuild→纯净实例:3215→smoke+functional+RSS 夹具）；package.json 增加 release-check。实测 release-check 全绿（smoke 20 + functional 29）。
