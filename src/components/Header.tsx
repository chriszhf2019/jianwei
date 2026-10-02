import React, { useState } from 'react';
import { 
  PrimaryNavTab, 
  UserPersona, 
  UserPersonaId 
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
  Bell,
  ShieldCheck
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
  onOpenNameModal: () => void;
  onOpenCognitiveModel?: () => void;
  onOpenSettings: () => void;
  onOpenSubscription?: () => void;
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
  onOpenSubscription,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const navItems: Array<{ id: PrimaryNavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'home', label: '首页', icon: <Compass className="w-4 h-4" /> },
    { id: 'intelligence', label: '情报中心', icon: <Flame className="w-4 h-4 text-[#E3120B]" />, badge: '今日' },
    { id: 'topics', label: '专题档案', icon: <Layers className="w-4 h-4" /> },
    { id: 'region', label: '地区情报', icon: <MapPin className="w-4 h-4 text-[#0284C7]" /> },
    { id: 'my_focus', label: '我的关注', icon: <Radio className="w-4 h-4 text-emerald-600" /> },
    { id: 'admin', label: '管理端', icon: <ShieldCheck className="w-4 h-4 text-purple-600" /> },
  ];


  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b-2 border-stone-900 transition-all font-sans">
      {/* Main navigation container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Slogan */}
          <div className="flex items-center space-x-3 lg:space-x-6 min-w-0">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center space-x-3 group text-left shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-stone-950 rounded-lg flex items-center justify-center text-white border-2 border-stone-800 shadow-xs group-hover:bg-[#E3120B] transition-colors shrink-0">
                <span className="font-serif font-black text-xl tracking-tight">微</span>
              </div>
              <div className="shrink-0">
                <div className="flex items-baseline space-x-1.5 whitespace-nowrap">
                  <span className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-950">
                    见微
                  </span>
                  <span className="hidden sm:inline text-xs sm:text-sm font-serif font-bold text-[#E3120B] tracking-wider">
                    Genway
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] text-stone-600 font-serif tracking-tight whitespace-nowrap">
                  于细微处 · 读懂新闻背后
                </p>
              </div>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center space-x-1 pl-4 border-l border-stone-300">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-serif font-bold flex items-center space-x-2 transition-all ${
                      isActive
                        ? 'bg-stone-900 text-stone-100 shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/70'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E3120B] text-white font-sans font-normal scale-90">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Morning Briefing Subscription */}
            {onOpenSubscription && (
              <button
                onClick={onOpenSubscription}
                className="p-2 sm:px-3 sm:py-2 text-stone-700 hover:text-stone-950 hover:bg-stone-200/80 rounded-lg border border-stone-300/80 bg-white/60 transition-colors flex items-center space-x-1.5"
                title="订阅晨间 3 分钟专属透镜（邮件或企微/飞书推送）"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline text-xs font-serif font-bold text-stone-700">早报订阅</span>
              </button>
            )}

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 sm:px-3 sm:py-2 text-stone-700 hover:text-stone-950 hover:bg-stone-200/80 rounded-lg border border-stone-300/80 bg-white/60 transition-colors"
              title="设置：用户档案 / AI 双通道 Key / 信源"
            >
              <SettingsIcon className="w-4 h-4 text-stone-600" />
            </button>

            {/* Global Search */}
            <button
              onClick={onOpenSearch}
              className="p-2 sm:px-3 sm:py-2 text-stone-700 hover:text-stone-950 hover:bg-stone-200/80 rounded-lg flex items-center space-x-1.5 transition-colors border border-stone-300/80 bg-white/60"
              title={FEATURE_SUMMARIES['global-search'].purpose}
            >
              <Search className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline text-xs font-medium text-stone-600">搜索</span>
              <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-300 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 flex items-center space-x-1.5 transition-colors"
                title={FEATURE_SUMMARIES.persona.purpose}
              >
                <UserCheck className="w-3.5 h-3.5 text-stone-700" />
                <span className="hidden sm:inline font-bold">{selectedPersona.name}</span>
                <span className="sm:hidden font-bold">{selectedPersona.name.slice(0, 3)}</span>
                <ChevronDown className="w-3 h-3 text-stone-500" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#FAF8F5] border-2 border-stone-900 rounded-xl shadow-xl p-2 z-50 font-sans">
                  <div className="text-[11px] font-serif font-bold text-stone-500 px-3 py-1.5 uppercase border-b border-stone-200 mb-1">
                    选择您的认知透镜（影响我）
                  </div>
                  {USER_PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPersona(p.id);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedPersona.id === p.id
                          ? 'bg-stone-900 text-white font-bold'
                          : 'hover:bg-stone-200/80 text-stone-800'
                      }`}
                    >
                      <div>
                        <div>{p.name}</div>
                        <div className={`text-[10px] line-clamp-1 ${
                          selectedPersona.id === p.id ? 'text-stone-300' : 'text-stone-500'
                        }`}>
                          {p.tagline}
                        </div>
                      </div>
                      {selectedPersona.id === p.id && (
                        <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">当前</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Custom News Analysis Button */}
            <button
              onClick={onOpenAnalyzeModal}
              title={FEATURE_SUMMARIES['ai-submit'].purpose}
              className="px-3.5 py-2 bg-[#E3120B] hover:bg-red-700 text-white text-xs font-bold font-serif rounded-lg shadow-sm flex items-center space-x-1.5 transition-all hover:shadow-md active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI 提交分析</span>
              <span className="sm:hidden">分析</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden grid grid-cols-6 border-t border-stone-300 py-1.5 bg-stone-100 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {

          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`min-w-0 flex flex-col items-center justify-center space-y-0.5 text-xs font-serif py-1 ${
                isActive ? 'text-[#E3120B] font-bold' : 'text-stone-600'
              }`}
            >
              {item.icon}
              <span className="text-[10px] truncate max-w-full px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
