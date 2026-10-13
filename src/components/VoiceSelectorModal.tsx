'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  X,
  Sparkles,
  User,
  Tag,
  Headphones,
} from 'lucide-react';
import { DOUBAO_VOICES, DoubaoVoiceInfo } from '@/lib/tts/doubao-tts';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoiceId?: string;
  roleName?: string;
  onSelectVoice: (voiceId: string) => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: '全部音色' },
  { id: 'novel', label: '网文演播' },
  { id: 'romance', label: '甜宠言情' },
  { id: 'mature', label: '成熟沉稳' },
  { id: 'youth', label: '热血少年' },
  { id: 'anime', label: '特色动漫' },
  { id: 'english', label: '外语多语' },
];

export function VoiceSelectorModal({
  isOpen,
  onClose,
  currentVoiceId,
  roleName,
  onSelectVoice,
}: VoiceSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on close or unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
    setIsLoadingAudio(false);
  };

  const handlePlayVoice = async (voice: DoubaoVoiceInfo) => {
    if (playingVoiceId === voice.id) {
      handleStopAudio();
      return;
    }

    handleStopAudio();
    setPlayingVoiceId(voice.id);
    setIsLoadingAudio(true);

    try {
      const sampleText = voice.previewText || '您好，这是火山引擎豆包语音大模型2.0官方精品音色演播试听。';
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: voice.id,
          speed: 1.0,
        }),
      });

      if (!res.ok) {
        throw new Error('试听音频生成失败');
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        setIsLoadingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        setIsLoadingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setIsLoadingAudio(false);
    } catch (err: any) {
      console.error('Play voice sample error:', err);
      setPlayingVoiceId(null);
      setIsLoadingAudio(false);
    }
  };

  const filteredVoices = useMemo(() => {
    return DOUBAO_VOICES.filter((v) => {
      // Category filter
      if (selectedCategory !== 'all' && v.category !== selectedCategory) {
        return false;
      }
      // Gender filter
      if (genderFilter !== 'all' && v.gender !== genderFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = v.name.toLowerCase().includes(q);
        const matchDesc = v.description.toLowerCase().includes(q);
        const matchTag = v.tags.some((t) => t.toLowerCase().includes(q));
        const matchId = v.id.toLowerCase().includes(q);
        return matchName || matchDesc || matchTag || matchId;
      }
      return true;
    });
  }, [selectedCategory, genderFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleStopAudio();
          onClose();
        }
      }}
    >
      <div className="bg-stone-900 border border-purple-500/30 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2">
                豆包 TTS 2.0 官方官方音色库
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-normal">
                  Seed-TTS 2.0
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                {roleName ? `正在为【${roleName}】选择专属配音声线` : '浏览、搜索与试听官方认证超拟真演播声线'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-stone-800/80 bg-stone-900/60 space-y-3">
          {/* Search Bar + Gender Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索音色名称、题材标签（如：仙侠、甜宠、大叔、反派、悬疑）..."
                className="w-full bg-stone-950/80 border border-stone-800 focus:border-purple-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Gender Toggle */}
            <div className="flex items-center rounded-xl bg-stone-950/80 p-0.5 border border-stone-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  genderFilter === 'all'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('Male')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  genderFilter === 'Male'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                男声
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('Female')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  genderFilter === 'Female'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                女声
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition text-xs ${
                  selectedCategory === tab.id
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-200 font-semibold shadow-xs'
                    : 'bg-stone-800/60 hover:bg-stone-800 border border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredVoices.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
              <p className="text-sm">未找到匹配的音色</p>
              <p className="text-xs text-stone-600">请尝试更换分类或清除搜索关键词</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredVoices.map((voice) => {
                const isCurrent = currentVoiceId === voice.id;
                const isPlaying = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={`rounded-2xl border p-3.5 flex flex-col justify-between transition relative ${
                      isCurrent
                        ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/30'
                        : 'bg-stone-950/60 border-stone-800/80 hover:border-purple-500/30 hover:bg-stone-900/50'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Name + Badges */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              voice.gender === 'Female' ? 'bg-rose-400 shadow-xs shadow-rose-400/50' : 'bg-blue-400 shadow-xs shadow-blue-400/50'
                            }`}
                          />
                          <span className="font-bold text-xs sm:text-sm text-stone-100">
                            {voice.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300">
                            {voice.categoryName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md ${
                              voice.gender === 'Female'
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                                : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                            }`}
                          >
                            {voice.gender === 'Female' ? '女声' : '男声'}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[11.5px] text-stone-400 leading-relaxed mb-2.5">
                        {voice.description}
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {voice.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/20 text-purple-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Actions: Play Sample & Select */}
                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                      {/* Play Preview Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(voice)}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition ${
                          isPlaying
                            ? 'bg-purple-600 text-white font-medium shadow-sm'
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                        }`}
                        title="点击试听当前音色演播范例"
                      >
                        {isPlaying && isLoadingAudio ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isPlaying ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>停止</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                            <span>试听原声</span>
                          </>
                        )}
                      </button>

                      {/* Select Voice Button */}
                      <button
                        type="button"
                        onClick={() => {
                          handleStopAudio();
                          onSelectVoice(voice.id);
                          onClose();
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          isCurrent
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>当前使用中</span>
                          </>
                        ) : (
                          <span>选用此音色</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-900/90 text-[11px] text-stone-400 flex items-center justify-between">
          <span>共收录 25 个官方验证 Seed-TTS 2.0 旗舰大模型音色</span>
          <button
            type="button"
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
