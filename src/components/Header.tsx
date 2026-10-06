import React, { useState } from 'react';
import {
  PrimaryNavTab,
  UserPersona,
  UserPersonaId,
} from '../types';
import {
  Sparkles,
  Search,
  Radio,
  Layers,
  Compass,
  UserCheck,
  Flame,
  ChevronDown,
  Settings as SettingsIcon,
  MapPin,
  ShieldCheck,
  MoreHorizontal,
} from 'lucide-react';
import { USER_PERSONAS } from '../data/intelligenceData';
import { FEATURE_SUMMARIES } from '../utils/featureSummaries';

interface HeaderProps {
  activeTab: PrimaryNavTab;
  onSelectTab: (tab: PrimaryNavTab) => void;
  selectedPersona: UserPersona;
  onSelectPersona: (personaId: UserPersonaId) => void;
  onOpenSearch: () => void;
  onOpenAnalyzeModal: () => void;
  onOpenNameModal?: () => void;
  onOpenCognitiveModel?: () => void;
  onOpenSettings: () => void;
  onOpenAudioBriefing?: () => void;
  nickname?: string;
  optimistic?: number | null;
  negative?: number | null;
  sentimentScope?: 'today' | '30d';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  selectedPersona,
  onSelectPersona,
  onOpenSearch,
  onOpenAnalyzeModal,
  onOpenSettings,
  onOpenAudioBriefing,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems: Array<{
    id: PrimaryNavTab;
    label: string;
    shortLabel: string;
    renderIcon: (isActive: boolean) => React.ReactNode;
  }> = [
    {
      id: 'home',
      label: '首页',
      shortLabel: '首页',
      renderIcon: (isActive) => (
        <Compass className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-[#E3120B]'}`} />
      ),
    },
    {
      id: 'intelligence',
      label: '情报中心',
      shortLabel: '情报',
      renderIcon: (isActive) => (
        <Flame className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-red-500'}`} />
      ),
    },
    {
      id: 'topics',
      label: '专题档案',
      shortLabel: '专题',
      renderIcon: (isActive) => (
        <Layers className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-stone-700'}`} />
      ),
    },
    {
      id: 'region',
      label: '地区情报',
      shortLabel: '地区',
      renderIcon: (isActive) => (
        <MapPin className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-[#0284C7]'}`} />
      ),
    },
    {
      id: 'my_focus',
      label: '我的关注',
      shortLabel: '关注',
      renderIcon: (isActive) => (
        <Radio className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-emerald-600'}`} />
      ),
    },
    {
      id: 'admin',
      label: '管理端',
      shortLabel: '管理',
      renderIcon: (isActive) => (
        <ShieldCheck className={`w-4 h-4 ${isActive ? 'text-[#E3120B]' : 'text-purple-600'}`} />
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/98 backdrop-blur-md transition-all font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="relative flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center space-x-2 group text-left shrink-0 cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-stone-950 rounded-xl flex items-center justify-center text-white border-2 border-stone-800 shadow-xs group-hover:bg-[#E3120B] transition-colors shrink-0">
              <span className="font-serif font-black text-lg tracking-tight">微</span>
            </div>
            <div className="flex items-baseline space-x-1.5 whitespace-nowrap">
              <span className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-950">
                见微
              </span>
              <span className="hidden sm:inline text-sm font-serif font-bold text-[#E3120B] tracking-wider">
                Genway
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu((v) => !v);
                  setShowPersonaMenu(false);
                }}
                className="p-2 text-stone-700 hover:bg-stone-100 rounded-xl border border-stone-300 bg-white/80"
                title="更多"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[#FAF8F5] border-2 border-stone-900 rounded-xl shadow-xl p-1.5 z-50">
                  {onOpenAudioBriefing && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenAudioBriefing();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-serif font-bold hover:bg-stone-100"
                    >
                      晨间简报（浏览器朗读）
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenSearch();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-serif font-bold hover:bg-stone-100"
                  >
                    搜索 ⌘K
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-serif font-bold hover:bg-stone-100"
                  >
                    设置
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowPersonaMenu(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-serif font-bold hover:bg-stone-100"
                  >
                    认知透镜 · {selectedPersona.name}
                  </button>
                </div>
              )}
            </div>

            {onOpenAudioBriefing && (
              <button
                onClick={onOpenAudioBriefing}
                className="hidden sm:flex px-3 py-1.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-[#E3120B] font-serif font-bold text-sm items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
                title="打开今日晨间简报（浏览器朗读，非云端 AI 语音）"
              >
                <Radio className="w-3.5 h-3.5 text-[#E3120B] animate-pulse shrink-0" />
                <span className="whitespace-nowrap">晨间简报</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="hidden sm:inline-flex p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-xl border border-stone-300 bg-white/80 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="系统设置"
            >
              <SettingsIcon className="w-4 h-4 text-stone-700" />
            </button>

            <button
              onClick={onOpenSearch}
              className="hidden sm:inline-flex p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-xl border border-stone-300 bg-white/80 transition-colors shrink-0 cursor-pointer shadow-2xs"
              title="全局搜索 (⌘K)"
            >
              <Search className="w-4 h-4 text-stone-700" />
            </button>

            <div className="relative shrink-0 hidden sm:block">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl text-sm font-serif font-medium text-stone-900 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                title={FEATURE_SUMMARIES.persona.purpose}
              >
                <UserCheck className="w-4 h-4 text-stone-700 shrink-0" />
                <span className="font-bold whitespace-nowrap max-w-[9rem] truncate">
                  {selectedPersona.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#FAF8F5] border-2 border-stone-900 rounded-xl shadow-xl p-2 z-50 font-sans">
                  <div className="text-xs font-serif font-bold text-stone-500 px-3 py-1.5 uppercase border-b border-stone-200 mb-1">
                    选择您的认知透镜
                  </div>
                  {USER_PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPersona(p.id);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        selectedPersona.id === p.id
                          ? 'bg-stone-900 text-white font-bold'
                          : 'hover:bg-stone-200/80 text-stone-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div
                          className={`text-xs line-clamp-1 ${
                            selectedPersona.id === p.id ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {p.tagline}
                        </div>
                      </div>
                      {selectedPersona.id === p.id && (
                        <span className="text-[10px] bg-[#E3120B] text-white px-1.5 py-0.5 rounded font-mono">
                          当前
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showPersonaMenu && (
              <div className="sm:hidden absolute right-0 top-full mt-1 w-[min(18rem,calc(100vw-1.5rem))] bg-[#FAF8F5] border-2 border-stone-900 rounded-xl shadow-xl p-2 z-50 font-sans">
                <div className="text-xs font-serif font-bold text-stone-500 px-3 py-1.5 border-b border-stone-200 mb-1">
                  选择认知透镜
                </div>
                {USER_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPersona(p.id);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedPersona.id === p.id
                        ? 'bg-stone-900 text-white font-bold'
                        : 'hover:bg-stone-200/80 text-stone-800'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onOpenAnalyzeModal}
              title={FEATURE_SUMMARIES['ai-submit'].purpose}
              className="px-3 py-1.5 sm:px-3.5 bg-[#E3120B] hover:bg-red-700 text-white text-sm font-serif font-bold rounded-xl shadow-2xs flex items-center space-x-1.5 transition-all hover:shadow-xs active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">读懂新闻</span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200 border-b-2 border-stone-900 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-1 sm:px-6">
          <nav className="flex items-center justify-between sm:justify-around py-1 sm:py-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-6 rounded-lg transition-colors cursor-pointer group min-w-[48px] sm:min-w-[88px] ${
                    isActive ? 'text-[#E3120B]' : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  <span
                    className={`transition-transform group-hover:scale-110 mb-0.5 ${
                      isActive ? 'text-[#E3120B]' : ''
                    }`}
                  >
                    {item.renderIcon(isActive)}
                  </span>
                  <span
                    className={`text-xs font-serif tracking-tight whitespace-nowrap ${
                      isActive
                        ? 'font-black text-[#E3120B]'
                        : 'font-medium text-stone-700 group-hover:text-stone-950'
                    }`}
                  >
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
