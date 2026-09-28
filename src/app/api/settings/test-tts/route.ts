import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts/tts-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voice = 'zh-CN-YunjianNeural' } = body;

    const testSentence = '欢迎使用审稿大师。这是一段语音试听测试，声音清晰自然，助您轻松校阅长篇巨著。';

    const result = await synthesizeSpeech({
      text: testSentence,
      provider: 'edge',
      voice,
      speed: 1.0,
      strict: true,
    });

    return new NextResponse(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.audioBuffer.length.toString(),
        'X-Provider-Used': result.providerUsed,
      },
    });
  } catch (error: any) {
    console.error('Test TTS Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '语音测试合成失败' },
      { status: 500 }
    );
  }
}
