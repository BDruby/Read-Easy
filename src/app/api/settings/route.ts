import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/settings - Retrieve all system settings (mask secret keys for safety)
export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const result: Record<string, string> = {};

    for (const item of settings) {
      result[item.key] = item.value;
    }

    return NextResponse.json({
      success: true,
      data: {
        // TTS Settings (Microsoft Edge Neural Only)
        tts_default_provider: 'edge',
        edge_voice: result['edge_voice'] || 'zh-CN-YunjianNeural',

        // Cloudflare R2 Storage Settings
        r2_account_id: result['r2_account_id'] || '',
        r2_access_key_id: result['r2_access_key_id'] ? maskKey(result['r2_access_key_id']) : '',
        r2_secret_access_key: result['r2_secret_access_key'] ? maskKey(result['r2_secret_access_key']) : '',
        r2_bucket_name: result['r2_bucket_name'] || '',
        r2_public_domain: result['r2_public_domain'] || '',

        // Flags to know if raw key is present
        has_r2_secret: !!result['r2_secret_access_key'],
      },
    });
  } catch (error: any) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取配置失败' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Save or update system settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const keysToSave = [
      'edge_voice',
      'r2_account_id',
      'r2_access_key_id',
      'r2_secret_access_key',
      'r2_bucket_name',
      'r2_public_domain',
    ];

    for (const key of keysToSave) {
      if (body[key] !== undefined) {
        const val = String(body[key]).trim();
        // Skip updating masked strings if user didn't change them
        if (val.startsWith('****') || val.includes('****')) {
          continue;
        }

        let group = 'general';
        if (key.startsWith('tts') || key.startsWith('edge')) {
          group = 'tts';
        } else if (key.startsWith('r2')) {
          group = 'storage';
        }

        await prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: val, group },
          update: { value: val, group },
        });
      }
    }

    return NextResponse.json({ success: true, message: '配置已成功保存！' });
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || '保存配置失败' },
      { status: 500 }
    );
  }
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}
