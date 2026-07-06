import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  FileStorageService,
  UploadedFile,
  UploadFileInput
} from '../../domain/file-storage.service';

@Injectable()
export class S3FileStorageService implements FileStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY')
      }
    });
  }

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const extension = this.extensionFor(input.contentType);
    const path = `${input.folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: input.buffer,
        ContentType: input.contentType
      })
    );
    return { path, url: this.getUrl(path) };
  }

  async delete(path: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));
  }

  getUrl(path: string): string {
    return `/storage/${path.replaceAll('\\', '/')}`;
  }

  async read(path: string): Promise<Buffer> {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: path }));
    if (!object.Body) return Buffer.alloc(0);
    if (object.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of object.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
    return Buffer.from(await object.Body.transformToByteArray());
  }

  private extensionFor(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm'
    };
    const extension = extensions[contentType];
    if (!extension) throw new Error('Unsupported file type.');
    return extension;
  }
}
