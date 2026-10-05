import React from 'react';
import {
  ShieldCheck, Key, Users, Rss, FileText, RefreshCw, Plus, Trash2, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Sparkles, Server, Activity, UserPlus, Edit2, Database,
  HardDrive, Zap, Cpu, RotateCcw, Sliders, Radio, Download, Search, Check, X,
  ExternalLink, Clock, BarChart3, Calendar, LogIn, BookOpen, Crosshair, Lightbulb,
  TrendingUp, Filter, ChevronLeft, ChevronRight, UserCheck, Layers, HelpCircle, Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { SECTOR_TAXONOMY_DEFAULT } from '../../../utils/sectorTaxonomy';
import { AiCostPanel } from '../AiCostPanel';
import type { AdminTabScope } from './scope';

export function KeysTab({ s }: { s: AdminTabScope }) {
  const { aiChoice, deepseekBaseUrlInput, deepseekKeyInput, deepseekModelInput, geminiKeyInput, geminiModelInput, handleSaveSettings, handleTestAi, setAiChoice, setDeepseekBaseUrlInput, setDeepseekKeyInput, setDeepseekModelInput, setGeminiKeyInput, setGeminiModelInput, setShowDeepseekKey, setShowGeminiKey, settings, showDeepseekKey, showGeminiKey, status, testResult, testingAi } = s;
  return (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-serif font-black text-stone-950">
                全局大模型引擎与 API 密钥管理
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                密钥由服务端安全加密存储（AES-256-GCM），为全平台分析师提供高精度认知推演能力。
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-xl text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : 'text-emerald-600'}`} />
              <span>{testingAi ? '诊断测试中…' : '全局连通性诊断'}</span>
            </button>
          </div>

          <AiCostPanel usage={status?.aiUsage} />

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-serif font-bold flex items-center space-x-2 ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-stone-900">
              全局推理调度策略 (AI Provider Strategy)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'auto', title: '智能自动调度 (Auto)', desc: '优先使用 Gemini 2.5，不可用时平滑降级' },
                { id: 'gemini', title: '全量 Gemini 引擎', desc: 'Google Gemini 2.5 高精度多层拆解' },
                { id: 'deepseek', title: '全量 DeepSeek 引擎', desc: 'DeepSeek-V3 / R1 深度因果推演' },
              ].map((prov) => (
                <div
                  key={prov.id}
                  onClick={() => setAiChoice(prov.id as any)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    aiChoice === prov.id
                      ? 'border-stone-900 bg-[#FAF8F5] shadow-xs'
                      : 'border-stone-200 hover:border-stone-400 bg-white'
                  }`}
                >
                  <div className="font-serif font-bold text-xs text-stone-950 flex items-center justify-between">
                    <span>{prov.title}</span>
                    {aiChoice === prov.id && <Check className="w-3.5 h-3.5 text-[#E3120B]" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{prov.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keys Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Gemini */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <span>Google Gemini 凭证与模型</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                  {settings?.ai?.gemini ? '已配置密钥' : '未配置'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder={settings?.ai?.gemini ? '•••••••••••••••• (已保存)' : 'AIzaSy...'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">默认 Gemini 模型</label>
                <select
                  value={geminiModelInput}
                  onChange={(e) => setGeminiModelInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速 & 推荐)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (深度长文推理)</option>
                </select>
              </div>
            </div>

            {/* DeepSeek */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>DeepSeek / OpenAI 代理网关</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                  {settings?.ai?.deepseek ? '已配置密钥' : '未配置'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">DeepSeek API Key</label>
                <div className="relative">
                  <input
                    type={showDeepseekKey ? 'text' : 'password'}
                    placeholder={settings?.ai?.deepseek ? '•••••••••••••••• (已保存)' : 'sk-...'}
                    value={deepseekKeyInput}
                    onChange={(e) => setDeepseekKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showDeepseekKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-serif font-bold text-stone-700">网关 Base URL</label>
                <input
                  type="text"
                  value={deepseekBaseUrlInput}
                  onChange={(e) => setDeepseekBaseUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => handleSaveSettings()}
              className="px-6 py-2.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>保存 AI 密钥与服务配置</span>
            </button>
          </div>
        </div>
  );
}
