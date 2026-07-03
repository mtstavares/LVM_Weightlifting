import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const MAX_FEED_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_FEED_VIDEO_SIZE = 80 * 1024 * 1024;
export const MAX_FEED_VIDEO_SECONDS = 15;

const imageTypes = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']]
]);

const videoTypes = new Map([
  ['video/mp4', ['.mp4']],
  ['video/quicktime', ['.mov']],
  ['video/webm', ['.webm']]
]);

const blockedExtensions = new Set(['.svg', '.html', '.htm', '.exe', '.bat', '.cmd', '.js', '.mjs', '.ps1', '.sh']);

export type ValidatedFeedMedia = {
  mediaType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  durationSeconds?: number;
};

export function validateFeedMedia(file: Express.Multer.File): ValidatedFeedMedia {
  validateFileName(file.originalname);
  const detectedMime = detectFeedMime(file.buffer);
  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new BadRequestException('Arquivo inv?lido. Envie JPG, PNG, WEBP, MP4, MOV ou WEBM.');
  }

  if (imageTypes.has(detectedMime)) {
    if (file.size > MAX_FEED_IMAGE_SIZE) throw new BadRequestException('Imagem excede 10 MB.');
    validateExtension(file.originalname, imageTypes.get(detectedMime)!);
    return { mediaType: 'IMAGE', mimeType: detectedMime };
  }

  if (videoTypes.has(detectedMime)) {
    if (file.size > MAX_FEED_VIDEO_SIZE) throw new BadRequestException('V?deo excede 80 MB.');
    validateExtension(file.originalname, videoTypes.get(detectedMime)!);
    const durationSeconds = extractVideoDurationSeconds(file.buffer, detectedMime);
    if (durationSeconds === undefined) {
      throw new BadRequestException('N?o foi poss?vel validar a dura??o do v?deo.');
    }
    if (durationSeconds !== undefined && durationSeconds > MAX_FEED_VIDEO_SECONDS) {
      throw new BadRequestException('V?deo deve ter no m?ximo 15 segundos.');
    }
    return { mediaType: 'VIDEO', mimeType: detectedMime, durationSeconds };
  }

  throw new BadRequestException('Tipo de arquivo n?o permitido.');
}

function validateFileName(fileName: string) {
  const lower = fileName.toLowerCase();
  const extension = extname(lower);
  if (!extension || blockedExtensions.has(extension)) {
    throw new BadRequestException('Extens?o de arquivo n?o permitida.');
  }
  const suspiciousExtensions = lower
    .slice(0, -extension.length)
    .split('.')
    .slice(1)
    .map((part) => `.${part}`);
  if (suspiciousExtensions.some((part) => blockedExtensions.has(part))) {
    throw new BadRequestException('Arquivos com dupla extens?o perigosa n?o s?o permitidos.');
  }
}

function validateExtension(fileName: string, allowed: string[]) {
  const extension = extname(fileName.toLowerCase());
  if (!allowed.includes(extension)) {
    throw new BadRequestException('Extens?o incompat?vel com o tipo do arquivo.');
  }
}

export function detectFeedMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('qt')) return 'video/quicktime';
    return 'video/mp4';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  return null;
}

export function extractVideoDurationSeconds(buffer: Buffer, mimeType: string): number | undefined {
  if (mimeType === 'video/webm') return undefined;
  return extractMp4DurationSeconds(buffer);
}

function extractMp4DurationSeconds(buffer: Buffer): number | undefined {
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (size < 8) break;
    if (type === 'moov' || type === 'trak' || type === 'mdia') {
      const nested = extractMp4DurationSeconds(buffer.subarray(offset + 8, offset + size));
      if (nested !== undefined) return nested;
    }
    if (type === 'mvhd') {
      const version = buffer[offset + 8];
      if (version === 0 && offset + 28 <= buffer.length) {
        const timescale = buffer.readUInt32BE(offset + 20);
        const duration = buffer.readUInt32BE(offset + 24);
        return timescale > 0 ? duration / timescale : undefined;
      }
      if (version === 1 && offset + 40 <= buffer.length) {
        const timescale = buffer.readUInt32BE(offset + 28);
        const duration = Number(buffer.readBigUInt64BE(offset + 32));
        return timescale > 0 ? duration / timescale : undefined;
      }
    }
    offset += size;
  }
  return undefined;
}
