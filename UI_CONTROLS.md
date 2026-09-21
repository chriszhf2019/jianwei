# 见微 Genway · UI 可交互控件逐项清单（UI CONTROLS）

> 2026-09-04　范围：全站按钮/下拉/点击卡片/开关/输入等“可点可操作”控件。
> 列含义：**行为** = 点击后发生了什么；**实现** = 组件→函数/Hook；**数据** = 改状态/调 API/持久化。

---

## 0. 全局（Header / 页脚 / 模态容器）

| # | 控件（文字/图标） | 位置 | 行为 | 实现 | 数据 |
|---|---|---|---|---|---|
| 1 | Logo“微/见微 Genway” | Header | 回首页 | Header→onSelectTab('home') | App activeTab |
| 2 | 首页/情报中心/专题档案/地区情报/我的关注 | Header 导航 | 切换主页面（详情态先回列表） | onSelectTab | activeTab；置顶滚动 |
| 3 | ⌘K 搜索按钮 | Header | 打开全局搜索 | onOpenSearch | isSearchOpen |
| 4 | 身份透镜（当前角色）下拉 | Header | 展开 6 身份菜单 | showPersonaMenu | 本地下拉态 |
| 5 | 身份菜单项×6 | Header 下拉 | 设全局身份 | onSelectPersona | useLocalState('user-persona') |
| 6 | 设置齿轮 ⚙️ | Header | 打开设置弹窗 | onOpenSettings | isSettingsOpen |
| 7 | “AI 提交分析”（红 CTA） | Header | 打开投递弹窗 | onOpenAnalyzeModal | isAnalyzeOpen |
| 8 | 认知全景模型 / 关于见微 | Header/页脚 | 打开对应模态 | onOpenCognitiveModel / onOpenNameModal | 模态状态 |
| 9 | 今日晨间简报 / 战略态势感知室 | 页脚 | 打开音频简报 / 跳情报中心 | App | isAudioBriefingOpen / activeTab |
| 10 | 所有模态 ✕/ESC | 模态层 | 关闭（Esc 经 useEscapeClose） | onClose | 模态状态 |

## 1. 首页（HomeView）
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 10.1 | Hero「今日速览」（终版） | 4 行紧凑卡：徽标带（hover 看口径）→ 结论+好/坏/中性+温度条 → 今日赛道热度（赛道+命中数+top2词）→ 重大突发（有才显示） | HomeHeroStatus→stats/breaking/sectorHeat | 今日发布词典统计；scope=today/30d 回退；hasLive 徽标 |
| 10.2 | 阅读模式×3 + 🎧听简报（信息流工具条） | 工具条右侧切换 标准/通俗/脱水 与打开 TTS 简报 | HomeView 工具条 | useLocalState('home-reading-mode') / isAudioBriefingOpen |
| 10.3 | ~~右侧「今日市场状态」小卡~~ 已删除 | 原净情绪近30天与 Hero 打架；赛道热度为硬编码假数据 | 移除 MarketStatusWidget | 赛道真实计数并入 Hero |
| 11 | 阅读模式×3（标准/通俗/脱水） | 切换信息流三态 | HomeView 工具条 | useLocalState('home-reading-mode') |
| 11.1 | 通俗卡片「✨ AI 用大白话讲一遍」 | 按需技能：调 /api/skill/plain 生成 tongsuSummary，就地展开大白话三段 | TongsuModeFeed→HomeView.onRunSkill→App.handleEnrichArticle | 写回语料持久化 |
| 11.2 | 脱水卡片「⚡ 生成 30 秒脱水要点」 | 按需技能：调 /api/skill/dehydrate 生成 dehydratedItems，展开显示核心变化/影响 | DehydratedModeFeed→HomeView.onRunSkill→App | 写回语料持久化 |
| 12 | 🎧 听今日简报 | 打开 TTS 简报 | onOpenAudioBriefing | isAudioBriefingOpen |
| 12.1 | ~~右栏「我的监控雷达」~~ 已移除 | 入口已并入信息流「监控中」分类 pill；管理仍在设置/我的关注 | —— | localStorage('radar-keywords') |
| 12.2 | 设置页「我的监控雷达」管理区 | 词列表（含当前语料命中数）+ 删除 + 添加跳转 | SettingsModal(radarKeywords/onRemoveRadar/onAddRadarOpen) | localStorage |
| 13 | 分类 pills（全部/热门/关注/监控中/影响我/热门赛道等） | 本地过滤列表（当日池内叠加） | selectedCategory | HomeView state |
| 13.2 | 「监控中 ·N」分类 pill | 只看命中我监控词的今日新闻；选中时顶部提示监控词并可去设置管理 | monitorHits(article, radarKeywords) | localStorage('radar-keywords') |
| 13.1 | ~~内容口径 pills（全部/深度解读/外部信源）~~ 已删除 | 当日每条均可 AI 深度解读，口径筛选无区分意义 → 改卡片徽标：`✓ 已深度解读`（spectrumLayers>0）与 `外部信源 · 可深度解读`；工具条左为「今日新闻 · N 条」 | StandardModeFeed 徽标 | /api/enrich 写回语料持久化 |
| 15 | 文章卡片整卡 | 进详情 | onSelectArticle | selectedArticle→tab=detail |
| 15.1 | 卡片「📡 命中监控词」红标 | 命中任一监控词即在卡片标注；悬停看提示、每词可点 ✕ 移除该监控 | monitorHits(article, radarKeywords) | localStorage('radar-keywords') |
| 15.2 | 卡片头部信息行 | 来源权威徽标（官方·A/行业·B/消费·C，悬停档案）+媒体名+真实多源数 · 时间(悬停完整日期) · 深度解读状态 · 📡监控词 · 情绪(🟢/🔴/⚪/🟡词典) | mediaProfile/tierBadge/articleSentiment | utils/mediaAuthority.ts 人工档案（未收录标虚线） |
| 15.3 | 卡片派生标签行 | 真实tags ∪ 监控词 ∪ 赛道命中（最多4） | cardTags | detectSectors + tags |
| 15.4 | 两列网格 + 分页 | lg 起 2 列；每页 20 条，「再看 N 条」加载，切筛选回第 1 页 | HomeView grid/pagedArticles | PAGE_SIZE=20 |
| 15.5 | 卡片解读盒（标签页式） | 常驻六标签：解读/趋势/风险/大白话/脱水/背景；点未生成的 AI 标签即时调用 | CardInsightBox(TABS) + onRunSkill | /api/skill/* 写回 corpus |
| 15.6 | 详情页认知 Tab（五页） | 七要素事实 → 因果与涟漪(合并) → 与我何干 → 人机预测擂台 → 深度全览(通读) | NewsDetailView tabsList | logicTree+rippleEffect 同页 |
| 16 | 卡片 ★ 收藏/☆ | 收藏切换 | onToggleBookmark | useLocalState('bookmarked-article-ids') |
| 17 | 卡片标签 #tag | 关注标签切换 | onToggleFollowTag | useLocalState('followed-tags') |
| 18 | 通俗模式术语 💡 | 打开术语词典 | onOpenTermExplain | activeTermExplain |
| 19 | 监控词行 | 雷达筛选/清除 | onSelectKeywordFilter | selectedRadarFilter |
| 20 | “添加”监控词 | 打开 AddRadar | onOpenAddRadar | isAddRadarOpen |
| 21 | ~~市场卡“情报中心/查看指挥室”~~ 已随小卡删除 | 情报中心入口在顶部导航 | —— | —— |
| 21.1 | 当日静默兜底（默认视图） | 今日 0 条新情报时，默认视图展示语料最近 6 条并标注“历史旧闻/站内示例”；有当日条目或用户主动筛选时自动回到纯“当日”口径 | isQuietDay / fallbackArticles / showFallbackFeed → displayFeed | 本地派生（不改变“当日”口径事实） |

## 2. 新闻详情页（NewsDetailView + 五页签）
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 22 | 返回全景情报列表 | 回首页列表 | onBack | activeTab=home |
| 23 | 收藏 | 切换收藏 | onToggleBookmark | localStorage 收藏 |
| 24 | 生成简报卡片 | 展开/收起页内**七要素简报卡**（标题/来源时间/AI 定性徽标/事件模型整合句/7W 单行列表/口径页脚；未深读文章给“尚未深度解读”回退） | showPrintCard + composeModel（utils/sevenElementsBrief） | article.sevenElements 等 |
| 24.1 | 「下载 / 打印 PDF」 | 打印预览只输出简报卡（body.printing + #briefing-sheet 打印样式），对话框选“另存为 PDF”即下载 | handlePrintBriefing → window.print | 浏览器打印通道 |
| 24.2 | 「下载 PNG 图片」 | Canvas 直绘简化图卡（2x 高清、换行排版、四色圆点 7W、AI 定性/事件模型/页脚口径），触发下载 见微简报-<id>.png | utils/briefingImage.ts downloadBriefingPng | 无第三方依赖 |
| 24.3 | 微观探针降级标注 | 服务端 `fallback:true` 时在答复上方显示「⚠ 本次为离线兜底 / 模板内容（非 AI 生成）」；客户端异常不再伪造结论 | NewsDetailView（probeFallback） | POST /api/ask-nuance |
| 24.4 | 战略顾问降级横幅 | 同上，离线/失败时横幅提示且 `citations` 为空 | AIStrategicAdvisor（fallback） | POST /api/strategic-advisor |
| 24.5 | AI 提交分析离线拦截 | 服务端返回 `fallback:true` 时前端拒绝写入情报流并说明原因（不再注入模板内容） | AnalyzeModal | POST /api/analyze |
| 25 | 分享金句 | 复制金句到剪贴板 | handleCopyQuote | navigator.clipboard + 2.5s 提示 |
| 26 | 认知页签×5（七要素事实/因果与涟漪/与我何干/人机预测擂台/深度全览） | 切换拆解维度（涟漪并入“因果与涟漪”页） | activeTab（本地） | NewsDetailView state |
| 27 | “下一步”进阶卡按钮 | 按序推进页签/跳我的关注 | 顺序 setActiveTab / onNavigateTab | 本地/路由 |
| 28 | 暗线/共振/专题横幅 | 跳对应页 | onNavigateTab | activeTab |
| 29 | 微观探针：预设问题 chips×3 | 立即发起追问 | handleAskProbe | fetch /api/ask-nuance |
| 30 | 微观探针：输入+“探针追问” | 自由追问 | handleAskProbe | 同上 + loading |
| 31 | 浅层条目自动补全 | 打开详情自动触发（无按钮） | useEffect→POST /api/enrich | 写回 articles/selectedArticle |
| 32 | 逻辑树：情景（基准/看多/压力）、滑块、保存方案 | 调节权重沙盒 | LogicTreeTab（weights/savedSnapshot） | 本地状态实时重算 |
| 33 | 预测擂台：命题/方向/期限/置信滑杆/前提/证伪线 | 立论输入 | ForecastArenaTab 表单 | 本地状态 |
| 34 | 引擎选择（自动/在线 Gemini/DeepSeek/本地） | 切换预测引擎 | enginePreference | useLocalState('forecast-engine-preference') |
| 35 | “确认并签订预测验证契约” | 生成契约 | handleSignContract | App predictionContracts（useLocalState） |
| 36 | R1/reasoner 思考链 <details> | 展开思考链 | 折叠 | aiPrediction.thinkingTrace |
| 37 | 七要素分组标题行 ×3（核心结论/证据佐证/推演视角） | 折叠/展开该组要素卡（核心结论默认展开，其余默认收起） | GroupFold 标题行 + open state | SevenElementsTab 本地 state |
| 38 | “一键补齐缺失要素”（总览工具条） | 自动盘点缺失的 AI 要素并按固定顺序逐个生成（全景时间轴→影响力→底层逻辑→正反方博弈→相关线索），单 busy 态串联合并 | generateAll → onRunSkill 顺序 await | POST /api/skill/{timeline,stakeholders,corelogic,debate,relatednews} → merge → 写回语料 |
| 39 | “全部展开 / 全部收起” | 三组同步开合（全关时置为全开） | setOpen 全量开关 | SevenElementsTab 本地 state |
| 39.1 | 总览条缺失提示 | 实时显示“还缺 N 项 AI 要素（名称）”，齐全后按钮置灰为“要素已齐全 ✓” | elementReady/missingElements 派生 | 本地状态 |
| 40 | 「我的身份 · 正反双向预测」面板（与我何干页 chips 下方） | 服务全局默认身份的预测：①主线方向（本地加权）恒在；②AI 双向情景按需生成 | RelevanceIdentityTab（localTrend / forecastEntry） | article.personaForecasts（本地公式 + AI 字段） |
| 41 | “✨ AI 生成双向情景 / 重新生成” | 按 (文章, 我的身份) 生成/重生成乐观+悲观双向情景（含触发/证伪/概率带） | handleGenForecast → onRunPersonaForecast | POST /api/skill/personaforecast（personaId 缓存+upsert）→ 写回语料持久化 |
| 42 | 主线概率条（绿/红）+ AI 综合方向徽标 + 「建议盯盘」条 | 展示主线乐观/悲观本地估计、AI 对“你”的方向判断与监测信号 | localTrend.direction/pPos/pNeg · directionBias · keyMonitor | 本地动量公式 / AI 返回 |
| 43 | 双向情景单侧卡 ×2（ForecastSideCard） | 绿=乐观受益路（情景/受益点/触发/证伪/概率带），红=悲观受损路（受损点同构） | ForecastSideCard（bull/bear） | forecastEntry.bull / bear |
| 44 | 卡片解读盒「背景」tab（已与详情⑦合并实现） | 点击任一相关条目 = 打开该文详情（stopPropagation）；来源：findRelatedArticles（与详情⑦站内部分同 util） | CardInsightBox related + onOpenArticle | 本地匹配，零 AI |
| 45 | /api/skill/verdict（已删除） | 一句话定性死字段收敛：定性统一由 enrich oneSentenceVerdict / aiVerdict 提供；旧端点现 404 | 无（端点移除） | —— |
| 46 | 人机预测擂台·本地引擎（口径更新） | 与「与我何干·双向预测」同源：utils/localTrendModel momentum；无逻辑树变量时返回 中性/不估方向（Minus 图标）；置信度=该方向模型概率收敛 25-85；无历史样本、先验不偏不倚 | ForecastArenaTab / server localBaselinePrediction | 同一公式（单一实现） |
| 47 | 多源验证·权威计数与 tier 双口径（标注更新） | “权威/高可信（Tier 1）”按 AI 深读标注计；字母分级 官方A/行业B/观点C = 人工档案（mediaAuthority），两者口径不同已注明；与涟漪页逐条摘录互链同源 | 七要素多源验证 + RippleEffectTab | article.rippleEffect.multiSources |
| 48 | 预测出口边界口径行 ×4 | 擂台 / 与我何干双向预测 / What-If 沙盒 / 卡片趋势·风险 各自注明：论据定性（博弈）·身份双路径（与我何干）·变量敏感性（沙盒）·概率立约回测（擂台） | 各组件口径文案 | 静态说明 |
| 49 | 长文重点词着色（KeyTermHighlight） | 四色速读标注：绿=利好/进展 · 红=风险/负面 · 金=数字/时间 · 蓝=主体/技术/市场术语（悬停显示类别） | 词典自动匹配 + article.entityMentions（可选） | utils/keyTermTone.ts（本地零 AI）；应用于七要素模型句/逻辑点/正反方论点与依据、与我何干核心影响·机会·风险与双向情景、深度全览正文、通俗大白话段落、首页卡片副标题、卡片 AI 技能输出（趋势/风险/大白话/脱水） |
| 49.1 | 图例 KeyTermNote | 显示“颜色仅作速读引导…词典自动匹配，非 AI 判断、非事实结论” | NewsDetailView（七要素/与我何干/深度全览 Tab 顶部）+ TongsuModeFeed 列表顶部 | 静态说明 |

## 3. 情报中心各面板
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 37 | 语料快照“刷新” | 重拉 /api/snapshot | useSnapshot.refresh | snapshot 状态 |
| 38 | 共振：自动发现组合卡/自定义 tab/两篇下拉 | 选择/计算比对 | CrossEventNexusPanel | 本地派生（无接口） |
| 39 | 热力：时段/近7天、行来源/来源地区/涉事地区、格子 | 切换维度/选中格子 | SentimentHeatmap24h | 本地计算 |
| 40 | 热力格子“示例标题” | 打开对应文章 | onSelectArticleTitle | 详情路由 |
| 41 | 密度：总量/按来源/按赛道堆叠 | 切换 | IntelligenceDensityCurve | 本地计算 |
| 42 | 密度/热力高峰样例标题 | 打开文章 | onSelectArticleTitle | 详情路由 |
| 43 | 信源健康“重新仲裁” | 跑 /api/conflicts | runArbitration | 仲裁结果状态 |
| 44 | 涉事地区 AI：标注抽样/全量后台/状态 | 抽样/全量+轮询 | MentionRegionAIPanel | /api/regions,/api/regions/annotate,/status |
| 45 | 聚焦：依赖预警卡（展示）| 浏览地区 chips → 文章 | RegionDependenceWidget | /api/corpus?region= |
| 46 | 地区情报/组合计数/矩阵格子→下钻文章 | 过滤与打开 | RegionIntelligencePanel / ComboAggregate / RegionSectorMatrix→drill | 本地派生 + 详情路由 |
| 47 | 盲区“补源建议 ▾ / 打开设置添加信源” | 展开建议/跳设置 | TodayBlindspotWidget | onOpenSettings |
| 47.1 | 地区维度入口条 +「去地区深潜（主体×矩阵×下钻×组合）→」 | 说明统计三件套在此；一键跳「地区情报」深潜页 | onGoRegion | App activeTab=region |

## 4. 地区情报页（RegionIntelligencePage）
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 48 | 时间 pills（全部/7天/30天）、置信 pills（不限/≥0.5/≥0.7） | 过滤下方全部面板 | range/confMin | filtered memo |
| 49 | 导出筛选 CSV | 下载文件 | downloadCsv(buildIntelCsv) | 前端生成 CSV |
| 50 | 矩阵格子（有值） | 设 drill → 下钻文章流 | onCell→setDrill | 本地 |
| 51 | 下钻条目 / 三级下拉 / 清除 | 过滤并打开文章 | ThreeLevelDrill/下钻列表 | onOpenArticleById |
| 51.1 | （去重后已移除 ×3）AI 涉事地区标注 / 依赖预警 / 覆盖·去重·近7天 | 不再在本页重复渲染（并入情报中心），页头说明条引导 | MentionRegionAIPanel / RegionDependenceWidget / RegionIntelligencePanel | 见情报中心 |

## 5. 我的关注 / 专题 / 搜索
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 52 | 身份矩阵卡 | 设主视角 | onSelectPersona | useLocalState('user-persona') |
| 53 | 契约“删除” | 移除契约 | onRemoveContract | predictionContracts(localStorage) |
| 54 | 契约“录入结果/回测”按钮 | 打开裁决弹窗 | resolvingContractId | 本地 |
| 55 | 裁决胜出按钮×4（用户/AI/双赢/双失）+保存 | 回填 Brier/状态 | onResolveContract | App：Brier=(P−O)²、resolutionDate |
| 56 | 雷达“添加/删除”、收藏“复盘/移除” | 增删监控/收藏 | onOpenAddRadar/onRemoveRadar/onToggleBookmark | localStorage |
| 57 | 行动备忘录 textarea | 自动保存 | useLocalState('action-memo') | localStorage（legacy 迁移） |
| 58 | 专题集群卡/时间轴/收录报告 | 切换专题/进详情 | TopicsView | 本地选择/路由 |
| 59 | 搜索输入/热门词/ESC/结果项 | 客户端检索→进详情 | SearchModal | articles/topics/radar 过滤 |

## 6. 设置弹窗（SettingsModal）
| # | 控件 | 行为 | 实现 | 数据 |
|---|---|---|---|---|
| 60 | 昵称输入 | 即时顶栏问候 | onNicknameChange | useLocalState('user-nickname') |
| 61 | AI 通道 pills（自动/强制 Gemini/强制 DeepSeek） | 设通道偏好 | aiChoice | 表单态 |
| 62 | Key 输入×2（显隐切换） | 填 Key（仅改动才提交） | keysVisible/keyTouched | 保存时 POST /api/settings |
| 63 | 清除已保存的 API Key | 标记清除 | handleClearKeys | 保存时提交空串 |
| 64 | 模型名/BaseURL 输入 | 覆盖模型配置 | geminiModel 等 | POST /api/settings |
| 65 | RSS textarea | 编辑信源列表 | feedsText | POST /api/settings |
| 66 | 信源“刷新” | 拉 feeds/status | loadFeedStatus | 状态卡 |
| 67 | 立即摄取 | POST /api/feeds/ingest | handleIngest | 语料/快照实时增长 |
| 68 | 赛道词库逐赛道输入 + “用默认词” | 编辑词库 | updateTaxoRow | localStorage + POST(双端同步) |
| 69 | 词库保存/恢复默认 | 双端生效（刷新后） | saveTaxonomy/resetTaxonomy | localStorage + /api/settings |
| 70 | 查看算法口径与词表 <details> | 展开公式/词表 | details | 静态展示 |
| 71 | 测试连接 | POST /api/ai/test | handleTest | 显示 ok/原因 |
| 72 | 保存设置 / 取消 | POST /api/settings / 关闭 | handleSave | settings.json（热更新、脱敏） |

## 7. 键盘与可达性
| 控件 | 行为 | 实现 |
|---|---|---|
| ⌘/Ctrl+K | 打开搜索 | App keydown 监听 |
| Esc | 关闭任意打开模态 | useEscapeClose（7+ 弹窗） |
| 输入 autofocus（搜索） | 打开即聚焦 | SearchModal autoFocus |

> 备注：除上表列出的“fetch”外，面板级计算均为**纯前端派生**（本地语料/内存），无隐藏接口；凡写“持久化”均为 localStorage（`jianwei:*`）或服务端 settings.json / corpus.db（SQLite 主存储，corpus.json 为兼容快照）。
