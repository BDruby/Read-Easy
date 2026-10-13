import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { synthesizeSpeech } from '@/lib/tts/tts-manager';
import { DEFAULT_VOICE_CAST, EMOTION_PRESETS, VoiceRole } from '@/lib/voice-cast';
import { preprocessTTSText } from '@/lib/parser';

export const dynamic = 'force-dynamic';

// Minimal silent MP3 frames for gap (~350ms)
const SILENCE_GAP_MP3 = Buffer.from(
  '//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAA2wADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw==',
  'base64'
);

function formatSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = params.id;
    const body = await req.json().catch(() => ({}));
    const { format = 'mp3', gapMs = 350, selectedVoiceConfig } = body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: { title: true, type: true, voiceCast: true },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ success: false, message: '章节不存在' }, { status: 404 });
    }

    // 1. Resolve Voice Cast
    let cast: VoiceRole[] = DEFAULT_VOICE_CAST;
    if (chapter.project.voiceCast) {
      try {
        cast = JSON.parse(chapter.project.voiceCast);
      } catch {}
    }

    // 2. Resolve Paragraph Voice Config
    let voiceConfig: Record<string, any> = {};
    if (selectedVoiceConfig && typeof selectedVoiceConfig === 'object') {
      voiceConfig = selectedVoiceConfig;
    } else if (chapter.voiceConfig) {
      try {
        voiceConfig = JSON.parse(chapter.voiceConfig);
      } catch {}
    }

    // 3. Split content into paragraphs
    const rawParagraphs = chapter.content
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (rawParagraphs.length === 0) {
      return NextResponse.json({ success: false, message: '章节内容为空' }, { status: 400 });
    }

    const defaultRole = cast[0] || DEFAULT_VOICE_CAST[0];
    const audioSegments: Buffer[] = [];
    const srtItems: string[] = [];
    let currentTimelineSecs = 0;

    for (let idx = 0; idx < rawParagraphs.length; idx++) {
      const pText = rawParagraphs[idx];
      const { cleanText, isAudible } = preprocessTTSText(pText);
      if (!isAudible || cleanText.length === 0) continue;

      const pSetting = voiceConfig[idx] || voiceConfig[String(idx)] || {};
      const roleId = pSetting.roleId || 'narrator';
      const role = cast.find((c) => c.id === roleId) || defaultRole;
      const emotionId = pSetting.emotion || 'normal';
      const emotion = EMOTION_PRESETS.find((e) => e.id === emotionId) || EMOTION_PRESETS[0];

      const speed = pSetting.speed || emotion.speed || 1.0;
      const contextText = pSetting.customPrompt || emotion.prompt;

      // Synthesize audio chunk
      const result = await synthesizeSpeech({
        text: cleanText,
        voice: role.voice,
        speed: speed,
        contextText: contextText,
      });

      const audioBuf = result.audioBuffer;
      // Estimate duration based on MP3 size (approx. 64kbps = 8000 bytes per second)
      const durationSecs = Math.max(0.5, audioBuf.length / 8000);

      // Append to SRT subtitle
      const startSecs = currentTimelineSecs;
      const endSecs = startSecs + durationSecs;
      srtItems.push(
        `${srtItems.length + 1}\n${formatSrtTimestamp(startSecs)} --> ${formatSrtTimestamp(endSecs)}\n${cleanText}\n`
      );

      // Append to full audio with silence gap
      audioSegments.push(audioBuf);
      if (idx < rawParagraphs.length - 1) {
        audioSegments.push(SILENCE_GAP_MP3);
        currentTimelineSecs = endSecs + gapMs / 1000;
      } else {
        currentTimelineSecs = endSecs;
      }
    }

    const safeTitle = encodeURIComponent(chapter.title.replace(/[\\/:*?"<>|]/g, '_'));

    // Handle format = 'srt'
    if (format === 'srt') {
      const srtContent = srtItems.join('\n');
      return new NextResponse(srtContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}.srt"; filename*=UTF-8''${safeTitle}.srt`,
        },
      });
    }

    // Handle format = 'mp3' (Default full audio concat)
    const fullAudioBuffer = Buffer.concat(audioSegments);

    return new NextResponse(new Uint8Array(fullAudioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mp3',
        'Content-Length': fullAudioBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${safeTitle}.mp3"; filename*=UTF-8''${safeTitle}.mp3`,
      },
    });
  } catch (error: any) {
    console.error('Export Audio Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '导出音频失败' },
      { status: 500 }
    );
  }
}
