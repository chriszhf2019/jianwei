# 见微 Genway · 全功能逻辑梳理与合理性审计（已被 V2 取代）

> ⚠️ **本文档为 2026-09-11 初版审计，保留仅供追溯。** 2026-09-12 已基于本文发现的问题完成整改，最新结果请阅读 [`FUNCTION_LOGIC_AUDIT_V2.md`](./FUNCTION_LOGIC_AUDIT_V2.md)（27 条整改结果 + 验收记录）与 [`FUNCTION_SCIENTIFIC_REVIEW.md`](./FUNCTION_SCIENTIFIC_REVIEW.md)（逐功能科学性判定）。本文中"待修复"项已在 V2 验收，勿据本文判断当前状态。
>
> 审计日期：2026-09-11　|　方式：13 路并行**只读**代码审计（11 个功能域 + 2 个交叉校验），逐功能提取真实实现逻辑（公式/阈值/分支/回退/数据来源）并评估合理性；本文档由审计结果汇编 + 主控复核，未修改任何代码。

**覆盖规模**：13 个域、76 个功能条目。**判定分布**：大体合理需打磨 40 / 口径隐患 23 / 合理 9 / 逻辑不合理 4。

## 〇、P0 修复状态（2026-09-11 更新）

已修复并验证（详见 `PROJECT_STATUS.md` 同日条目）：

| 审计项                                    | 状态   | 验证方式                                                        | <br /> | <br />                                    |
| -------------------------------------- | ---- | ----------------------------------------------------------- | :----- | :---------------------------------------- |
| 3 处离线兜底伪造（探针/提交分析/战略顾问）                | ✅ 已修 | 无 Key 纯净实例实测 `fallback:true` + 显式标注；citations 置空；投稿被拒绝入流    | <br /> | <br />                                    |
| rebuild.sh 假成功                         | ✅ 已修 | 去 \`                                                        | <br /> | true\` + 构建指纹校验；实测揭穿旧进程（PID 24490 → 7726） |
| 危险端点无鉴权开放                              | ✅ 已修 | 未配令牌时仅回环（局域网 IP 实测 403）；reset 前自动备份（`data/backups`，保留 10 份） | <br /> | <br />                                    |
| 打印 PDF 死代码                             | ✅ 已修 | 补 `body.printing` 类 + 打印态 flex 恢复                           | <br /> | <br />                                    |
| 重大突发分级失效                               | ✅ 已修 | STRONG 单篇即报、WEAK 需印证；否定语境改为位置判定；unit 用例扩充并通过                | <br /> | <br />                                    |
| （附带）摄取 errors 被丢弃 / @types 断链 / 过期测试断言 | ✅ 已修 | `release-check.sh` 全绿：冒烟 20/20 + 功能 29/29                   | <br /> | <br />                                    |

仍未处理（P1/P2，见第四节）：今日口径三套不一致、常量字段当派生指标展示、pill 与真实字段错配、live 统计掺演示语料、概率量纲不统一、缓存与语料不同步、五层光谱四模式同文本换皮、摄取去重仅按标题、AI 调用无超时/重试、重点词着色 O(n²) 等。

## 一、总体判定

**结论：架构与诚实口径的底子是好的，但"展示口径"与"真实数据能力"之间存在系统性错配，且有三处明确的功能缺陷。**

判定为**合理**的部分（可直接依赖）：分类筛选与分页的真实派生、当日静默兜底的设计、语料分页排序与去重、skill 端点骨架与字段白名单、缓存 TTL 与滑动窗口限流、本地主线方向模型（前后端同源）、CSV 导出、⌘K 搜索、hash 路由与 pendingArticleId 回补、16 例纯函数单元测试。

判定为**逻辑不合理 / 必须修**的部分：

1. **打印 PDF 是死代码** —— `body.printing` 类从未被添加，`@media print` 规则永不命中，「下载 / 打印 PDF」实际输出整页应用。
2. **重大突发分级失效** —— STRONG 与 WEAK 判定条件完全相同，分级与文件注释相反；`回应/只是/并非` 等否定语义词过宽，会把正在发生的真事件整条剔除。
3. **五层光谱四个阅读模式实为同一文本换皮** —— fast\_dialogue / magazine / immersive 都用 `layers[0]/[1]/[4]` 的相同文本包裹固定问答与导语，无真实问答数据；data\_driven 无证据链时静默回退。
4. **重建脚本会给假成功** —— `launchctl kickstart -k ... || true` 吞掉失败，随后只探端口健康；实测 launchd 进程比刚构建的 `dist` 旧 5 天，仍报 \[OK]。
5. **无 Key 时多个 AI 兜底返回硬编码模板且不标注降级** —— 微观探针返回"关键利益方通过时间差规避合规成本"、AI 提交分析返回台积电半导体固定模板、战略顾问返回写死话术并把前 3 篇标题当引证。这是诚实性红线。

判定为**口径隐患**的核心（同一事实多套算法/标注）：

- 「今日」有**三套**定义（顶栏不限 isExternal 且无上界、Hero 要求 isExternal、信息流另加次日上界）；

- 140/144 条真实语料的 `sourceCount≡1`、`credibilityStars≡2`、`changeVelocity≡'→ 稳定'`，详情页却以「多源交叉 1 家媒体 / ★2.0 / 变化速度」的派生指标口吻展示；

- 「热门 / 关注 / 影响我」在纯 RSS 运行日**恒空**（tags 全空、personaImpacts 仅 2/140、星级/信源数全为 2/1），而 analyze 提示词把 sourceCount 硬编码为 5 → 「热门」退化为"被 AI 分析过的文章"；

- live 状态的派生统计仍掺 4 篇演示语料（星级 5 / 信源 5）且未标注；4 篇站内示例文的 `aiVerdict` 84–98 以「AI 定性」呈现，无逐篇演示标注；

- 置信度/概率并存三套量纲（本地 8–92、AI 0–100、高/中/低带），同文可出现 92 / 85 / 高；服务端复制了前端公式未引用共享 util；predict 缓存仅按问题哈希、模型名恒标 r1；

- 缓存与持久化不同步：enrich 缓存命中不回写语料（注释称已写回）、personaforecast 缓存命中重打 `generatedAt`、客户端按 id 去重使服务端对站内文的写回刷新即失效。

**结论性建议**：先修 5 项"逻辑不合理"与 3 项诚实性/部署/安全问题（见第四节优先级），再做口径统一与数据管道收口；在完成这些之前，本产品适合内部/受邀内测，不宜公开商用。

## 二、各域逻辑与判定总览

| 域                     | 功能数 | 判定分布                                | 结论摘要                                                                                                                                                      |
| --------------------- | --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页信息流与今日口径            | 6   | 合理×2 / 大体合理需打磨×2 / 口径隐患×1 / 逻辑不合理×1 | 审计首页信息流与今日口径。当日池/静默兜底/分页为正序的真实派生，结构干净；Hero 情绪、赛道热度、重大突发均为可复核的词典计数而非 AI。主要缺陷：Hero、todayFeed 与顶栏三处「今日」口径不一致；「热门」门槛与真实语料字段（全为 2/1）不匹配导致恒空；detectBreaking …   |
| 卡片渲染与卡片级 AI 技能        | 5   | 大体合理需打磨×3 / 口径隐患×1 / 合理×1           | 审计卡片渲染与卡片级技能：卡片头部（媒体档位徽标、相对时间、监控命中、词典情绪）、标签派生、六标签技能盒（生成＋内存缓存与语料回写）、监控命中、媒体档案、重点词四色着色。口径总体诚实，隐患为「N家媒体」取自 AI 生成字段与词典计数瑕疵。                                   |
| 详情页骨架、七要素与简报卡         | 6   | 大体合理需打磨×4 / 合理×1 / 口径隐患×1           | 详情域=五页签认知路径：浅层条目打开即自动 /api/enrich 补全并白名单合并，七要素页三层折叠+5 项技能一键补齐，多源一致性按立场/Tier 计数出结论，相关新闻站内词重叠+AI 线索双轨，简报卡统一口径并支持 PNG 直绘与打印 PDF。结构扎实，缺口在打印样式、补齐口径与提示文案。      |
| 推演 / 预测 / 身份页         | 6   | 大体合理需打磨×3 / 口径隐患×2 / 逻辑不合理×1        | 推演域五项功能均落地：What-If 沙盒基于逻辑树变量线性推演冲击分；预测擂台提供本地加权/在线双引擎并立约存档；身份页以本地主线+AI双向情景分工；涟漪与五层光谱多为语料静态展示。核心口径问题：契约把非正向判断标成「否/落空」，双引擎在线回落被缓存伪装成在线，相同公式在前后端双份维护。         |
| 情报中心面板群               | 6   | 大体合理需打磨×3 / 口径隐患×3                  | 情报中心9面板：指标条为静态示例，共振/热力/密度/健康/盲区/点名由语料真实派生，战略顾问走 DeepSeek。披露尚诚实，但共振阈值失真、密度标注不符、点名占比超100%。                                                                  |
| 地区情报页与下钻              | 6   | 大体合理需打磨×3 / 口径隐患×2 / 合理×1           | 地区页为 AI 标注驱动的下钻工作台：矩阵、三级下钻、组合聚合、主体抽样、CSV、依赖预警。计数与赛道属真实派生，地区/主体标签为 AI 生成；主地区多口径并存，预警阈值偏宽。                                                                  |
| 我的关注 / 专题 / 搜索与模态     | 6   | 大体合理需打磨×3 / 口径隐患×2 / 逻辑不合理×1        | 审阅我的关注、专题、⌘K 搜索与 10 个模态：雷达命中与收藏走真实语料与 localStorage，Brier 回测公式自洽；专题时间轴、语音简报、术语兜底属静态或模板；无 Key 时提交分析固定返回半导体模板且不提示。                                           |
| 服务端核心（语料/设置/缓存/AI 通道） | 6   | 大体合理需打磨×4 / 合理×1 / 口径隐患×1           | 服务端核心非占位：鉴权放行、滑动窗口限流、双层 TTL 缓存、密钥 AES 加密落盘、语料标题去重与时间回退排序、DeepSeek 在线＋本地启发式兜底均有真实实现。主要瑕疵在口径一致性：live 模式派生指标仍掺演示语料、本地兜底 45-55 段与前端判法不一致、predict 缓存只按问题哈希且…   |
| 服务端 AI 技能 / 标注 / 摄取管道 | 6   | 大体合理需打磨×4 / 合理×1 / 口径隐患×1           | 审计 server-ai 域：enrich、9 个技能端点、身份化预测三条 AI 写回链路，regions/entities 批标注，RSS 摄取去重与日期卫生，6 小时定时调度。缓存键隔离、字段白名单、失败不造假等机制成立；主要风险是标注枚举未校验、仅标题去重、缺失时间戳条目永不清理及缓存命中不写…   |
| App 全局状态与编排           | 6   | 大体合理需打磨×3 / 口径隐患×3                  | 审计见微 Genway 全局编排：hash 路由、技能合并、localStorage 集合、快照拉取、内置与运行时语料合并及顶栏词典情绪口径。                                                                                   |
| 测试与运维脚本               | 5   | 大体合理需打磨×2 / 逻辑不合理×1 / 合理×1 / 口径隐患×1 | 链路：tsc→vite→esbuild 固定重建序、JIANWEI\_NO\_SETTINGS=1 纯净实例、smoke/functional/feature/unit 四套测试、launchd 常驻加 start-server.sh 兜底。风险：rebuild 的重启步骤被「／／ true」短路且只以… |
| 交叉校验：数据与口径一致性         | 6   | 大体合理需打磨×3 / 口径隐患×3                  | 跨页口径大体自洽且多处已如实标注双口径，但同一事实存在多套算法：今日情绪在顶栏与首页 Hero 过滤条件不同，置信度有本地 8–92 与 AI 0–100 两套，媒体权威人工 A/B/C 与 AI Tier 并存，影响对象三套分类互不校验；缓存与语料双写不同步、客户端按 id 去重使服务端写回对 4…   |
| 交叉校验：健壮性与商用阻塞项        | 6   | 大体合理需打磨×3 / 口径隐患×2 / 合理×1           | 鉴权为可选共享令牌：未配时 admin/reset（覆写 corpus.json、无备份无确认）、settings（可改 deepseekBaseUrl 令 Key 外发）对 0.0.0.0 开放；AI 调用无超时无重试；语料非原子全量写盘且无备份；调度双阈值不一致、启动不抓取；密钥加密但轮换即清空…   |

## 三、逐功能逻辑明细

### 首页信息流与今日口径　`home-feed`

**本域结论**：审计首页信息流与今日口径。当日池/静默兜底/分页为正序的真实派生，结构干净；Hero 情绪、赛道热度、重大突发均为可复核的词典计数而非 AI。主要缺陷：Hero、todayFeed 与顶栏三处「今日」口径不一致；「热门」门槛与真实语料字段（全为 2/1）不匹配导致恒空；detectBreaking 强弱两级判定条件相同，分级与注释矛盾。

**1. 分类 pills 与筛选**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：HomeView\.tsx:115-127 拼 pill：8 基础项，含外部信源时插「外部信源」，有监控词时在「影响我」前插「监控中」(徽章=今日池内 monitorHits>0 条数,:146)。:168-195 筛选：「热门」=credibilityStars===5||sourceCount>=5；「关注」=tags 命中 followedTags 或已收藏；「影响我」=personaImpacts 含当前 personaId；「监控中」=monitorHits 非空；其余按 category/tags 精确相等；雷达词按 title/tags/summary 包含，结果按 articleSortTime 倒序。

- 问题：

  - 热度门槛(5)依赖内置静态字段，真实语料全命中不了

**2. 当日池与静默兜底**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：HomeView\.tsx:131-143 今日池：publishedAt 解析成功即取 \[dayStart, dayStart+24h)；解析失败则退 sourceDate→date 同区间，故站内/投递文按 sourceDate 计入。池空→isQuietDay，仅当分类为「全部」且无雷达筛选(:163)时 displayFeed 换成 fallbackArticles：全语料按 publishedAt→sourceDate→date 倒序取 6（解析失败记 0 沉底,:154-162），文案改为「今日暂无新情报」并标注历史旧闻。

- 问题：

  - 静默日切非「全部」分类时，通俗/脱水模式无空态文案

**3. 分页**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：PAGE\_SIZE=20(:64)，pagedArticles=filteredArticles.slice(0,visibleCount)(:206)，三种阅读模式共用；按钮「再看 N 条」每次 setVisibleCount(n+20) 并显示 已显示/总数，剩余不足 20 时按钮显示实际剩余数(:410-415)。selectedCategory/selectedRadarFilter/radarKeywords 变化时 useEffect 把 visibleCount 复位为 PAGE\_SIZE(:201-203)。静默兜底时 filteredArticles 为空，加载按钮不渲染。

- 问题：无

**4. Hero 情绪口径**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：HomeView\.tsx:71-78 取 isExternal&\&publishedAt 且 ts>=dayStart 的条目；sentimentCounts 对 title+summary 小写做词典 includes，每篇最多各计 1 次正/负；net=round((P-N)/(P+N)×100)∈\[-100,100]，分母 0 返回 null；neutral=max(0,scanned-P-N)。scanned>=20 用今日，否则 corpusDerived(articles,30)（无 publishedAt 条目无条件保留:corpusMetrics.ts:171-176）。HomeHeroStatus.tsx:51-87 按 40/15/-15/-40 档出结论词，net=null 显示「暂无样本/无明显倾向」。

- 问题：

  - 同篇正负同命中时被双计，三数之和可超 scanned

  - 30 天窗口实含无日期条目

**5. Hero 赛道热度**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：HomeView\.tsx:79-103：遍历今日池，对 `${title} ${summary}`.toLowerCase() 逐赛道 keywords.includes，命中即 count+=1（每篇每赛道至多 1 次），命中词按 canonical 计数（keywords.length>=2 才参与）；按 count 降序取前 5 赛道，topWords 取 3（UI 只显示 2，名称经 shortName 去「与XX」后缀）。sectorHeat 为空时整行不渲染(:178)，词表来源 SECTOR\_TAXONOMY（可被 localStorage 覆盖）。

- 问题：

  - canonical 用 flatMap find 在双重循环内查找，O(n) 热路径

  - 赛道词跨类重复

**6. Hero 重大突发**　—　数据来源：`词典启发式`　判定：**逻辑不合理**

- 逻辑：todayBrief.detectBreaking:103-149 只扫标题；先剔除含 防爆/辟谣/否认/回应/演练/不实 等语境的整条标题；STRONG 命中优先于 WEAK（else-if，:114-124）；命中词须篇数>=2 或去重来源数>=2 才输出，来源取 sourceName，缺失时用 URL hostname；按 total、sources 降序取 3；HomeHeroStatus.tsx:208-227 渲染为可点按钮，经 onOpenBreaking 按 id 回查原条目。

- 问题：

  - STRONG/WEAK 判定条件完全相同，分级失效

  - 否定语境词（回应/只是）过宽会误杀真事件

  - 文档注释与实现相反

### 卡片渲染与卡片级 AI 技能　`cards-skills`

**本域结论**：审计卡片渲染与卡片级技能：卡片头部（媒体档位徽标、相对时间、监控命中、词典情绪）、标签派生、六标签技能盒（生成＋内存缓存与语料回写）、监控命中、媒体档案、重点词四色着色。口径总体诚实，隐患为「N家媒体」取自 AI 生成字段与词典计数瑕疵。

**1. 卡片头部信息与标签派生**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：头部：mediaProfile 查 15 条人工域名档案得 A/B/C 徽标，未收录显「来源未收录」；家数优先 multiSources 长度，否则 sourceCount>1，否则 1；时间按 publishedAt→sourceDate→date，超 7 天转日期，超 30 天标旧闻；情绪用 16 正/18 负词典计数比大小。标签＝真实 tags∪监控命中∪赛道命中取 4。

- 问题：

  - 家数取 AI 生成 multiSources 长度，非真实来源数

  - 自产「见微·」条目也标来源未收录

  - NEGATIVE\_WORDS 内「下跌/下滑」重复计数。

**2. 六标签技能盒生成与缓存**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：六标签技能盒：解读读 oneSentenceVerdict＋persona 的 coreImpact；背景用本地 findRelatedArticles（≥3 分取 3）；趋势/风险/大白话/脱水四项字段为空时点标签调 POST /api/skill/:name。缓存键 skill:articleId 命中内存 Map（TTL 24h）回写，未命中调 AI 并写 serverCorpus。

- 问题：

  - hasOutput 定义后未使用（死代码）

  - 脱水 textOf 丢 impactHighlights

  - 138/144 篇「一句话解读」实为摘要原文。

**3. 监控命中判定**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：标题、副标题、摘要、一句话定性、tags 小写拼接；先整词 includes，否则按空格切分组成词，仅「≥3 汉字或 ≥4 拉丁字母」的具体词算命中，无具体词则短语永不命中；结果按用户添加顺序返回。

- 问题：

  - 双字中文组合（如「中美 关税」）永不命中

  - 只查标题摘要等字段，不含正文。

**4. 媒体权威档案**　—　数据来源：`演示静态`　判定：**合理**

- 逻辑：15 条人工域名档案（displayName/type/tier A|B|C），无自动评分。mediaKey 优先取 URL hostname 去 [www.，否则正则抽](http://www.，否则正则抽) sourceName 注册域主干；未收录返回 null，卡片显虚线「来源未收录」；tierBadge 映射三档颜色。语料 9 源中 ithome/tmtpost/ifanr 命中，44/144 篇未收录。

- 问题：

  - 44/144 篇落「来源未收录」

  - A/B/C 为人工主观分级、无量化判据。

**5. 重点词四色着色**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：buildTerms 把 KEY\_TERMS 74、正向 41、负向 39 词与实体词转义为正则并按长度降序；splitKeyTerms 逐字符位置试位置 0 命中（最长优先），再试 NUM\_PATTERNS（日期/年份/百分数/金额）打金色，未命中前进 1 字符，输出 KeySeg 交 KeyTermHighlight 四色渲染。

- 问题：

  - 「调查/风险」等词致「风险投资」误标红

  - entities 每次新建数组使 useMemo 失效

  - 154 条正则逐位 slice 重扫，长文 O(n²) 复制。

### 详情页骨架、七要素与简报卡　`detail-core`

**本域结论**：详情域=五页签认知路径：浅层条目打开即自动 /api/enrich 补全并白名单合并，七要素页三层折叠+5 项技能一键补齐，多源一致性按立场/Tier 计数出结论，相关新闻站内词重叠+AI 线索双轨，简报卡统一口径并支持 PNG 直绘与打印 PDF。结构扎实，缺口在打印样式、补齐口径与提示文案。

**1. 五页签认知路径骨架**　—　数据来源：`混合`　判定：**合理**

- 逻辑：NewsDetailView\.tsx:210 tabsList 固定 5 项（seven\_elements 默认、logic\_tree、relevance\_identity、forecast\_arena、deep\_spectrum），activeTab 状态条件渲染；logic\_tree 页由 LogicTreeTab + rippleEffect 的 RippleEffectTab 组合；缺字段渲染 MissingDeep 占位（deepNote 随 enrich 状态变）；底部按钮按序 setActiveTab 并 scrollTo(400)。

- 问题：

  - 注释仍写「4-Stage Cognitive Path」，实为五页签

**2. 浅层条目自动 enrich 补全**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：isShallow=spectrumLayers 空（NewsDetailView\.tsx:148）；useEffect 内 25s AbortController POST /api/enrich（content=summary||subtitle||title）；服务端 deepEndpoints.ts:10 以 enrichKey=id:{articleId} 或 h:djb2(title) 命中缓存（ENRICH\_TTL\_MS 24h），无 provider 返 reason=no\_api\_key；成功后写 serverCorpus 并 persistCorpus；前端 mergeDeep 白名单 20 字段经 App.handleEnrichArticle 回写列表与选中文。

- 问题：

  - 文案仍称需 GEMINI\_API\_KEY，与 DeepSeek 默认 provider 不符

  - 卸载 abort 后仍置 error

**3. 七要素三层折叠与一键补齐**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：SevenElementsTab.tsx:110 三层 GroupFold：core 默认展开、evidence/scenario 收起，open 驱动 aria-expanded；readyKeys=timeline/stakeholders/corelogic/debate/relatednews 按字段非空判就绪，missingElements 控制「一键补齐」可用与文案；generateAll:137 for-await 固定顺序逐个 onRunSkill，成功累积 cur 传下一项，返回 null 静默跳过；各缺项卡片另有单点按钮+busy 态。

- 问题：

  - 「一键补齐/要素齐全」只统计这 5 项技能，与七要素口径不符

  - 失败静默无提示

**4. 多源一致性模型**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：SevenElementsTab.tsx:32 mediaConsensusModel 读 rippleEffect.multiSources：按 stance 精确匹配累计 正面/负面/预警，其余（含缺失）并入中性；dissent=负面∪预警；tier1 由 tier.includes('Tier 1'|'一级') 计数；verdict 三档（有 dissent→存在相反/警示论调；pos+neu 并存→正面中性并存；否则方向一致），UI 只出计数+结论+dissent\[0].excerpt，逐家明细在涟漪页。

- 问题：

  - 缺失或异常 stance 一律计中性，中性数被高估

  - 只展示首条反方摘录

**5. 相关新闻双轨（站内+AI 线索）**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：relatedArticles.ts:19 tokenize 用 /\[\u4e00-\u9fa5]{3,4}/g 抽 3-4 字块并剔除 20 个停用词；标题词为空即返回 \[]，tokens=标题+摘要去重取前 30；score=标题重叠×2+正文包含数，≥3 入选、降序取 top4、排除自身；SevenElementsTab:502 并列渲染 article.relatedNews（AI 记忆召回、不可点，注明非实时联网）。

- 问题：

  - 3-4 字硬切非分词，阈值 3 且无时间衰减，易匹配同类旧文

**6. 简报卡预览 / PDF / PNG**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：NewsDetailView\.tsx:297 #briefing-sheet 预览含标题、时间、来源、AI 定性（置信%·波动·行动）、composeModel(sevenElements) 合成段与 SEVEN\_W\_ITEMS 网格；PNG 由 briefingImage.ts:45 Canvas 2D 绘制：W=820、scale=2，先 wrapLines 逐字测量预布局算 totalH，再按 20/22/26/38 行高绘制并 toDataURL 下载；PDF 走 window\.print()+\@media print 的 body.printing 收窄。

- 问题：

  - body.printing 从未添加，打印样式成死代码，PDF 实际输出整页

  - 画布模型框高少算 18px

### 推演 / 预测 / 身份页　`reasoning`

**本域结论**：推演域五项功能均落地：What-If 沙盒基于逻辑树变量线性推演冲击分；预测擂台提供本地加权/在线双引擎并立约存档；身份页以本地主线+AI双向情景分工；涟漪与五层光谱多为语料静态展示。核心口径问题：契约把非正向判断标成「否/落空」，双引擎在线回落被缓存伪装成在线，相同公式在前后端双份维护。

**1. What-If 敏感度沙盒**　—　数据来源：`演示静态`　判定：**大体合理需打磨**

- 逻辑：LogicTreeTab:32-111。weights 由 useState 一次性初始化自 logicTree.variableWeights，滑块 5-95 步长5；scoreWeights 公式 shock=clamp(25,99, round(50+net*0.4))，net=up*1.2-down*0.7*1.1+neutral\*0.05。delta=cur-base，|delta|>8 判方向；对每变量 ±10 微扰取 Top3 敏感（141-149）；shock≥80 提速、≤45 滞后。bull 预设上×1.5 下×0.6，stress 对 down 或名称含审批/合规/用工/通胀 ×1.8（上限85），其余 ×0.7。

- 问题：

  - weights 未随文章重置

  - 下界25压扁差分

**2. 预测擂台双引擎与契约**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：ForecastArenaTab:55-119 与 server.ts:367-443 同公式双实现。本地：upSum/downSum 按 impactDirection 求和，momentum=(up-down)/total，pPos=clamp(8,92,round(50+momentum\*35))，方向阈值 pPos≥56正/≤44负，置信度=clamp(25,85,max(pPos,pNeg))；无变量时 pBias=50。在线：POST /api/predict（20s AbortController），modelChoice=auto|gemini-2.5-flash，服务端按缓存键 predictKey(question) 复用并回 cached:true。契约 handleSignContract:289 存 aiPred/userPred + gapSummary，status=pending。

- 问题：

  - 非正向判定被标「否/落空」

  - 缓存复用带 fallback:false 致回落伪装成在线

**3. 认知鸿沟与契约标签**　—　数据来源：`AI生成`　判定：**口径隐患**

- 逻辑：gapData:259-283：delta=userConfidence-aiPrediction.confidenceScore（滑块10-95步长5）。|delta|≤5 且方向相同→高度共识协同；方向不同→变量权重分歧（判定 dir!==dir，neutral 亦判分歧）；同向 delta>5→乐观溢价；否则保守折价。诊断文案中「历史同类事件基准达成率」直接取 baseRatePercentage，而该值实为 max(pPos,pNeg) 或 50 先验，非历史基准。

- 问题：

  - 把先验/方向概率当历史基准达成率展示

**4. 身份影响与双向预测**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：RelevanceIdentityTab:87-110。① 主线：localTrendModel(article) 复用同一动量公式，kind!=weights 时只显示「信号不足」不出数字；② 双向情景 onRunPersonaForecast→POST /api/skill/personaforecast（deepEndpoints.ts:328-411），按 personaId upsert 写回语料并缓存，只允许 band=高/中/低，生成后同时挂起全局身份。identity 标签与卡片由 personaImpacts+USER\_PERSONAS 静态渲染，选中透镜与「我的身份」相互独立。

- 问题：

  - 双向预测仅绑定全局身份，选中透镜不生效

**5. 涟漪传导与多源核验**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：RippleEffectTab 纯渲染：stages（stage/timeframe/title/items/severity）三阶卡片，severity=高 才标红；knowledgeGraph 按 type∈company/tech 映射中文标签；multiSources 逐条展示 tier、stance、excerpt、verified，无计算与阈值。页面自述 Tier1/2/3 为 AI 标注、来源徽标为人工 mediaAuthority，两口径可能不一致。

- 问题：

  - 严重度/时间窗为语料静态值，与因果页沙盒结论无联动

**6. 五层光谱通读**　—　数据来源：`演示静态`　判定：**逻辑不合理**

- 逻辑：DeepSpectrumTab:19-275。classic 按 spectrumLayers 的 layer/color/headline/content 渲染并按色带过滤；fast\_dialogue/magazine/immersive 用固定问答与导语包裹 layers\[0]/\[1]/\[4] 的相同文本（无真实问答数据）；data\_driven 走 article.evidenceChain（claim/confidenceScore/sourceFact/reliability），为空即静默回退一句说明文案。语料 144 条中仅 6 条有 spectrumLayers，138 条由 NewsDetailView:580 拦截为缺失提示。

- 问题：

  - 四模式实为同一文本换皮

  - entityMentions 全库缺失致高亮失效

### 情报中心面板群　`intel-hub`

**本域结论**：情报中心9面板：指标条为静态示例，共振/热力/密度/健康/盲区/点名由语料真实派生，战略顾问走 DeepSeek。披露尚诚实，但共振阈值失真、密度标注不符、点名占比超100%。

**1. 战略指标条**　—　数据来源：`演示静态`　判定：**大体合理需打磨**

- 逻辑：直读 props.metrics 渲染乐观度68/政策敏感度82/技术突破17及环比、警戒、爆发百分比与结论句；数据为 intelligenceData.ts 常量 MARKET\_STATUS\_METRICS，App.tsx:110 useState 初始化后无 setter 调用，永不刷新；横幅自述演示静态。

- 问题：

  - setMarketMetrics 从未调用（死代码）

  - 分值、环比与结论句全写死

**2. 跨事件共振**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：pool=含 spectrumLayers 内置文+语料末36篇外部条目前40篇，做780对；字符二元组 Jaccard 得相似度，score=clamp(30×共享标签/min标签数+40×相似度(>0.05取1否则0.35)+15×双方含深层字段+10×同分类×0.5)，≥76突变/≥46结构/否则周期，取TOP5。

- 问题：

  - 实测780对最高20分全落最低档，阈值脱离分布

  - 每对现算二元组Map无缓存

**3. 24H热力与密度曲线**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：只统计 publishedAt 可解析且距今≤30天条目：热力行=来源/来源地区(配置表)/涉事地区(词典)取Top6，列=4小时时段或近7天，格计数按全表峰值归一1-5级；密度按12个2小时槽计数并堆叠来源或赛道。

- 问题：

  - 密度称相对峰值≥50%却只取前6槽

  - 横幅一处称热力仍是示例、一处称真实派生

  - 入口「情绪热力」实为到达条数

**4. 信源健康与仲裁**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：健康指数=min(35,外部host×5)+min(35,5+外部条数/12)+min(30,内置篇数×7.5)；来源与星级直方图按真实计数(外部默认2★)；外部≥2篇挂载即 POST /api/conflicts：赛道词典分组要求同赛道≥2来源且≥2条取3组，交模型判立场引句。

- 问题：

  - 4篇内置文即拿满30分深度项

  - 挂载即自动调模型耗额度

  - 候选「最新」按数组序非 publishedAt

**5. 盲区扫描与明日点名**　—　数据来源：`词典启发式`　判定：**口径隐患**

- 逻辑：detectSectors 对标题+摘要+tags 子串命中关键词(可多标签)，盲区取 count/最高覆盖<0.35 的3个低赛道并附静态补源清单；点名取数组末80篇赛道命中数排序Top5，占比=命中数/80，均标注为观察候选口径。

- 问题：

  - 多标签重复计数，实测占比合计129%

  - 点名用数组尾序非 publishedAt

  - 子串无词边界可误命中

**6. 战略顾问**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：前端把全部 contextArticles 标题/结论/摘要/分类与 persona 名 POST /api/strategic-advisor(20s超时)；服务端仅取前3篇入 prompt，callAI(DeepSeek,温度0.35)返 answer；citations 恒为前3篇标题，与模型实际引用无关；无Key或异常落写死话术。

- 问题：

  - 无Key/异常返回编造事实并配前3标题为引证

  - citations 未经校验

### 地区情报页与下钻　`地区情报页与下钻（region）`

**本域结论**：地区页为 AI 标注驱动的下钻工作台：矩阵、三级下钻、组合聚合、主体抽样、CSV、依赖预警。计数与赛道属真实派生，地区/主体标签为 AI 生成；主地区多口径并存，预警阈值偏宽。

**1. 筛选与 CSV 导出**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：RegionIntelligencePage.tsx:134 filtered 先按 regionMentions.length>0 且 confMin>0 时 some(conf≥阈值)，再按 range（30d 默认/7d/all，cutoff=now−N\*86400000，publishedAt 缺失或早于 cutoff 剔除）。导出 buildIntelCsv(intelExport.ts) 输出 9 列，entities 用 名称:类型、regions 用 地区:置信%，esc() 双引号转义并加 BOM，无行数上限、无公式注入防护。

- 问题：无

**2. 地区×赛道矩阵与格子下钻**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：RegionSectorMatrix.tsx:13 用 reduce 取置信最高 regionMentions 作主地区，赛道=detectSectors（sectorTaxonomy 关键词命中标题+摘要+tags，可被 localStorage sector-taxonomy-overrides 覆盖）；区域取 top6、赛道按列和取 top6，色深 alpha=0.18+(v/max)\*0.72，max 为当前筛选内最大值（相对色阶）。仅 v>0 可点，点击后 RegionIntelligencePage 用同一主地区+赛道口径重算，显示 matched.slice(-12) 倒序 12 条。

- 问题：

  - top6 截断未提示

  - 色阶随筛选变

**3. 三级下钻（地区×主体×赛道）**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：ThreeLevelDrill.tsx:36 地区下拉来自全部 regionMentions，但过滤只取置信最高项 sorted\[0].region 做全等；主体命中 entityMentions.some(name)，下拉按出现篇数排序取前 60；赛道用 detectSectors 全量 9 类。三者 AND 过滤，展示 matched.slice(-15) 倒序（语料按时间新在前，实际取最新 15 条中的尾部）。

- 问题：

  - 下拉含副地区但只按主地区过滤，选副地区恒 0

**4. 组合聚合 Top8**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：ComboAggregate.tsx:11 一次遍历：主地区（置信最高）与每个 entityMentions 组成 “地区 × 主体” 计数；每个主体与该篇 detectSectors 结果笛卡尔组成 “主体 × 赛道” 计数；各自按计数降序 slice(0,8)，无样本量门槛、无去重归一化，主地区缺失则不产地区组合行。

- 问题：

  - 无最少条数门槛，低频组合也进榜

**5. 主体抽样与置信加权聚合**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：EntitySamplePanel.tsx:27 取 articles.filter(isExternal&\&title).slice(-24) 实时 POST /api/entities（服务端 annotations.ts:189 截断 title160/summary300，模型抽 ≤3 主体，置信 clamp 0-1）；前端按名称累加 confidence 得 weight，取 top10，条宽=weight/maxW。不读语料已缓存的 entityMentions；tried ref 仅按 sample.length 触发，article id 变化不重取。

- 问题：

  - 重复调用在线模型

  - 缓存实体未复用

**6. 依赖预警与覆盖/去重度/近7天**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：RegionDependenceWidget.tsx:21 以 Σconfidence 为权重计地份额，top.share≥0.5 报警并附来源数（≤2 标“来源单点”），地区按钮取 top8，浏览走 /api/corpus?region=\&limit=12（服务端 any 命中，见 server.ts:628）。RegionIntelligencePanel.tsx:22 用 Set(articleId) 计条数、Set(sourceName) 计来源，avgConf=confSum/items.size，迷你柱按自然日 key 计近 7 天到达，仅展示 top8。

- 问题：

  - 均置信分母为条数而分子含多标签

  - 预警只看 top1 份额

### 我的关注 / 专题 / 搜索与模态　`workspace`

**本域结论**：审阅我的关注、专题、⌘K 搜索与 10 个模态：雷达命中与收藏走真实语料与 localStorage，Brier 回测公式自洽；专题时间轴、语音简报、术语兜底属静态或模板；无 Key 时提交分析固定返回半导体模板且不提示。

**1. 监控雷达命中与收藏档案（MyFocusView）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：keywordHits(keyword, articles)：文本=title+subtitle+summary+oneSentenceVerdict+tags 小写 contains；短语整体未命中时按组成词兜底（中文≥3字、英文≥4字符）。total 为命中数，recent24h/prev24h 按 dayKey(Date.now()) 今昨自然日归类，情绪=(正−负)/(正+负)×100（仅窗口内条目）。收藏=App.bookmarkedIds(localStorage)∩articles；备忘录走 useLocalState('action-memo')。

- 问题：

  - 今日/昨日按自然日窗口，语料最新 09-05、今日 09-11，恒为 0 且情绪文案永为「暂无情绪样本」

  - 窗口用 new Date() 而非 parseArticleDate，无 publishedAt 的站内文不入窗口

  - followedTags/onRemoveTag 与 Tag 等导入为死代码

**2. 前瞻契约与 Brier 事实回测**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：MyFocusView\.handleConfirmResolve：人工裁决 verified\_hit\_ai 或 verified\_both\_win → aiHit=1，Brier=round((aiPred.confidence/100−aiHit)²×100)/100（AI 方向为负时数学等价，公式自洽）；App.handleResolveContract 写入 status/actualOutcome/brierScore/resolutionDate 及按 status 分支的固定 reflectionNotes。契约存 localStorage，初值含 2 条内置示例（DEMO\_PREDICTION\_IDS 加「内置示例」标）。

- 问题：

  - 「校准优异」硬编码，Brier=0.9 仍显示优异

  - 只给 AI 侧打分，用户置信度不入分

  - 示例契约 aiPred 署名 Gemini 2.5 Pro，与实际生效通道无关

**3. 专题时间轴与收录计数（TopicsView）**　—　数据来源：`演示静态`　判定：**口径隐患**

- 逻辑：直接渲染 intelligenceData.TOPIC\_CLUSTERS 3 个专题，timeline 里程碑、updatedAt、summary、coreConflict 及标签均为写死文本；收录数 countMatched = articles.filter(a => (topic.articleIds||\[]).includes(a.id)).length，relatedArticlesList 同口径，为 0 时显示空态；TopicCluster.articleCount 字段未参与任何计算。

- 问题：

  - 时间轴与 updatedAt 非语料派生，界面却称「以真实匹配为准」

  - 成员靠硬编码 articleIds，140 条 RSS 新文永不入专题

  - articleCount 为死字段

**4. ⌘K 搜索（SearchModal）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：App keydown 捕获 meta/ctrl+K 置 isSearchOpen；输入经 150ms 防抖后对小写 query 做 includes 匹配——文章 title/subtitle/summary/tags、专题 title/summary/tags、雷达 keyword；雷达命中数复用 keywordHits().total。无相关性排序、无高亮、无结果上限；空 query 时展示雷达热词，无结果时提示改用 AI 提交分析。

- 问题：

  - 占位符宣称可搜术语（CPO/散件），但未接 JARGON\_DICTIONARY

  - 文章命中字段少于雷达口径（缺 oneSentenceVerdict），同词两处不一致

  - 无上限全量渲染

**5. 设置热更新、RSS 摄取与 AI 提交分析**　—　数据来源：`混合`　判定：**逻辑不合理**

- 逻辑：SettingsModal 打开并行 GET /api/settings 与 /api/feeds/status、/api/admin/status；保存 POST /api/settings，仅 keyTouched 的 Key 上送，服务端 persistSettings 落盘 data/settings.json 并以 AES-256-GCM 加密 Key；provider=activeProvider() 即时切换。RSS 换行拆成 settings.feeds，POST /api/feeds/ingest 按 FEED\_MAX\_AGE\_DAYS=30 入库。AnalyzeModal POST /api/analyze 只取 resData.data，缺字段用硬编码默认值（信心 92、sourceCount 4）填补。

- 问题：

  - 无 Key 时任意投稿都返回台积电半导体固定模板，前端不提示 fallback

  - 未校验 res.ok，429/400 也只报「网络异常」

  - 用户投稿仅存内存，刷新丢失后收藏变悬空 id

**6. 术语解释与语音简报**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：TermExplainModal 以 term 查 JARGON\_DICTIONARY（仅 9 条：鹰派/鸽派/CPO 等），未命中回退含「这是《见微》为您提炼的专业名词解析」的模板段落；入口术语多来自 AI 生成的 tongsuSummary.jargonTerms。AudioBriefingModal 读静态 AUDIO\_BRIEFING\_SCRIPT 6 段，用 window\.speechSynthesis 逐段 speak（rate=playbackSpeed，onend 链式续播，关窗 cancel），语速与进度均不持久化。

- 问题：

  - 词典外术语返回通用模板，仍以「通俗小词典」名义展示

  - 改语速不重播当前段，仅下一段生效

  - 「6 个要点/3 分钟/127 篇」为写死常量

### 服务端核心（语料/设置/缓存/AI 通道）　`server-core`

**本域结论**：服务端核心非占位：鉴权放行、滑动窗口限流、双层 TTL 缓存、密钥 AES 加密落盘、语料标题去重与时间回退排序、DeepSeek 在线＋本地启发式兜底均有真实实现。主要瑕疵在口径一致性：live 模式派生指标仍掺演示语料、本地兜底 45-55 段与前端判法不一致、predict 缓存只按问题哈希且模型名硬编码、摄取路径重复且阈值不一，另有死导入残留。

**1. 健康检查与 AI 通道探测（/api/health）**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：鉴权中间件挂 app.use("/api")，内部对 req.path==="/health" 显式放行，其余校验 x-jianwei-token 或 Bearer，AUTH\_ENABLED 由 JIANWEI\_AUTH\_TOKEN 是否为空决定。handler 调 activeProvider() 取当前通道，geminiKeyOk/deepseekKeyOk 只判断 Key 非空且不等于占位串 MY\_GEMINI\_API\_KEY（.env 中该 Key 恰为占位值，故实际走 DeepSeek）；authRequired 按本次请求 token 是否匹配现算，不回传任何密钥。

- 问题：无

**2. 语料装载、去重、排序分页（corpus.ts / /api/corpus）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：loadCorpus 优先读 data/corpus.json，仅当为非空数组才采用，否则拷贝 CURATED\_ARTICLES；appendFeedItems 用现有语料标题 trim+小写建 Set 去重，再逐条判龄 (now-parseArticleDate(pubDate))/86400000 > FEED\_MAX\_AGE\_DAYS(默认 30) 记为 skippedStale 丢弃，feeds.ts 内层已按标题去重一层。/api/corpus 先按 regionMentions 或标题/摘要/标签关键词过滤，再按 corpusSortTime（publishedAt→sourceDate→date 依次解析，失败返 0）降序；limit 默认全量、上限 500，offset clamp 到长度并回 hasMore；每次写回 persistCorpus 全量同步落盘 data/corpus.json（现 432KB/144 条）。

- 问题：

  - 摄取在 ingest 与定时任务重复，30/45 天阈值不一

**3. snapshot 派生与多源立场冲突（/api/snapshot、/api/conflicts）**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：snapshot 单遍遍历 serverCorpus 累计 categoryCounts、starDistribution（缺 star 计 0）、velocityCounts（原样字符串标签）、tagFreq，tagFrequency 按次数降序；sourceStats.avgPerArticle=ΣsourceCount/条数；regionMentionDistribution 按 region 求和 confidence 后取 top8；未派生项显式列入 notYetDerived。conflicts 先筛 isExternal 且标题+摘要>2 字，用 serverDetectSectors 关键词词典分组，要求组内来源（sourceName=hostname）≥2 且条目≥2，按来源数降序取前 3 组，每组从尾部倒序取 2 个不同源，串行调 callAI(json,0.2) 判立场与分歧；无 Key 返回 no\_api\_key。

- 问题：

  - live 模式派生仍掺 4 条演示语料（星级5、信源数5）未加标注

**4. 设置脱敏、热更新与 AI 连接测试（settings.ts、/api/settings、/api/ai/test）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：loadSettings 用 env 默认值合并 data/settings.json；JIANWEI\_SECRET 存在时以 aes-256-gcm(sha256(secret)) 解密 geminiApiKeyEncrypted/deepseekApiKeyEncrypted，persistSettings 反向加密并删明文字段（无 secret 则告警明文落盘），JIANWEI\_NO\_SETTINGS=1 强制清空 Key 与 feeds。POST /api/settings 逐字段白名单赋值到 settings 单例后立即落盘（热更新生效于下一次 activeProvider），GET 只回 userName/aiChoice/provider/keyOk 布尔/模型/feeds。ai/test 以当前通道发 callAI("请只回复两个字：正常", temperature 0)，失败回 ok:false+reason。

- 问题：无

**5. 在线 provider 选择与本地兜底链（ai.ts、fallback.ts、/api/predict）**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：activeProvider：显式选择缺 Key 时回落另一通道，auto 先 gemini 后 deepseek，双无返 null。无 provider 时 /api/analyze 回 generateFallbackAnalysis（演示静态长文，含 42%、1200W 等演示数字），strategic-advisor/ask-nuance 回固定模板，/api/predict 回 localBaselinePrediction：momentum=(upSum-downSum)/totalWeight，pPos=clamp(round(50+momentum×35),8,92)，pNeg=100-pPos，置信度=clamp(max(pPos,pNeg),25,85)，无变量时给 neutral 与先验 50。DeepSeek 走 baseUrl+/chat/completions，模型名含 reasoner 时跳过 temperature 与 response\_format，content 为空抛错。

- 问题：

  - 兜底方向 45-55 段服务端判中性、前端判正/负，口径冲突

  - 夹取阈值属死代码

**6. 限流、缓存 TTL 与 admin 端点（cache.ts、/api/admin/\*）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：applyRateLimit 以 req.ip（未设 trust proxy）做 60s 滑动窗口，RATE\_LIMIT\_MAX 默认 300，超限回 429；hitCounts 只在同 IP 再次请求时过滤过期时间戳，无全局淘汰。enrichCache 键为 id:<articleId> 或 h:djb2(title)，TTL=ENRICH\_TTL\_MS 默认 24h，写入时删旧重插并裁到 1000 条；predictCache 键 q:djb2(question)，TTL 默认 10min，上限 500，二者均无落盘。POST /api/admin/reset 复位内存语料并清两缓存（不动 settings.json），GET /api/admin/status 汇总 uptime、限流参数、getAIUsage、cacheSizes 与语料/feeds 状态。

- 问题：

  - predict 缓存仅按问题哈希，忽略文章与前提

  - 模型名恒标 r1

### 服务端 AI 技能 / 标注 / 摄取管道　`server-ai`

**本域结论**：审计 server-ai 域：enrich、9 个技能端点、身份化预测三条 AI 写回链路，regions/entities 批标注，RSS 摄取去重与日期卫生，6 小时定时调度。缓存键隔离、字段白名单、失败不造假等机制成立；主要风险是标注枚举未校验、仅标题去重、缺失时间戳条目永不清理及缓存命中不写回。

**1. enrich 深度补全与写回（/api/enrich）**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：title/content 至少一项否则 400；缓存键 enrichKey：有 articleId 取 id:<id>，否则 h:djb2(标题)，TTL 24h、上限 1000 条；命中即回 overrides 不写回；无 provider 返 enriched:false+no\_api\_key；callAI(json,temp 0.3)，JSON.parse 失败剥 \`\`\`json 重试；成功按 deepKeys 18 键白名单写 serverCorpus 条目并 persistCorpus()。

- 问题：

  - 命中缓存直接返回，不写回语料，同 id 换内容仍复用旧解析

  - 白名单 industrySignals/coreQuote/quoteAuthor prompt 未请求，属死项

  - L80 自赋值冒充『标记已补全』

**2. 九个技能端点（runSingleSkill 骨架）**　—　数据来源：`AI生成`　判定：**合理**

- 逻辑：plain/dehydrate/trend/risk/timeline/stakeholders/corelogic/debate/relatednews 共用 runSingleSkill：键 <skillKey>:\<articleId|djb2(title)> 与 enrich 隔离；命中即回写 target\[field]+persistCorpus；无 key 返 ok:false；parsed\[field] 为对象才取否则取整包，以兼容裸数组与 {text}；每次只写单字段，白名单即该 field。

- 问题：

  - trend/risk 落库 {text} 与类型 string|{text} 双口径并存，读端靠 textOf 兜底

  - 裸数组技能无条数校验，0 条也写空数组并缓存，空值当成功

**3. personaforecast 身份化双向预测**　—　数据来源：`AI生成`　判定：**大体合理需打磨**

- 逻辑：键 personaforecast:\<articleId|djb2(title)>:<personaId>；结果按 personaId 在 target.personaForecasts 内 upsert（同身份替换、否则 push）并打 generatedAt；命中缓存也 upsert 后返回；提示词限定 band/directionBias 枚举、triggers/falsify 需可观察；解析结果无 bull/bear 时 raw 回落 undefined。

- 问题：

  - 缓存命中重写 generatedAt 为当前时刻，生成时间失真

  - raw 为 undefined 时以 {} 落库并缓存 24h，失败被当成功返回 ok:true

  - 无 target 时 overrides 返回单元素数组、有 target 返整数组，写回口径不一

**4. regions/entities 批标注任务**　—　数据来源：`AI生成`　判定：**口径隐患**

- 逻辑：两个常驻 JobState，BATCH=20 串行 callAI(json,temp 0.1)；jobTodo 只取 isExternal 且标题/摘要非空、对应 mentions 非数组者；提示词要 {results:\[{index,regions|entities}]}，jobAttach 按 base+idx 对齐、slice(0,3)、confidence 夹 \[0,1]、region 截 20/name 截 60；抛错 failed+=chunk，finally 一律 processed+=chunk；循环间消费 cancel，结束统一 persistCorpus。

- 问题：

  - region/type 未按枚举白名单校验，越界标签新建分桶且 /api/corpus?region= 精确匹配失效

  - index 缺失不计 failed 但 processed 照加，进度失真

  - 抽样端点与批任务各写一份 prompt 与归一化，重复实现

**5. RSS/Atom 摄取、去重与日期卫生**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：正则切 <item>/<entry>，decodeEntities→stripTags，description 截 500 字；fetchRssFeed 用 AbortController 20s 超时，非 2xx 或无条目抛错；ingestAllFeeds 并发抓取后按 title.toLowerCase() 去重计 skipped；appendFeedItems 再与语料标题比对，pubDate 经 parseArticleDate 算 ageDays>阈值记 skippedStale；入库 date=当天、timeAgo=刚刚、publishedAt=原始 pubDate。fixture rss.xml（RFC822 GMT+CDATA）由 functional-test H1 断言 added≥2。

- 问题：

  - 仅按标题去重无链接键，同题异源误合、改题重复入库

  - pubDate 缺失或不可解析时 publishedAt=null，排序回落 sourceDate 当最新且 prune 永不清理

  - 手动摄取 30 天与调度器 45 天两套阈值

**6. 定时摄取与过期清理（scheduler.ts）**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：FEED\_INGEST\_INTERVAL\_MS 默认 6h、FEED\_CLEANUP\_MAX\_AGE\_DAYS 默认 45；listen 成功后 startFeedScheduler，setInterval 内 void runScheduledIngest().catch(log)，timer.unref 不保活；模块级 running 互斥，重入直接返 errors:\[ingest already running]；单轮=ingestAllFeeds→appendFeedItems(45d)→pruneExternalCorpus(45d)，prune 保留无 publishedAt 与非 external 条目。

- 问题：

  - 环境变量无数字校验，NaN 传入 setInterval 退化为约 1ms 空转狂抓

  - 启动不预热，重启后最长 6h 无新条目

  - 返回的 timer 未保存，无法停机或热改间隔

### App 全局状态与编排　`app-global`

**本域结论**：审计见微 Genway 全局编排：hash 路由、技能合并、localStorage 集合、快照拉取、内置与运行时语料合并及顶栏词典情绪口径。

**1. 导航与详情路由**　—　数据来源：`演示静态`　判定：**大体合理需打磨**

- 逻辑：parseLocationHash() 解析 #/article/<id> 与五个主 Tab，非法回落 home；writeHash():detail 入栈 location.hash，home 用 replaceState 清 hash。hashchange 用 articlesRef 查 id，未命中写 pendingArticleId，等语料合并后由 \[articles,pendingArticleId] effect 补解析。

- 问题：

  - 未知 id 白屏无兜底

  - replaceState 抹掉前进记录

  - 路由逻辑三处重复

**2. 技能结果合并**　—　数据来源：`AI生成`　判定：**口径隐患**

- 逻辑：runNewsSkill 等 POST /api/skill/:name，body 取标题或摘要截 600 字；服务端按 articleId 写回 serverCorpus 并返回 overrides。mergeSkillArticle 仅白名单 10 字段浅覆盖（personaForecasts 用整数组），再经 handleEnrichArticle 同步 articles 与 selectedArticle；失败静默返回 null。

- 问题：

  - 本地副本与服务端 corpus 双写分叉，刷新丢结果

  - 失败仅静默 null

**3. localStorage 集合与偏好**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：useLocalState 统一 jianwei: 前缀，{v,d} 包装校验 version，不符回落 init，legacyKey 读到即迁移删除，读写 try/catch 降级。App 持久化 7 项：阅读模式、身份、雷达词、书签、标签关注、预测契约、昵称。挂载时 \[] effect 把雷达 count/countChange/sentimentTrend/marketAttention 清零。

- 问题：

  - 清零 effect 每次挂载都重写存储

  - authError 从未 set 属死状态

**4. 快照拉取**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：useSnapshot() 挂载即 fetch /api/snapshot，inFlight AbortController 取消旧请求并 setTimeout 15s 超时；ok 存 SnapshotResponse（meta.corpusSize/demo），res 非 ok 或异常置 error。Hub 仅 status==='ok' 消费快照，loading 显示占位并禁用刷新按钮。

- 问题：

  - 超时 abort 不置 error，状态永久 loading

  - ingest 后不刷新

**5. 内置示例与运行时语料合并**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：App 初始 articles=CURATED\_ARTICLES（4 条站内示例）；挂载后递归 /api/corpus?limit=200\&offset 翻页（封顶 10000），服务端按 publishedAt→sourceDate→date 倒序分页，前端按 id 去重后追加到 prev 尾部，不重排不覆盖。服务端 loadCorpus() 优先 data/corpus.json（144 条=4 站内+140 RSS）。

- 问题：

  - 同 id 去重使服务端写回与标注被本地静态副本覆盖

  - 追加不重排

  - 仅拉一次

**6. 顶栏情绪与坏消息口径**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：derived：取 publishedAt≥本地当日 0 点的条目做 deriveFromList，net=(正−负)/(正+负)×100，scanned<20 则改用 corpusDerived(articles,30)（30 天窗）。Header 显示 optimistic??marketMetrics.netOptimism 与 negativeHits；正负可双计，neutral=scanned−正−负。

- 问题：

  - net=null 回落静态乐观值

  - 今日口径未过滤外部条目

  - 与首页不一致

### 测试与运维脚本　`ops-tests`

**本域结论**：链路：tsc→vite→esbuild 固定重建序、JIANWEI\_NO\_SETTINGS=1 纯净实例、smoke/functional/feature/unit 四套测试、launchd 常驻加 start-server.sh 兜底。风险：rebuild 的重启步骤被「|| true」短路且只以端口健康判成功，实测 3001 进程比 dist 旧 5 天；测试断言与现行 /api/admin/status 字段不符，dist 产物从未被冒烟验证。

**1. 一键重建与重启 rebuild.sh**　—　数据来源：`真实派生`　判定：**逻辑不合理**

- 逻辑：固定四步：npx tsc --noEmit → npx vite build（必须先于 esbuild，因 vite outDir=dist 会清空 dist/server.cjs）→ npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs → launchctl kickstart -k gui/$(id -u)/com.user.news-jianwei（后接 || true）→ 15 次×1s 轮询 <http://127.0.0.1:3001/api/health，成功即> exit 0，超时 exit 1 并提示 /tmp/news-jianwei.err.log（scripts/rebuild.sh:9-29）。

- 问题：

  - kickstart 失败被 || true 吞掉，无进程身份校验

  - 旧进程应答健康即报 OK，实测 uptime 5.4 天而 dist 已重建

  - label 硬编码 com.user.news-jianwei，与仓库模板 label 不一致

**2. 纯净实例发布闸门 release-check.sh**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：五步：tsc --noEmit → vite build → esbuild 打包 dist/server.cjs → 起纯净实例（PORT=3215，JIANWEI\_NO\_SETTINGS=1）→ 跑断言。纯净语义由 src/server/settings.ts:27 的 NO\_PERSIST 实现：loadSettings 强制 aiChoice=auto、gemini/deepseekApiKey=''、feeds=\[]，persistSettings() 与 corpus.ts:12 persistCorpus() 直接 return，故无 Key 且不写 data/\*.json；另用 python3 -m http.server 3211 托管 scripts/fixtures/rss.xml，trap EXIT kill 两 PID，30×1s 等健康。

- 问题：

  - 实例用 nohup npx tsx server.ts 跑源码，launchd 实跑的 dist/server.cjs 产物未被验证

  - trap 只 kill npx 父进程，tsx 子进程可能残留占 3215

  - 闸门不跑 unit.test.ts 与 feature-test.mjs

**3. 三层 API 测试脚本**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：smoke.mjs 20 项：health、首页含「见微 Genway」、POST /api/analyze 结构完整且 date 匹配 /^\d{4}年\d+月\d+日$/ 且≠「2026年9月1日」、snapshot 要求 meta.corpus==='curated'、predict 空请求 400 且无 Key 时 fallback===true 且 modelChoice==='jianwei-demo'、feeds/ingest 未配置 400、enrich 返回 enriched===false 且 reason==='no\_api\_key'、settings 无密钥字段、admin/status。functional-test.mjs 29 项：Z0 /api/admin/reset 复位于 4 篇内置语料 → G 热更新 feeds=\[本地RSS] → H ingest added>=2、meta.corpus 翻 'live' → I 不可达源 errors>=1 且整体不失败 → J 还原 feeds=\[]。feature-test.mjs 24 项面向带真实 Key 的在线实例，并 dynamic import 源码纯函数。

- 问题：

  - 断言 adm.enrichCache/predictCache，现行 server.ts:678 已改为 caches.enrich/predict，重启后必红

  - RSS fixture pubDate 固定，超 FEED\_MAX\_AGE\_DAYS=30 后 H 组失效

  - feature-test 硬编码绝对路径、C1 依赖在线 Key，F3/F4 恒真

**4. 纯函数单元测试 unit.test.ts**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：node:test + npx tsx --test scripts/unit.test.ts，无第三方依赖、不触网。16 个 test 断言不变量：parseArticleDate 覆盖 RFC822/ISO/空格/纯日期/中文，非法回 null；articleSortTime 优先级 publishedAt>sourceDate>date 且失败回 0；isStaleArticle 30 天阈值；sentimentCounts/netSentiment 词典命中且 net∈\[-100,100]；corpusDerived 30 天窗口排除旧闻、无时刻保留（断言行 positive===2）；monitorHits 短语需完整命中或≥3 汉字组成词兜底；mediaProfile 域名归一与 A/B/C 档；detectBreaking 需强词+多源印证；parseFeed 兼容 RSS2/Atom；localTrendModel 权重齐全给 pPos、缺失回 kind='none'。

- 问题：

  - 仅覆盖纯函数，无端点与持久化路径

  - PROJECT\_STATUS 记「10 例」实际 16 例，文档过期

  - 未纳入 release-check 闸门

**5. launchd 常驻与 start-server.sh 兜底**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：实装 \~/Library/LaunchAgents/com.user.news-jianwei.plist：/usr/local/bin/node dist/server.cjs，RunAtLoad+KeepAlive+ProcessType=Background，NODE\_ENV=production，日志 /tmp/news-jianwei{,.err}.log；端口取 server.ts:53 的 PORT||3001，app.listen(0.0.0.0) 成功回调内 startFeedScheduler（默认 6h 摄取、45 天清理）。start-server.sh 兜底：curl /api/health 判活 → lsof -tnP -iTCP:PORT -sTCP:LISTEN 取真实监听 PID 写 scripts/server.pid；端口占用但不健康则 kill 后重启，30×1s 等待，stop 只 kill 监听 PID。

- 问题：

  - 仓库模板 label/__USER__/npx tsx 与实装不一致，按文件注释安装起不来

  - vite build 清空 dist 期间 KeepAlive 重启有崩溃窗口

  - scripts/server.log 无轮转且留 EADDRINUSE 崩溃栈

### 交叉校验：数据与口径一致性　`cross-consistency`

**本域结论**：跨页口径大体自洽且多处已如实标注双口径，但同一事实存在多套算法：今日情绪在顶栏与首页 Hero 过滤条件不同，置信度有本地 8–92 与 AI 0–100 两套，媒体权威人工 A/B/C 与 AI Tier 并存，影响对象三套分类互不校验；缓存与语料双写不同步、客户端按 id 去重使服务端写回对 4 篇站内文失效。

**1. 今日/近30天情绪口径（顶栏 vs 首页 vs 信息流）**　—　数据来源：`词典启发式`　判定：**大体合理需打磨**

- 逻辑：corpusMetrics:net=(正−负)/(正+负)×100，按篇布尔命中词典（sentimentCounts）。App.tsx:411 顶栏今日=publishedAt≥本地零点、不限 isExternal、无上界；HomeView\.tsx:68 Hero 要求 isExternal，scanned≥20 才用今日，否则回退 corpusDerived(articles,30)（含无 publishedAt 站内文，corpusMetrics:172）；HomeView:131 信息流另加次日上界。

- 问题：

  - 顶栏今日不限 isExternal 且无上界，与 Hero、信息流口径分叉

  - 标称近 30 天实含 4 篇无 publishedAt 站内文

  - StandardModeFeed:17 逐词计数与汇总按篇布尔不可对齐

**2. 概率/置信度多套口径与本地引擎重复实现**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：localTrendModel:35 pPos=clamp(50+momentum×35,8,92)、pNeg=100−pPos；ForecastArenaTab:76 置信度=clamp(max(pPos,pNeg),25,85)，baseRatePercentage 用未收敛原值；/api/predict 在线 AI 输出 0–100 无上界；aiVerdict.confidenceScore 为 AI 或站内演示值 84–98；personaForecast 仅高/中/低带。

- 问题：

  - 同文置信度可同时为 92/85/高，无量纲换算

  - mixed 区间(45–55)前端判正负、server.ts:388 判中性

  - server.ts 复制公式未引用 localTrendModel

**3. 媒体权威双口径（人工 A/B/C vs AI Tier）**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：mediaAuthority.ts 按域名人工维护 A/B/C，未收录返回 null（卡片徽标）；AI 深读在 rippleEffect.multiSources 自填 tier 串，语料中 Tier 1 顶级权威/一级/官方/科技媒体混用。SevenElementsTab:50 tier1=tier 含 'Tier 1' 或 '一级'；SevenElementsTab:427 与 RippleEffectTab:117 已明示双口径并以人工档案为准复核。

- 问题：

  - Tier1 计数漏 '官方' 等非规范写法，且数值含 AI 自填

  - 多源家数与摘录为 AI 记忆生成，非真实检索结果

**4. 影响对象三类分类互不校验**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：stakeholderImpact 由 AI 生成（deepEndpoints:54）：type 六值、direction benefit/pressure/neutral、strength 1–5（SevenElementsTab:667 ≥4 强、≥2 中）；personaImpacts 六身份，站内 4 篇为演示静态、其余由 enrich 生成；rippleEffect.stages 一/二/三阶 severity 高/中/低。首页「影响我」筛选仅依赖 personaImpacts 是否存在。

- 问题：

  - 同一主体可在三处给出相左方向，无交叉校验

  - strength、severity、direction 三套量纲无换算说明

**5. 缓存与语料持久化同步（含客户端合并）**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：cache.ts 内存 Map（enrich TTL 24h、predict 10min）与 data/corpus.json 双写。deepEndpoints:19 缓存命中只返回 overrides 不 persistCorpus（:67 注释称已写回）；runSingleSkill:105 命中才回写；personaforecast:339 命中重打 generatedAt=now；App.tsx:445 仅追加未见 id，站内 4 篇服务端写回刷新即失效；persistCorpus 每次全量写 432KB。

- 问题：

  - enrich 缓存命中不回写语料，与注释不符

  - 缓存命中重打 generatedAt，旧内容显示为刚生成

  - 客户端按 id 去重，站内文写回刷新即丢

**6. 真实/AI/词典/演示 标注如实性**　—　数据来源：`混合`　判定：**口径隐患**

- 逻辑：已如实标注：Hero 示例/实时徽标（hasLive=存在 isExternal）、StrategicMetricsBar:15 宏观三项标为演示静态、snapshot.meta.demo、七要素注明站内示例媒体为演示构造。未对齐：App.tsx:659 页脚恒称「静态示例快照（非实时抓取）」；站内 4 篇静态 spectrumLayers 恒显示「✓深度解读」，其 aiVerdict 84–98 以「AI 定性」呈现且详情页无演示标注。

- 问题：

  - 页脚「非实时抓取」与实时徽标冲突

  - 演示静态的高置信度以 AI 定性呈现，未逐篇标注

  - 站内演示文计入情绪与赛道派生统计

### 交叉校验：健壮性与商用阻塞项　`cross-robustness`

**本域结论**：鉴权为可选共享令牌：未配时 admin/reset（覆写 corpus.json、无备份无确认）、settings（可改 deepseekBaseUrl 令 Key 外发）对 0.0.0.0 开放；AI 调用无超时无重试；语料非原子全量写盘且无备份；调度双阈值不一致、启动不抓取；密钥加密但轮换即清空。

**1. 鉴权与 admin 暴露面**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：server.ts:55-71：仅当 JIANWEI\_AUTH\_TOKEN 非空才对 /api 校验 x-jianwei-token 或 Bearer（明文 === 比较），/api/health 豁免并回传 authRequired、activeProvider。admin/reset(664)、settings(717)、feeds/ingest(609) 共用同一令牌、无二次确认与角色区分；token 为空时这些破坏性端点对 0.0.0.0:3001(867) 全开放。

- 问题：

  - token 未配则 reset/settings 全开放

  - reset 无确认即覆写语料

  - 令牌明文比较无时效

**2. AI 失败降级链路**　—　数据来源：`混合`　判定：**大体合理需打磨**

- 逻辑：ai.ts:85-147：Gemini 传 responseMimeType=json；DeepSeek POST /chat/completions，模型名含 reasoner 时省略 temperature 与 response\_format。各端点 JSON 两段容错（parse→剥 \`\`\` 围栏，再失败即抛）。无 Key：analyze→generateFallbackAnalysis、predict→localBaselinePrediction（净动量 (upSum-downSum)/总权重，pPos=clamp(50+35m,8,92)，置信度 clamp(25,85)）、enrich/skill 返 no\_api\_key。无超时、无重试退避。

- 问题：

  - DeepSeek fetch 无超时，挂起则请求悬挂

  - 无 429/5xx 重试

  - 失败只返 error 不区分原因

**3. 限流与缓存**　—　数据来源：`真实派生`　判定：**合理**

- 逻辑：cache.ts:13 滑动窗口 60s、RATE\_MAX\_PER\_MIN(默认 300)/ip，超限 429；Map\<ip,时间戳\[]> 仅在重复来访时修剪。enrich 缓存 TTL 24h，key=id:<articleId> 否则 h:djb2(title)，写入按插入序淘汰到 1000 条；predict 以问题文本 djb2 为键、TTL 10min、上限 500；admin/reset 清空两者。同请求并发无 in-flight 合并，会重复调用 AI。

- 问题：

  - AI 与只读端点同权限流，300 次/分成闸门过松

  - 同请求并发不合并，重复计费

**4. 调度器与入库卫生**　—　数据来源：`真实派生`　判定：**口径隐患**

- 逻辑：scheduler.ts:61 仅 setInterval(FEED\_INGEST\_INTERVAL\_MS 默认 6h) 触发，启动不立即抓取，lastIngest 只存内存不持久化；running 标志只互斥调度自身（手动 /api/feeds/ingest 不共享）。feeds.ts:90 fetchRssFeed 20s AbortController 超时；corpus.ts:78 appendFeedItems 按标题小写对全量 corpus 去重、pubDate 超龄跳过，pruneExternalCorpus 删过期外部条目。

- 问题：

  - 手动摄取 FEED\_MAX\_AGE\_DAYS(30) 与调度 FEED\_CLEANUP\_MAX\_AGE\_DAYS(45) 双阈值冲突

  - 重启后无 lastIngest 仅缓存

**5. 密钥与隐私**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：settings.ts:26-49 以 sha256(JIANWEI\_SECRET) 派生 AES-256-GCM 密钥，密文以 v1:iv:tag:data 落 data/settings.json；无 secret 则明文写并 warn。GET /api/settings 只回 gemini/deepseek 布尔与模型名，不回密钥；前端登录令牌存 localStorage，main.tsx:9 包装 fetch 注入所有 /api 请求。配置 secret 时启动即 persistSettings 重写文件（明文迁移）。

- 问题：

  - 轮换或丢失 secret 后解密返空，启动自动落盘把 Key 清成空串

  - 令牌存 localStorage

**6. 构建与发布检查**　—　数据来源：`真实派生`　判定：**大体合理需打磨**

- 逻辑：rebuild.sh 四步：tsc --noEmit→vite build→esbuild 打包 dist/server.cjs→launchctl kickstart 常驻服务，轮询 15s /api/health，失败 exit 1。release-check.sh 起 fixtures RSS(3211) 与 PORT=3215、JIANWEI\_NO\_SETTINGS=1 的无 Key/不写盘实例，顺序跑 smoke.mjs 与 functional-test.mjs，trap 收尾清理。

- 问题：

  - plist 用 NODE\_ENV=development 常驻跑 Vite dev 中间件

  - release-check 不覆盖带令牌路径

  - 无回滚

## 四、跨域共性问题与修复优先级

### P0（诚实性 / 可信度 / 安全，建议立即处理）

1. **兜底模板必须如实标注或改为错误态**：`/api/ask-nuance`、`/api/analyze`、`/api/strategic-advisor` 的写死内容要显式标注「离线兜底/演示示例」，或直接返回失败态；战略顾问的 citations 必须来自真实引用而非前 3 篇标题。
2. **修重建/部署可信度**：`rebuild.sh` 去掉 `|| true`，改为校验「dist/server.cjs 构建时间 > 进程启动时间」或比对 PID/端口占用者，失败必须非 0 退出。
3. **危险端点收口**：`/api/admin/reset`（覆写语料、无备份）、`/api/settings`（可改 baseUrl 使 Key 外发）、`/api/feeds/ingest` 在未配置 `JIANWEI_AUTH_TOKEN` 时默认只允许本地回环访问；reset 增加自动备份 + 二次确认。
4. **修复/移除打印 PDF**：补 `document.body.classList.add('printing')` 并恢复打印样式中的 flex/grid，或直接下掉 PDF 按钮只保留 PNG。
5. **修重大突发分级与否定语境判定**：区分 STRONG/WEAK 的印证要求，否定词改为位置/句式判定。

### P1（口径统一，避免"看起来像派生指标"）

1. 抽取唯一时间口径工具（今日窗口/范围决策），替换顶栏、Hero、信息流的 3 份内联实现；静默兜底扩展到非「全部」分类，或明确提示"今日 0 条"。
2. live 统计剔除演示语料或逐处标注；4 篇站内示例文加「演示」徽标，其 aiVerdict 不署「AI 定性」。
3. `sourceCount / credibilityStars / changeVelocity / readTimeMinutes` 这类常量字段不要再以派生指标口吻展示（或改为真实派生值）。
4. 分类 pill 与真实字段对齐：「热门」改多源/权威派生分或注明仅示例语料有；赛道 pill 统一到 `SECTOR_TAXONOMY`；「影响我」说明其依赖「点开过详情」而非画像。
5. 置信度/概率统一量纲与展示文案；服务端复用 `utils/localTrendModel` 公式；predict 缓存键纳入文章与前提，模型名按实际通道填写。
6. 缓存命中回写语料、`generatedAt` 保留首次生成时间；客户端合并改为服务端优先（或补 `updatedAt` 比较）。

### P2（数据管道与性能）

1. 摄取去重加链接键；统一 `FEED_MAX_AGE_DAYS` 与调度清理阈值；无 `pubDate` 条目单独策略（不参与"最新"排序、按入库时间老化）。
2. 调度器：环境变量数字校验、启动预热、保留 timer 以支持热改；手动与调度共用互斥锁。
3. AI 调用补超时与 429/5xx 退避重试；同请求 in-flight 合并避免重复计费。
4. 性能：重点词着色改为一次联合正则或 Aho-Corasick（当前 O(n²) 字符复制 + 每次重建 130+ RegExp）；共振 780 对相似度缓存；搜索加结果上限与高亮。
5. 密钥轮换策略：secret 缺失/变更时不要自动落盘清空 Key，改为拒绝启动并提示。

### 已具备、可保留的优点（不要改坏）

真实派生的筛选与分页、当日静默兜底的诚实标注、skill 端点字段白名单与缓存隔离、滑动窗口限流、AES-256-GCM 密钥加密与 `/api/settings` 脱敏、unit.test.ts 的纯函数不变量测试、`localTrendModel` 单一公式来源、CSV 导出、hash 路由 + pendingArticleId 回补。
