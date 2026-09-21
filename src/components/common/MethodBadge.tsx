import React from 'react';
import { CircleHelp } from 'lucide-react';
import { certificationSpec, methodSpec } from '../../utils/methodRegistry';

interface MethodBadgeProps {
  methodId: string;
  compact?: boolean;
}

const STYLE: Record<string, string> = {
  fact: 'text-emerald-800 bg-emerald-50 border-emerald-300',
  derived_metric: 'text-sky-800 bg-sky-50 border-sky-300',
  heuristic_signal: 'text-amber-800 bg-amber-50 border-amber-300',
  model_inference: 'text-purple-800 bg-purple-50 border-purple-300',
  scenario: 'text-indigo-800 bg-indigo-50 border-indigo-300',
  prediction: 'text-red-800 bg-red-50 border-red-300',
};

const CERTIFICATION_STYLE: Record<string, string> = {
  deterministic: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  curated: 'text-teal-700 bg-teal-50 border-teal-200',
  derived: 'text-sky-700 bg-sky-50 border-sky-200',
  heuristic: 'text-amber-700 bg-amber-50 border-amber-200',
  ai_single: 'text-purple-700 bg-purple-50 border-purple-200',
  ai_consensus: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  scenario: 'text-violet-700 bg-violet-50 border-violet-200',
  prediction_uncalibrated: 'text-red-700 bg-red-50 border-red-200',
  prediction_calibrated: 'text-emerald-800 bg-emerald-100 border-emerald-300',
  human_verified: 'text-blue-700 bg-blue-50 border-blue-200',
  unverified: 'text-stone-600 bg-stone-100 border-stone-300',
};

export const MethodBadge: React.FC<MethodBadgeProps> = ({ methodId, compact = false }) => {
  const spec = methodSpec(methodId);
  const certification = certificationSpec(methodId);
  const certificationAlreadyNamed = compact && spec.label.replace(/^AI\s*/i, '') === certification.label;
  const title = [
    `认证标准：${certification.label}`,
    `认证定义：${certification.description}`,
    `认证边界：${certification.limitations.join('；')}`,
    `方法：${spec.method}`,
    `依据：${spec.basis}`,
    `边界：${spec.limitations.join('；')}`,
    spec.calibrated ? '校准状态：已校准' : '校准状态：未校准',
  ].join('\n');
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={title}>
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${STYLE[spec.assertionType]}`}>
        <CircleHelp className="w-3 h-3" />
        {spec.label}
      </span>
      {!certificationAlreadyNamed && (
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${CERTIFICATION_STYLE[certification.id]}`}>
          {compact ? certification.label : `认证 · ${certification.label}`}
        </span>
      )}
    </span>
  );
};
