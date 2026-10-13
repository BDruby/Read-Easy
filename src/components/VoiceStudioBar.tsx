'use client';

import React, { useState } from 'react';
import {
  Mic,
  Sparkles,
  Download,
  FileText,
  Volume2,
  Users,
  Settings2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Check,
  Search,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';
import { VoiceRole, DEFAULT_VOICE_CAST, EMOTION_PRESETS, autoDetectParagraphRoles, ParagraphVoiceSetting } from '@/lib/voice-cast';
import { DOUBAO_VOICES } from '@/lib/tts/doubao-tts';
import { VoiceSelectorModal } from './VoiceSelectorModal';
import { RoleEditModal } from './RoleEditModal';

interface VoiceStudioBarProps {
  chapterId: string;
  chapterTitle: string;
  paragraphs: string[];
  cast: VoiceRole[];
  voiceConfig: Record<number, ParagraphVoiceSetting>;
  onUpdateCast: (cast: VoiceRole[]) => void;
  onUpdateVoiceConfig: (config: Record<number, ParagraphVoiceSetting>) => void;
  isLoggedIn?: boolean;
}

const getRoleDotClass = (color?: string) => {
  switch (color) {
    case 'blue': return 'bg-blue-400 shadow-sm shadow-blue-400/50';
    case 'rose': return 'bg-rose-400 shadow-sm shadow-rose-400/50';
    case 'indigo': return 'bg-indigo-400 shadow-sm shadow-indigo-400/50';
    case 'purple': return 'bg-purple-400 shadow-sm shadow-purple-400/50';
    case 'emerald': return 'bg-emerald-400 shadow-sm shadow-emerald-400/50';
    case 'teal': return 'bg-teal-400 shadow-sm shadow-teal-400/50';
    case 'orange': return 'bg-orange-400 shadow-sm shadow-orange-400/50';
    case 'cyan': return 'bg-cyan-400 shadow-sm shadow-cyan-400/50';
    case 'fuchsia': return 'bg-fuchsia-400 shadow-sm shadow-fuchsia-400/50';
    case 'amber':
    default:
      return 'bg-amber-400 shadow-sm shadow-amber-400/50';
  }
};

export function VoiceStudioBar({
  chapterId,
  chapterTitle,
  paragraphs,
  cast,
  voiceConfig,
  onUpdateCast,
  onUpdateVoiceConfig,
  isLoggedIn = false,
}: VoiceStudioBarProps) {
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isExportingMp3, setIsExportingMp3] = useState(false);
  const [isExportingSrt, setIsExportingSrt] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [modalRole, setModalRole] = useState<VoiceRole | null>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VoiceRole | null>(null);

  // Calculate statistics
  const totalParas = paragraphs.length;
  let dialogueCount = 0;
  paragraphs.forEach((p, idx) => {
    const conf = voiceConfig[idx];
    if (conf?.roleId && conf.roleId !== 'narrator') {
      dialogueCount++;
    }
  });

  // 1. One-click Auto Detect Dialogue Speakers
  const handleAutoDetect = () => {
    setIsAutoDetecting(true);
    try {
      const detected = autoDetectParagraphRoles(paragraphs, cast);
      // Merge with existing
      const updated = { ...voiceConfig, ...detected };
      onUpdateVoiceConfig(updated);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // 2. Export Full Chapter Merged MP3
  const handleExportMp3 = async () => {
    if (isExportingMp3) return;
    setIsExportingMp3(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/export-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'mp3',
          selectedVoiceConfig: voiceConfig,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '导出音频失败');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapterTitle || '有声章节'}_全篇合并配音.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '导出全章音频失败，请稍后重试');
    } finally {
      setIsExportingMp3(false);
    }
  };

  // 3. Export Synced Subtitles (.SRT)
  const handleExportSrt = async () => {
    if (isExportingSrt) return;
    setIsExportingSrt(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/export-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'srt',
          selectedVoiceConfig: voiceConfig,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '导出字幕失败');
      }

      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapterTitle || '有声章节'}_同步字幕.srt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '导出字幕失败，请稍后重试');
    } finally {
      setIsExportingSrt(false);
    }
  };

  // 4. Test Play Voice
  const handleTestPlayVoice = async (voiceId: string) => {
    if (playingVoiceId) return;
    setPlayingVoiceId(voiceId);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '你好，我是豆包大模型语音合成2.0，期待为你呈现最生动的角色配音。',
          voice: voiceId,
          speed: 1.0,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        await audio.play();
      } else {
        setPlayingVoiceId(null);
      }
    } catch {
      setPlayingVoiceId(null);
    }
  };

  // 5. Update individual role's voice
  const handleRoleVoiceChange = (roleId: string, newVoice: string) => {
    const updated = cast.map((r) => (r.id === roleId ? { ...r, voice: newVoice } : r));
    onUpdateCast(updated);
  };

  // 6. Save (Add or Update) Role
  const handleSaveRole = (savedRole: VoiceRole) => {
    const existingIndex = cast.findIndex((r) => r.id === savedRole.id);
    if (existingIndex >= 0) {
      const updated = [...cast];
      updated[existingIndex] = savedRole;
      onUpdateCast(updated);
    } else {
      onUpdateCast([...cast, savedRole]);
    }
  };

  // 7. Delete Role
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (roleId === 'narrator') {
      alert('旁白为基础角色，不可删除');
      return;
    }

    if (!confirm(`确定要删除角色【${roleName}】吗？已分配此角色的段落将自动恢复为旁白。`)) {
      return;
    }

    const updated = cast.filter((r) => r.id !== roleId);
    onUpdateCast(updated);

    // Reset deleted role to narrator in voiceConfig
    const updatedConfig = { ...voiceConfig };
    let changed = false;
    Object.keys(updatedConfig).forEach((k) => {
      const idx = Number(k);
      if (updatedConfig[idx]?.roleId === roleId) {
        updatedConfig[idx] = { ...updatedConfig[idx], roleId: 'narrator' };
        changed = true;
      }
    });
    if (changed) {
      onUpdateVoiceConfig(updatedConfig);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/90 via-indigo-950/90 to-stone-900/90 border border-purple-500/30 rounded-3xl p-4 sm:p-5 text-white shadow-xl backdrop-blur-md mb-6 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
            <Mic className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                <span>AI 有声工坊</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/25 border border-purple-400/30 text-purple-200">
                  Seed-TTS 2.0
                </span>
              </h2>
            </div>
            <p className="text-xs text-purple-200/70">
              共 {totalParas} 段落 · 已分配 {dialogueCount} 处角色台词 · 支持单句MP3与全篇带轴字幕导出
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Smart Detect Button */}
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/40 text-purple-100 font-medium text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            title="自动扫描全文中的引号对话和角色称呼，智能为各段匹配对应声优"
          >
            {isAutoDetecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>智能识别对话角色</span>
          </button>

          {/* Cast Config Toggle */}
          <button
            type="button"
            onClick={() => setIsCastOpen(!isCastOpen)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-xs flex items-center gap-1.5 transition"
            title="展开或折叠声优角色阵容设置"
          >
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span>声优阵容 ({cast.length})</span>
            {isCastOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Export Full MP3 Button */}
          <button
            type="button"
            onClick={handleExportMp3}
            disabled={isExportingMp3}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition active:scale-95"
            title="一键将整章所有段落按照指定声优与语速合并导出为高保真 MP3 文件"
          >
            {isExportingMp3 ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                <span>全章渲染中...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>导出全章MP3</span>
              </>
            )}
          </button>

          {/* Export SRT Subtitles */}
          <button
            type="button"
            onClick={handleExportSrt}
            disabled={isExportingSrt}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium text-xs flex items-center gap-1.5 transition"
            title="导出与音频时间轴精准匹配的 .srt 字幕文件，可直接拖入剪映或 Premiere"
          >
            {isExportingSrt ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
            )}
            <span>导出字幕(SRT)</span>
          </button>
        </div>
      </div>

      {/* Expandable Voice Cast Management Panel */}
      {isCastOpen && (
        <div className="pt-3 border-t border-purple-500/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header of Cast Panel with Add Role button */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-200">
                配音声优阵容 ({cast.length} 位角色)
              </span>
              <span className="text-[11px] text-purple-300/60 hidden sm:inline">
                · 支持自定义增加新角色、更换声线与设置色彩标识
              </span>
            </div>

            {/* Add New Custom Role Button */}
            <button
              type="button"
              onClick={() => {
                setEditingRole(null);
                setIsAddRoleOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="新增自定义角色（如女配角、反派手下、神秘人、系统音等）"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增角色</span>
            </button>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cast.map((role) => {
              const currentVoiceObj = DOUBAO_VOICES.find((v) => v.id === role.voice);

              return (
                <div
                  key={role.id}
                  className="bg-black/25 border border-purple-400/20 rounded-2xl p-3 flex flex-col justify-between space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getRoleDotClass(role.color)}`} />
                      <span className="font-bold text-xs text-stone-100">{role.name}</span>
                      {role.isCustom && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/30">
                          自定义
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Role Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRole(role);
                          setIsAddRoleOpen(true);
                        }}
                        className="p-1 px-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/30 transition text-[11px] flex items-center gap-0.5"
                        title="修改角色名称、色彩与简介"
                      >
                        <Edit2 className="w-3 h-3 text-purple-300" />
                        <span className="hidden sm:inline">编辑</span>
                      </button>

                      {/* Delete Role Button (narrator cannot be deleted) */}
                      {role.id !== 'narrator' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="p-1 px-1.5 rounded-lg text-stone-400 hover:text-red-300 hover:bg-red-500/20 transition text-[11px]"
                          title="删除此角色"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}

                      {/* Search Library Button */}
                      <button
                        type="button"
                        onClick={() => setModalRole(role)}
                        className="p-1 px-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/30 transition text-[11px] flex items-center gap-0.5 border border-purple-500/30"
                        title="打开官方音色库进行分类筛选与搜索"
                      >
                        <Search className="w-3 h-3 text-purple-300" />
                        <span>换音色</span>
                      </button>

                      {/* Play Voice Sample Button */}
                      <button
                        type="button"
                        onClick={() => handleTestPlayVoice(role.voice)}
                        disabled={playingVoiceId === role.voice}
                        className="p-1 px-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/30 transition text-[11px] flex items-center gap-0.5 border border-purple-500/20"
                        title="试听当前声优原声"
                      >
                        {playingVoiceId === role.voice ? (
                          <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        <span>试听</span>
                      </button>
                    </div>
                  </div>

                  {/* Voice Selector Dropdown */}
                  <div>
                    <select
                      value={role.voice}
                      onChange={(e) => handleRoleVoiceChange(role.id, e.target.value)}
                      className="w-full bg-stone-900/90 border border-purple-500/30 rounded-xl px-2.5 py-1.5 text-xs text-purple-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    >
                      {DOUBAO_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10.5px] text-stone-400 mt-1 line-clamp-1">
                      {currentVoiceObj?.description || role.description || ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice Selector & Search Modal */}
      <VoiceSelectorModal
        isOpen={!!modalRole}
        onClose={() => setModalRole(null)}
        currentVoiceId={modalRole?.voice}
        roleName={modalRole?.name}
        onSelectVoice={(voiceId) => {
          if (modalRole) {
            handleRoleVoiceChange(modalRole.id, voiceId);
          }
        }}
      />

      {/* Role Create & Edit Modal */}
      <RoleEditModal
        isOpen={isAddRoleOpen}
        onClose={() => {
          setIsAddRoleOpen(false);
          setEditingRole(null);
        }}
        roleToEdit={editingRole}
        onSaveRole={handleSaveRole}
      />
    </div>
  );
}

