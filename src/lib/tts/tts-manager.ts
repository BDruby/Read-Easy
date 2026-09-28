import { prisma } from '../prisma';
import { synthesizeEdgeTTS } from './edge-tts';
import { preprocessTTSText } from '../parser';
import crypto from 'crypto';

export type TTSProvider = 'edge';

export interface TTSRequest {
  text: string;
  provider?: TTSProvider | string;
  voice?: string;
  speed?: number; // 0.5 - 2.0
  strict?: boolean;
}

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
  providerUsed: string;
}

// Global server memory cache (LRU, max 1000 entries)
const serverTtsCache = new Map<string, { buffer: Buffer; contentType: string; provider: string }>();

// Minimal silent MP3 frame for inaudible/pure-divider lines
const SILENT_MP3 = Buffer.from(
  '//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAA2wADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw==',
  'base64'
);

function getCacheKey(voice: string, speed: number, text: string) {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  return `edge::${voice}::${speed.toFixed(2)}::${hash}`;
}

function setCache(key: string, data: { buffer: Buffer; contentType: string; provider: string }) {
  if (serverTtsCache.size > 1000) {
    const firstKey = serverTtsCache.keys().next().value;
    if (firstKey) serverTtsCache.delete(firstKey);
  }
  serverTtsCache.set(key, data);
}

export async function getSystemSettingsMap(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  } catch (e) {
    console.error('Failed to read system settings from DB, falling back to defaults:', e);
    return {};
  }
}

/**
 * 统一语音合成调度器 (专注 Microsoft Edge Neural 顶级神经语音)
 * 默认音色：云健 (影视评书/热血说书男声)
 * 特性：完全免费、零Token、响应快、MD5内存极速缓存、空行与符号智能跳读
 */
export async function synthesizeSpeech(request: TTSRequest): Promise<TTSResult> {
  const settings = await getSystemSettingsMap();
  const speed = request.speed || 1.0;
  const edgeRate = speed === 1.0 ? '+0%' : `${speed > 1.0 ? '+' : ''}${Math.round((speed - 1.0) * 100)}%`;

  // 1. 智能预处理文本：过滤空段与纯符号分割线
  const { cleanText, isAudible } = preprocessTTSText(request.text);
  if (!isAudible || cleanText.length === 0) {
    return {
      audioBuffer: SILENT_MP3,
      contentType: 'audio/mp3',
      providerUsed: 'skipped (inaudible)',
    };
  }

  // 默认音色：云健 (zh-CN-YunjianNeural)
  const voice = request.voice || settings['edge_voice'] || 'zh-CN-YunjianNeural';

  // 2. 内存 LRU 极速缓存检测 (根据文本 MD5 哈希秒级命中)
  const cacheKey = getCacheKey(voice, speed, cleanText);
  const cached = serverTtsCache.get(cacheKey);
  if (cached) {
    return {
      audioBuffer: cached.buffer,
      contentType: cached.contentType,
      providerUsed: 'edge (cached)',
    };
  }

  // 3. 微软 Edge Neural 神经语音合成
  const buf = await synthesizeEdgeTTS(cleanText, {
    voice,
    rate: edgeRate,
  });

  const result: TTSResult = {
    audioBuffer: buf,
    contentType: 'audio/mp3',
    providerUsed: 'edge',
  };

  setCache(cacheKey, {
    buffer: buf,
    contentType: 'audio/mp3',
    provider: 'edge',
  });
  return result;
}
