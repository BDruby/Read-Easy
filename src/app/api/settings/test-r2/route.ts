import { NextRequest, NextResponse } from 'next/server';
import { testR2Connection } from '@/lib/r2';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = body;

    // If secrets are empty or masked, fetch from DB
    if (!secretAccessKey || secretAccessKey.includes('****')) {
      const savedSecret = await prisma.systemSetting.findUnique({
        where: { key: 'r2_secret_access_key' },
      });
      secretAccessKey = savedSecret?.value || '';
    }
    if (!accessKeyId || accessKeyId.includes('****')) {
      const savedKeyId = await prisma.systemSetting.findUnique({
        where: { key: 'r2_access_key_id' },
      });
      accessKeyId = savedKeyId?.value || '';
    }
    if (!accountId) {
      const savedAcc = await prisma.systemSetting.findUnique({
        where: { key: 'r2_account_id' },
      });
      accountId = savedAcc?.value || '';
    }
    if (!bucketName) {
      const savedBucket = await prisma.systemSetting.findUnique({
        where: { key: 'r2_bucket_name' },
      });
      bucketName = savedBucket?.value || '';
    }

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        success: false,
        message: '请填写完整的 Cloudflare R2 参数 (Account ID, Access Key, Secret Key, Bucket Name)',
      });
    }

    const result = await testR2Connection({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicDomain,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: `R2 连接测试失败: ${error.message || '未知错误'}`,
    });
  }
}
