import React from 'react';
import { Info } from 'lucide-react';
import { FEATURE_SUMMARIES, type FeatureSummaryId } from '../../utils/featureSummaries';

interface FeatureSummaryProps {
  featureId: FeatureSummaryId;
  compact?: boolean;
  className?: string;
}

export const FeatureSummary: React.FC<FeatureSummaryProps> = ({
  featureId,
  compact = false,
  className = '',
}) => {
  const spec = FEATURE_SUMMARIES[featureId];
  if (!spec) return null;

  if (compact) {
    return (
      <details className={`group rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-[10px] text-stone-500 ${className}`}>
        <summary className="cursor-pointer list-none flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 text-stone-400" />
          <span>
            <b className="font-serif text-stone-700">{spec.title}：</b>
            {spec.purpose}
          </span>
        </summary>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-stone-200 pt-2 leading-relaxed">
          <p><strong className="text-stone-600">什么时候用：</strong>{spec.when}</p>
          <p><strong className="text-stone-600">输出：</strong>{spec.output}</p>
          <p><strong className="text-stone-600">边界：</strong>{spec.boundary}</p>
        </div>
      </details>
    );
  }

  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-900">
        <Info className="w-4 h-4 text-[#0284C7]" />
        {spec.title}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-700">{spec.purpose}</p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] leading-relaxed text-stone-500">
        <p><strong className="text-stone-700">什么时候用：</strong>{spec.when}</p>
        <p><strong className="text-stone-700">输出：</strong>{spec.output}</p>
        <p><strong className="text-stone-700">边界：</strong>{spec.boundary}</p>
      </div>
    </section>
  );
};
