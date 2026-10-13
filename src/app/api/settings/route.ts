import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
        // TTS Settings (Volcano / Doubao TTS & Microsoft Edge / Azure)
        tts_default_provider: result['tts_default_provider'] || 'doubao',
        volcano_app_id: result['volcano_app_id'] || process.env.VOLCANO_APP_ID || '',
        volcano_access_token: result['volcano_access_token'] ? maskKey(result['volcano_access_token']) : (process.env.VOLCANO_ACCESS_TOKEN ? maskKey(process.env.VOLCANO_ACCESS_TOKEN) : ''),
        volcano_secret_key: result['volcano_secret_key'] ? maskKey(result['volcano_secret_key']) : (process.env.VOLCANO_SECRET_KEY ? maskKey(process.env.VOLCANO_SECRET_KEY) : ''),
        has_volcano_key: !!result['volcano_access_token'] || !!process.env.VOLCANO_ACCESS_TOKEN,

        edge_voice: result['edge_voice'] || 'zh-CN-YunjianNeural',
        azure_speech_key: result['azure_speech_key'] ? maskKey(result['azure_speech_key']) : '',
        azure_speech_region: result['azure_speech_region'] || 'eastus',
        has_azure_key: !!result['azure_speech_key'] || !!process.env.AZURE_SPEECH_KEY,

        // Cloudflare R2 Storage Settings
        r2_account_id: result['r2_account_id'] || '',
        r2_access_key_id: result['r2_access_key_id'] ? maskKey(result['r2_access_key_id']) : '',
        r2_secret_access_key: result['r2_secret_access_key'] ? maskKey(result['r2_secret_access_key']) : '',
        r2_bucket_name: result['r2_bucket_name'] || '',
        r2_public_domain: result['r2_public_domain'] || '',

        // Author / Admin Account Settings
        admin_username: result['admin_username'] || 'admin',
        admin_display_name: result['admin_display_name'] || '作者本人',
        has_custom_password: !!result['admin_password'],

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
      'tts_default_provider',
      'volcano_app_id',
      'volcano_access_token',
      'volcano_secret_key',
      'edge_voice',
      'azure_speech_key',
      'azure_speech_region',
      'r2_account_id',
      'r2_access_key_id',
      'r2_secret_access_key',
      'r2_bucket_name',
      'r2_public_domain',
      'admin_username',
      'admin_password',
      'admin_display_name',
    ];

    for (const key of keysToSave) {
      if (body[key] !== undefined) {
        const val = String(body[key]).trim();
        // Skip updating masked strings if user didn't change them
        if (val.startsWith('****') || val.includes('****')) {
          continue;
        }

        let group = 'general';
        if (key.startsWith('tts') || key.startsWith('edge') || key.startsWith('azure') || key.startsWith('volcano')) {
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
