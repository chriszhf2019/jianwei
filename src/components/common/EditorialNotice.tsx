import React from 'react';
import { MethodBadge } from './MethodBadge';

interface EditorialNoticeProps {
  title?: string;
  children: React.ReactNode;
}

/** 编辑模板、情景表和固定权重的统一口径条。 */
export const EditorialNotice: React.FC<EditorialNoticeProps> = ({
  title = '编辑口径',
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
