import { Global, Module } from '@nestjs/common';
import { FILE_STORAGE_SERVICE } from './storage.token';
import { LocalFileStorageService } from './local-file-storage.service';
import { PrivateMediaController } from './private-media.controller';

@Global()
@Module({
  controllers: [PrivateMediaController],
  providers: [{ provide: FILE_STORAGE_SERVICE, useClass: LocalFileStorageService }],
  exports: [FILE_STORAGE_SERVICE]
})
export class StorageModule {}
