'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Type,
  Maximize2,
  Minimize2,
  Edit3,
  Check,
  Highlighter,
  MessageSquarePlus,
  PlayCircle,
  Save,
  Clock,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Copy,
  X,
  Hash,
  CornerDownRight,
  Navigation
} from 'lucide-react';
import { splitParagraphs, estimateReadingMinutes, countWords } from '@/lib/parser';
import { copyToClipboard } from '@/lib/clipboard';

export type ReaderTheme = 'parchment' | 'bamboo' | 'night' | 'white' | 'amber';
export type FontFamily = 'serif' | 'kaiti' | 'sans';

export interface AnnotationItem {
  id: string;
  chapterId: string;
  paragraphIdx: number;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  noteText: string;
  type: string; // typo, comment, polish, plot
  color: string;
  resolved: boolean;
  createdAt: string;
}

export interface ReaderViewProps {
  chapterId: string;
  title: string;
  content: string;
  wordCount: number;
  annotations: AnnotationItem[];
  currentSpeakingIdx: number;
  onSelectParagraph: (idx: number) => void;
  onSaveContent: (newContent: string, newTitle?: string) => Promise<void>;
  onAddAnnotation: (annotation: {
    paragraphIdx: number;
    startIndex: number;
    endIndex: number;
    selectedText: string;
    noteText: string;
    type: string;
    color: string;
  }) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  hasResumedProgress?: boolean;
  onResetToBeginning?: () => void;
}

export function ReaderView({
  chapterId,
  title,
  content,
  wordCount,
  annotations,
  currentSpeakingIdx,
  onSelectParagraph,
  onSaveContent,
  onAddAnnotation,
  onDeleteAnnotation,
  onPrevChapter,
  onNextChapter,
  hasPrev = false,
  hasNext = false,
  hasResumedProgress = false,
  onResetToBeginning,
}: ReaderViewProps) {
  // Reader settings state with localStorage persistence
  const [theme, setTheme] = useState<ReaderTheme>('parchment');
  const [fontSize, setFontSize] = useState<number>(19); // 15 - 28 px
  const [lineHeight, setLineHeight] = useState<number>(1.85);
  const [fontFamily, setFontFamily] = useState<FontFamily>('serif');
  const [maxWidth, setMaxWidth] = useState<'narrow' | 'medium' | 'wide'>('medium');

  // Load persisted typography & theme preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('review_reader_theme') as ReaderTheme;
      if (savedTheme && ['parchment', 'bamboo', 'night', 'white', 'amber'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
      const savedFontSize = localStorage.getItem('review_reader_font_size');
      if (savedFontSize) {
        const sz = parseInt(savedFontSize, 10);
        if (!isNaN(sz) && sz >= 14 && sz <= 32) setFontSize(sz);
      }
      const savedLineHeight = localStorage.getItem('review_reader_line_height');
      if (savedLineHeight) {
        const lh = parseFloat(savedLineHeight);
        if (!isNaN(lh) && lh >= 1.4 && lh <= 2.8) setLineHeight(lh);
      }
      const savedFontFamily = localStorage.getItem('review_reader_font_family') as FontFamily;
      if (savedFontFamily && ['serif', 'kaiti', 'sans'].includes(savedFontFamily)) {
        setFontFamily(savedFontFamily);
      }
      const savedMaxWidth = localStorage.getItem('review_reader_max_width') as any;
      if (savedMaxWidth && ['narrow', 'medium', 'wide'].includes(savedMaxWidth)) {
        setMaxWidth(savedMaxWidth);
      }
    } catch {}
  }, []);

  const handleUpdateTheme = (t: ReaderTheme) => {
    setTheme(t);
    try { localStorage.setItem('review_reader_theme', t); } catch {}
  };

  const handleUpdateFontSize = (sz: number) => {
    setFontSize(sz);
    try { localStorage.setItem('review_reader_font_size', String(sz)); } catch {}
  };

  const handleUpdateLineHeight = (lh: number) => {
    setLineHeight(lh);
    try { localStorage.setItem('review_reader_line_height', String(lh)); } catch {}
  };

  const handleUpdateFontFamily = (f: FontFamily) => {
    setFontFamily(f);
    try { localStorage.setItem('review_reader_font_family', f); } catch {}
  };

  const handleUpdateMaxWidth = (w: 'narrow' | 'medium' | 'wide') => {
    setMaxWidth(w);
    try { localStorage.setItem('review_reader_max_width', w); } catch {}
  };

  // Quick Jump Modal state
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpTargetInput, setJumpTargetInput] = useState('');
  const [highlightedJumpIdx, setHighlightedJumpIdx] = useState<number | null>(null);

  // Textarea reference & last viewed paragraph anchor for seamless edit mode toggle
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastViewedParagraphIdxRef = useRef<number>(0);

  // Edit / Proofread Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Copy current chapter text
  const handleCopyChapter = async () => {
    const textToCopy = `${title}\n\n${content}`;
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Jump to specific paragraph (works in both Reading Mode and Edit Mode)
  const handleJumpToParagraph = (targetIdx: number, andPlay: boolean = false) => {
    if (targetIdx < 0 || targetIdx >= paragraphs.length) return;
    lastViewedParagraphIdxRef.current = targetIdx;
    setShowJumpModal(false);

    if (isEditMode) {
      // In edit mode: calculate character offset in editedContent, focus and scroll textarea
      if (textareaRef.current) {
        const lines = editedContent.split('\n');
        let charOffset = 0;
        let pCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().length > 0) {
            if (pCount === targetIdx) break;
            pCount++;
          }
          charOffset += lines[i].length + 1;
        }

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(charOffset, charOffset);

        const ratio = targetIdx / Math.max(1, paragraphs.length);
        const targetScroll = ratio * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
        textareaRef.current.scrollTop = targetScroll;
      }
    } else {
      // In reading mode: scroll element into view
      const el = paragraphRefs.current[targetIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedJumpIdx(targetIdx);
        setTimeout(() => setHighlightedJumpIdx(null), 2500);
      }
      if (andPlay) {
        onSelectParagraph(targetIdx);
      }
    }
  };

  // Enter Edit Mode while preserving exact paragraph location
  const handleEnterEditMode = (specificParaIdx?: number) => {
    const targetIdx =
      typeof specificParaIdx === 'number'
        ? specificParaIdx
        : currentSpeakingIdx >= 0
        ? currentSpeakingIdx
        : lastViewedParagraphIdxRef.current || 0;

    lastViewedParagraphIdxRef.current = targetIdx;
    setIsEditMode(true);

    setTimeout(() => {
      if (!textareaRef.current) return;
      const lines = editedContent.split('\n');
      let charOffset = 0;
      let pCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0) {
          if (pCount === targetIdx) break;
          pCount++;
        }
        charOffset += lines[i].length + 1;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charOffset, charOffset);

      const ratio = targetIdx / Math.max(1, paragraphs.length);
      const targetScroll = ratio * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
      textareaRef.current.scrollTop = targetScroll;
    }, 80);
  };

  // Exit Edit Mode without saving, restoring reader scroll position
  const handleCancelEdit = () => {
    setEditedTitle(title);
    setEditedContent(content);
    setIsEditMode(false);
    setTimeout(() => {
      paragraphRefs.current[lastViewedParagraphIdxRef.current]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
  };

  // Text selection popover for annotations
  const [selectedRange, setSelectedRange] = useState<{
    text: string;
    paragraphIdx: number;
    start: number;
    end: number;
    x: number;
    y: number;
  } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [annotationType, setAnnotationType] = useState<'typo' | 'comment' | 'polish' | 'plot'>('typo');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const paragraphs = splitParagraphs(content);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep edited content in sync when props change
  useEffect(() => {
    setEditedTitle(title);
    setEditedContent(content);
  }, [title, content]);

  // Auto-scroll to currently spoken paragraph smoothly
  useEffect(() => {
    if (currentSpeakingIdx >= 0 && paragraphRefs.current[currentSpeakingIdx]) {
      const el = paragraphRefs.current[currentSpeakingIdx];
      if (el) {
        const rect = el.getBoundingClientRect();
        const isOutOfView = rect.top < 80 || rect.bottom > window.innerHeight - 120;
        if (isOutOfView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentSpeakingIdx]);

  // Handle Text Selection in Reader
  const handleMouseUp = () => {
    if (isEditMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedRange(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      setSelectedRange(null);
      return;
    }

    // Determine which paragraph was selected
    const anchorNode = selection.anchorNode;
    let paragraphElement = anchorNode?.parentElement;
    while (paragraphElement && !paragraphElement.dataset.pindex) {
      paragraphElement = paragraphElement.parentElement;
    }

    const pIdx = paragraphElement?.dataset.pindex ? parseInt(paragraphElement.dataset.pindex, 10) : 0;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedRange({
      text: selectedText,
      paragraphIdx: pIdx,
      start: 0,
      end: selectedText.length,
      x: Math.max(10, rect.left + rect.width / 2 - 140),
      y: rect.top - 50 + window.scrollY,
    });
  };

  // Submit Annotation
  const handleCreateAnnotation = async () => {
    if (!selectedRange) return;
    try {
      await onAddAnnotation({
        paragraphIdx: selectedRange.paragraphIdx,
        startIndex: selectedRange.start,
        endIndex: selectedRange.end,
        selectedText: selectedRange.text,
        noteText: noteInput || (annotationType === 'typo' ? '疑似错别字或语病' : '审稿批注'),
        type: annotationType,
        color: annotationType === 'typo' ? 'red' : annotationType === 'polish' ? 'blue' : 'amber',
      });
      setSelectedRange(null);
      setNoteInput('');
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      console.error(e);
    }
  };

  // Save modified content and restore reader scroll position
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveContent(editedContent, editedTitle);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditMode(false);
      setTimeout(() => {
        paragraphRefs.current[lastViewedParagraphIdxRef.current]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 80);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Theme styling definitions
  const themeClassMap: Record<ReaderTheme, string> = {
    parchment: 'bg-[#F5F0E8] text-[#2C241B] border-[#E5DAC8]',
    bamboo: 'bg-[#EAF0E9] text-[#1E2E1A] border-[#CFDFC9]',
    night: 'bg-[#15171B] text-[#D4D7DE] border-[#262A35]',
    white: 'bg-[#FFFFFF] text-[#1F2937] border-[#E5E7EB]',
    amber: 'bg-[#F9F3E5] text-[#332616] border-[#E8DCC2]',
  };

  const themePaperClass: Record<ReaderTheme, string> = {
    parchment: 'bg-[#FCF9F3] text-[#2A231C] shadow-stone-300/40 border-[#E8DFC8]',
    bamboo: 'bg-[#F2F7F1] text-[#1B2918] shadow-emerald-900/10 border-[#D2E2CF]',
    night: 'bg-[#1C1F26] text-[#CDD2DC] shadow-black/40 border-[#2A303F]',
    white: 'bg-[#FFFFFF] text-[#111827] shadow-slate-200/60 border-slate-200',
    amber: 'bg-[#FEFAF0] text-[#2C2013] shadow-amber-900/10 border-[#EFE3C6]',
  };

  const fontFamilyStyle: Record<FontFamily, string> = {
    serif: '"Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif',
    kaiti: '"Kaiti SC", "STKaiti", "KaiTi", serif',
    sans: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Inter, sans-serif',
  };

  const maxWidthClass = {
    narrow: 'max-w-2xl',
    medium: 'max-w-3xl',
    wide: 'max-w-4xl',
  }[maxWidth];

  return (
    <div className={`min-h-screen ${themeClassMap[theme]} transition-colors duration-300 relative pb-36`}>
      {/* Sticky Top Floating Action Bar & Typography Settings Dock */}
      <div className="sticky top-14 z-30">
        <header className="backdrop-blur-md bg-white/80 dark:bg-stone-900/80 border-b border-stone-200/60 dark:border-stone-800/60 px-4 py-2.5 shadow-xs transition-colors">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            {/* Chapter navigation buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={onPrevChapter}
                disabled={!hasPrev}
                className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="上一章"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">上一章</span>
              </button>
              <button
                onClick={onNextChapter}
                disabled={!hasNext}
                className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="下一章"
              >
                <span className="hidden sm:inline">下一章</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Center Stats */}
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>{wordCount.toLocaleString()} 字</span>
              </span>
              <span className="hidden md:flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>约 {estimateReadingMinutes(wordCount)} 分钟</span>
              </span>
              {annotations.length > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
                  {annotations.length} 处批注
                </span>
              )}
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1.5">
              {/* One-Click Copy Chapter Button */}
              <button
                onClick={handleCopyChapter}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isCopied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
                title="一键复制本章标题与正文到剪贴板"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>已复制本章</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                    <span className="hidden sm:inline">复制本章</span>
                  </>
                )}
              </button>

              {/* Edit / Proofread Mode Switch */}
              <button
                onClick={() => {
                  if (isEditMode) {
                    handleSave();
                  } else {
                    handleEnterEditMode();
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isEditMode
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
                title={isEditMode ? '保存修改并返回' : '进入直接修稿模式 (自动定位当前段落)'}
              >
                {isEditMode ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? '保存中...' : '保存修订'}</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">直接修稿</span>
                  </>
                )}
              </button>

              {/* Quick Paragraph Jump Button (Sticky at top) */}
              <button
                onClick={() => {
                  setShowJumpModal(!showJumpModal);
                  setShowSettingsDrawer(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  showJumpModal
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
                title="快速跳转到某个段落编号 (如 #56)"
              >
                <Hash className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">跳至段落</span>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold sm:hidden">
                  #{currentSpeakingIdx + 1}
                </span>
              </button>

              {/* Typography / Theme Setting Button (Sticky at top) */}
              <button
                onClick={() => {
                  setShowSettingsDrawer(!showSettingsDrawer);
                  setShowJumpModal(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  showSettingsDrawer
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
                title="排版与主题设置 (吸附在顶部，滑动页面随时可调)"
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">排版设置</span>
              </button>
            </div>
          </div>
        </header>

        {/* Quick Jump Popover / Modal (Sticks at top under header) */}
        {showJumpModal && (
          <>
            {/* Click-away backdrop overlay */}
            <div
              className="fixed inset-0 z-30 bg-black/15 dark:bg-black/40 backdrop-blur-[0.5px]"
              onClick={() => setShowJumpModal(false)}
            />

            {/* Quick Jump Card anchored right below sticky header */}
            <div className="absolute top-full left-0 right-0 z-40 px-3 sm:px-4 pt-1.5 pointer-events-auto">
              <div className="max-w-md mx-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-2xl shadow-2xl p-4 text-stone-800 dark:text-stone-100 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                    <Hash className="w-4 h-4 text-amber-500" />
                    <span>快速跳转段落 (本章共 {paragraphs.length} 段)</span>
                  </div>
                  <button
                    onClick={() => setShowJumpModal(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                    title="关闭"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Input and Action Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = parseInt(jumpTargetInput, 10);
                    if (!isNaN(target) && target >= 1 && target <= paragraphs.length) {
                      handleJumpToParagraph(target - 1);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">#</span>
                    <input
                      type="number"
                      min={1}
                      max={paragraphs.length}
                      autoFocus
                      value={jumpTargetInput}
                      onChange={(e) => setJumpTargetInput(e.target.value)}
                      placeholder={`输入段落编号 1 ~ ${paragraphs.length}`}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition shrink-0"
                  >
                    跳转定位
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = parseInt(jumpTargetInput, 10);
                      if (!isNaN(target) && target >= 1 && target <= paragraphs.length) {
                        handleJumpToParagraph(target - 1, true);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition shrink-0 flex items-center gap-1"
                    title="跳转到此段并开始听稿"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>从此开读</span>
                  </button>
                </form>

                {/* Quick Position Preset Chips */}
                <div>
                  <div className="text-[11px] text-stone-400 mb-1.5 font-medium">快捷位置跳转:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '章首 #1', idx: 0 },
                      { label: `1/4处 #${Math.max(1, Math.round(paragraphs.length * 0.25))}`, idx: Math.max(0, Math.round(paragraphs.length * 0.25) - 1) },
                      { label: `正中间 #${Math.max(1, Math.round(paragraphs.length * 0.5))}`, idx: Math.max(0, Math.round(paragraphs.length * 0.5) - 1) },
                      { label: `3/4处 #${Math.max(1, Math.round(paragraphs.length * 0.75))}`, idx: Math.max(0, Math.round(paragraphs.length * 0.75) - 1) },
                      { label: `章末 #${paragraphs.length}`, idx: Math.max(0, paragraphs.length - 1) },
                      ...(currentSpeakingIdx >= 0 ? [{ label: `当前听读 #${currentSpeakingIdx + 1}`, idx: currentSpeakingIdx }] : []),
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleJumpToParagraph(chip.idx)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950 dark:hover:text-amber-300 text-stone-700 dark:text-stone-300 transition"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Floating Typography & Theme Setting Drawer Dropdown (Sticks at top under header) */}
        {showSettingsDrawer && (
          <>
            {/* Click-away backdrop overlay */}
            <div
              className="fixed inset-0 z-30 bg-black/15 dark:bg-black/40 backdrop-blur-[0.5px]"
              onClick={() => setShowSettingsDrawer(false)}
            />

            {/* Floating Settings Card anchored right below sticky header */}
            <div className="absolute top-full left-0 right-0 z-40 px-3 sm:px-4 pt-1.5 pointer-events-auto">
              <div className="max-w-2xl mx-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-2xl shadow-2xl p-4 sm:p-5 text-stone-800 dark:text-stone-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header with Title & Close Button */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                    <Type className="w-4 h-4 text-amber-500" />
                    <span>排版与主题设置 (吸附置顶 · 随时调节)</span>
                  </div>
                  <button
                    onClick={() => setShowSettingsDrawer(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                    title="关闭设置"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Theme Selectors */}
                <div>
                  <div className="text-xs font-medium text-stone-500 mb-2">阅读底色</div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'parchment', name: '宣纸', bg: 'bg-[#F5F0E8] border-[#DFD3BF] text-[#2C241B]' },
                      { id: 'bamboo', name: '护眼', bg: 'bg-[#EAF0E9] border-[#CFDFC9] text-[#1E2E1A]' },
                      { id: 'night', name: '夜玉', bg: 'bg-[#15171B] border-[#262A35] text-[#D4D7DE]' },
                      { id: 'white', name: '纯白', bg: 'bg-[#FFFFFF] border-stone-200 text-[#1F2937]' },
                      { id: 'amber', name: '暖玉', bg: 'bg-[#F9F3E5] border-[#E8DCC2] text-[#332616]' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleUpdateTheme(t.id as ReaderTheme)}
                        className={`py-2 px-1 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition ${t.bg} ${
                          theme === t.id ? 'ring-2 ring-amber-500 shadow-sm font-bold' : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family & Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Font Family */}
                  <div>
                    <div className="text-xs font-medium text-stone-500 mb-2">字体样式</div>
                    <div className="flex gap-2">
                      {[
                        { id: 'serif', name: '宋体 / 明体' },
                        { id: 'kaiti', name: '楷体 / 仿宋' },
                        { id: 'sans', name: '现代黑体' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleUpdateFontFamily(f.id as FontFamily)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs border transition ${
                            fontFamily === f.id
                              ? 'bg-amber-500 text-white border-amber-500 font-medium shadow-xs'
                              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size & Line Height */}
                  <div>
                    <div className="text-xs font-medium text-stone-500 mb-2">
                      字号大小: {fontSize}px · 行距: {lineHeight}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpdateFontSize(Math.max(15, fontSize - 1))}
                        className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center font-bold text-sm transition"
                        title="缩小字号"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min={15}
                        max={28}
                        value={fontSize}
                        onChange={(e) => handleUpdateFontSize(parseInt(e.target.value, 10))}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />
                      <button
                        onClick={() => handleUpdateFontSize(Math.min(28, fontSize + 1))}
                        className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center font-bold text-base transition"
                        title="放大字号"
                      >
                        A+
                      </button>
                    </div>
                  </div>
                </div>

                {/* Page Width & Line Height Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {/* Line Spacing Toggles */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 shrink-0">行距:</span>
                    <div className="flex gap-1.5">
                      {[
                        { label: '紧凑', val: 1.65 },
                        { label: '标准', val: 1.85 },
                        { label: '宽松', val: 2.15 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleUpdateLineHeight(item.val)}
                          className={`px-2 py-0.5 rounded text-xs transition ${
                            lineHeight === item.val
                              ? 'bg-amber-500 text-white font-medium'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Width */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 shrink-0">版心宽度:</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'narrow', name: '紧凑' },
                        { id: 'medium', name: '适中' },
                        { id: 'wide', name: '宽幅' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          onClick={() => handleUpdateMaxWidth(w.id as any)}
                          className={`px-2.5 py-1 rounded text-xs transition ${
                            maxWidth === w.id
                              ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Reader Content Canvas */}
      <main className={`mx-auto px-4 sm:px-6 pt-8 ${maxWidthClass}`}>
        {/* Paper Container */}
        <div
          className={`rounded-3xl border p-6 sm:p-12 shadow-reader transition-all ${themePaperClass[theme]}`}
          onMouseUp={handleMouseUp}
          style={{ fontFamily: fontFamilyStyle[fontFamily] }}
        >
          {/* Chapter Title */}
          {isEditMode ? (
            <div className="mb-8">
              <label className="block text-xs text-stone-400 mb-1">章节标题</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-b-2 border-amber-500 pb-2 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide mb-6 text-center pb-4 border-b border-stone-200/50 dark:border-stone-800/50">
                {title}
              </h1>

              {/* Resumed Reading Progress Banner */}
              {hasResumedProgress && (
                <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      已自动为您定位至上次阅读位置：<strong>第 {currentSpeakingIdx + 1} 段</strong>
                    </span>
                  </div>
                  {onResetToBeginning && (
                    <button
                      onClick={onResetToBeginning}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-300/80 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-stone-700 text-amber-800 dark:text-amber-300 font-medium text-[11px] transition shadow-xs shrink-0"
                    >
                      从章首读起
                    </button>
                  )}
                </div>
              )}

              {/* Chapter Reading Progress Indicator */}
              <div className="mb-6 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    本章听读进度：第 <strong className="text-amber-600 dark:text-amber-400 font-semibold">{currentSpeakingIdx + 1}</strong> / {paragraphs.length} 段
                    <span className="ml-1 opacity-70">({Math.round(((currentSpeakingIdx + 1) / (paragraphs.length || 1)) * 100)}%)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyChapter}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-stone-200/80 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition"
                    title="一键复制本章"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">已复制本章</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-stone-400" />
                        <span>复制本章</span>
                      </>
                    )}
                  </button>
                  <span className="hidden sm:inline text-stone-300 dark:text-stone-700">·</span>
                  <span className="hidden sm:inline text-[10.5px] text-stone-400">💡 双击任意段落直接从该段开读</span>
                </div>
              </div>
            </div>
          )}

          {/* Chapter Content Body */}
          {isEditMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>章节正文（每段留空行或回车）</span>
                <span className="text-[11px] text-stone-400">
                  当前定位：第 {lastViewedParagraphIdxRef.current + 1} 段
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={22}
                className="w-full bg-stone-50/50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-amber-500 font-inherit leading-relaxed"
                style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl text-xs bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 shadow-md transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? '正在保存...' : '保存更改并同步'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="space-y-6 select-text text-justify"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                letterSpacing: '0.02em',
              }}
            >
              {paragraphs.map((para, idx) => {
                const isSpeaking = currentSpeakingIdx === idx;
                const isJumpHighlighted = highlightedJumpIdx === idx;
                const paraAnnotations = annotations.filter((a) => a.paragraphIdx === idx);

                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      paragraphRefs.current[idx] = el;
                    }}
                    data-pindex={idx}
                    onDoubleClick={() => onSelectParagraph(idx)}
                    className={`group relative rounded-xl transition-all duration-300 p-2.5 -mx-2.5 cursor-pointer ${
                      isSpeaking
                        ? 'speaking-highlight'
                        : isJumpHighlighted
                        ? 'ring-2 ring-amber-500 bg-amber-500/15 shadow-md scale-[1.002]'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                    title="双击本段开始听读"
                  >
                    {/* Paragraph Quick Speak Button on Hover (Desktop) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectParagraph(idx);
                      }}
                      className="absolute -left-7 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-amber-600 hidden sm:inline-block"
                      title="从此处开始听稿"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>

                    {/* Paragraph Number Badge & Quick Actions (Visible on BOTH Desktop & Mobile) */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectParagraph(idx);
                      }}
                      className="float-right text-[11px] font-mono text-stone-400/90 dark:text-stone-500 bg-stone-100/90 dark:bg-stone-800/90 hover:bg-amber-100 dark:hover:bg-amber-950/70 hover:text-amber-700 dark:hover:text-amber-300 px-1.5 py-0.5 rounded-md ml-2.5 cursor-pointer select-none transition-colors border border-stone-200/60 dark:border-stone-700/60 inline-flex items-center gap-1 group/badge"
                      title={`第 ${idx + 1} 段 (点击由此开读)`}
                    >
                      <span>#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterEditMode(idx);
                        }}
                        className="opacity-0 group-hover/badge:opacity-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-opacity ml-0.5 hidden sm:inline-block text-[10px]"
                        title="修此段（直接进入编辑模式并定位光标）"
                      >
                        ✏️
                      </button>
                    </span>

                    {/* Paragraph Text Content */}
                    <p className="indent-8 leading-relaxed">
                      {para}
                    </p>

                    {/* Inline Annotations Badges for this paragraph */}
                    {paraAnnotations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                        {paraAnnotations.map((ann) => (
                          <span
                            key={ann.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                              ann.type === 'typo'
                                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                                : ann.type === 'polish'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-medium">「{ann.selectedText.slice(0, 10)}」</span>
                            <span>{ann.noteText}</span>
                            <button
                              onClick={() => onDeleteAnnotation(ann.id)}
                              className="ml-1 hover:text-stone-900 dark:hover:text-white"
                              title="删除此批注"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Selection Tooltip for Adding Annotations */}
      {selectedRange && (
        <div
          className="fixed z-50 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-3 w-72 text-xs text-stone-800 dark:text-stone-100"
          style={{
            left: `${selectedRange.x}px`,
            top: `${Math.max(60, selectedRange.y - 120)}px`,
          }}
        >
          <div className="font-semibold text-stone-900 dark:text-stone-100 mb-1.5 truncate">
            标记选中：「{selectedRange.text.slice(0, 16)}」
          </div>

          <div className="flex gap-1 mb-2">
            {[
              { id: 'typo', label: '错别字', color: 'text-red-600 bg-red-50' },
              { id: 'comment', label: '审稿批注', color: 'text-amber-600 bg-amber-50' },
              { id: 'polish', label: '语句润色', color: 'text-blue-600 bg-blue-50' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAnnotationType(t.id as any)}
                className={`flex-1 py-1 rounded-lg text-center font-medium border transition ${
                  annotationType === t.id
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="输入修改建议或备忘..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAnnotation()}
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 mb-2"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                onSelectParagraph(selectedRange.paragraphIdx);
                setSelectedRange(null);
              }}
              className="flex items-center gap-1 text-amber-600 hover:underline"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>听此处</span>
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedRange(null)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600"
              >
                取消
              </button>
              <button
                onClick={handleCreateAnnotation}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
              >
                添加标记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
