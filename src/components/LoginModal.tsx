'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Lock, User, Feather, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MathCaptcha } from './MathCaptcha';

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setErrorMsg('获取验证码失败，请检查网络');
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    if (isLoginModalOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      try {
        const lastUser = localStorage.getItem('review_last_username');
        if (lastUser) {
          setUsername(lastUser);
        } else if (!username) {
          setUsername('admin');
        }
      } catch {
        if (!username) setUsername('admin');
      }
      fetchCaptcha();
    }
  }, [isLoginModalOpen, fetchCaptcha]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('请输入用户名');
      return;
    }
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }
    if (!captchaAnswer.trim() || !captchaData?.key) {
      setErrorMsg('请输入验证码计算结果');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await login(username.trim(), password, captchaAnswer.trim(), captchaData.key);
      if (res.success) {
        try {
          localStorage.setItem('review_last_username', username.trim());
        } catch {}
        setSuccessMsg('登录成功！已解锁作者编辑权限');
      } else {
        setErrorMsg(res.message || '登录失败');
        fetchCaptcha(); // Refresh captcha on failure
      }
    } catch (e: any) {
      setErrorMsg(e.message || '登录异常');
      fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                作者 / 编辑登录
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                登录后可解锁文稿修订、删改段落与章节管理
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              账号 / 用户名
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="默认 admin 或自定义账号"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                管理密码
              </label>
              <span className="text-[11px] text-stone-400">若未修改默认: 123456</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入作者管理密码"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Dynamic Math Captcha */}
          <MathCaptcha
            question={captchaData?.question || ''}
            svg={captchaData?.svg}
            value={captchaAnswer}
            onChange={setCaptchaAnswer}
            onRefresh={fetchCaptcha}
            isLoading={isLoadingCaptcha}
            placeholder="输入算术结果"
          />

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeLoginModal}
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
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>验证中...</span>
                </>
              ) : (
                <span>验证并登录</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
