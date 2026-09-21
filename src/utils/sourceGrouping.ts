import { mediaKey } from './mediaAuthority';

export interface SourceGroupInfo {
  key: string;
  label: string;
  known: boolean;
  basis: 'known_group' | 'domain_only';
}

/**
 * 只登记能够明确确认归属关系的域名组。
 * 未登记来源按各自域名分开，不推断母集团，也不把“未知”当作同一来源。
 */
const KNOWN_GROUPS: Array<{ id: string; label: string; domains: string[] }> = [
  {
    id: 'group-people-daily-online',
    label: '人民网系',
    domains: ['people.com.cn'],
  },
  {
    id: 'group-xinhua',
    label: '新华社系',
    domains: ['xinhuanet.com', 'news.cn'],
  },
  {
    id: 'group-cctv',
    label: '中央广播电视总台系',
    domains: ['cctv.com', 'cctv.cn'],
  },
  {
    id: 'group-guangming',
    label: '光明日报系',
    domains: ['gmw.cn'],
  },
];

function hostname(sourceName?: string | null, sourceUrl?: string | null): string {
  return mediaKey(sourceName, sourceUrl).toLowerCase().replace(/^www\./, '');
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function sourceGroupInfo(
  sourceName?: string | null,
  sourceUrl?: string | null
): SourceGroupInfo {
  const host = hostname(sourceName, sourceUrl);
  if (!host) {
    return { key: 'unknown-source', label: '来源未知', known: false, basis: 'domain_only' };
  }
  const matched = KNOWN_GROUPS.find((group) =>
    group.domains.some((domain) => matchesDomain(host, domain))
  );
  if (matched) {
    return { key: matched.id, label: matched.label, known: true, basis: 'known_group' };
  }
  return { key: `domain:${host}`, label: host, known: false, basis: 'domain_only' };
}

export function sourceGroupKey(
  sourceName?: string | null,
  sourceUrl?: string | null
): string {
  return sourceGroupInfo(sourceName, sourceUrl).key;
}
