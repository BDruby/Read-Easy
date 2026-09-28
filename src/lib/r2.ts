import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string;
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToR2(
  config: R2Config,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const client = createR2Client(config);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  if (config.publicDomain) {
    const domain = config.publicDomain.replace(/\/+$/, '');
    return `${domain}/${key}`;
  }

  // Generate a pre-signed URL valid for 7 days if no public domain configured
  const getCommand = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  return await getSignedUrl(client, getCommand, { expiresIn: 604800 });
}

export async function testR2Connection(config: R2Config): Promise<{ success: boolean; message: string }> {
  try {
    const client = createR2Client(config);
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1,
    });
    await client.send(command);
    return { success: true, message: `成功连接到 Cloudflare R2 存储桶「${config.bucketName}」！` };
  } catch (error: any) {
    return { success: false, message: `Cloudflare R2 连接失败: ${error.message || '未知错误'}` };
  }
}
