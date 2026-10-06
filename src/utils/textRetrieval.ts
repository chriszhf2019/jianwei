export interface RankDocument {
  id: string;
  title: string;
  body?: string;
}

export interface RankedDocument<T extends RankDocument> {
  document: T;
  score: number;
  titleScore: number;
  bodyScore: number;
}

const STOP_TOKENS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', '公司', '发布', '宣布', '推出',
  '相关', '最新', '消息', '报道', '今日', '表示', '进行', '一个', '以及',
]);

/** 核心科技/财经双语实体同义映射库（用于混合召回，增强中英/别名同义覆盖） */
const ENTITY_SYNONYMS: Record<string, string[]> = {
  nvidia: ['英伟达'],
  英伟达: ['nvidia'],
  tsmc: ['台积电'],
  台积电: ['tsmc'],
  apple: ['苹果'],
  苹果: ['apple'],
  tesla: ['特斯拉'],
  特斯拉: ['tesla'],
  microsoft: ['微软'],
  微软: ['microsoft'],
  google: ['谷歌'],
  谷歌: ['google'],
  byd: ['比亚迪'],
  比亚迪: ['byd'],
  catl: ['宁德时代'],
  宁德时代: ['catl'],
  fed: ['美联储', '联储'],
  美联储: ['fed'],
  pboc: ['央行', '人行'],
  央行: ['pboc'],
  agent: ['智能体'],
  智能体: ['agent'],
  semiconductor: ['半导体', '芯片'],
  芯片: ['半导体', 'chip'],
};

/** 查询词同义扩展，增强跨语种与别名召回 */
export function expandQuerySynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = ENTITY_SYNONYMS[token.toLowerCase()];
    if (synonyms) {
      for (const syn of synonyms) {
        for (const synToken of tokenizeForRetrieval(syn)) {
          expanded.add(synToken);
        }
      }
    }
  }
  return Array.from(expanded);
}

/** 英文按词切分，中文按 2/3 字符 n-gram 切分；无需外部分词依赖。 */
export function tokenizeForRetrieval(text: string): string[] {
  const normalized = String(text || '').toLowerCase();
  const tokens: string[] = [];
  for (const match of normalized.matchAll(/[a-z0-9]+|[\u4e00-\u9fff]+/g)) {
    const part = match[0];
    if (/^[a-z0-9]+$/.test(part)) {
      if (part.length >= 2 && !STOP_TOKENS.has(part)) tokens.push(part);
      continue;
    }
    if (part.length === 1) {
      tokens.push(part);
      continue;
    }
    for (let size = 2; size <= 3; size += 1) {
      for (let i = 0; i <= part.length - size; i += 1) {
        const token = part.slice(i, i + size);
        if (!STOP_TOKENS.has(token)) tokens.push(token);
      }
    }
  }
  return tokens;
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
  return tf;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 1;
}

function bm25(
  queryTerms: string[],
  documentTerms: string[],
  documentFrequency: Map<string, number>,
  documentCount: number,
  averageLength: number
): number {
  const tf = termFrequency(documentTerms);
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;
  for (const term of new Set(queryTerms)) {
    const frequency = tf.get(term) || 0;
    if (frequency === 0) continue;
    const df = documentFrequency.get(term) || 0;
    const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
    const denominator = frequency + k1 * (1 - b + b * (documentTerms.length / Math.max(1, averageLength)));
    score += idf * ((frequency * (k1 + 1)) / denominator);
  }
  return score;
}

export function rankDocumentsBM25<T extends RankDocument>(
  query: string,
  documents: readonly T[],
  topN = 10,
  minScore = 0
): Array<RankedDocument<T>> {
  const queryTerms = expandQuerySynonyms(tokenizeForRetrieval(query));
  if (queryTerms.length === 0 || documents.length === 0) return [];

  const titleTokens = documents.map((document) => tokenizeForRetrieval(document.title));
  const bodyTokens = documents.map((document) => tokenizeForRetrieval(document.body || ''));
  const titleDf = new Map<string, number>();
  const bodyDf = new Map<string, number>();
  for (const tokens of titleTokens) {
    for (const term of new Set(tokens)) titleDf.set(term, (titleDf.get(term) || 0) + 1);
  }
  for (const tokens of bodyTokens) {
    for (const term of new Set(tokens)) bodyDf.set(term, (bodyDf.get(term) || 0) + 1);
  }
  const averageTitleLength = average(titleTokens.map((tokens) => tokens.length));
  const averageBodyLength = average(bodyTokens.map((tokens) => tokens.length));

  return documents
    .map((document, index) => {
      const titleScore = bm25(queryTerms, titleTokens[index], titleDf, documents.length, averageTitleLength);
      const bodyScore = bm25(queryTerms, bodyTokens[index], bodyDf, documents.length, averageBodyLength);
      return {
        document,
        score: titleScore * 2 + bodyScore,
        titleScore,
        bodyScore,
      };
    })
    .filter((item) => item.score > minScore)
    .sort((a, b) => b.score - a.score || b.titleScore - a.titleScore)
    .slice(0, topN);
}
