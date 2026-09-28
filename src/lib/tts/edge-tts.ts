import crypto from 'crypto';

export interface EdgeTTSOptions {
  voice?: string;
  rate?: string; // e.g. "+0%", "+20%", "-10%"
  pitch?: string;
  volume?: string;
}

export const CHINESE_VOICES = [
  { id: 'zh-CN-YunjianNeural', name: '云健 (影视评书/热血说书男声 - 默认推荐)', gender: 'Male', description: '浑厚有力，极富戏剧张力，适合武侠、玄幻、历史与热血爽文' },
  { id: 'zh-CN-YunxiNeural', name: '云希 (沉浸小说/故事男声 - 强烈推荐)', gender: 'Male', description: '抑扬顿挫，极富故事感染力，小说旁白与男主首选' },
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 (温暖柔和/女主播女声)', gender: 'Female', description: '清澈温润，自然流畅，适合言情、都市与散文' },
  { id: 'zh-CN-YunyangNeural', name: '云扬 (新闻主播/专业沉稳男声)', gender: 'Male', description: '播音腔调，清晰严谨，适合纪实与硬核科幻' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊 (多情感女声/甜美轻快)', gender: 'Female', description: '活泼灵动，适合轻小说、青春与玄幻女主' },
  { id: 'zh-CN-YunxiaNeural', name: '云夏 (热血少年/生动自然男声)', gender: 'Male', description: '少年感十足，适合修仙少年与热血冒险' },
  { id: 'zh-CN-liaoning-XiaobeiNeural', name: '东北晓北 (幽默诙谐方言女声)', gender: 'Female', description: '亲切风趣，适合生活轻喜剧与乡土年代文' },
  { id: 'zh-CN-shaanxi-XiaoniNeural', name: '陕西晓妮 (豪爽西北方言女声)', gender: 'Female', description: '质朴豪爽，适合西北风情与特色小说' },
  { id: 'zh-HK-HiuMaanNeural', name: '晓曼 (粤语女声)', gender: 'Female', description: '标准粤语朗读，发音自然' },
  { id: 'zh-TW-HsiaoChenNeural', name: '晓臻 (台湾国语女声)', gender: 'Female', description: '温婉柔和的台湾腔国语' },
];

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

/**
 * 动态计算微软 Edge DRM Sec-MS-GEC 安全校验令牌（基于 Windows Epoch 时间窗算法）
 */
function generateSecMsGec(): string {
  let ticks = Date.now() / 1000;
  ticks += 11644473600; // 转换至 Windows Epoch
  ticks -= ticks % 300; // 5分钟动态滚动窗口
  ticks *= 1e7; // 转换为 100 纳秒间隔
  const strToHash = ticks.toFixed(0) + TRUSTED_CLIENT_TOKEN;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

/**
 * Generate audio buffer using Edge TTS WebSocket endpoint
 */
export async function synthesizeEdgeTTS(
  text: string,
  options: EdgeTTSOptions = {}
): Promise<Buffer> {
  const voice = options.voice || 'zh-CN-YunjianNeural';
  const rate = options.rate || '+0%';
  const pitch = options.pitch || '+0Hz';
  const volume = options.volume || '+0%';

  const secMsGec = generateSecMsGec();
  const connectionId = crypto.randomUUID().replace(/-/g, '');
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;

  const muid = crypto.randomBytes(16).toString('hex').toUpperCase();

  // Use dynamic import for ws to avoid bundling issues
  const WebSocket = (await import('ws')).default;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': `muid=${muid};`,
      },
    });

    const audioChunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      } else {
        reject(new Error('Edge TTS synthesis timed out'));
      }
    }, 25000);

    ws.on('open', () => {
      const now = new Date().toISOString();
      
      // 1. Send speech.config
      const configMessage = `X-Timestamp:${now}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "true",
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMessage);

      // 2. Escape XML in text
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      // 3. Send SSML request
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
  <voice name='${voice}'>
    <prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>
      ${escapedText}
    </prosody>
  </voice>
</speak>`;

      const requestId = crypto.randomUUID().replace(/-/g, '');
      const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now}Z\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMessage);
    });

    ws.on('message', (data: any) => {
      const dataStr = Buffer.isBuffer(data) ? data.toString('utf-8') : (typeof data === 'string' ? data : '');
      if (dataStr.includes('Path:turn.end')) {
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolve(Buffer.concat(audioChunks));
        return;
      }

      if (Buffer.isBuffer(data)) {
        // Binary message contains audio data with header
        // Header format: 2-byte header length + header text + audio binary
        if (data.length > 2) {
          const headerLength = data.readUInt16BE(0);
          if (data.length > headerLength + 2) {
            const headerStr = data.subarray(2, headerLength + 2).toString('utf-8');
            if (headerStr.includes('Path:audio')) {
              const audioData = data.subarray(headerLength + 2);
              audioChunks.push(audioData);
            }
          }
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      } else {
        reject(err);
      }
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      }
    });
  });
}
