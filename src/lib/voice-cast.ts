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
  emotion?: string;
  customPrompt?: string;
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
    voice: 'zh_male_dayi_uranus_bigtts',
    gender: 'Male',
    color: 'purple',
    description: '大义 2.0 · 沧桑沉稳的大叔音、威严长辈与霸气反派',
  },
];

export interface EmotionPreset {
  id: string;
  name: string;
  speed: number;
  icon: string;
  desc: string;
  prompt?: string;
  category: 'emotion' | 'dialect' | 'atmosphere';
}

export const EMOTION_PRESETS: EmotionPreset[] = [
  { id: 'normal', name: '平稳叙述', speed: 1.0, icon: '📖', desc: '标准语速，沉稳自然', category: 'emotion' },
  { id: 'fight', name: '吵架质问', speed: 1.15, icon: '💥', desc: '用很生气、吵架、激烈的语气对话', prompt: '用很生气、吵架、激烈的语气对话', category: 'emotion' },
  { id: 'whisper', name: '暧昧耳语', speed: 0.9, icon: '🤫', desc: '用悄悄话的语气来试试撩撩我，非常温柔耳语', prompt: '用悄悄话的语气来试试撩撩我，非常温柔耳语', category: 'emotion' },
  { id: 'spoiled', name: '撒娇卖萌', speed: 1.05, icon: '🎀', desc: '用撒娇卖萌、软糯甜美的语气说话', prompt: '用撒娇卖萌、软糯甜美的语气说话', category: 'emotion' },
  { id: 'crying', name: '悲伤哭腔', speed: 0.85, icon: '😭', desc: '带着哽咽、悲伤快要哭出来的语气', prompt: '带着哽咽、悲伤快要哭出来的语气', category: 'emotion' },
  { id: 'creepy', name: '阴森惊悚', speed: 0.9, icon: '👻', desc: '压低声音、阴森恐惧的语气说话', prompt: '用压低声音、阴森恐惧的语气说话', category: 'atmosphere' },
  { id: 'majestic', name: '霸道威严', speed: 0.95, icon: '👑', desc: '威严霸道、不怒自威的帝王语气', prompt: '用威严霸道、不怒自威的帝王语气说话', category: 'atmosphere' },
  { id: 'sarcastic', name: '冷嘲热讽', speed: 1.05, icon: '😏', desc: '充满嘲弄、轻蔑冷笑的语气', prompt: '用充满嘲弄、轻蔑冷笑的语气说话', category: 'emotion' },
  { id: 'dialect_dongbei', name: '东北方言', speed: 1.05, icon: '🥟', desc: '用很纯正地道的东北话口音朗读', prompt: '用很纯正地道的东北话口音朗读', category: 'dialect' },
  { id: 'dialect_sichuan', name: '四川方言', speed: 1.0, icon: '🌶️', desc: '用地道的四川话方言语气朗读', prompt: '用地道的四川话方言语气朗读', category: 'dialect' },
  { id: 'dialect_beijing', name: '北京京腔', speed: 1.0, icon: '🏮', desc: '用一口地道北京腔、带儿化音的语气朗读', prompt: '用一口地道北京腔、带儿化音的语气朗读', category: 'dialect' },
  { id: 'excited', name: '慷慨激昂', speed: 1.15, icon: '🔥', desc: '语速加快，情绪充沛激昂', prompt: '用慷慨激昂、斗志昂扬的热血语气说话', category: 'emotion' },
  { id: 'cheerful', name: '轻快俏皮', speed: 1.1, icon: '🌸', desc: '欢快灵动，生活轻喜剧', prompt: '用欢快俏皮、轻松愉悦的语气说话', category: 'emotion' },
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
    let matchedEmotion: string = 'normal';

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

      // 智能情绪识别
      if (trimmed.includes('吵') || trimmed.includes('滚') || trimmed.includes('闭嘴') || trimmed.includes('放肆') || trimmed.includes('怒') || trimmed.includes('大喝') || trimmed.includes('杀')) {
        matchedEmotion = 'fight';
      } else if (trimmed.includes('哭') || trimmed.includes('泣') || trimmed.includes('泪') || trimmed.includes('哽咽') || trimmed.includes('痛')) {
        matchedEmotion = 'crying';
      } else if (trimmed.includes('悄悄') || trimmed.includes('耳边') || trimmed.includes('低语') || trimmed.includes('温存')) {
        matchedEmotion = 'whisper';
      } else if (trimmed.includes('撒娇') || trimmed.includes('求求') || trimmed.includes('讨厌啦')) {
        matchedEmotion = 'spoiled';
      }
    }

    result[idx] = {
      roleId: matchedRole.id,
      emotion: matchedEmotion,
    };
  });

  return result;
}
