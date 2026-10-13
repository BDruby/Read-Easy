import { DOUBAO_VOICES } from './tts/doubao-tts';

export interface VoiceRole {
  id: string;
  name: string;
  voice: string;
  gender: 'Male' | 'Female';
  color: string;
  description?: string;
}

export interface ParagraphVoiceSetting {
  roleId?: string;
  emotion?: 'normal' | 'excited' | 'sad' | 'scary' | 'cheerful';
  speed?: number;
}

export const DEFAULT_VOICE_CAST: VoiceRole[] = [
  {
    id: 'narrator',
    name: '旁白',
    voice: 'zh_female_vv_uranus_bigtts',
    gender: 'Female',
    color: 'amber',
    description: 'Vivi 2.0 · 温柔自然，负责场景与背景描写',
  },
  {
    id: 'male_lead',
    name: '男主角',
    voice: 'zh_male_taocheng_uranus_bigtts',
    gender: 'Male',
    color: 'blue',
    description: '小天 2.0 · 阳光少年音，热血冲劲十足',
  },
  {
    id: 'female_lead',
    name: '女主角',
    voice: 'zh_female_tianmeixiaoyuan_uranus_bigtts',
    gender: 'Female',
    color: 'rose',
    description: '甜美小源 2.0 · 灵动甜美，少女感充沛',
  },
  {
    id: 'storyteller',
    name: '说书人/沉稳男声',
    voice: 'zh_male_m191_uranus_bigtts',
    gender: 'Male',
    color: 'indigo',
    description: '云舟 2.0 · 低沉磁性，悬疑与大场面叙述',
  },
  {
    id: 'mature_male',
    name: '长辈/反派',
    voice: 'zh_male_sophie_uranus_bigtts',
    gender: 'Male',
    color: 'purple',
    description: '魅力苏菲 2.0 · 沧桑沉稳的大叔音',
  },
];

export const EMOTION_PRESETS = [
  { id: 'normal', name: '平稳叙述', speed: 1.0, icon: '📖', desc: '标准语速，沉稳自然' },
  { id: 'excited', name: '慷慨激昂', speed: 1.15, icon: '🔥', desc: '语速加快，情绪充沛激昂' },
  { id: 'sad', name: '低落哀伤', speed: 0.85, icon: '💔', desc: '语速放缓，声调低沉' },
  { id: 'scary', name: '惊悚悬疑', speed: 0.9, icon: '👻', desc: '压低声线，氛围压抑紧绷' },
  { id: 'cheerful', name: '轻快俏皮', speed: 1.1, icon: '🌸', desc: '欢快灵动，生活轻喜剧' },
];

/**
 * 智能剧本检测：识别小说中的对话前缀（例如：萧炎道：“……” 或 [萧炎] 等）
 * 并自动建议匹配的角色 ID
 */
export function autoDetectParagraphRoles(
  paragraphs: string[],
  cast: VoiceRole[] = DEFAULT_VOICE_CAST
): Record<number, ParagraphVoiceSetting> {
  const result: Record<number, ParagraphVoiceSetting> = {};

  const maleLead = cast.find((c) => c.id === 'male_lead') || cast[1];
  const femaleLead = cast.find((c) => c.id === 'female_lead') || cast[2];
  const matureMale = cast.find((c) => c.id === 'mature_male') || cast[4];
  const narrator = cast.find((c) => c.id === 'narrator') || cast[0];

  paragraphs.forEach((text, idx) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. 如果段落以引号开头或包含说话标记
    const hasQuotes = trimmed.includes('“') || trimmed.includes('"') || trimmed.includes('「');
    
    // 常见男性角色前缀词
    const maleKeywords = ['他', '少年', '青年', '弟子', '林辰', '萧炎', '男主', '小天', '哥', '兄弟'];
    // 常见女性角色前缀词
    const femaleKeywords = ['她', '少女', '姑娘', '师妹', '小姐', '薰儿', '小医仙', '女主', '小玲', '姐'];
    // 常见长辈/反派前缀词
    const matureKeywords = ['老者', '长老', '师尊', '掌门', '家主', '宗主', '父亲', '老头', '敌人', '魔头'];

    let matchedRole = narrator;
    let matchedEmotion: 'normal' | 'excited' | 'sad' | 'scary' | 'cheerful' = 'normal';

    if (hasQuotes) {
      if (matureKeywords.some((k) => trimmed.slice(0, 15).includes(k))) {
        matchedRole = matureMale || narrator;
      } else if (femaleKeywords.some((k) => trimmed.slice(0, 15).includes(k))) {
        matchedRole = femaleLead || narrator;
      } else if (maleKeywords.some((k) => trimmed.slice(0, 15).includes(k))) {
        matchedRole = maleLead || narrator;
      } else {
        // 纯对话但未匹配到明显名字，交替分配或默认主角
        matchedRole = maleLead || narrator;
      }

      // 情绪粗检
      if (trimmed.includes('！') || trimmed.includes('怒') || trimmed.includes('大喝') || trimmed.includes('杀')) {
        matchedEmotion = 'excited';
      } else if (trimmed.includes('哭') || trimmed.includes('泣') || trimmed.includes('叹息') || trimmed.includes('痛')) {
        matchedEmotion = 'sad';
      }
    }

    result[idx] = {
      roleId: matchedRole.id,
      emotion: matchedEmotion,
    };
  });

  return result;
}
