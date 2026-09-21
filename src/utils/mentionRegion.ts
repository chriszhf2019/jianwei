// “内容涉事地区”词典检测（启发式；非实体识别）。
// 口径：在标题/摘要中按地区词表顺序扫描，取首个命中的地区为该文“主要涉事地区（词典代理）”。
// 局限：不含实体消歧（如“中国”可指地域/企业），仅作聚合观察，不构成事实结论。

export interface MentionRegion {
  id: string;
  name: string;
  names: string[];
}

export const MENTION_REGIONS: MentionRegion[] = [
  { id: 'cn', name: '中国大陆', names: ['中国', '国内', '央行', '工信部', '发改委', '北京', '上海', '国产', '沪深'] },
  { id: 'us', name: '美国', names: ['美国', '美联储', '硅谷', '华盛顿', '白宫', '美股', '美元', 'OpenAI', '英伟达', '谷歌'] },
  { id: 'eu', name: '欧洲', names: ['欧洲', '欧盟', '德国', '法国', '英国', '伦敦', '巴黎', '柏林', '英伟达'] },
  { id: 'jp_kr', name: '日韩', names: ['日本', '日元', '东京', '韩国', '三星', 'SK海力士', '首尔'] },
  { id: 'apac', name: '东南亚/其他亚太', names: ['东南亚', '东盟', '越南', '印尼', '印度', '台湾', '香港', '新加坡'] },
  { id: 'me', name: '中东', names: ['中东', '以色列', '伊朗', '沙特', '阿联酋', '迪拜'] },
  { id: 'latam', name: '拉美/非洲', names: ['巴西', '墨西哥', '阿根廷', '非洲', '南非', '尼日利亚'] },
];

/** 对标题+摘要做词典地区检测，返回命中地区数组（去重保序） */
export function detectMentionRegions(text: string): string[] {
  const lower = String(text || '').toLowerCase();
  const found: string[] = [];
  for (const r of MENTION_REGIONS) {
    if (r.names.some((n) => lower.includes(n.toLowerCase()))) {
      found.push(r.name);
    }
  }
  return found;
}

/** 主涉事地区 = 词表顺序中首个命中；无命中返回 null */
export function primaryMentionRegion(text: string): string | null {
  const found = detectMentionRegions(text);
  return found.length > 0 ? found[0] : null;
}
