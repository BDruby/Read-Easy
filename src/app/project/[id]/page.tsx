'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Menu,
  ChevronLeft,
  Settings,
  Download,
  Share2,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Upload,
  FolderPlus,
  FileDown,
  Copy,
  Check,
  Loader2,
  Edit2
} from 'lucide-react';
import { SidebarChapters, ChapterSummary } from '@/components/SidebarChapters';
import { ReaderView, AnnotationItem } from '@/components/ReaderView';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ImportModal } from '@/components/ImportModal';
import { EditProjectModal } from '@/components/EditProjectModal';
import { splitParagraphs } from '@/lib/parser';
import { copyToClipboard } from '@/lib/clipboard';

export default function ProjectReviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [projectTitle, setProjectTitle] = useState('');
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [currentChapterData, setCurrentChapterData] = useState<{
    id: string;
    title: string;
    content: string;
    wordCount: number;
    annotations: AnnotationItem[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectInfo, setProjectInfo] = useState<{
    id: string;
    title: string;
    author: string | null;
    tags?: string | null;
    description?: string | null;
  } | null>(null);
  const [currentSpeakingIdx, setCurrentSpeakingIdx] = useState<number>(0);
  const [playTrigger, setPlayTrigger] = useState<number>(0);

  // Reading Record & Auto-location State
  const [hasResumedProgress, setHasResumedProgress] = useState(false);
  const pendingResumeParaIdxRef = useRef<number | null>(null);
  const autoPlayNextChapterRef = useRef<boolean>(false);

  // Fetch Project & Chapter List
  const loadProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProjectTitle(data.data.title);
        setProjectInfo({
          id: data.data.id,
          title: data.data.title,
          author: data.data.author,
          tags: data.data.tags,
          description: data.data.description,
        });
        const chapList = data.data.chapters || [];
        setChapters(chapList);

        // Check localStorage for saved reading progress
        if (chapList.length > 0 && !currentChapterId) {
          let targetChapId = chapList[0].id;
          let targetParaIdx = 0;
          try {
            const savedStr = localStorage.getItem(`review_progress_${projectId}`);
            if (savedStr) {
              const saved = JSON.parse(savedStr);
              if (saved.chapterId && chapList.some((c: any) => c.id === saved.chapterId)) {
                targetChapId = saved.chapterId;
                targetParaIdx = typeof saved.paragraphIdx === 'number' ? saved.paragraphIdx : 0;
              }
            }
          } catch {}

          pendingResumeParaIdxRef.current = targetParaIdx;
          setCurrentChapterId(targetChapId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentChapterId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Fetch Current Chapter Details & Annotations
  const loadChapter = useCallback(async (chapId: string) => {
    try {
      const res = await fetch(`/api/chapters/${chapId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentChapterData({
          id: data.data.id,
          title: data.data.title,
          content: data.data.content,
          wordCount: data.data.wordCount,
          annotations: data.data.annotations || [],
        });

        const resumeIdx = pendingResumeParaIdxRef.current;
        pendingResumeParaIdxRef.current = null; // consume it

        const startIdx = typeof resumeIdx === 'number' && resumeIdx > 0 ? resumeIdx : 0;
        setCurrentSpeakingIdx(startIdx);
        if (startIdx > 0) {
          setHasResumedProgress(true);
        } else {
          setHasResumedProgress(false);
        }

        // If continuous cross-chapter autoplay triggered
        if (autoPlayNextChapterRef.current) {
          autoPlayNextChapterRef.current = false;
          setPlayTrigger(Date.now());
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (currentChapterId) {
      loadChapter(currentChapterId);
    }
  }, [currentChapterId, loadChapter]);

  // Persist Reading Progress in localStorage
  useEffect(() => {
    if (!projectId || !currentChapterId || !currentChapterData) return;
    try {
      const record = {
        projectId,
        chapterId: currentChapterId,
        chapterTitle: currentChapterData.title,
        paragraphIdx: currentSpeakingIdx,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`review_progress_${projectId}`, JSON.stringify(record));

      // Also update global recent projects reading index
      const globalRecentStr = localStorage.getItem('review_recent_reading') || '{}';
      const globalRecent = JSON.parse(globalRecentStr);
      globalRecent[projectId] = record;
      localStorage.setItem('review_recent_reading', JSON.stringify(globalRecent));
    } catch {}
  }, [projectId, currentChapterId, currentSpeakingIdx, currentChapterData]);

  // Save Modified Content
  const handleSaveContent = async (newContent: string, newTitle?: string) => {
    if (!currentChapterId) return;
    try {
      const res = await fetch(`/api/chapters/${currentChapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          title: newTitle || currentChapterData?.title,
          status: '已修订',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentChapterData((prev) =>
          prev
            ? {
                ...prev,
                content: newContent,
                title: newTitle || prev.title,
                wordCount: data.data.wordCount,
              }
            : null
        );
        // Refresh chapter list summary
        setChapters((prev) =>
          prev.map((c) =>
            c.id === currentChapterId
              ? {
                  ...c,
                  title: newTitle || c.title,
                  wordCount: data.data.wordCount,
                  status: '已修订',
                }
              : c
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Annotation
  const handleAddAnnotation = async (anno: {
    paragraphIdx: number;
    startIndex: number;
    endIndex: number;
    selectedText: string;
    noteText: string;
    type: string;
    color: string;
  }) => {
    if (!currentChapterId) return;
    try {
      const res = await fetch(`/api/chapters/${currentChapterId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anno),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentChapterData((prev) =>
          prev
            ? {
                ...prev,
                annotations: [...prev.annotations, data.data],
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Annotation
  const handleDeleteAnnotation = async (annoId: string) => {
    try {
      const res = await fetch(`/api/chapters/${currentChapterId}/annotations?id=${annoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCurrentChapterData((prev) =>
          prev
            ? {
                ...prev,
                annotations: prev.annotations.filter((a) => a.id !== annoId),
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add New Chapter
  const handleAddChapter = async (title: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: '请在此输入本章正文内容...',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChapters((prev) => [...prev, data.data]);
        setCurrentChapterId(data.data.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Chapter
  const handleDeleteChapter = async (chapId: string) => {
    try {
      const res = await fetch(`/api/chapters/${chapId}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = chapters.filter((c) => c.id !== chapId);
        setChapters(remaining);
        if (remaining.length > 0) {
          setCurrentChapterId(remaining[0].id);
        } else {
          setCurrentChapterData(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isExportingFull, setIsExportingFull] = useState(false);
  const [isChapterCopied, setIsChapterCopied] = useState(false);

  // Export Clean TXT for current chapter
  const handleExportTxt = () => {
    if (!currentChapterData) return;
    const blob = new Blob([`${currentChapterData.title}\n\n${currentChapterData.content}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle}_${currentChapterData.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Full Novel TXT (All chapters)
  const handleExportFullBook = async () => {
    setIsExportingFull(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`);
      if (!res.ok) throw new Error('导出全书失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectTitle || '小说'}_全本完整稿.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('下载全书失败，请稍后重试');
    } finally {
      setIsExportingFull(false);
    }
  };

  // Copy current chapter text
  const handleCopyCurrentChapter = async () => {
    if (!currentChapterData) return;
    const text = `${currentChapterData.title}\n\n${currentChapterData.content}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setIsChapterCopied(true);
      setTimeout(() => setIsChapterCopied(false), 2000);
    }
  };

  // Chapter Navigation Helpers with stable useCallback references
  const currentChapterIdx = chapters.findIndex((c) => c.id === currentChapterId);
  const hasPrev = currentChapterIdx > 0;
  const hasNext = currentChapterIdx >= 0 && currentChapterIdx < chapters.length - 1;

  const handlePrevChapter = useCallback(() => {
    const idx = chapters.findIndex((c) => c.id === currentChapterId);
    if (idx > 0) {
      setCurrentChapterId(chapters[idx - 1].id);
    }
  }, [chapters, currentChapterId]);

  const handleNextChapter = useCallback((autoPlay: boolean = false) => {
    const idx = chapters.findIndex((c) => c.id === currentChapterId);
    if (idx >= 0 && idx < chapters.length - 1) {
      if (autoPlay) {
        autoPlayNextChapterRef.current = true;
      }
      setCurrentChapterId(chapters[idx + 1].id);
    }
  }, [chapters, currentChapterId]);

  const handleNextChapterAuto = useCallback(() => {
    handleNextChapter(true);
  }, [handleNextChapter]);

  const handleParagraphChange = useCallback((idx: number) => {
    setCurrentSpeakingIdx(idx);
  }, []);

  const handleResetToBeginning = () => {
    setCurrentSpeakingIdx(0);
    setHasResumedProgress(false);
  };

  const paragraphs = currentChapterData ? splitParagraphs(currentChapterData.content) : [];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border-b border-stone-200/80 dark:border-stone-800 px-4 h-14 flex items-center justify-between">
        {/* Left: Sidebar Toggle & Project Name */}
        <div className="flex items-center gap-2.5 truncate">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
            title="展开/收起章节目录"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <Link
            href="/"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center gap-1 text-xs"
            title="返回书架"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">书架</span>
          </Link>

          <span className="text-stone-300 dark:text-stone-700">/</span>

          <div
            onClick={() => setIsEditProjectOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer group/title transition"
            title="点击修改作品信息（书名、作者等）"
          >
            <h1 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 group-hover/title:text-amber-600 dark:group-hover/title:text-amber-400 transition truncate max-w-[120px] sm:max-w-[240px]">
              {projectTitle || '长篇小说审稿'}
            </h1>
            <Edit2 className="w-3 h-3 text-stone-400 opacity-60 group-hover/title:opacity-100 group-hover/title:text-amber-500 transition shrink-0" />
          </div>
        </div>

        {/* Right Tools: Import, Export & Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold transition"
            title="导入新文稿或追加章节"
          >
            <Upload className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">导入文章</span>
          </button>

          {/* Copy Current Chapter Button */}
          <button
            onClick={handleCopyCurrentChapter}
            disabled={!currentChapterData}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              isChapterCopied
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 border-transparent hover:bg-stone-200 text-stone-700 dark:text-stone-300'
            }`}
            title="一键复制本章标题与正文到剪贴板"
          >
            {isChapterCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>已复制本章</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden sm:inline">复制本章</span>
              </>
            )}
          </button>

          {/* Export Full Book TXT Button */}
          <button
            onClick={handleExportFullBook}
            disabled={isExportingFull || chapters.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
            title="下载全书所有章节完整 TXT 文稿"
          >
            {isExportingFull ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isExportingFull ? '打包中...' : '下载全书'}</span>
          </button>

          {/* Export Current Chapter TXT Button */}
          <button
            onClick={handleExportTxt}
            disabled={!currentChapterData}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
            title="仅导出当前章节为纯净 TXT"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">导出单章</span>
          </button>

          <Link
            href="/settings"
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="语音模型与存储设置"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex relative">
        {/* Left Chapter Drawer */}
        <SidebarChapters
          chapters={chapters}
          currentChapterId={currentChapterId}
          bookTitle={projectTitle}
          onSelectChapter={(id) => {
            setHasResumedProgress(false);
            setCurrentChapterId(id);
          }}
          onAddChapter={handleAddChapter}
          onDeleteChapter={handleDeleteChapter}
          onOpenImport={() => setIsImportModalOpen(true)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Center / Right Reader Area */}
        <div className="flex-1 min-w-0 transition-all duration-300 lg:pl-80">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-stone-400 text-xs gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>正在加载文稿与审阅批注...</span>
            </div>
          ) : !currentChapterData ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-stone-400 text-xs gap-2 p-6 text-center">
              <BookOpen className="w-12 h-12 text-stone-300 mb-2" />
              <p className="font-semibold text-sm text-stone-700 dark:text-stone-300">当前没有选中的章节</p>
              <p>请点击左上角菜单选择章节，或点击右上角「导入文章」批量导入文稿</p>
            </div>
          ) : (
            <ReaderView
              chapterId={currentChapterData.id}
              title={currentChapterData.title}
              content={currentChapterData.content}
              wordCount={currentChapterData.wordCount}
              annotations={currentChapterData.annotations}
              currentSpeakingIdx={currentSpeakingIdx}
              hasResumedProgress={hasResumedProgress}
              onResetToBeginning={handleResetToBeginning}
              onSelectParagraph={(idx) => {
                setHasResumedProgress(false);
                setCurrentSpeakingIdx(idx);
                setPlayTrigger(Date.now());
              }}
              onSaveContent={handleSaveContent}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onPrevChapter={() => handlePrevChapter()}
              onNextChapter={() => handleNextChapter(false)}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          )}
        </div>
      </div>

      {/* Batch Import Chapters Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetProjectId={projectId}
        targetProjectTitle={projectTitle}
        onSuccess={() => loadProject()}
      />

      {/* Edit Project Info Modal */}
      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={projectInfo}
        onClose={() => setIsEditProjectOpen(false)}
        onSuccess={(updated) => {
          setProjectTitle(updated.title);
          setProjectInfo((prev) => (prev ? { ...prev, ...updated } : null));
        }}
      />

      {/* Synchronized Audio Proofreader Player */}
      {currentChapterData && paragraphs.length > 0 && (
        <AudioPlayer
          paragraphs={paragraphs}
          currentParagraphIdx={currentSpeakingIdx}
          onParagraphChange={handleParagraphChange}
          chapterTitle={currentChapterData.title}
          bookTitle={projectTitle}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapterAuto}
          hasPrevChapter={hasPrev}
          hasNextChapter={hasNext}
          playTrigger={playTrigger}
        />
      )}
    </div>
  );
}
