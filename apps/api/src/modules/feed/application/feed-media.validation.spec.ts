import { BadRequestException } from '@nestjs/common';
import { validateFeedMedia } from './feed-media.validation';

function file(input: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    originalname: 'media.jpg',
    mimetype: 'image/jpeg',
    size: input.buffer?.length ?? 0,
    buffer: Buffer.from([0xff, 0xd8, 0xff]),
    ...input
  } as Express.Multer.File;
}

function mp4Buffer(durationSeconds: number) {
  const ftyp = Buffer.alloc(16);
  ftyp.writeUInt32BE(16, 0);
  ftyp.write('ftyp', 4, 'ascii');
  ftyp.write('isom', 8, 'ascii');

  const mvhd = Buffer.alloc(28);
  mvhd.writeUInt32BE(28, 0);
  mvhd.write('mvhd', 4, 'ascii');
  mvhd[8] = 0;
  mvhd.writeUInt32BE(1000, 20);
  mvhd.writeUInt32BE(durationSeconds * 1000, 24);

  const moov = Buffer.alloc(8 + mvhd.length);
  moov.writeUInt32BE(moov.length, 0);
  moov.write('moov', 4, 'ascii');
  mvhd.copy(moov, 8);
  return Buffer.concat([ftyp, moov]);
}

describe('feed media validation', () => {
  it('accepts valid jpeg image', () => {
    expect(validateFeedMedia(file({ originalname: 'foto.jpg' }))).toMatchObject({ mediaType: 'IMAGE', mimeType: 'image/jpeg' });
  });

  it('accepts valid png image', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateFeedMedia(file({ originalname: 'foto.png', mimetype: 'image/png', buffer, size: buffer.length }))).toMatchObject({ mediaType: 'IMAGE', mimeType: 'image/png' });
  });

  it('accepts valid webp image', () => {
    const buffer = Buffer.concat([Buffer.from('RIFF0000WEBP', 'ascii')]);
    expect(validateFeedMedia(file({ originalname: 'foto.webp', mimetype: 'image/webp', buffer, size: buffer.length }))).toMatchObject({ mediaType: 'IMAGE', mimeType: 'image/webp' });
  });

  it('rejects double extension files', () => {
    expect(() => validateFeedMedia(file({ originalname: 'foto.jpg.exe' }))).toThrow(BadRequestException);
  });

  it('rejects mime mismatch', () => {
    expect(() => validateFeedMedia(file({ originalname: 'foto.png', mimetype: 'image/png' }))).toThrow(BadRequestException);
  });

  it('rejects image above size limit', () => {
    expect(() => validateFeedMedia(file({ originalname: 'foto.jpg', size: 11 * 1024 * 1024 }))).toThrow(BadRequestException);
  });

  it('accepts mp4 video up to fifteen seconds', () => {
    const buffer = mp4Buffer(15);
    expect(validateFeedMedia(file({ originalname: 'video.mp4', mimetype: 'video/mp4', buffer, size: buffer.length }))).toMatchObject({ mediaType: 'VIDEO', durationSeconds: 15 });
  });

  it('accepts mp4 names with harmless dots', () => {
    const buffer = mp4Buffer(10);
    expect(validateFeedMedia(file({ originalname: 'treino.01.final.mp4', mimetype: 'video/mp4', buffer, size: buffer.length }))).toMatchObject({ mediaType: 'VIDEO' });
  });

  it('rejects webm video when duration cannot be validated', () => {
    const buffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
    expect(() => validateFeedMedia(file({ originalname: 'video.webm', mimetype: 'video/webm', buffer, size: buffer.length }))).toThrow(BadRequestException);
  });

  it('rejects video above size limit', () => {
    const buffer = mp4Buffer(10);
    expect(() => validateFeedMedia(file({ originalname: 'video.mp4', mimetype: 'video/mp4', buffer, size: 81 * 1024 * 1024 }))).toThrow(BadRequestException);
  });

  it('rejects video above fifteen seconds', () => {
    const buffer = mp4Buffer(16);
    expect(() => validateFeedMedia(file({ originalname: 'video.mp4', mimetype: 'video/mp4', buffer, size: buffer.length }))).toThrow(BadRequestException);
  });
});
