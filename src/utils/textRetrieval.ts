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
  const queryTerms = tokenizeForRetrieval(query);
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
