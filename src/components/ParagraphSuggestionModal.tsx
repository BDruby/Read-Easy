'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquarePlus, Lightbulb, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MathCaptcha } from './MathCaptcha';

interface ParagraphSuggestionModalProps {
  isOpen: boolean;
  chapterId: string;
  paragraphIndex: number | null;
  paragraphText: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParagraphSuggestionModal({
  isOpen,
  chapterId,
  paragraphIndex,
  paragraphText,
  onClose,
  onSuccess,
}: ParagraphSuggestionModalProps) {
  const { isLoggedIn, user } = useAuth();

  const [type, setType] = useState<'typo' | 'polish' | 'plot' | 'suggestion'>('suggestion');
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaData, setCaptchaData] = useState<{
    key: string;
    question: string;
    svg: string;
  } | null>(null);

  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch captcha
  const fetchCaptcha = useCallback(async () => {
    try {
      setIsLoadingCaptcha(true);
      setErrorMsg('');
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (data.success && data.data) {
        setCaptchaData(data.data);
        setCaptchaAnswer('');
      }
    } catch {
      setErrorMsg('获取验证码失败，请重试');
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setErrorMsg('');
      setSuccessMsg('');
      setNickname(isLoggedIn ? user?.displayName || user?.username || '作者本人' : '');
      fetchCaptcha();
    }
  }, [isOpen, isLoggedIn, user, fetchCaptcha]);

  if (!isOpen || paragraphIndex === null) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('请输入您对本段的建议内容');
      return;
    }
    if (!captchaAnswer.trim() || !captchaData?.key) {
      setErrorMsg('请输入验证码计算结果');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          paragraphIdx: paragraphIndex,
          type,
          content: content.trim(),
          nickname: nickname.trim() || (isLoggedIn ? '作者本人' : '热心书友'),
          captcha: captchaAnswer.trim(),
          captchaKey: captchaData.key,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('感谢您的宝贵建议！已成功提交');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.message || '提交失败');
        fetchCaptcha();
      }
    } catch (e: any) {
      setErrorMsg(e.message || '网络请求失败');
      fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { id: 'typo', label: '错字语病', color: 'text-red-600 border-red-200' },
    { id: 'polish', label: '词句润色', color: 'text-blue-600 border-blue-200' },
    { id: 'plot', label: '情节伏笔', color: 'text-purple-600 border-purple-200' },
    { id: 'suggestion', label: '读者建议', color: 'text-amber-600 border-amber-200' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>给段落写建议</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                  第 #{paragraphIndex + 1} 段
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                游客无需登录即可直接发表修改建议与读者反馈
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Snippet Preview */}
          <div className="text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 text-stone-600 dark:text-stone-300 line-clamp-2 italic font-serif">
            「{paragraphText}」
          </div>

          {/* Suggestion Category */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              建议类型
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {types.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={`py-1.5 text-xs font-medium rounded-xl border transition text-center ${
                    type === t.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              建议内容 / 修改理由
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：此处建议将“他毅然决然”改为“他转身离去”，节奏更紧凑..."
              className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Nickname (Optional) */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              读者昵称 (选填)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={isLoggedIn ? '已登录: 作者本人' : '留空默认为“热心书友”'}
              disabled={isLoggedIn}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition disabled:opacity-75"
            />
          </div>

          {/* Dynamic Math Captcha */}
          <MathCaptcha
            question={captchaData?.question || ''}
            svg={captchaData?.svg}
            value={captchaAnswer}
            onChange={setCaptchaAnswer}
            onRefresh={fetchCaptcha}
            isLoading={isLoadingCaptcha}
            placeholder="输入计算结果"
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>提交建议</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
