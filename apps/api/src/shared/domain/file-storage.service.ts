export type UploadFileInput = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  folder: 'videos' | 'photos' | 'exercises';
};

export type UploadedFile = {
  path: string;
  url: string;
};

export interface FileStorageService {
  upload(input: UploadFileInput): Promise<UploadedFile>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
