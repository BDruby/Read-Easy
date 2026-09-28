import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts/tts-manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, provider, voice, speed } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, message: '朗读文本不能为空' }, { status: 400 });
    }

    // Limit single paragraph synthesis length for speed & responsiveness (max ~4000 characters)
    const truncatedText = text.slice(0, 4000);

    const result = await synthesizeSpeech({
      text: truncatedText,
      provider,
      voice,
      speed: speed ? parseFloat(speed) : 1.0,
    });

    return new NextResponse(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.audioBuffer.length.toString(),
        'X-Provider-Used': result.providerUsed,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    console.error('TTS Synthesis Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '语音合成失败' },
      { status: 500 }
    );
  }
}
