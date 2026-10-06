import React from 'react';
import {
  Activity,
  BookOpen,
  Crosshair,
  FileText,
  LogIn,
  Sparkles,
  UserCheck,
} from 'lucide-react';

// Format Action Type to Chinese Label & Color Badge
export function formatActionBadge(action: string) {
  const act = action.toLowerCase();
  if (act.includes('register')) {
    return {
      label: '注册申请',
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <UserCheck className="w-3 h-3" />,
    };
  }
  if (act.includes('knowledge') || act.includes('deposit')) {
    return {
      label: '知识库添加',
      colorClass: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: <BookOpen className="w-3 h-3" />,
    };
  }
  if (act.includes('enrich') || act.includes('ai') || act.includes('analysis')) {
    return {
      label: '深度解读调用',
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: <Sparkles className="w-3 h-3" />,
    };
  }
  if (act.includes('predict') || act.includes('contract')) {
    return {
      label: '前瞻预测契约',
      colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: <Crosshair className="w-3 h-3" />,
    };
  }
  if (act.includes('login') || act.includes('auth')) {
    return {
      label: '用户登录',
      colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
      icon: <LogIn className="w-3 h-3" />,
    };
  }
  if (act.includes('read') || act.includes('article') || act.includes('view')) {
    return {
      label: '情报阅读',
      colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
      icon: <FileText className="w-3 h-3" />,
    };
  }
  return {
    label: action,
    colorClass: 'bg-stone-100 text-stone-700 border-stone-200',
    icon: <Activity className="w-3 h-3" />,
  };
}

