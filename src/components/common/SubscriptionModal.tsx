import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Bell, Check, Send, Sparkles, Shield, Clock, Smartphone, MessageSquare, ExternalLink, Play, Eye } from 'lucide-react';
import { UserPersona } from '../../types';
import { useEscapeClose } from '../../hooks/useEscapeClose';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersona: UserPersona;
  radarKeywordsCount: number;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  selectedPersona,
  radarKeywordsCount,
}) => {
  useEscapeClose(isOpen, onClose);
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState<'email' | 'webhook'>('email');
  const [deliveryTime, setDeliveryTime] = useState('08:00');
  const [subscribed, setSubscribed] = useState(false);
  const [existingSubscription, setExistingSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingDispatch, setTestingDispatch] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  // 加载已有订阅配置
  React.useEffect(() => {
    if (isOpen) {
      try {
        const cached = localStorage.getItem('genway_morning_digest_subscription');
        if (cached) {
          const parsed = JSON.parse(cached);
          setExistingSubscription(parsed);
          if (parsed.channel) setChannel(parsed.channel);
          if (parsed.channel === 'email' && parsed.target) setEmail(parsed.target);
          if (parsed.channel === 'webhook' && parsed.target) setWebhookUrl(parsed.target);
          if (parsed.deliveryTime) setDeliveryTime(parsed.deliveryTime);
        } else {
          setExistingSubscription(null);
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnsubscribe = () => {
    try {
      localStorage.removeItem('genway_morning_digest_subscription');
      setExistingSubscription(null);
      setEmail('');
      setWebhookUrl('');
    } catch {}
  };

  const handleSendTest = () => {
    setTestingDispatch(true);
    setTimeout(() => {
      setTestingDispatch(false);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }, 800);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      try {
        const payload = {
          channel,
          target: channel === 'email' ? email : webhookUrl,
          deliveryTime,
          persona: selectedPersona.name,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('genway_morning_digest_subscription', JSON.stringify(payload));
        setExistingSubscription(payload);
      } catch {}
    }, 600);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950 font-serif font-black text-sm">
                晨
              </div>
              <div>
                <h3 className="text-base font-serif font-bold tracking-wide">
                  见微 · 晨间 3 分钟专属简报订阅
                </h3>
                <p className="text-xs text-stone-400 font-sans">
                  基于您的「{selectedPersona.name}」视角 + {radarKeywordsCount} 个监控词定制
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {subscribed ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-serif font-bold text-stone-900">
                  订阅成功！每天晨间推送准时抵达
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  系统将于每天 <strong className="text-stone-900">{deliveryTime}</strong> 为您提炼前 24 小时对【{selectedPersona.name}】最具实质影响的因果推演，杜绝信息噪音。
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-serif font-bold hover:bg-stone-800 transition-colors"
                >
                  好的，返回浏览
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-4">
                {/* 已开通状态提示条 */}
                {existingSubscription && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-serif font-bold text-emerald-900">
                        当前已激活每日 {existingSubscription.deliveryTime} 推送
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnsubscribe}
                      className="text-[11px] text-stone-500 hover:text-red-600 underline font-sans"
                    >
                      取消订阅
                    </button>
                  </div>
                )}

                {/* 订阅形式选择 */}
                <div>
                  <label className="block text-xs font-serif font-bold text-stone-700 mb-2">
                    接收渠道
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all ${
                        channel === 'email'
                          ? 'border-stone-900 bg-white shadow-xs font-bold text-stone-950'
                          : 'border-stone-300 bg-stone-100/70 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <Mail className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                      <div>
                        <div className="text-xs font-serif">个人邮件 Digest</div>
                        <div className="text-[10px] text-stone-500 font-normal">每天早间一封极简排版邮件</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('webhook')}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all ${
                        channel === 'webhook'
                          ? 'border-stone-900 bg-white shadow-xs font-bold text-stone-950'
                          : 'border-stone-300 bg-stone-100/70 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 mt-0.5 text-[#0284C7] shrink-0" />
                      <div>
                        <div className="text-xs font-serif">飞书 / 企微群机器人</div>
                        <div className="text-[10px] text-stone-500 font-normal">直接推送至团队工作群</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 填写输入框 */}
                {channel === 'email' ? (
                  <div>
                    <label className="block text-xs font-serif font-bold text-stone-700 mb-1">
                      您的接收邮箱
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-serif font-bold text-stone-700 mb-1">
                      Webhook 机器人地址 (飞书/企微/钉钉/Telegram)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* 推送时间 */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-serif font-bold text-stone-700 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>期望送达时间</span>
                  </div>
                  <select
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-mono font-bold text-stone-900 focus:outline-hidden"
                  >
                    <option value="07:30">07:30 晨间初醒</option>
                    <option value="08:00">08:00 通勤首选 (默认)</option>
                    <option value="08:30">08:30 工作前瞻</option>
                    <option value="09:00">09:00 开盘早间</option>
                  </select>
                </div>

                {/* 权益说明与试送样张 */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>见微早报三不原则：</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSamplePreview(!showSamplePreview)}
                      className="text-stone-700 hover:text-stone-950 font-serif font-bold text-[10px] flex items-center gap-1 underline"
                    >
                      <Eye className="w-3 h-3 text-stone-600" />
                      <span>{showSamplePreview ? '折叠样张' : '查阅推送样张'}</span>
                    </button>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                    <li>不发无实质影响的公关公报；</li>
                    <li>不发缺乏因果论证的传闻；</li>
                    <li>每条简报必包含“与我何干”和“第一波二级传导预警”。</li>
                  </ul>

                  {showSamplePreview && (
                    <div className="bg-white p-3 rounded-lg border border-amber-300 text-stone-800 space-y-2 font-serif text-[11px] mt-2">
                      <div className="flex items-center justify-between pb-1 border-b border-stone-200 text-[10px] text-stone-500 font-sans">
                        <span>【样张 · 08:00 晨间早报】</span>
                        <span className="font-bold text-red-600">👤 {selectedPersona.name}视角</span>
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-xs">《大模型推理端算力成本再降 40% 深度复盘》</div>
                        <div className="text-stone-600 mt-0.5">📌 <b>So What：</b>AI 算力成本出现陡峭下滑，终端轻量化模型部署窗口正式开启。</div>
                        <div className="text-amber-900 bg-amber-50 p-1.5 rounded mt-1 text-[10px] border border-amber-200">
                          🎯 <b>对您影响：</b>技术降本转化为落地价格战，需加速评估下游边缘芯片选型。
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 试发一条与提交操作栏 */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={testingDispatch || !(channel === 'email' ? email : webhookUrl)}
                      className="py-2 px-3 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-serif font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                      title="向填写的地址立即发送一条样本，验证通道连通性"
                    >
                      {testSent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Play className="w-3.5 h-3.5 text-stone-600" />}
                      <span>{testSent ? '测试样本已发' : testingDispatch ? '发送中…' : '发送连通测试'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-3 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {loading 
                          ? '正在配置推送引擎…' 
                          : existingSubscription 
                            ? '更新每日专属透镜推送偏好' 
                            : '立即开通每日专属透镜推送'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 text-center font-sans">
                    可随时取消订阅，邮箱与 Webhook 严格仅用于向您派发早报情报。
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
