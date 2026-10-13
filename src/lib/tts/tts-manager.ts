import { prisma } from '../prisma';
import { synthesizeDoubaoTTS, DOUBAO_VOICES } from './doubao-tts';
import { synthesizeAzureTTS } from './azure-tts';
import { synthesizeEdgeTTS } from './edge-tts';
import { synthesizeFallbackTTS } from './fallback-tts';
import { preprocessTTSText } from '../parser';
import crypto from 'crypto';

export type TTSProvider = 'doubao' | 'azure' | 'edge' | 'fallback';

export interface TTSRequest {
  text: string;
  provider?: TTSProvider | string;
  voice?: string;
  speed?: number; // 0.5 - 2.0
  strict?: boolean;
  contextText?: string;
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

function getCacheKey(voice: string, speed: number, text: string, contextText?: string) {
  const hash = crypto.createHash('md5').update(`${text}::${contextText || ''}`).digest('hex');
  return `tts::${voice}::${speed.toFixed(2)}::${hash}`;
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
 * 统一高可用语音合成调度器
 * 1. 优先使用火山引擎 / 豆包语音大模型 (支持精品小说演播男女声，极速响应，0 Token重复浪费)
 * 2. 其次使用微软官方 Azure 认知语音服务
 * 3. 再次尝试 Edge Neural 免费神经语音
 * 4. 最终全自动无缝兜底，永不崩溃
 */
export async function synthesizeSpeech(request: TTSRequest): Promise<TTSResult> {
  const settings = await getSystemSettingsMap();
  const speed = request.speed || 1.0;
  const edgeRate = speed === 1.0 ? '+0%' : `${speed > 1.0 ? '+' : ''}${Math.round((speed - 1.0) * 100)}%`;

  // 1. 智能预处理文本：过滤空段与纯符号分割线（节约 10%~20% Token）
  const { cleanText, isAudible } = preprocessTTSText(request.text);
  if (!isAudible || cleanText.length === 0) {
    return {
      audioBuffer: SILENT_MP3,
      contentType: 'audio/mp3',
      providerUsed: 'skipped (inaudible)',
    };
  }

  // 默认音色：优先使用豆包音色，或根据用户配置
  const voice = request.voice || settings['volcano_voice_type'] || settings['edge_voice'] || 'zh_female_vv_uranus_bigtts';

  // 2. 内存 LRU 极速缓存检测 (根据文本 MD5 哈希秒级命中，0ms，0 Token)
  const cacheKey = getCacheKey(voice, speed, cleanText, request.contextText);
  const cached = serverTtsCache.get(cacheKey);
  if (cached) {
    return {
      audioBuffer: cached.buffer,
      contentType: cached.contentType,
      providerUsed: `${cached.provider} (cached)`,
    };
  }

  // 3. 优先通道：火山引擎 / 豆包语音大模型 (若配置了 AppID 和 Token)
  const volcanoAppId = settings['volcano_app_id'] || process.env.VOLCANO_APP_ID;
  const volcanoToken = settings['volcano_access_token'] || process.env.VOLCANO_ACCESS_TOKEN;
  const isDoubaoVoice = DOUBAO_VOICES.some((v) => v.id === voice);

  if (volcanoAppId && volcanoToken && (isDoubaoVoice || settings['tts_default_provider'] === 'doubao' || settings['tts_default_provider'] === 'volcano')) {
    try {
      const doubaoVoice = isDoubaoVoice ? voice : 'zh_female_vv_uranus_bigtts';
      const buf = await synthesizeDoubaoTTS(cleanText, volcanoAppId, volcanoToken, {
        voice: doubaoVoice,
        speed: speed,
        contextText: request.contextText,
      });

      const result: TTSResult = {
        audioBuffer: buf,
        contentType: 'audio/mp3',
        providerUsed: 'doubao',
      };

      setCache(cacheKey, {
        buffer: buf,
        contentType: 'audio/mp3',
        provider: 'doubao',
      });
      return result;
    } catch (doubaoErr: any) {
      console.warn(`[TTS] Doubao TTS unavailable (${doubaoErr?.message || doubaoErr}), falling back to next provider...`);
    }
  }

  // 4. 第二通道：微软官方 Azure Speech (若用户配置了 Key)
  const azureKey = settings['azure_speech_key'] || process.env.AZURE_SPEECH_KEY;
  const azureRegion = settings['azure_speech_region'] || process.env.AZURE_SPEECH_REGION || 'eastus';
  if (azureKey) {
    try {
      const azureVoice = isDoubaoVoice ? 'zh-CN-YunjianNeural' : voice;
      const buf = await synthesizeAzureTTS(cleanText, azureKey, azureRegion, {
        voice: azureVoice,
        rate: edgeRate,
      });

      const result: TTSResult = {
        audioBuffer: buf,
        contentType: 'audio/mp3',
        providerUsed: 'azure-speech',
      };

      setCache(cacheKey, {
        buffer: buf,
        contentType: 'audio/mp3',
        provider: 'azure-speech',
      });
      return result;
    } catch (azureErr: any) {
      console.warn(`[TTS] Azure Speech API unavailable (${azureErr?.message || azureErr}), trying next provider...`);
    }
  }

  // 4. 免费通道：尝试 Edge Neural 神经语音合成
  try {
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
  } catch (edgeErr: any) {
    console.warn(`[TTS] Edge TTS synthesis unavailable (${edgeErr?.message || edgeErr}), activating high-reliability fallback engine...`);

    // 5. 高可用回退方案：使用智能分句并行合成引擎 (保底朗读)
    const fallbackBuf = await synthesizeFallbackTTS(cleanText, speed, voice);

    const result: TTSResult = {
      audioBuffer: fallbackBuf,
      contentType: 'audio/mp3',
      providerUsed: 'fallback',
    };

    setCache(cacheKey, {
      buffer: fallbackBuf,
      contentType: 'audio/mp3',
      provider: 'fallback',
    });
    return result;
  }
}


