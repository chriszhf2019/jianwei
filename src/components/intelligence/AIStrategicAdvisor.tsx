import React, { useState } from 'react';
import { UserPersona, NewsArticle } from '../../types';
import { Bot, Send, Sparkles, UserCheck, MessageSquare, Quote, RefreshCw } from 'lucide-react';

interface AIStrategicAdvisorProps {
  selectedPersona: UserPersona;
  contextArticles: NewsArticle[];
}

export const AIStrategicAdvisor: React.FC<AIStrategicAdvisorProps> = ({
  selectedPersona,
  contextArticles,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [advisorResponse, setAdvisorResponse] = useState<{
    answer: string | null;
    /** 服务端标记：本次没有生成内容 */
    fallback?: boolean;
    error?: string;
    citations: string[];
  } | null>(null);

  // 极简行内富文本渲染：将 **加粗** 段落转换为 <strong>（避免直接输出字面星号）
  const renderRich = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
    );

  const presetQuestions = [
    `如果我是硬件与数据中心厂商，这次散热公差与电网变化对我意味着什么？`,
    `今天的大模型架构与推理成本逆转，是否会压制垂直场景的初创公司？`,
    `面对关税措辞微调与离岸美元波动，出海供应链该如何调整账期？`,
    `作为${selectedPersona.name}，今天哪一条情报最值得我立刻调整策略？`
  ];

  const handleAsk = async (qText: string) => {
    if (!qText.trim()) return;
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('/api/strategic-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: qText,
          userPersona: selectedPersona.name,
          contextArticles: contextArticles.map((a) => ({
            title: a.title,
            oneSentenceVerdict: a.oneSentenceVerdict,
            summary: a.summary,
            category: a.category,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error(`顾问接口返回异常状态：${res.status}`);
      }
      const data = await res.json();
      setAdvisorResponse({
        answer: data.answer || null,
        citations: data.citations || [],
        fallback: !!data.fallback,
      });
    } catch (e) {
      console.error(e);
      setAdvisorResponse({
        answer: null,
        error: '网络异常或服务超时，未生成内容。',
        citations: [],
        fallback: false,
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-stone-800 rounded-xl p-6 shadow-xs font-sans space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h3 className="text-base font-serif font-bold text-stone-950">
              基于今日新闻情报回答我 (AI Strategic Advisor)
            </h3>
            <p className="text-xs text-stone-500">
              基于当前运行时语料向顾问提问 · 供决策参考（非投资建议）
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-stone-700 bg-stone-100 px-3 py-1 rounded-lg border border-stone-300">
          <UserCheck className="w-3.5 h-3.5 text-[#E3120B]" />
          <span>当前透镜：<strong>{selectedPersona.name}</strong></span>
        </div>
      </div>

      {/* Preset Questions Chips */}
      <div className="space-y-2">
        <div className="text-xs font-serif font-bold text-stone-600">
          快速发起战略咨询：
        </div>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              disabled={loading}
              className="text-left text-xs px-3 py-1.5 bg-[#FAF8F5] hover:bg-stone-200 text-stone-800 rounded-lg border border-stone-300 hover:border-stone-800 transition-all"
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Question Input Box */}
      <div className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`例如：基于今天的关税与算力情报，${selectedPersona.name}接下来 3 个月最大的风险点是什么？`}
          rows={2}
          className="w-full p-3.5 pr-24 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-950 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 resize-none font-sans"
        />
        <button
          onClick={() => handleAsk(question)}
          disabled={loading || !question.trim()}
          className="absolute right-3 bottom-3 px-4 py-2 bg-stone-900 hover:bg-[#E3120B] disabled:opacity-40 text-white text-xs font-serif font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-xs"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>咨询推演</span>
        </button>
      </div>

      {/* Response Box */}
      {advisorResponse && (
        <div className="bg-[#FAF8F5] border-2 border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>见微战略顾问 · 深度逻辑推演报告</span>
          </div>

          <div className="text-sm font-serif text-stone-900 leading-relaxed whitespace-pre-line bg-white p-4 rounded-lg border border-stone-300">
            {advisorResponse.fallback && (
              <p className="mb-2 text-[11px] font-bold text-amber-700">
                未配置可用模型，本次没有生成顾问结论。
              </p>
            )}
            {advisorResponse.answer ? (
              renderRich(advisorResponse.answer)
            ) : (
              <p className="text-stone-500">
                {advisorResponse.error || '本次未生成内容。'}
              </p>
            )}
          </div>

          {/* Citations */}
          {advisorResponse.citations && advisorResponse.citations.length > 0 && (
            <div className="pt-2 border-t border-stone-200 text-xs text-stone-600">
              <div className="font-serif font-bold text-stone-900 mb-1 flex items-center space-x-1">
                <Quote className="w-3 h-3 text-stone-500" />
                <span>输入上下文中的报道标题（未逐条核验）：</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-stone-700">
                {advisorResponse.citations.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
