// 重点词速读标注（纯本地、零 AI、可复核）
// 四色调：绿=利好/进展词 · 红=风险/负面词 · 金=数字/时间 · 蓝=主体/技术/市场术语
// 由静态信号词词典 + 可选的语料 AI 实体词（article.entityMentions）匹配；非 AI 判断、非事实结论。
// 用于长文正文的阅读引导；英文词大小写不敏感，中文按包含匹配（取最长命中，避免重叠）。

export type KeyTone = 'pos' | 'neg' | 'num' | 'key';

export interface KeySeg {
  text: string;
  tone?: KeyTone; // undefined = 普通文本
}

const POSITIVE_TERMS = [
  '全球首发', '创新高', '创纪录', '超预期', '增长', '大涨', '上涨', '突破', '发布', '推出',
  '达成', '合作', '签约', '获批', '量产', '交付', '上市', '盈利', '预增', '提速', '回暖',
  '中标', '落地', '开放', '完成', '超越', '领先', '融资', '收购', '加码', '扩产', '扩容',
  '放量', '上调', '增产', '亮眼', '加速', '首发', '首个', '首款', '新高',
];

const NEGATIVE_TERMS = [
  '不及预期', '增速放缓', '净流出', '下跌', '下滑', '暴跌', '亏损', '裁员', '退市', '处罚',
  '立案', '调查', '违规', '召回', '延期', '推迟', '承压', '放缓', '降速', '停运', '故障',
  '泄露', '被诉', '起诉', '败诉', '受阻', '下调', '熔断', '暴雷', '爆雷', '利空', '收缩',
  '关闭', '停售', '腰斩', '跌破', '风险', '存疑', '质疑',
];

// 主体/技术/市场术语（人工精选 + 可选 AI 实体词）
const KEY_TERMS = [
  '人工智能', 'AI 大模型', 'AI大模型', '大模型', '智能体', 'Agent', '生成式 AI', '生成式AI',
  'AIGC', '算力', '芯片', '半导体', '晶圆', '先进封装', '封装', 'GPU', 'NPU', 'CPU',
  '自动驾驶', '智能驾驶', '智驾', '新能源', '电动汽车', '固态电池', '锂电池', '储能', '光伏',
  '氢能', '云计算', '数据中心', '服务器', '量子', '操作系统', '开源', 'SaaS', '算法',
  '端侧', 'CPO', '光模块', '内存', '存储', '消费电子', '折叠屏', 'XR', '卫星', '6G', '5G',
  '物联网', '短剧', '机器人', '人形机器人', '无人机', '低空经济', '美元', '美股', 'A股',
  '港股', '美联储', '央行', '利率', '降息', '加息', '汇率', '关税', '制裁', '补贴', 'GDP',
  '通胀', '数据要素', '跨境电商', '出海', 'PlayStation', 'Roland', 'IFA',
];

const NUM_PATTERNS = [
  /20\d{2}年\d{1,2}月\d{1,2}日/,
  /\d{1,2}月\d{1,2}日/,
  /20\d{2}年/,
  /[+-]?\d{1,3}(?:[.,]\d+)?%/, // 百分数
  /[+-]?\d+(?:\.\d+)?\s*(?:亿美元|亿元|万元|美元|欧元|元|亿|万|千|倍)/, // 金额/量词
];

interface TermItem {
  tone: KeyTone;
  re: RegExp;
}

// 把词典与可选实体编译成"按命中长度降序"的单条正则（含捕获组 → 色调）
function buildTerms(extraKeys: string[]): TermItem[] {
  const seen = new Set<string>();
  const items: TermItem[] = [];
  const push = (text: string, tone: KeyTone) => {
    const t = text.trim();
    if (t.length < 2) return;
    if (seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    items.push({ tone, re: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
  };
  for (const t of [...extraKeys, ...KEY_TERMS]) push(t, 'key');
  for (const t of POSITIVE_TERMS) push(t, 'pos');
  for (const t of NEGATIVE_TERMS) push(t, 'neg');
  items.sort((a, b) => b.re.source.length - a.re.source.length);
  return items;
}

// 把词典与可选实体编译成"按命中长度降序"的正则表
let _staticTerms: TermItem[] | null = null;
function staticTerms(): TermItem[] {
  if (_staticTerms) return _staticTerms;
  _staticTerms = buildTerms([]);
  return _staticTerms;
}

/** 把纯文本切成长短片段，命中的词带色调；非命中片段 tone=undefined */
export function splitKeyTerms(text: string, extraKeys: string[] = []): KeySeg[] {
  if (!text) return [];
  const terms = extraKeys.length > 0 ? buildTerms([...extraKeys]) : staticTerms();
  const segs: KeySeg[] = [];
  let pos = 0;
  outer: while (pos < text.length) {
    // 优先尝试长词/术语，避免"增长"命中"增速放缓"之类的前缀
    for (const item of terms) {
      item.re.lastIndex = 0;
      const m = item.re.exec(text.slice(pos));
      if (m && m.index === 0) {
        const word = m[0];
        if (pos > 0) segs.push({ text: text.slice(0, pos), tone: undefined });
        segs.push({ text: word, tone: item.tone });
        text = text.slice(pos + word.length);
        pos = 0;
        continue outer;
      }
    }
    for (const p of NUM_PATTERNS) {
      p.lastIndex = 0;
      const m = p.exec(text.slice(pos));
      if (m && m.index === 0) {
        const word = m[0];
        if (pos > 0) segs.push({ text: text.slice(0, pos), tone: undefined });
        segs.push({ text: word, tone: 'num' });
        text = text.slice(pos + word.length);
        pos = 0;
        continue outer;
      }
    }
    // 无命中：前进一个字符（支持中文逐字）
    pos += 1;
  }
  if (text) segs.push({ text, tone: undefined });
  return segs;
}
