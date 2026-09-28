'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  X,
  BookPlus,
  Sparkles,
  RefreshCw,
  Layers,
  Folder,
  Files
} from 'lucide-react';
import { parseNovelText, ParsedChapter, countWords } from '@/lib/parser';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
  targetProjectId?: string;
  targetProjectTitle?: string;
}

export function ImportModal({
  isOpen,
  onClose,
  onSuccess,
  targetProjectId,
  targetProjectTitle,
}: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookTitle, setBookTitle] = useState(targetProjectTitle || '');
  const [author, setAuthor] = useState('作家本人');
  const [tags, setTags] = useState('长篇小说');
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [progressMsg, setProgressMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Read File As Text with UTF-8 / GBK detection
  const readFileAsText = async (file: File): Promise<string> => {
    if (file.name.endsWith('.docx')) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.data.chapters) {
        return data.data.chapters.map((c: any) => `${c.title}\n\n${c.content}`).join('\n\n');
      }
      return '';
    }

    const arrayBuffer = await file.arrayBuffer();
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      return utf8Decoder.decode(arrayBuffer);
    } catch {
      const gbkDecoder = new TextDecoder('gbk');
      return gbkDecoder.decode(arrayBuffer);
    }
  };

  // Recursively read all files from a directory entry
  const readDirectoryEntries = async (dirEntry: any): Promise<File[]> => {
    const reader = dirEntry.createReader();
    const entries: any[] = await new Promise((resolve) => {
      reader.readEntries((results: any[]) => resolve(results || []), () => resolve([]));
    });

    const files: File[] = [];
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await new Promise<File | null>((resolve) => entry.file(resolve, () => resolve(null)));
        if (file && (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.docx'))) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        const subFiles = await readDirectoryEntries(entry);
        files.push(...subFiles);
      }
    }
    return files;
  };

  // Natural numeric sorting for chapters
  const sortFilesNaturally = (files: File[]): File[] => {
    return [...files].sort((a, b) => {
      return a.name.localeCompare(b.name, 'zh-Hans-CN', {
        numeric: true,
        sensitivity: 'base',
      });
    });
  };

  // Process Files List
  const processFilesList = async (filesList: File[], defaultTitle?: string) => {
    if (filesList.length === 0) return;

    setIsProcessing(true);
    setErrorMessage('');
    setProgressMsg('正在扫描并解析文稿...');

    try {
      const validFiles = sortFilesNaturally(
        filesList.filter((f) => f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.docx'))
      );

      if (validFiles.length === 0) {
        setErrorMessage('未找到有效的 .txt, .md 或 .docx 小说文件');
        setIsProcessing(false);
        return;
      }

      if (!targetProjectId && !bookTitle) {
        if (defaultTitle) {
          setBookTitle(defaultTitle);
        } else if (validFiles.length === 1) {
          setBookTitle(validFiles[0].name.replace(/\.[^/.]+$/, ''));
        } else {
          setBookTitle('我的长篇小说');
        }
      }

      let allChapters: ParsedChapter[] = [];
      let totalWordCount = 0;

      if (validFiles.length === 1 && !validFiles[0].name.endsWith('.docx')) {
        setProgressMsg(`正在解析文件: ${validFiles[0].name}`);
        const content = await readFileAsText(validFiles[0]);
        const parseRes = parseNovelText(content, validFiles[0].name);
        allChapters = parseRes.chapters;
        totalWordCount = parseRes.totalWords;
      } else {
        // Multi-file batch mode
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          setProgressMsg(`正在处理 (${i + 1}/${validFiles.length}): ${file.name}`);
          const content = await readFileAsText(file);
          const singleTitle = file.name.replace(/\.[^/.]+$/, '');
          const words = countWords(content);
          totalWordCount += words;

          allChapters.push({
            title: singleTitle,
            content: content,
            wordCount: words,
            orderIndex: i,
          });
        }
      }

      setParsedChapters(allChapters);
      setTotalWords(totalWordCount);
      setProgressMsg('');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || '文件解析发生异常');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      await processFilesList(files);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      let folderName = '';
      if (files[0]?.webkitRelativePath) {
        folderName = files[0].webkitRelativePath.split('/')[0];
      }
      await processFilesList(files, folderName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];
    let detectedFolderName = '';

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
          if (entry) {
            if (entry.isDirectory) {
              if (!detectedFolderName) detectedFolderName = entry.name;
              const dirFiles = await readDirectoryEntries(entry);
              files.push(...dirFiles);
            } else if (entry.isFile) {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          } else {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
    }

    await processFilesList(files, detectedFolderName);
  };

  // Submit to create project or append to existing project
  const handleSubmit = async () => {
    if (!targetProjectId && !bookTitle.trim()) {
      setErrorMessage('请输入书名/作品标题');
      return;
    }
    if (parsedChapters.length === 0) {
      setErrorMessage('请至少导入或添加一个章节');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      if (targetProjectId) {
        // Append chapters to existing project
        const res = await fetch(`/api/projects/${targetProjectId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapters: parsedChapters,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || '导入章节失败');
        }

        onSuccess(targetProjectId);
        onClose();
      } else {
        // Create new project
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: bookTitle.trim(),
            author: author.trim(),
            tags: tags.trim(),
            chapters: parsedChapters,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || '创建项目失败');
        }

        onSuccess(data.data.id);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || '保存文稿异常');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-800 dark:text-stone-100">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {targetProjectId ? `导入新文章到《${targetProjectTitle || '当前小说'}》` : '导入小说文稿 / 新建审稿项目'}
              </h2>
              <p className="text-xs text-stone-500">支持拖入整个文件夹、批量TXT/MD文件，自动自然排序与智能分章</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Metadata Inputs (Only for New Project) */}
          {!targetProjectId && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-500 mb-1">作品名称 / 书名 *</label>
                <input
                  type="text"
                  placeholder="例如：剑来 / 诡秘之主 / 凡人修仙传..."
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">作者笔名</label>
                <input
                  type="text"
                  placeholder="作者姓名"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Hidden File / Folder Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".txt,.md,.docx"
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderSelect}
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
          />

          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-3 relative ${
              isDragging
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 scale-[0.99]'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                拖拽小说【文件夹】或【多个 TXT/MD/DOCX 文件】到此处
              </p>
              <p className="text-xs text-stone-400 mt-1">
                支持系统自动递归读取子目录、智能按章节自然序号排列、GBK/UTF-8 编码自适应
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-sm transition"
              >
                <Files className="w-3.5 h-3.5 text-amber-500" />
                <span>选择单个 / 多个文件</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-sm transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>批量选择小说文件夹</span>
              </button>
            </div>
          </div>

          {/* Progress / Status Display */}
          {progressMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Chapters Preview */}
          {parsedChapters.length > 0 && (
            <div className="space-y-2 border-t border-stone-100 dark:border-stone-800 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  已识别 {parsedChapters.length} 个章节
                </span>
                <span className="text-stone-400">总字数：约 {totalWords.toLocaleString()} 字</span>
              </div>

              <div className="max-h-44 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-2xl p-2 bg-stone-50/50 dark:bg-stone-800/40 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {parsedChapters.map((ch, idx) => (
                  <div key={idx} className="py-1.5 px-2 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
                    <span className="truncate pr-2 font-medium">{ch.title}</span>
                    <span className="text-stone-400 shrink-0 text-[11px]">{ch.wordCount} 字</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || parsedChapters.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>正在保存...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{targetProjectId ? `确认追加导入这 ${parsedChapters.length} 章` : '确认创建并开始审稿'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
