'use client';

import React from 'react';
import { RotateCw, HelpCircle } from 'lucide-react';

interface MathCaptchaProps {
  question: string;
  svg?: string;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  placeholder?: string;
  error?: string;
}

export function MathCaptcha({
  question,
  svg,
  value,
  onChange,
  onRefresh,
  isLoading = false,
  placeholder = '计算结果',
  error,
}: MathCaptchaProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
          <span>防刷人机验证码</span>
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 active:scale-95 transition disabled:opacity-50"
          title="换一道算术题"
        >
          <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>换一题</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Math Equation Visual Badge */}
        <div
          onClick={onRefresh}
          className="cursor-pointer select-none border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800/80 shadow-inner flex items-center justify-center w-36 shrink-0 h-10 group hover:border-amber-400 transition"
          title="点击换一题"
        >
          {svg ? (
            <div
              className="w-full h-full flex items-center justify-center pointer-events-none group-hover:opacity-90"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-sm tracking-wider">
              {question || '加载中...'}
            </span>
          )}
        </div>

        {/* Input Answer */}
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
        />
      </div>

      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  );
}
