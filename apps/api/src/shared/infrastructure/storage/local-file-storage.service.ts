import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileStorageService,
  UploadedFile,
  UploadFileInput
} from '../../domain/file-storage.service';

@Injectable()
export class LocalFileStorageService implements FileStorageService {
  constructor(private readonly config: ConfigService) {}

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const extension = this.extensionFor(input.contentType);
    const fileName = `${randomUUID()}.${extension}`;
    const root = this.config.get<string>('LOCAL_STORAGE_ROOT', '../../storage');
    const directory = join(root, input.folder);
    await mkdir(directory, { recursive: true });
    const relativePath = `${input.folder}/${fileName}`;
    await writeFile(join(directory, fileName), input.buffer);
    return { path: relativePath, url: this.getUrl(relativePath) };
  }

  async delete(path: string): Promise<void> {
    const root = this.config.get<string>('LOCAL_STORAGE_ROOT', '../../storage');
    await rm(join(root, path), { force: true });
  }

  getUrl(path: string): string {
    return `/storage/${path.replaceAll('\\', '/')}`;
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
