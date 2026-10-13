import https from 'https';

/**
 * Split text into small sentence chunks for fast parallel TTS synthesis
 * (Each chunk is around 60-90 characters, split along Chinese punctuation)
 */
export function splitSentences(text: string, maxLen = 80): string[] {
  const parts = text.match(/[^。！？；\n]+[。！？；\n]?/g) || [text];
  const chunks: string[] = [];
  let cur = '';

  for (const p of parts) {
    if ((cur + p).length > maxLen) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }

  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
}

function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 7000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const data: Buffer[] = [];
      res.on('data', (c) => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TTS request timed out'));
    });

    req.on('error', reject);
  });
}

export interface VoiceProfile {
  engine: 'baidu' | 'google';
  pitch?: number;
  tl?: string;
}

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // 1. 云健 (影视评书/热血说书男声) -> 沉雄低沉，抑扬起伏
  'zh-CN-YunjianNeural': {
    engine: 'baidu',
    pitch: 3,
  },
  // 2. 云希 (沉浸小说/故事男声) -> 沉稳中低音，耐听娓娓道来
  'zh-CN-YunxiNeural': {
    engine: 'baidu',
    pitch: 4,
  },
  // 3. 云扬 (新闻主播/专业沉稳男声) -> 清朗标准播音音调
  'zh-CN-YunyangNeural': {
    engine: 'baidu',
    pitch: 5,
  },
  // 4. 云夏 (热血少年/生动自然男声) -> 少年清脆高亢
  'zh-CN-YunxiaNeural': {
    engine: 'baidu',
    pitch: 7,
  },
  // 5. 晓晓 (温暖柔和/女主播女声) -> 标准温润女主播
  'zh-CN-XiaoxiaoNeural': {
    engine: 'baidu',
    pitch: 5,
  },
  // 6. 晓伊 (多情感女声/甜美轻快) -> 清亮甜美少女高音
  'zh-CN-XiaoyiNeural': {
    engine: 'baidu',
    pitch: 8,
  },
  // 7. 东北晓北 (幽默诙谐方言女声) -> 亲切醇厚生活女声
  'zh-CN-liaoning-XiaobeiNeural': {
    engine: 'baidu',
    pitch: 4,
  },
  // 8. 陕西晓妮 (豪爽西北方言女声) -> 豪爽质朴女声
  'zh-CN-shaanxi-XiaoniNeural': {
    engine: 'baidu',
    pitch: 6,
  },
  // 9. 晓曼 (粤语女声) -> 柔美台湾腔/粤语腔
  'zh-HK-HiuMaanNeural': {
    engine: 'google',
    tl: 'zh-TW',
  },
  // 10. 晓臻 (台湾国语女声) -> 正宗台湾甜美国语女声
  'zh-TW-HsiaoChenNeural': {
    engine: 'google',
    tl: 'zh-TW',
  },
};

/**
 * Baidu Translate TTS: High stability, pure MP3 stream, natural Chinese pronunciation
 */
async function fetchBaiduChunk(chunkText: string, speed = 1.0, pitch = 5): Promise<Buffer> {
  const spd = Math.max(1, Math.min(9, Math.round(5 + (speed - 1.0) * 4)));
  const url = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(chunkText)}&spd=${spd}&source=web&pit=${pitch}`;

  return fetchWithTimeout(url, {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://fanyi.baidu.com/',
  });
}

/**
 * Google Translate TTS: Secondary global fallback / Taiwan voice
 */
async function fetchGoogleChunk(chunkText: string, tl = 'zh-CN'): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunkText)}&tl=${tl}&client=tw-ob`;

  return fetchWithTimeout(url, {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://translate.google.com/',
  });
}

/**
 * Synthesizes a single chunk according to selected voice profile
 */
async function synthesizeChunkWithFallback(chunkText: string, speed = 1.0, voice = 'zh-CN-YunjianNeural'): Promise<Buffer> {
  const profile = VOICE_PROFILES[voice] || { engine: 'baidu', pitch: 5 };

  // If voice specifically prefers Google (e.g. Taiwan Mandarin 晓臻)
  if (profile.engine === 'google') {
    try {
      const buf = await fetchGoogleChunk(chunkText, profile.tl || 'zh-TW');
      if (buf.length > 300) return buf;
    } catch (err: any) {
      console.warn(`[FallbackTTS] Google chunk failed (${err?.message}), falling back to Baidu...`);
    }
  }

  // Primary: Baidu TTS with dedicated pitch tuning
  try {
    const buf = await fetchBaiduChunk(chunkText, speed, profile.pitch || 5);
    if (buf.length > 300) return buf;
  } catch (err: any) {
    console.warn(`[FallbackTTS] Baidu chunk failed (${err?.message}), trying Google TTS...`);
  }

  // Global backup: Google Translate TTS
  try {
    const buf = await fetchGoogleChunk(chunkText, 'zh-CN');
    if (buf.length > 300) return buf;
  } catch (err: any) {
    console.warn(`[FallbackTTS] Google backup failed: ${err?.message}`);
  }

  throw new Error('All TTS fallback providers failed for chunk');
}

/**
 * Main Fallback Speech Synthesizer
 * Splits paragraph text into sentences, synthesizes them in parallel, and stitches the MP3 streams
 */
export async function synthesizeFallbackTTS(text: string, speed = 1.0, voice = 'zh-CN-YunjianNeural'): Promise<Buffer> {
  const chunks = splitSentences(text);
  if (chunks.length === 0) {
    throw new Error('No audible text chunks to synthesize');
  }

  const audioParts = await Promise.all(
    chunks.map((chunk) => synthesizeChunkWithFallback(chunk, speed, voice))
  );

  return Buffer.concat(audioParts);
}
