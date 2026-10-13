'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MathCaptcha } from './MathCaptcha';

export interface CommentItem {
  id: string;
  chapterId: string;
  paragraphIdx: number | null;
  nickname: string;
  content: string;
  type: string;
  isAuthor: boolean;
  createdAt: string;
}

interface ChapterCommentsProps {
  chapterId: string;
  chapterTitle: string;
  comments: CommentItem[];
  onRefreshComments: () => void;
}

export function ChapterComments({
  chapterId,
  chapterTitle,
  comments,
  onRefreshComments,
}: ChapterCommentsProps) {
  const { isLoggedIn, user, openLoginModal } = useAuth();

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setErrorMsg('获取验证码失败，请点击刷新');
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [chapterId, fetchCaptcha]);

  // Submit comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('请输入留言内容');
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
          paragraphIdx: null, // bottom comment
          type: 'general',
          content: content.trim(),
          nickname: nickname.trim() || (isLoggedIn ? '作者本人' : '热心书友'),
          captcha: captchaAnswer.trim(),
          captchaKey: captchaData.key,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setContent('');
        setSuccessMsg('留言发表成功！');
        setTimeout(() => setSuccessMsg(''), 3000);
        onRefreshComments();
        fetchCaptcha();
      } else {
        setErrorMsg(data.message || '发表失败');
        fetchCaptcha();
      }
    } catch (e: any) {
      setErrorMsg(e.message || '网络请求异常');
      fetchCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment (Author only)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条留言吗？')) return;

    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onRefreshComments();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (e: any) {
      alert(e.message || '删除请求失败');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter bottom comments (where paragraphIdx is null)
  const bottomComments = comments.filter((c) => c.paragraphIdx === null);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins} 分钟前`;
      if (diffHours < 24) return `${diffHours} 小时前`;
      if (diffDays < 7) return `${diffDays} 天前`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-stone-200/80 dark:border-stone-800 space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>本章读者留言与交流</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                {bottomComments.length} 条
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              游客免登录可自由留言；给段落挑错或提建议可点击段落序号旁边的“💡建议”
            </p>
          </div>
        </div>

        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="text-xs text-amber-600 hover:text-amber-700 underline flex items-center gap-1"
          >
            <span>作者登录</span>
          </button>
        )}
      </div>

      {/* Write Comment Form */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 space-y-3.5">
        <div className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
          <span>发表读后感或总体建议</span>
          <span className="text-stone-400">
            {isLoggedIn ? `当前身份: ${user?.displayName || '作者'}` : '当前身份: 游客 (无需登录)'}
          </span>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-2.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`写下您对《${chapterTitle}》的读后感受、剧情推测或整体改进建议...`}
            className="w-full p-3 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            {/* Nickname input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
                您的昵称 (选填)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={isLoggedIn ? '已登录: 作者本人' : '留空默认为“热心书友”'}
                disabled={isLoggedIn}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition disabled:opacity-75"
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
              placeholder="计算结果"
            />
          </div>

          <div className="flex justify-end pt-1">
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
                  <span>发表留言</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {bottomComments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs space-y-1.5">
            <MessageCircle className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
            <p>本章暂无下方留言</p>
            <p className="text-[11px] text-stone-400">
              欢迎作为第一位读者留下您的读后感或修改建议～
            </p>
          </div>
        ) : (
          bottomComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-2xl border transition ${
                comment.isAuthor
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
                  : 'bg-white dark:bg-stone-850/60 border-stone-200/70 dark:border-stone-800'
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      comment.isAuthor
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {comment.isAuthor ? '作' : comment.nickname.slice(0, 1)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                      {comment.nickname}
                    </span>
                    {comment.isAuthor && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium border border-amber-200 dark:border-amber-800">
                        <ShieldCheck className="w-3 h-3" />
                        作者
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(comment.createdAt)}
                  </span>
                  {/* Delete button (only visible to logged-in author) */}
                  {isLoggedIn && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-stone-400 hover:text-red-500 p-1 rounded-md transition"
                      title="删除该条留言 (作者权限)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed pl-9 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
