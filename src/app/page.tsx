'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Layers,
  Clock,
  Headphones,
  UploadCloud,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  CheckCircle2,
  ArrowRight,
  Settings,
  Feather,
  Download,
  Loader2,
  Mic,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ImportModal } from '@/components/ImportModal';
import { EditProjectModal } from '@/components/EditProjectModal';
import { estimateReadingMinutes } from '@/lib/parser';
import { useAuth } from '@/lib/AuthContext';

export interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  wordCount: number;
  chapterCount: number;
  tags: string | null;
  status: string;
  type?: string | null;
  voiceCast?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { chapters: number };
}

export default function HomePage() {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [readingRecords, setReadingRecords] = useState<Record<string, { chapterTitle?: string; paragraphIdx: number; updatedAt: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [downloadingProjId, setDownloadingProjId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'novel' | 'audiobook'>('all');

  // Open edit modal
  const handleOpenEdit = (proj: ProjectItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      openLoginModal(() => {
        setEditingProject(proj);
        setIsEditModalOpen(true);
      });
      return;
    }
    setEditingProject(proj);
    setIsEditModalOpen(true);
  };

  // Handle edit success update in local state
  const handleEditSuccess = (updated: {
    id: string;
    title: string;
    author: string | null;
    tags: string | null;
    description: string | null;
  }) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              title: updated.title,
              author: updated.author,
              tags: updated.tags,
              description: updated.description,
            }
          : p
      )
    );
  };

  // Download entire book TXT
  const handleDownloadFullBook = async (projId: string, projTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingProjId(projId);
    try {
      const res = await fetch(`/api/projects/${projId}/export`);
      if (!res.ok) throw new Error('导出全书失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projTitle}_全本完整稿.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('下载全书失败，请稍后重试');
    } finally {
      setDownloadingProjId(null);
    }
  };

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // Load local reading records
    try {
      const recordsStr = localStorage.getItem('review_recent_reading');
      if (recordsStr) {
        setReadingRecords(JSON.parse(recordsStr));
      }
    } catch {}
  }, []);

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      openLoginModal(() => {
        handleDeleteProject(id, e);
      });
      return;
    }
    if (!confirm('确定要删除这部作品及所有章节和批注吗？')) return;

    try {
      setIsDeleting(id);
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(null);
    }
  };

  const novelCount = projects.filter((p) => p.type !== 'audiobook').length;
  const audiobookCount = projects.filter((p) => p.type === 'audiobook').length;

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.author && p.author.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (typeFilter === 'novel') return p.type !== 'audiobook';
    if (typeFilter === 'audiobook') return p.type === 'audiobook';
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      <Navbar onOpenImport={() => setIsImportOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Banner with Quick Stats & Writer Quote */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900 text-white p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-amber-100 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>作家专属 · 全端无缝审阅与有声配音工坊</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              专注字里行间，
              <br />
              随时随地审阅、配音与听稿。
            </h1>

            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
              电脑写稿、手机校阅。不仅支持长篇小说自然伴读，更全新提供<strong>「AI 有声工坊」</strong>：多角色台词分段配音、语气模版、单段MP3与全篇带轴字幕一键导出！
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-white text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-50 active:scale-95 shadow-lg shadow-black/20 flex items-center gap-2 transition"
              >
                <UploadCloud className="w-4 h-4 text-amber-600" />
                <span>新建作品 / 拖拽文件导入</span>
              </button>

              <Link
                href="/settings"
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/20 flex items-center gap-1.5 transition"
              >
                <Settings className="w-4 h-4" />
                <span>豆包语音与音色设置</span>
              </Link>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
            <Feather className="w-80 h-80 text-white" />
          </div>
        </div>

        {/* Project Bookshelf Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>我的作品书架</span>
              </h2>

              {/* Type Category Tabs */}
              <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800/80 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    typeFilter === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  全部 ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('novel')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    typeFilter === 'novel'
                      ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>文学审校 ({novelCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('audiobook')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    typeFilter === 'audiobook'
                      ? 'bg-white dark:bg-stone-900 text-purple-700 dark:text-purple-400 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-purple-500" />
                  <span>AI 有声工坊 ({audiobookCount})</span>
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="搜索作品名称或作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-3xl bg-stone-200/60 dark:bg-stone-900 animate-pulse border border-stone-200/40 dark:border-stone-800"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              onClick={() => setIsImportOpen(true)}
              className="border-2 border-dashed border-stone-300 dark:border-stone-800 rounded-3xl p-12 text-center hover:border-amber-400 bg-white/60 dark:bg-stone-900/60 cursor-pointer transition"
            >
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                {typeFilter === 'audiobook' ? (
                  <Mic className="w-7 h-7 text-purple-500" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {searchQuery
                  ? '未找到匹配作品'
                  : typeFilter === 'audiobook'
                  ? '暂无有声工坊项目，点击此处新建一个'
                  : '书架暂无文稿，点击此处新建或拖入文件'}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                支持 TXT 长篇小说自动切章、Word .docx、播客台词剧本文档
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((proj) => {
                const isAudiobook = proj.type === 'audiobook';

                return (
                  <Link
                    key={proj.id}
                    href={`/project/${proj.id}`}
                    className={`group relative bg-white dark:bg-stone-900 border rounded-3xl p-5 shadow-soft hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                      isAudiobook
                        ? 'border-purple-200/70 dark:border-purple-900/50 hover:border-purple-400 dark:hover:border-purple-500'
                        : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isAudiobook
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isAudiobook ? <Mic className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isAudiobook
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {isAudiobook ? '🎙️ AI 有声工坊' : proj.tags || '文学审校'}
                          </span>
                        </div>

                        {/* Action Buttons: Download & Edit & Delete */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => handleDownloadFullBook(proj.id, proj.title, e)}
                            disabled={downloadingProjId === proj.id}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            title="下载全本完整 TXT"
                          >
                            {downloadingProjId === proj.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit Project Info Button */}
                          <button
                            onClick={(e) => handleOpenEdit(proj, e)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            title="修改书名、作品类型和作者信息"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            disabled={isDeleting === proj.id}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="删除作品"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3
                          className={`font-bold text-base text-stone-900 dark:text-stone-100 transition truncate ${
                            isAudiobook
                              ? 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
                              : 'group-hover:text-amber-600 dark:group-hover:text-amber-400'
                          }`}
                        >
                          {proj.title}
                        </h3>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {isAudiobook ? '配音编排：' : '作者：'}
                          {proj.author || '作家本人'}
                        </p>

                        {/* Reading Progress Indicator Badge */}
                        {readingRecords[proj.id] && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium max-w-full">
                            <Headphones className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="truncate">
                              上次：{readingRecords[proj.id].chapterTitle || '当前章节'} · 第 {readingRecords[proj.id].paragraphIdx + 1} 段
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Stats Footer */}
                    <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-stone-400" />
                          <span>{proj.chapterCount || proj._count?.chapters || 0} 章</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{proj.wordCount.toLocaleString()} 字</span>
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform ${
                          isAudiobook
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <span>
                          {isAudiobook ? '进入配音工坊' : readingRecords[proj.id] ? '继续听读' : '进入审阅'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={(newId) => {
          window.location.href = `/project/${newId}`;
        }}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        project={editingProject}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
