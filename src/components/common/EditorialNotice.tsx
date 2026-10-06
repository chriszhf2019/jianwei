import React from 'react';
import { MethodBadge } from './MethodBadge';

interface EditorialNoticeProps {
  title?: string;
  children: React.ReactNode;
}

/** 编辑种子、专题框架、赛道词与固定权重的统一口径条：产品配置，不是实时情报。 */
export const EditorialNotice: React.FC<EditorialNoticeProps> = ({
  title = '产品配置 · 编辑种子',
  children,
}) => (
  <div className="text-[11px] leading-relaxed text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-wrap items-start gap-2">
    <MethodBadge methodId="editorial_template" compact />
    <p>
      <span className="font-bold">{title}</span>
      <span> · {children}</span>
    </p>
  </div>
);
