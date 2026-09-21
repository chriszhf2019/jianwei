// 七要素简报共享工具：详情「七要素事实」页与「简报卡」同源，保证口径一致。

import { NewsArticle } from '../types';

/** 把 7W 合成一段精简模型说明：what（已含主体与动作）为主线，who/when/where 并入锚点括号，动因/路径/格局分句 */
export function composeModel(se: NonNullable<NewsArticle['sevenElements']>): string {
  const { what, who, when, where, why, how, soWhat } = se;
  const parts: string[] = [];
  const push = (t: string) => {
    const x = (t || '').trim();
    if (x) parts.push(x);
  };

  push((what || '').trim());

  const metaBits: string[] = [];
  if ((who || '').trim()) metaBits.push(`主体：${(who || '').trim()}`);
  if ((when || '').trim()) metaBits.push((when || '').trim());
  if ((where || '').trim()) metaBits.push((where || '').trim());
  if (metaBits.length > 0) push(`【${metaBits.join(' · ')}】`);
  if (why) push(`动因：${why.trim()}`);
  if (how) push(`路径：${how.trim()}`);
  if (soWhat) push(`格局影响：${soWhat.trim()}`);
  return parts.join(' ');
}

/** 7W 简报条目（用于简报卡的单行速读列表）：顺序与七要素页一致 */
export const SEVEN_W_ITEMS: Array<{ key: keyof NonNullable<NewsArticle['sevenElements']>; label: string; color: string }> = [
  { key: 'what', label: '发生了什么', color: 'bg-[#E3120B]' },
  { key: 'who', label: '涉及主体', color: 'bg-[#0284C7]' },
  { key: 'when', label: '时间', color: 'bg-amber-500' },
  { key: 'where', label: '空间', color: 'bg-emerald-600' },
  { key: 'why', label: '动因', color: 'bg-purple-600' },
  { key: 'how', label: '路径', color: 'bg-blue-600' },
  { key: 'soWhat', label: '格局影响', color: 'bg-red-600' },
];
