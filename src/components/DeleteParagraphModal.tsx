'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteParagraphModalProps {
  isOpen: boolean;
  paragraphIndex: number | null;
  paragraphText: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteParagraphModal({
  isOpen,
  paragraphIndex,
  paragraphText,
  onClose,
  onConfirm,
}: DeleteParagraphModalProps) {
  // Support Esc key to cancel, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen || paragraphIndex === null) return null;

  const charCount = paragraphText.trim().length;
  const previewSnippet =
    paragraphText.length > 120
      ? paragraphText.slice(0, 120) + '...'
      : paragraphText || '(空段落)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>警告：确认删除该段落？</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                  第 #{paragraphIndex + 1} 段
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                本段共计 {charCount} 字，请仔细核对内容以防误删
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-stone-600 dark:text-stone-300">
            您即将删除以下段落文本：
          </div>

          {/* Snippet Blockquote */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-sm leading-relaxed max-h-48 overflow-y-auto italic font-serif">
            「{previewSnippet}」
          </div>

          <div className="text-xs text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl leading-relaxed">
            💡 <strong>提示：</strong>删除后该段落及其关联标记将从当前文稿中移除，后续段落序号会自动重新排定。保存文稿后将永久生效。
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-800/30 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-700 rounded-xl transition"
          >
            取消 (Esc)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-md shadow-red-500/20 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  );
}
