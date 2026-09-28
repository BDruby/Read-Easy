'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  Clock,
  Sparkles,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  Headphones,
  CheckCircle2,
  Check
} from 'lucide-react';
import { CHINESE_VOICES } from '@/lib/tts/edge-tts';
import { preprocessTTSText } from '@/lib/parser';

export interface AudioPlayerProps {
  paragraphs: string[];
  currentParagraphIdx: number;
  onParagraphChange: (idx: number) => void;
  chapterTitle: string;
  bookTitle?: string;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
  playTrigger?: number;
}

export function AudioPlayer({
  paragraphs,
  currentParagraphIdx,
  onParagraphChange,
  chapterTitle,
  bookTitle = '长篇小说',
  onPrevChapter,
  onNextChapter,
  hasPrevChapter = false,
  hasNextChapter = false,
  playTrigger,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>('zh-CN-YunjianNeural');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [timerRemainingSecs, setTimerRemainingSecs] = useState<number | null>(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Current audio duration and playback progress
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Stable Master Audio Reference (High-resilience single pipeline)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Multi-tier in-memory audio caches and in-flight promise deduplication
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const inFlightRequestsRef = useRef<Map<string, Promise<string>>>(new Map());

  const timerIntervalRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const activeIdxRef = useRef(currentParagraphIdx);
  const paragraphsRef = useRef(paragraphs);
  const speedRef = useRef(playbackSpeed);
  const isMutedRef = useRef(isMuted);
  const isManualStopRef = useRef(false);
  const selectedVoiceRef = useRef(selectedVoice);
  const playbackSessionIdRef = useRef(0);
  const prefetchTimerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Lazy-create single master HTMLAudioElement
  const getAudioElement = useCallback((): HTMLAudioElement => {
    if (typeof window === 'undefined') return null as any;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  // Keep refs in sync with state/props
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Keep refs in sync with props
  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    activeIdxRef.current = currentParagraphIdx;
  }, [currentParagraphIdx]);

  // Clean teardown on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 1. Restore Persisted Voice & Speed Preferences from LocalStorage on Mount
  useEffect(() => {
    try {
      // Restore Speed
      const savedSpeedStr = localStorage.getItem('review_tts_speed');
      if (savedSpeedStr) {
        const s = parseFloat(savedSpeedStr);
        if (!isNaN(s) && s >= 0.5 && s <= 3.0) {
          setPlaybackSpeed(s);
          speedRef.current = s;
        }
      }

      // Restore Voice
      const savedVoice = localStorage.getItem('review_tts_voice');
      if (savedVoice && CHINESE_VOICES.some((v) => v.id === savedVoice)) {
        setSelectedVoice(savedVoice);
        selectedVoiceRef.current = savedVoice;
      } else {
        // Fall back to server system settings
        fetch('/api/settings')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data?.edge_voice) {
              const v = data.data.edge_voice;
              setSelectedVoice(v);
              selectedVoiceRef.current = v;
              localStorage.setItem('review_tts_voice', v);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to load voice preferences:', e);
    }
  }, []);

  // Sleep Timer Countdown Effect
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (sleepTimerMinutes === null) {
      setTimerRemainingSecs(null);
      return;
    }

    setTimerRemainingSecs(sleepTimerMinutes * 60);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemainingSecs((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleStop();
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sleepTimerMinutes]);

  // Lockscreen MediaSession API Setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${chapterTitle} (段落 ${currentParagraphIdx + 1}/${paragraphs.length})`,
        artist: bookTitle,
        album: '审稿大师 · 听稿',
        artwork: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
      });

      navigator.mediaSession.setActionHandler('play', () => handlePlay());
      navigator.mediaSession.setActionHandler('pause', () => handleStop());
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentParagraphIdx > 0) {
          playParagraph(currentParagraphIdx - 1);
        } else if (onPrevChapter && hasPrevChapter) {
          onPrevChapter();
        }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (currentParagraphIdx < paragraphs.length - 1) {
          playParagraph(currentParagraphIdx + 1);
        } else if (onNextChapter && hasNextChapter) {
          onNextChapter();
        }
      });
    }
  }, [chapterTitle, currentParagraphIdx, paragraphs.length, bookTitle, hasPrevChapter, hasNextChapter]);



  // In-Flight Deduplicated Fetcher with Automatic LRU Cache Management & Auto-Retry
  const fetchAudioWithRetry = useCallback(async (cleanText: string, voice: string, speed: number, maxRetries = 2): Promise<string> => {
    const cacheKey = `edge_${voice}_${speed.toFixed(2)}_${cleanText}`;

    // 1. Resolved URL cache check (true LRU: move access to end of Map)
    const existing = audioCacheRef.current.get(cacheKey);
    if (existing) {
      audioCacheRef.current.delete(cacheKey);
      audioCacheRef.current.set(cacheKey, existing);
      return existing;
    }

    // 2. In-flight promise reuse (prevents duplicate network requests during rapid preloading)
    const inFlight = inFlightRequestsRef.current.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // 3. Initiate network synthesis request with exponential backoff retries
    const requestPromise = (async () => {
      let lastError: any = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanText,
              voice,
              speed,
            }),
          });

          if (!res.ok) {
            throw new Error(`TTS server responded with ${res.status}`);
          }

          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);

          // Safe LRU cleanup: maintain maximum 200 cached audio URLs to keep memory lightweight
          if (audioCacheRef.current.size >= 200) {
            const oldestKey = audioCacheRef.current.keys().next().value;
            if (oldestKey) {
              const oldUrl = audioCacheRef.current.get(oldestKey);
              if (oldUrl && audioRef.current?.src !== oldUrl) {
                try {
                  URL.revokeObjectURL(oldUrl);
                } catch {}
              }
              audioCacheRef.current.delete(oldestKey);
            }
          }

          audioCacheRef.current.set(cacheKey, objUrl);
          return objUrl;
        } catch (err: any) {
          lastError = err;
          console.warn(`TTS attempt ${attempt + 1}/${maxRetries + 1} failed:`, err?.message || err);
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          }
        }
      }
      throw lastError || new Error('TTS synthesis failed after retries');
    })();

    inFlightRequestsRef.current.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inFlightRequestsRef.current.delete(cacheKey);
    }
  }, []);

  // Multi-Paragraph Pipeline Preloader (Sliding Window: Preloads next 3 upcoming paragraphs in parallel)
  const pumpPrefetchPipeline = useCallback((currentIdx: number, voice: string, speed: number) => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }

    const list = paragraphsRef.current;
    if (!list || list.length === 0) return;

    // Scan up to 3 upcoming audible paragraphs ahead
    const upcomingIndices: number[] = [];
    let scan = currentIdx + 1;
    while (scan < list.length && upcomingIndices.length < 3) {
      const raw = list[scan]?.trim();
      const { isAudible, cleanText } = preprocessTTSText(raw);
      if (isAudible && cleanText) {
        upcomingIndices.push(scan);
      }
      scan++;
    }

    if (upcomingIndices.length === 0) return;

    // Kick off parallel background pre-fetching for upcoming paragraphs
    upcomingIndices.forEach((idxToFetch) => {
      const raw = list[idxToFetch]?.trim();
      const { cleanText } = preprocessTTSText(raw);
      if (cleanText) {
        fetchAudioWithRetry(cleanText, voice, speed).catch(() => {});
      }
    });
  }, [fetchAudioWithRetry]);

  // Core Play Paragraph Dispatcher (Resilient Single Master Audio Pipeline with 0ms Transition)
  const playParagraph = useCallback(async (idx: number, overrideVoice?: string) => {
    const list = paragraphsRef.current;
    if (!list || list.length === 0 || idx < 0 || idx >= list.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
      return;
    }

    const rawText = list[idx]?.trim();

    // 1. Skip empty lines or pure punctuation/divider lines (***, ---, etc.)
    const { cleanText, isAudible } = preprocessTTSText(rawText);
    if (!isAudible || !cleanText) {
      if (idx < list.length - 1) {
        const nextIdx = idx + 1;
        activeIdxRef.current = nextIdx;
        onParagraphChange(nextIdx);
        playParagraph(nextIdx, overrideVoice);
      } else if (hasNextChapter && onNextChapter) {
        onNextChapter();
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsLoading(false);
      }
      return;
    }

    // Generate unique session token for this playback request
    const sessionId = ++playbackSessionIdRef.current;
    const voiceToUse = overrideVoice || selectedVoiceRef.current;

    isManualStopRef.current = false;
    isPlayingRef.current = true;
    activeIdxRef.current = idx;
    setIsPlaying(true);

    // Cancel any browser speechSynthesis to prevent robotic voice interference
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cacheKey = `edge_${voiceToUse}_${speedRef.current.toFixed(2)}_${cleanText}`;
    const isAlreadyCached = audioCacheRef.current.has(cacheKey);
    if (!isAlreadyCached) {
      setIsLoading(true);
    }

    let url: string;
    try {
      url = await fetchAudioWithRetry(cleanText, voiceToUse, speedRef.current);
    } catch (err: any) {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.warn('TTS request error after retries:', err);
      setIsLoading(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    if (sessionId !== playbackSessionIdRef.current || !isPlayingRef.current || isManualStopRef.current) {
      return;
    }

    const audio = getAudioElement();
    if (!audio) return;

    if (audio.src !== url) {
      audio.src = url;
    }
    audio.playbackRate = speedRef.current;
    audio.muted = isMutedRef.current;

    let hasEndedTriggered = false;
    const triggerNext = () => {
      if (hasEndedTriggered) return;
      hasEndedTriggered = true;
      if (sessionId !== playbackSessionIdRef.current) return;
      if (isManualStopRef.current || !isPlayingRef.current) return;

      const currentList = paragraphsRef.current;
      if (idx < currentList.length - 1) {
        const nextIdx = idx + 1;
        activeIdxRef.current = nextIdx;
        onParagraphChange(nextIdx);
        playParagraph(nextIdx, voiceToUse);
      } else if (hasNextChapter && onNextChapter) {
        setIsLoading(true);
        onNextChapter();
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    audio.ontimeupdate = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      setAudioCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
        // Fallback watchdog: if audio is within 0.08s of end and hasn't triggered ended within 400ms
        if (audio.currentTime >= audio.duration - 0.08 && audio.duration > 0.5) {
          triggerNext();
        }
      }
    };

    audio.onended = () => {
      triggerNext();
    };

    audio.onerror = (e) => {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.warn('Audio playback error:', e);
      if (isPlayingRef.current && !isManualStopRef.current) {
        // Attempt a graceful 1-time recovery
        setTimeout(() => {
          if (sessionId === playbackSessionIdRef.current && isPlayingRef.current) {
            audio.load();
            audio.play().catch(() => {
              setIsLoading(false);
              setIsPlaying(false);
              isPlayingRef.current = false;
            });
          }
        }, 100);
      }
    };

    try {
      await audio.play();
      if (sessionId !== playbackSessionIdRef.current) {
        audio.pause();
        return;
      }
      setIsLoading(false);

      // Immediately pump prefetch pipeline for upcoming paragraphs
      pumpPrefetchPipeline(idx, voiceToUse, speedRef.current);
    } catch (playErr: any) {
      if (sessionId !== playbackSessionIdRef.current || !isPlayingRef.current) return;

      if (playErr?.name === 'AbortError') {
        // Browser interrupted play() request: wait 70ms and retry smoothly
        try {
          await new Promise((r) => setTimeout(r, 70));
          if (sessionId === playbackSessionIdRef.current && isPlayingRef.current) {
            await audio.play();
            setIsLoading(false);
            pumpPrefetchPipeline(idx, voiceToUse, speedRef.current);
          }
        } catch (retryErr) {
          console.warn('Retry audio.play failed:', retryErr);
          setIsLoading(false);
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      } else {
        console.warn('Audio play failed:', playErr);
        setIsLoading(false);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  }, [
    fetchAudioWithRetry,
    getAudioElement,
    hasNextChapter,
    onNextChapter,
    onParagraphChange,
    pumpPrefetchPipeline,
  ]);

  // When playTrigger prop updates from parent (e.g. click "从此处听稿" or cross-chapter autoplay)
  const lastPlayTriggerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (playTrigger && playTrigger !== lastPlayTriggerRef.current) {
      lastPlayTriggerRef.current = playTrigger;
      playParagraph(activeIdxRef.current);
    }
  }, [playTrigger, playParagraph]);

  // Track chapter change to keep index aligned
  const lastChapterTitleRef = useRef(chapterTitle);
  useEffect(() => {
    if (chapterTitle !== lastChapterTitleRef.current) {
      lastChapterTitleRef.current = chapterTitle;
      activeIdxRef.current = currentParagraphIdx;
    }
  }, [chapterTitle, currentParagraphIdx]);

  const handlePlay = () => {
    isManualStopRef.current = false;
    playParagraph(activeIdxRef.current);
  };

  const handleStop = () => {
    playbackSessionIdRef.current++;
    isManualStopRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsLoading(false);

    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  // Keyboard Shortcuts (Space for Play/Pause, Left/Right for Paragraph Skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevParagraph();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextParagraph();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Progress Bar Seek / Drag Handler
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || paragraphs.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const fraction = clickX / rect.width;
    const targetIdx = Math.min(paragraphs.length - 1, Math.max(0, Math.floor(fraction * paragraphs.length)));

    activeIdxRef.current = targetIdx;
    onParagraphChange(targetIdx);
    playParagraph(targetIdx);
  };

  const handlePrevParagraph = () => {
    if (currentParagraphIdx > 0) {
      const prevIdx = currentParagraphIdx - 1;
      activeIdxRef.current = prevIdx;
      onParagraphChange(prevIdx);
      playParagraph(prevIdx);
    } else if (hasPrevChapter && onPrevChapter) {
      onPrevChapter();
    }
  };

  const handleNextParagraph = () => {
    if (currentParagraphIdx < paragraphs.length - 1) {
      const nextIdx = currentParagraphIdx + 1;
      activeIdxRef.current = nextIdx;
      onParagraphChange(nextIdx);
      playParagraph(nextIdx);
    } else if (hasNextChapter && onNextChapter) {
      onNextChapter();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    speedRef.current = speed;
    setShowSpeedMenu(false);
    try {
      localStorage.setItem('review_tts_speed', String(speed));
    } catch {}

    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleSelectVoice = (vId: string) => {
    if (vId === selectedVoiceRef.current) {
      setShowVoiceMenu(false);
      return;
    }
    selectedVoiceRef.current = vId;
    setSelectedVoice(vId);
    setShowVoiceMenu(false);
    try {
      localStorage.setItem('review_tts_voice', vId);
    } catch {}

    // Asynchronously synchronize user's default voice to database
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edge_voice: vId }),
    }).catch(() => {});

    // If currently playing, immediately re-read the current paragraph with the newly selected voice
    if (isPlayingRef.current) {
      playParagraph(activeIdxRef.current, vId);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalParagraphs = paragraphs.length;

  const currentVoiceObj = CHINESE_VOICES.find((v) => v.id === selectedVoice) || CHINESE_VOICES[0];

  return (
    <>
      {/* 1. Minimized Floating Audio Capsule Widget */}
      {isMinimized && (
        <div className="fixed bottom-5 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 p-1.5 pl-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-amber-500/40 dark:border-amber-400/40 rounded-full shadow-2xl text-stone-800 dark:text-stone-100 hover:border-amber-500 transition group">
            {/* Click info to expand */}
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none py-0.5"
              onClick={() => setIsMinimized(false)}
              title="点击展开听稿控制台"
            >
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                {isPlaying && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isPlaying ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                  }`}
                ></span>
              </span>
              <Headphones className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'text-amber-500 animate-pulse' : 'text-stone-400'}`} />
              <div className="flex flex-col text-left pr-1 max-w-[90px] sm:max-w-[130px]">
                <span className="text-[11px] font-medium truncate leading-tight">
                  {chapterTitle}
                </span>
                <span className="text-[9px] text-stone-400 leading-tight">
                  {currentParagraphIdx + 1}/{totalParagraphs || 1} 段
                </span>
              </div>
            </div>

            {/* Quick Play/Skip buttons */}
            <div className="flex items-center gap-1 border-l border-stone-200 dark:border-stone-800 pl-1.5">
              <button
                onClick={togglePlay}
                disabled={isLoading && !isPlaying}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:scale-105 active:scale-95 transition shadow-sm shrink-0"
                title={isPlaying ? '暂停' : '播放'}
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNextParagraph}
                disabled={currentParagraphIdx === totalParagraphs - 1 && !hasNextChapter}
                className="p-1 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition shrink-0"
                title="下一段"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsMinimized(false)}
                className="p-1 rounded-full text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition shrink-0"
                title="展开播放器"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full Audio Player Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 transform ${
          isMinimized ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="max-w-4xl mx-auto px-3 pb-3">
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl p-3 sm:p-4 text-stone-800 dark:text-stone-100">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100 dark:border-stone-800/80 text-xs sm:text-sm">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="flex h-2 w-2 relative shrink-0">
                  {isPlaying && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isPlaying ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                    }`}
                  ></span>
                </span>
                <span className="font-medium text-stone-900 dark:text-stone-100 truncate">{chapterTitle}</span>
                <span className="text-stone-400 dark:text-stone-500 shrink-0 text-[11px] sm:text-xs">
                  · 第 {currentParagraphIdx + 1}/{totalParagraphs || 1} 段
                  {audioDuration > 0 && ` (${formatTimer(audioCurrentTime)} / ${formatTimer(audioDuration)})`}
                </span>

                <div className="hidden md:flex items-center ml-2">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    title="微软 Edge 神经语音 · 完全免费 · 免Token"
                  >
                    <Zap className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Edge 神经语音 · 免Token</span>
                  </span>
                </div>
              </div>

              {/* Quick Badges & Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Voice Selector Pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowVoiceMenu(!showVoiceMenu);
                      setShowSpeedMenu(false);
                      setShowTimerMenu(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition"
                    title="切换朗读音色"
                  >
                    <Sparkles className="w-3 h-3 shrink-0 text-amber-500" />
                    <span className="max-w-[110px] sm:max-w-[150px] truncate">{currentVoiceObj.name.split(' (')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-amber-500/70" />
                  </button>

                  {/* Responsive Voice Selection Menu */}
                  {showVoiceMenu && (
                    <>
                      <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 sm:hidden"
                        onClick={() => setShowVoiceMenu(false)}
                      />
                      <div className="fixed inset-x-3 bottom-24 sm:bottom-full sm:right-0 sm:left-auto mb-2 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-3 z-50 max-h-[65vh] sm:max-h-88 overflow-y-auto">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
                          <span className="font-semibold text-xs text-stone-700 dark:text-stone-300">
                            选择听审音色 (微软 Edge 神经语音)
                          </span>
                          <button
                            onClick={() => setShowVoiceMenu(false)}
                            className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1"
                          >
                            关闭
                          </button>
                        </div>

                        {/* Voice Items */}
                        <div className="space-y-1">
                          {CHINESE_VOICES.map((v) => {
                            const isSelected = selectedVoice === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => handleSelectVoice(v.id)}
                                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex flex-col transition ${
                                  isSelected
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium border border-amber-200 dark:border-amber-800'
                                    : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate pr-2 font-medium flex items-center gap-1.5">
                                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                    <span>{v.name}</span>
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                                    v.gender === 'Male'
                                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  }`}>
                                    {v.gender === 'Male' ? '男声' : '女声'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-stone-400 leading-tight truncate mt-0.5">
                                  {v.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Speed Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowVoiceMenu(false);
                      setShowTimerMenu(false);
                    }}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
                    title="朗读倍速"
                  >
                    <Gauge className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>{playbackSpeed}x</span>
                  </button>

                  {showSpeedMenu && (
                    <>
                      <div
                        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                        onClick={() => setShowSpeedMenu(false)}
                      />
                      <div className="fixed sm:absolute bottom-24 sm:bottom-full right-4 sm:right-0 mb-2 w-32 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-1.5 z-50">
                        {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSpeedChange(s)}
                            className={`w-full text-center px-2 py-1 rounded-lg text-xs transition ${
                              playbackSpeed === s
                                ? 'bg-amber-500 text-white font-medium'
                                : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {s}x {s === 1.0 && '(标准)'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Sleep Timer Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTimerMenu(!showTimerMenu);
                      setShowVoiceMenu(false);
                      setShowSpeedMenu(false);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                      timerRemainingSecs !== null
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                    title="定时休眠"
                  >
                    <Clock className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>{timerRemainingSecs !== null ? formatTimer(timerRemainingSecs) : '定时'}</span>
                  </button>

                  {showTimerMenu && (
                    <>
                      <div
                        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                        onClick={() => setShowTimerMenu(false)}
                      />
                      <div className="fixed sm:absolute bottom-24 sm:bottom-full right-4 sm:right-0 mb-2 w-32 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-1.5 z-50">
                        <div className="text-[10px] text-stone-400 px-2 py-1 font-semibold">听稿休眠定时</div>
                        {[
                          { label: '不开启', value: null },
                          { label: '15 分钟', value: 15 },
                          { label: '30 分钟', value: 30 },
                          { label: '45 分钟', value: 45 },
                          { label: '60 分钟', value: 60 },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => {
                              setSleepTimerMinutes(item.value);
                              setShowTimerMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition ${
                              sleepTimerMinutes === item.value
                                ? 'bg-amber-500 text-white font-medium'
                                : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Hide / Minimize Button */}
                <button
                  onClick={() => {
                    setIsMinimized(true);
                    setShowVoiceMenu(false);
                    setShowSpeedMenu(false);
                    setShowTimerMenu(false);
                  }}
                  className="p-1 sm:p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  title="收起为悬浮胶囊"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Player Main Playback Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Previous Section Button */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevParagraph}
                  disabled={currentParagraphIdx === 0 && !hasPrevChapter}
                  className="p-2 sm:p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition text-stone-700 dark:text-stone-200"
                  title="上一段 (快捷键 ←)"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Center: Play/Pause Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  disabled={isLoading && !isPlaying}
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? '暂停听稿 (快捷键 空格)' : '开始听稿 (快捷键 空格)'}
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Right: Next Section Button */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNextParagraph}
                  disabled={currentParagraphIdx === totalParagraphs - 1 && !hasNextChapter}
                  className="p-2 sm:p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition text-stone-700 dark:text-stone-200"
                  title="下一段 (快捷键 →)"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-500 dark:text-stone-400 hidden sm:inline-flex"
                  title={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Interactive Progress Bar */}
            <div className="mt-3 group/progress relative">
              <div
                ref={progressBarRef}
                onClick={handleSeek}
                className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden flex items-center cursor-pointer relative hover:h-3 transition-all"
                title="点击跳转到对应段落"
              >
                <div
                  className="bg-gradient-to-r from-amber-600 to-amber-500 h-full rounded-full transition-all duration-150 relative"
                  style={{
                    width: `${totalParagraphs > 0 ? ((currentParagraphIdx + 1) / totalParagraphs) * 100 : 0}%`,
                  }}
                >
                  {/* Visual Thumb Marker */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-600 rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
