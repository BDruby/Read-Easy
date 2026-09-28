'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  FileText,
  Layers,
  ChevronRight,
  Upload,
  FolderPlus,
  Files,
  Copy,
  Check
} from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

export interface ChapterSummary {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string;
  wordCount: number;
  status: string; // 待审, 审阅中, 已修订, 已完成
  notesCount: number;
}

export interface SidebarChaptersProps {
  chapters: ChapterSummary[];
  currentChapterId: string;
  bookTitle: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: (title: string) => Promise<void>;
  onDeleteChapter: (id: string) => Promise<void>;
  onOpenImport?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarChapters({
  chapters,
  currentChapterId,
  bookTitle,
  onSelectChapter,
  onAddChapter,
  onDeleteChapter,
  onOpenImport,
  isOpen,
  onClose,
}: SidebarChaptersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copyingChapId, setCopyingChapId] = useState<string | null>(null);
  const [copiedChapId, setCopiedChapId] = useState<string | null>(null);

  const handleCopyChapter = async (e: React.MouseEvent, chap: ChapterSummary) => {
    e.stopPropagation();
    setCopyingChapId(chap.id);
    try {
      const res = await fetch(`/api/chapters/${chap.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const text = `${json.data.title}\n\n${json.data.content}`;
        const ok = await copyToClipboard(text);
        if (ok) {
          setCopiedChapId(chap.id);
          setTimeout(() => setCopiedChapId(null), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to copy chapter:', err);
    } finally {
      setCopyingChapId(null);
    }
  };

  const filtered = chapters.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsAdding(true);
    try {
      await onAddChapter(newTitle.trim());
      setNewTitle('');
      setShowAddInput(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, chap: ChapterSummary) => {
    e.stopPropagation();
    if (confirm(`确定要删除章节「${chap.title}」吗？删除后该章节的批注也将被移除。`)) {
      onDeleteChapter(chap.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已修订':
      case '已完成':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">已定稿</span>;
      case '审阅中':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">审阅中</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">待校阅</span>;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Chapter Sidebar / Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-80 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="truncate">
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">{bookTitle}</h2>
              <p className="text-[11px] text-stone-500">共 {chapters.length} 章节</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-3 space-y-2 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="搜索章节名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {!showAddInput ? (
              <button
                onClick={() => setShowAddInput(true)}
                className="flex-1 py-1.5 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center gap-1 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建章节</span>
              </button>
            ) : null}

            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center justify-center gap-1 transition"
                title="批量拖入或选择文件夹/文件导入到此书"
              >
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>导入文章</span>
              </button>
            )}
          </div>

          {showAddInput && (
            <form onSubmit={handleAdd} className="space-y-1.5 bg-white dark:bg-stone-800 p-2 rounded-xl border border-amber-500/50 shadow-sm">
              <input
                type="text"
                autoFocus
                placeholder={`第 ${chapters.length + 1} 章 标题...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-transparent border-b border-stone-200 dark:border-stone-700 focus:outline-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddInput(false)}
                  className="px-2 py-0.5 text-[11px] text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newTitle.trim()}
                  className="px-2.5 py-0.5 text-[11px] bg-amber-500 text-white rounded font-medium disabled:opacity-50"
                >
                  {isAdding ? '添加中...' : '确定'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-stone-400">
              {searchQuery ? '未找到匹配章节' : '暂无章节，请点击上方「导入文章」或「新建章节」'}
            </div>
          ) : (
            filtered.map((chap) => {
              const isSelected = chap.id === currentChapterId;
              return (
                <div
                  key={chap.id}
                  onClick={() => {
                    onSelectChapter(chap.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm font-medium'
                      : 'hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                    <span className="truncate">{chap.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                      {chap.wordCount > 0 ? `${chap.wordCount}字` : '0字'}
                    </span>
                    {!isSelected && getStatusBadge(chap.status)}

                    {/* Copy Chapter Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyChapter(e, chap)}
                      disabled={copyingChapId === chap.id}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                        copiedChapId === chap.id
                          ? '!opacity-100 bg-emerald-500 text-white shadow-xs'
                          : isSelected
                          ? 'hover:bg-amber-600 text-white/80 hover:text-white'
                          : 'hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                      }`}
                      title={copiedChapId === chap.id ? '已复制！' : '一键复制本章'}
                    >
                      {copiedChapId === chap.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete Chapter Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, chap)}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                        isSelected
                          ? 'hover:bg-amber-600 text-white/80 hover:text-white'
                          : 'hover:bg-red-50 dark:hover:bg-red-950/60 text-stone-400 hover:text-red-600'
                      }`}
                      title="删除此章节"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
