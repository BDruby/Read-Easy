import { NextRequest, NextResponse } from 'next/server';
import { parseNovelText } from '@/lib/parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, message: '请选择要解析的文件' }, { status: 400 });
    }

    const fileName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    const defaultTitle = (titleOverride || fileName.replace(/\.[^/.]+$/, '')).trim();

    if (fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const docResult = await mammoth.default.extractRawText({ buffer: fileBuffer });
      extractedText = docResult.value;
    } else {
      // Decode as UTF-8 or GBK fallback for Chinese novel text files
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        extractedText = decoder.decode(fileBuffer);
      } catch {
        // Fallback to GBK / GB18030 commonly found in legacy Chinese txt files
        try {
          const gbkDecoder = new TextDecoder('gb18030');
          extractedText = gbkDecoder.decode(fileBuffer);
        } catch {
          extractedText = fileBuffer.toString('utf-8');
        }
      }
    }

    const parsed = parseNovelText(extractedText, defaultTitle);

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        title: parsed.title,
        chapters: parsed.chapters,
        totalWords: parsed.totalWords,
        chapterCount: parsed.chapterCount,
      },
    });
  } catch (error: any) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '文件解析失败' },
      { status: 500 }
    );
  }
}
