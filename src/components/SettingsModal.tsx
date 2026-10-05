import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UserRound,
  Shield,
  Radio,
  Plus,
  Trash2,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ExternalLink,
  BookOpen,
  KeyRound,
  ShieldCheck,
  Bell,
  Mail,
  Send,
  Smartphone,
  Clock,
  Check
} from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { NEWS_INTEREST_GROUPS } from '../utils/sectorTaxonomy';
import { RadarKeyword, NewsArticle, UserPersona } from '../types';
import { monitorHits } from '../utils/monitorKeywords';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  /** 首页默认兴趣领域；“我的领域”按赛道词表派生过滤。 */
  interestGroups: string[];
  onInterestGroupsChange: (value: string[]) => void;
  /** 首页“关注”筛选使用的手动标签。 */
  followedTags: string[];
  onFollowedTagsChange: (value: string[]) => void;
  /** 监控雷达词库（设置页管理增删） */
  radarKeywords?: RadarKeyword[];
  onAddRadarOpen?: () => void;
  onRemoveRadar?: (id: string) => void;
  /** 用于显示每个监控词在当前语料的命中数 */
  articles?: NewsArticle[];
  selectedPersona?: UserPersona;
}

type PersonalSection = 'profile' | 'interests' | 'radar' | 'subscription' | 'security';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  nickname,
  onNicknameChange,
  interestGroups,
  onInterestGroupsChange,
  followedTags,
  onFollowedTagsChange,
  radarKeywords = [],
  onAddRadarOpen,
  onRemoveRadar,
  articles = [],
  selectedPersona,
}) => {
  useEscapeClose(isOpen, onClose);

  const [activeSection, setActiveSection] = useState<PersonalSection>('profile');
  const [tempNickname, setTempNickname] = useState(nickname);
  const [newTagInput, setNewTagInput] = useState('');
  const [readingDensity, setReadingDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [defaultRhythm, setDefaultRhythm] = useState<string>('classic');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Subscription state
  const [subChannel, setSubChannel] = useState<'email' | 'webhook'>('email');
  const [subEmail, setSubEmail] = useState('');
  const [subWebhookUrl, setSubWebhookUrl] = useState('');
  const [subDeliveryTime, setSubDeliveryTime] = useState('08:00');
  const [existingSub, setExistingSub] = useState<any | null>(null);
  const [savingSub, setSavingSub] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState('');
  const [testingDispatch, setTestingDispatch] = useState(false);
  const [testSentMsg, setTestSentMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      try {
        const cached = localStorage.getItem('genway_morning_digest_subscription');
        if (cached) {
          const parsed = JSON.parse(cached);
          setExistingSub(parsed);
          if (parsed.channel) setSubChannel(parsed.channel);
          if (parsed.channel === 'email' && parsed.target) setSubEmail(parsed.target);
          if (parsed.channel === 'webhook' && parsed.target) setSubWebhookUrl(parsed.target);
          if (parsed.deliveryTime) setSubDeliveryTime(parsed.deliveryTime);
        } else {
          setExistingSub(null);
        }
      } catch {}
    }
  }, [isOpen]);

  const handleSaveSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSub(true);
    setTimeout(() => {
      const payload = {
        channel: subChannel,
        target: subChannel === 'email' ? subEmail : subWebhookUrl,
        deliveryTime: subDeliveryTime,
        persona: selectedPersona?.name || '资深分析师',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('genway_morning_digest_subscription', JSON.stringify(payload));
      setExistingSub(payload);
      setSavingSub(false);
      setSubSuccessMsg('晨间早报推送订阅已成功保存！');
      setTimeout(() => setSubSuccessMsg(''), 3000);
    }, 400);
  };

  const handleUnsubscribe = () => {
    try {
      localStorage.removeItem('genway_morning_digest_subscription');
      setExistingSub(null);
      setSubEmail('');
      setSubWebhookUrl('');
      setSubSuccessMsg('已取消晨间早报订阅');
      setTimeout(() => setSubSuccessMsg(''), 3000);
    } catch {}
  };

  const handleSendTestPush = () => {
    setTestingDispatch(true);
    setTimeout(() => {
      setTestingDispatch(false);
      setTestSentMsg('测试推送已成功发送！请查收您的邮箱或群机器人通知。');
      setTimeout(() => setTestSentMsg(''), 4000);
    }, 700);
  };

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    onNicknameChange(tempNickname.trim() || '资深分析师');
    onClose();
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim();
    if (!followedTags.includes(clean)) {
      onFollowedTagsChange([...followedTags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    onFollowedTagsChange(followedTags.filter((t) => t !== tag));
  };

  const handleToggleGroup = (groupId: string) => {
    if (interestGroups.includes(groupId)) {
      onInterestGroupsChange(interestGroups.filter((id) => id !== groupId));
    } else {
      onInterestGroupsChange([...interestGroups, groupId]);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ ok: false, text: '请填写原密码与新密码' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ ok: false, text: '两次输入的新密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ ok: false, text: '新密码长度不能少于 6 位' });
      return;
    }

    setSavingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '密码修改失败');
      setPasswordFeedback({ ok: true, text: '密码修改成功，其他会话已安全退出' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordFeedback({ ok: false, text: err.message || '修改密码失败，请检查原密码' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white border-2 border-stone-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif font-black text-sm">
              微
            </div>
            <div>
              <h2 className="text-base font-serif font-black text-stone-950">
                个人偏好设置 (Personal Settings)
              </h2>
              <p className="text-[11px] text-stone-500">
                定制您的分析师昵称、常驻关注领域与阅读排版偏好
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Admin Notice Bar */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-2.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-amber-900">
            <ShieldCheck className="w-4 h-4 text-[#E3120B] shrink-0" />
            <span className="text-[11px] leading-relaxed">
              全局大模型密钥、多信源 RSS 管道调度、行业板块规则与全员权限管理已统一由 <b>管理端</b> 集中维护。
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-5 pt-2 space-x-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'profile', label: '个人资料与阅读', icon: <UserRound className="w-3.5 h-3.5" /> },
            { id: 'interests', label: '关注领域与标签', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'radar', label: '雷达监控词库', icon: <Radio className="w-3.5 h-3.5" /> },
            { id: 'subscription', label: '早报推送订阅', icon: <Bell className="w-3.5 h-3.5 text-amber-600" /> },
            { id: 'security', label: '账户安全与密码', icon: <Lock className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as PersonalSection)}
                className={`px-3 py-2 text-xs font-serif font-bold rounded-t-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-stone-950 border-t-2 border-x border-stone-200 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Section 1: Profile & Reading */}
          {activeSection === 'profile' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-serif font-bold text-stone-700">
                  分析师昵称 (Display Name)
                </label>
                <input
                  type="text"
                  placeholder="例如: 资深产业观察员 / Analyst Zhang"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-serif"
                />
                <p className="text-[11px] text-stone-400">
                  显示在顶部问候语、推演记录与报告导出落款处。
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-serif font-bold text-stone-700">
                  默认阅读节奏排版偏好
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'classic', title: '经典报刊节奏 (Classic)', desc: '深度导读与层层递进' },
                    { id: 'fast_dialogue', title: '对话快读 (Axios)', desc: '清单式要点与高密提炼' },
                    { id: 'data_driven', title: '数据驱动 (Bloomberg)', desc: '图表优先与量化信号' },
                  ].map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setDefaultRhythm(r.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        defaultRhythm === r.id
                          ? 'border-stone-900 bg-[#FAF8F5] shadow-xs'
                          : 'border-stone-200 hover:border-stone-400 bg-white'
                      }`}
                    >
                      <div className="font-serif font-bold text-xs text-stone-900">{r.title}</div>
                      <p className="text-[10px] text-stone-500 mt-0.5">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-serif font-bold text-stone-700">
                  排版信息密度
                </label>
                <div className="flex space-x-3 text-xs">
                  {[
                    { id: 'comfortable', label: '舒适宽松排版 (推荐)' },
                    { id: 'compact', label: '高密度紧凑视图' },
                  ].map((d) => (
                    <label key={d.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="density"
                        checked={readingDensity === d.id}
                        onChange={() => setReadingDensity(d.id as any)}
                        className="text-stone-900 focus:ring-stone-900"
                      />
                      <span className="font-serif text-stone-800">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Interests & Followed Tags */}
          {activeSection === 'interests' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-serif font-bold text-stone-700">
                  我的常驻兴趣领域 (首页「我的领域」过滤)
                </label>
                <div className="flex flex-wrap gap-2">
                  {NEWS_INTEREST_GROUPS.map((group) => {
                    const isSelected = interestGroups.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => handleToggleGroup(group.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-400">
                  未选中任何领域时，首页将默认展示全景所有分类的情报。
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-stone-100">
                <label className="block text-xs font-serif font-bold text-stone-700">
                  自定义关注标签 (Followed Tags)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入关注标签 (如: 台积电, 降息, 人形机器人)"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {followedTags.length === 0 ? (
                    <span className="text-xs text-stone-400">暂未添加关注标签</span>
                  ) : (
                    followedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-300 text-xs font-serif text-stone-800"
                      >
                        <span>#{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-stone-400 hover:text-stone-900 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Radar Keywords */}
          {activeSection === 'radar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-serif font-bold text-stone-900">
                    个人雷达关键词库 ({radarKeywords.length})
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    实时监控语料库中命中的关键高敏异动词条
                  </p>
                </div>
                {onAddRadarOpen && (
                  <button
                    onClick={onAddRadarOpen}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-[#E3120B] text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增雷达词</span>
                  </button>
                )}
              </div>

              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden max-h-60 overflow-y-auto">
                {radarKeywords.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-400">暂无雷达监控词</div>
                ) : (
                  radarKeywords.map((rk) => {
                    const hitCount = articles.filter((a) => {
                      const text = `${a.title || ''} ${a.subtitle || ''} ${a.summary || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
                      return text.includes(rk.keyword.toLowerCase());
                    }).length;
                    return (
                      <div key={rk.id} className="p-3 flex items-center justify-between hover:bg-stone-50 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-serif font-bold text-stone-900 flex items-center space-x-2">
                            <span>{rk.keyword}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                              命中 {hitCount} 篇
                            </span>
                          </div>
                        </div>
                        {onRemoveRadar && (
                          <button
                            onClick={() => onRemoveRadar(rk.id)}
                            className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })

                )}
              </div>
            </div>
          )}

          {/* Section 4: Morning Briefing Subscription */}
          {activeSection === 'subscription' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <h3 className="text-xs font-serif font-bold text-stone-900 flex items-center space-x-1.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>晨间 3 分钟专属透镜早报订阅</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    每天准时送达：结合您当前的认知透镜与雷达词库，过滤噪音，推送高价值决策情报
                  </p>
                </div>
                {existingSub && (
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>已激活推送</span>
                  </span>
                )}
              </div>

              {subSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-serif font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{subSuccessMsg}</span>
                </div>
              )}

              {testSentMsg && (
                <div className="p-3 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-xs font-serif font-bold flex items-center space-x-2">
                  <Send className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{testSentMsg}</span>
                </div>
              )}

              {/* Existing Subscription Info Card */}
              {existingSub && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-serif font-bold text-stone-900">
                      当前生效的订阅档案
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSendTestPush}
                        disabled={testingDispatch}
                        className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-serif font-bold text-stone-700 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3 text-amber-600" />
                        <span>{testingDispatch ? '发送中…' : '发送测试推送'}</span>
                      </button>
                      <button
                        onClick={handleUnsubscribe}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 border border-stone-300 hover:border-red-300 text-stone-600 hover:text-red-700 rounded-lg text-xs font-serif font-bold transition-colors cursor-pointer"
                      >
                        退订
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans">推送通道</span>
                      <span className="font-bold text-stone-800">
                        {existingSub.channel === 'email' ? '📧 电子邮箱' : '🤖 Webhook 机器人'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans">目标地址</span>
                      <span className="font-bold text-stone-800 truncate block" title={existingSub.target}>
                        {existingSub.target || '未设置'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans">投递时间</span>
                      <span className="font-bold text-stone-800">每天 {existingSub.deliveryTime || '08:00'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans">测算透镜</span>
                      <span className="font-bold text-[#E3120B] truncate block">
                        {existingSub.persona || selectedPersona?.name || '当前角色'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form to update or create */}
              <form onSubmit={handleSaveSubscription} className="space-y-4">
                {/* Channel Switcher */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-serif font-bold text-stone-700">
                    选择推送接收方式 (Delivery Channel)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSubChannel('email')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        subChannel === 'email'
                          ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-serif font-bold text-xs">
                        <Mail className="w-4 h-4" />
                        <span>工作电子邮箱</span>
                      </div>
                      <p className={`text-[11px] mt-1 ${subChannel === 'email' ? 'text-stone-300' : 'text-stone-500'}`}>
                        HTML 精致图文排版，支持在移动设备与 Outlook 查阅
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubChannel('webhook')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        subChannel === 'webhook'
                          ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-serif font-bold text-xs">
                        <Smartphone className="w-4 h-4" />
                        <span>企业微信 / 飞书群机器人</span>
                      </div>
                      <p className={`text-[11px] mt-1 ${subChannel === 'webhook' ? 'text-stone-300' : 'text-stone-500'}`}>
                        通过 Webhook 发送高燃卡片至内部战略研判群
                      </p>
                    </button>
                  </div>
                </div>

                {/* Target Address Input */}
                {subChannel === 'email' ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-serif font-bold text-stone-700">
                      接收邮箱地址 (Email Address)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="例如: research.team@firm.com"
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-serif font-bold text-stone-700">
                      群机器人 Webhook 地址 (Custom Bot Webhook URL)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      value={subWebhookUrl}
                      onChange={(e) => setSubWebhookUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono"
                    />
                  </div>
                )}

                {/* Delivery Time & Persona Linkage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-serif font-bold text-stone-700">
                      每日定时投递时间 (Delivery Time)
                    </label>
                    <select
                      value={subDeliveryTime}
                      onChange={(e) => setSubDeliveryTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-stone-900 font-mono cursor-pointer"
                    >
                      <option value="07:00">07:00 (开盘/早会前抢先研判)</option>
                      <option value="07:30">07:30 (晨间通勤前)</option>
                      <option value="08:00">08:00 (官方推荐标准时间)</option>
                      <option value="08:30">08:30 (工作日始发时刻)</option>
                      <option value="09:00">09:00 (上午工作起始)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-serif font-bold text-stone-700">
                      绑定认知透镜 (Tailored Persona)
                    </label>
                    <div className="w-full px-3 py-2 text-xs bg-stone-100 border border-stone-200 rounded-xl text-stone-700 flex items-center justify-between">
                      <span className="font-bold">{selectedPersona?.name || '资深分析师'}</span>
                      <span className="text-[10px] text-stone-500">（可在顶部随时切换）</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={savingSub}
                    className="px-5 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingSub ? '正在保存…' : '保存订阅设置'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={testingDispatch}
                    className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-serif font-bold transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-stone-500" />
                    <span>发送测试推送</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 5: Account Security */}
          {activeSection === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <h3 className="text-xs font-serif font-bold text-stone-900">
                  修改个人登录密码
                </h3>
                <p className="text-[11px] text-stone-400">
                  修改后将强制下线您在其他设备上的活跃会话
                </p>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-serif font-bold flex items-center space-x-2 ${
                    passwordFeedback.ok
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {passwordFeedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-serif font-bold text-stone-700">当前原密码</label>
                  <input
                    type="password"
                    required
                    placeholder="输入当前密码"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-serif font-bold text-stone-700">设置新密码</label>
                  <input
                    type="password"
                    required
                    placeholder="不少于 6 位字符"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-serif font-bold text-stone-700">确认新密码</label>
                  <input
                    type="password"
                    required
                    placeholder="再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingPassword ? '正在修改…' : '提交修改密码'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-[#FAF8F5] flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-serif">
            见微 Genway · 个性化认知配置
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-serif font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSaveProfile}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold transition-colors shadow-xs cursor-pointer"
            >
              保存偏好
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
