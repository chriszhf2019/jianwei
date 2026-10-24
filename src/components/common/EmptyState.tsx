import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  reason?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
}

/** 统一空态：说清「为什么空」和「下一步做什么」，而不是只写一句暂无数据。 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  reason,
  actionLabel,
  onAction,
  icon,
  compact = false,
}) => (
  <div
    className={`rounded-xl border border-dashed border-stone-300 bg-stone-50 text-center ${
      compact ? 'px-4 py-5' : 'px-6 py-10'
    } space-y-2`}
  >
    <div className="flex justify-center text-stone-400">{icon || <Inbox className="w-6 h-6" />}</div>
    <div className="text-sm font-serif font-bold text-stone-800">{title}</div>
    {reason && <p className="text-[11px] text-stone-500 leading-relaxed max-w-xl mx-auto">{reason}</p>}
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-1 inline-flex items-center px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-[11px] font-serif font-bold transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
