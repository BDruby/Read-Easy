import https from 'https';

export interface AzureTTSOptions {
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
}

/**
 * 微软官方 Azure 认知语音服务合成器 (REST API)
 * 官方免费套餐 (F0 Free Tier)：每月免费 500,000 字符 (50万字)
 * 特性：100% 官方支持、永不 403、拥有全套 Edge Neural 原生男女多角色音色
 */
export async function synthesizeAzureTTS(
  text: string,
  key: string,
  region = 'eastus',
  options: AzureTTSOptions = {}
): Promise<Buffer> {
  const voice = options.voice || 'zh-CN-YunjianNeural';
  const rate = options.rate || '+0%';
  const pitch = options.pitch || '+0Hz';

  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
  <voice name='${voice}'>
    <prosody pitch='${pitch}' rate='${rate}'>
      ${escapedText}
    </prosody>
  </voice>
</speak>`;

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'ReviewMaster-TTS',
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = '';
          res.on('data', (c) => (errBody += c));
          res.on('end', () => {
            reject(new Error(`Azure Speech API error ${res.statusCode}: ${errBody || res.statusMessage}`));
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Azure Speech API request timed out'));
    });

    req.on('error', reject);
    req.write(ssml);
    req.end();
  });
}
