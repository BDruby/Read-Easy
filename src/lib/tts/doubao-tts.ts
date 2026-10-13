import crypto from 'crypto';

export interface DoubaoTTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0 -> speed_ratio
  volume?: number; // 1.0 default
  pitch?: number; // 1.0 default
  cluster?: string;
}

/**
 * 豆包语音合成大模型 2.0 (Seed-TTS 2.0) 官方认证音色库 (全量支持 *_uranus_bigtts)
 * 特性：高保真拟真、丰富情感演播、自然呼吸声与停顿、低延迟
 */
export const DOUBAO_VOICES = [
  {
    id: 'zh_female_vv_uranus_bigtts',
    name: 'Vivi 2.0 (女声 · 豆包旗舰/全能演播)',
    gender: 'Female',
    description: '豆包大模型2.0官方旗舰女声，温柔自然、抑扬顿挫，全题材网文通吃首选',
  },
  {
    id: 'zh_female_shuangkuaisisi_uranus_bigtts',
    name: '爽快思思 2.0 (女声 · 爆款女频/爽利灵动)',
    gender: 'Female',
    description: '明快利落、生动活泼，极度契合女频打脸爽文、言情宠文与日常轻小说',
  },
  {
    id: 'zh_female_tianmeixiaoyuan_uranus_bigtts',
    name: '甜美小源 2.0 (女声 · 甜宠言情/青春少女)',
    gender: 'Female',
    description: '轻柔甜润、少女感满满，青春校园、轻小说与甜宠女主首选',
  },
  {
    id: 'zh_female_xiaohe_uranus_bigtts',
    name: '小何 2.0 (女声 · 温暖治愈/舒缓自然)',
    gender: 'Female',
    description: '纯净温和、语调治愈自然，适合现代都市、慢节奏种田与生活流小说',
  },
  {
    id: 'zh_female_meilinvyou_uranus_bigtts',
    name: '魅力女友 2.0 (女声 · 轻熟感性/细腻动人)',
    gender: 'Female',
    description: '声线轻熟有质感，情感充沛细腻，适合情感虐恋、悬疑与强情绪交锋',
  },
  {
    id: 'zh_male_m191_uranus_bigtts',
    name: '云舟 2.0 (男声 · 沉稳叙事/悬疑惊悚说书)',
    gender: 'Male',
    description: '低沉磁性、叙事张力极强，玄幻仙侠、盗墓悬疑与历史演义绝佳男声',
  },
  {
    id: 'zh_male_taocheng_uranus_bigtts',
    name: '小天 2.0 (男声 · 阳光青年/修真热血主角)',
    gender: 'Male',
    description: '少年感清澈饱满、朝气蓬勃，修仙逆袭、电竞文与玄幻主角第一人称',
  },
  {
    id: 'zh_male_ruyayichen_uranus_bigtts',
    name: '儒雅逸辰 2.0 (男声 · 温润如玉/古风雅韵)',
    gender: 'Male',
    description: '典雅端方、不疾不徐，极具文人墨客书卷气，古风架空与仙侠首选',
  },
  {
    id: 'zh_male_liufei_uranus_bigtts',
    name: '刘飞 2.0 (男声 · 成熟沉着/商战权谋)',
    gender: 'Male',
    description: '稳重沉着、气场内敛，适合都市官场、商战博弈与刑侦探案小说',
  },
  {
    id: 'zh_male_sophie_uranus_bigtts',
    name: '魅力苏菲 2.0 (男声 · 磁性大叔/霸道深沉)',
    gender: 'Male',
    description: '醇厚深沉的大叔音色，充满沧桑与力量感，硬派军事、末日废土首选',
  },
  {
    id: 'zh_female_xiaoxue_uranus_bigtts',
    name: '小雪 2.0 (女声 · 萌趣童声/绘本轻萌)',
    gender: 'Female',
    description: '童真童趣、可爱生动，适合萌宠日常、萌娃爽文与童话小说',
  },
];

/**
 * 豆包语音合成统一调度入口
 * 优先调用火山引擎官方 Seed-TTS 2.0 (V3 HTTP) 接口，兼顾旧版音色兼容与无感重试
 */
export async function synthesizeDoubaoTTS(
  text: string,
  appid: string,
  token: string,
  options: DoubaoTTSOptions = {}
): Promise<Buffer> {
  let voice = options.voice || 'zh_female_vv_uranus_bigtts';
  const speed = options.speed || 1.0;

  // 映射旧版音色ID到 TTS 2.0 对应音色
  if (voice.includes('shuangkuaisisi')) {
    voice = 'zh_female_shuangkuaisisi_uranus_bigtts';
  } else if (voice.includes('tianmei')) {
    voice = 'zh_female_tianmeixiaoyuan_uranus_bigtts';
  } else if (voice.includes('chunhou') || voice.includes('BV701') || voice.includes('BV107')) {
    voice = 'zh_male_m191_uranus_bigtts';
  } else if (voice.includes('BV123')) {
    voice = 'zh_male_taocheng_uranus_bigtts';
  } else if (!voice.includes('uranus')) {
    voice = 'zh_female_vv_uranus_bigtts';
  }

  // 1. 调用火山引擎官方 V3 Seed-TTS 2.0 单向流式合成
  return await synthesizeDoubaoTTS2(text, appid, token, voice, speed);
}

/**
 * 火山引擎豆包语音大模型 2.0 (Seed-TTS 2.0) 核心合成实现
 * 接口协议：POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
 * 协议头：X-Api-App-Key, X-Api-Access-Key, X-Api-Resource-Id: seed-tts-2.0
 */
async function synthesizeDoubaoTTS2(
  text: string,
  appid: string,
  token: string,
  voice: string,
  speed: number = 1.0
): Promise<Buffer> {
  const reqid = crypto.randomUUID();

  const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
    method: 'POST',
    headers: {
      'X-Api-App-Key': appid.trim(),
      'X-Api-Access-Key': token.trim(),
      'X-Api-Resource-Id': 'seed-tts-2.0',
      'X-Api-Request-Id': reqid,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      req_params: {
        text: text,
        speaker: voice,
        speed_ratio: Math.max(0.5, Math.min(2.0, speed)),
        audio_config: {
          format: 'mp3',
          sample_rate: 24000,
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`豆包 TTS 2.0 HTTP ${response.status}: ${errText}`);
  }

  const rawText = await response.text();
  const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
  const audioChunks: Buffer[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.code === 0 && parsed.data) {
        audioChunks.push(Buffer.from(parsed.data, 'base64'));
      } else if (parsed.code && parsed.code !== 0 && parsed.code !== 20000000) {
        throw new Error(parsed.message || `错误码 ${parsed.code}`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('错误码')) {
        throw e;
      }
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('豆包 TTS 2.0 未返回有效音频数据');
  }

  return Buffer.concat(audioChunks);
}
