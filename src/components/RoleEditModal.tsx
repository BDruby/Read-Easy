'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Sparkles,
  Headphones,
  Check,
  Search,
} from 'lucide-react';
import { VoiceRole, ROLE_COLOR_OPTIONS } from '@/lib/voice-cast';
import { DOUBAO_VOICES } from '@/lib/tts/doubao-tts';
import { VoiceSelectorModal } from './VoiceSelectorModal';

interface RoleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: VoiceRole | null;
  onSaveRole: (role: VoiceRole) => void;
}

export function RoleEditModal({
  isOpen,
  onClose,
  roleToEdit,
  onSaveRole,
}: RoleEditModalProps) {
  const isEditing = !!roleToEdit;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [color, setColor] = useState('emerald');
  const [voice, setVoice] = useState('zh_male_m191_uranus_bigtts');
  const [description, setDescription] = useState('');
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setGender(roleToEdit.gender);
      setColor(roleToEdit.color);
      setVoice(roleToEdit.voice);
      setDescription(roleToEdit.description || '');
    } else {
      // Default for new role
      setName('');
      setGender('Male');
      setColor('emerald');
      setVoice('zh_male_m191_uranus_bigtts');
      setDescription('');
    }
  }, [roleToEdit, isOpen]);

  const currentVoiceObj = DOUBAO_VOICES.find((v) => v.id === voice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('请输入角色名称');
      return;
    }

    const savedRole: VoiceRole = {
      id: roleToEdit ? roleToEdit.id : `role_${Date.now()}`,
      name: trimmedName,
      voice,
      gender,
      color,
      description: description.trim() || undefined,
      isCustom: true,
    };

    onSaveRole(savedRole);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-stone-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-stone-100 animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-stone-100">
                {isEditing ? `编辑角色 · ${roleToEdit?.name}` : '✨ 新增配音角色'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                角色名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：萧薰儿、药老、反派魔头、系统音、掌柜..."
                className="w-full bg-stone-950 border border-stone-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
            </div>

            {/* Gender Toggle */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                角色性别
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGender('Male');
                    if (currentVoiceObj?.gender === 'Female') {
                      setVoice('zh_male_m191_uranus_bigtts');
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    gender === 'Male'
                      ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-xs'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>男声角色</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGender('Female');
                    if (currentVoiceObj?.gender === 'Male') {
                      setVoice('zh_female_tianmeixiaoyuan_uranus_bigtts');
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    gender === 'Female'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-xs'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>女声角色</span>
                </button>
              </div>
            </div>

            {/* Badge Color Selection */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                角色标识色彩（用于剧本高亮与气泡区分）
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition ${
                      color === c.id
                        ? 'border-purple-400 bg-purple-900/40 text-purple-200 ring-1 ring-purple-400'
                        : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Assignment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-300">
                  分配官方声线 (Seed-TTS 2.0)
                </label>
                <button
                  type="button"
                  onClick={() => setIsVoicePickerOpen(true)}
                  className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 transition"
                >
                  <Search className="w-3 h-3" />
                  <span>库中搜索与试听</span>
                </button>
              </div>

              {/* Voice Card display */}
              <div
                onClick={() => setIsVoicePickerOpen(true)}
                className="bg-stone-950/80 border border-stone-800 hover:border-purple-500/50 rounded-xl p-2.5 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-stone-200">
                      {currentVoiceObj?.name || voice}
                    </p>
                    <p className="text-[10.5px] text-stone-400 line-clamp-1">
                      {currentVoiceObj?.description || '豆包大模型 2.0 官方精品演播音色'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-purple-400 underline whitespace-nowrap ml-2">
                  更换
                </span>
              </div>
            </div>

            {/* Description / Personality */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                角色人设或声线备注 (选填)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：冷傲高贵、语调清冷但暗藏柔情..."
                className="w-full bg-stone-950 border border-stone-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs text-stone-400 hover:bg-stone-800 transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition"
              >
                {isEditing ? '保存修改' : '确认添加'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Voice Picker Modal */}
      <VoiceSelectorModal
        isOpen={isVoicePickerOpen}
        onClose={() => setIsVoicePickerOpen(false)}
        currentVoiceId={voice}
        roleName={name || '新建角色'}
        onSelectVoice={(newVoiceId) => {
          setVoice(newVoiceId);
          const found = DOUBAO_VOICES.find((v) => v.id === newVoiceId);
          if (found) {
            setGender(found.gender);
          }
        }}
      />
    </>
  );
}
