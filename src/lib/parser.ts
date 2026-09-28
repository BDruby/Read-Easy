export interface ParsedChapter {
  title: string;
  content: string;
  wordCount: number;
  orderIndex: number;
}

export interface ParseResult {
  title: string;
  description?: string;
  chapters: ParsedChapter[];
  totalWords: number;
  chapterCount: number;
}

// Regex patterns for Chinese chapter headings in web novels & traditional books
const CHAPTER_REGEXES = [
  /^(?:\s*|\ufeff)(第[0-9零一二三四五六七八九十百千万]+[章回节卷集部篇幕折话话场]\s*.*)$/m,
  /^(?:\s*|\ufeff)(Chapter\s+[0-9IVXLCDMivxlcdm]+[\s:.-]*.*)$/im,
  /^(?:\s*|\ufeff)(【第[0-9零一二三四五六七八九十百千万]+[章回节卷集部篇]】\s*.*)$/m,
  /^(?:\s*|\ufeff)([0-9]{1,4}[\s、.：:](?:[\u4e00-\u9fa5\w\s]{1,30}))$/m,
  /^(?:\s*|\ufeff)(引子|序章|序言|楔子|尾声|后记|番外[0-9零一二三四五六七八九十]*[\s:.-]*.*)$/m,
];

/**
 * Intelligent novel text parser
 */
export function parseNovelText(rawText: string, defaultTitle: string = '未命名作品'): ParseResult {
  // Normalize line breaks
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Try to find matching chapter split points
  const lines = normalized.split('\n');
  const chapters: ParsedChapter[] = [];

  let currentTitle = '序章 / 开篇';
  let currentLines: string[] = [];
  let detectedTitle = defaultTitle;

  // If first few lines contain title info
  if (lines.length > 0 && lines[0].length < 40 && !lines[0].startsWith('第')) {
    detectedTitle = lines[0].replace(/^[《<]/, '').replace(/[》>]$/, '').trim() || defaultTitle;
  }

  function isChapterHeading(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 60) return false;
    for (const regex of CHAPTER_REGEXES) {
      if (regex.test(trimmed)) return true;
    }
    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isChapterHeading(line)) {
      // Flush previous chapter if it has content
      if (currentLines.length > 0) {
        const content = currentLines.join('\n').trim();
        if (content.length > 0) {
          chapters.push({
            title: currentTitle,
            content: content,
            wordCount: countWords(content),
            orderIndex: chapters.length,
          });
        }
      }
      currentTitle = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush last chapter
  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim();
    if (content.length > 0) {
      chapters.push({
        title: currentTitle,
        content: content,
        wordCount: countWords(content),
        orderIndex: chapters.length,
      });
    }
  }

  // If no chapter headers were recognized, treat whole text as single chapter
  if (chapters.length === 0 && normalized.length > 0) {
    chapters.push({
      title: '正文',
      content: normalized,
      wordCount: countWords(normalized),
      orderIndex: 0,
    });
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return {
    title: detectedTitle,
    chapters,
    totalWords,
    chapterCount: chapters.length,
  };
}

/**
 * Accurately count Chinese characters + English words
 */
export function countWords(text: string): number {
  if (!text) return 0;
  // Match Chinese, Japanese, Korean characters
  const cjk = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
  // Match English words and numbers
  const nonCjk = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .match(/[a-zA-Z0-9_-]+/g) || [];
  return cjk.length + nonCjk.length;
}

/**
 * Estimate reading time in minutes (average 350 chars/min for Chinese novels)
 */
export function estimateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 350));
}

/**
 * Paragraph split helper
 */
export function splitParagraphs(content: string): string[] {
  return content
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

export interface CleanTTSResult {
  cleanText: string;
  isAudible: boolean;
  charCount: number;
}

/**
 * 智能 TTS 文本预处理：过滤纯符号分割线、精简冗余标点，大幅节省 Token 并提升朗读流畅度
 */
export function preprocessTTSText(rawText: string): CleanTTSResult {
  if (!rawText) return { cleanText: '', isAudible: false, charCount: 0 };

  let text = rawText.trim();

  // 检查是否包含实质可读字符（中文字符、英文字母、阿拉伯数字）
  const hasReadableChars = /[\u4e00-\u9fa5a-zA-Z0-9]/.test(text);
  if (!hasReadableChars) {
    // 纯分割线或无意义符号（如 ***、---、===、……、表情等），跳过朗读节省 Token
    return { cleanText: '', isAudible: false, charCount: 0 };
  }

  // 针对长篇小说优化标点符号：
  // 1. 压缩连续过量符号（如 "。。。。。。" 或 "！！！"），避免语音引擎长时间停顿，同时减少计费字数
  text = text
    .replace(/\.{3,}/g, '……')
    .replace(/。{2,}/g, '。')
    .replace(/！{2,}/g, '！')
    .replace(/？{2,}/g, '？')
    .replace(/[,，]{2,}/g, '，')
    .replace(/[-—_]{3,}/g, ' ')
    .replace(/[*#=~]{2,}/g, ' ')
    .trim();

  const isAudible = text.length > 0 && /[\u4e00-\u9fa5a-zA-Z0-9]/.test(text);

  return {
    cleanText: text,
    isAudible,
    charCount: text.length,
  };
}
