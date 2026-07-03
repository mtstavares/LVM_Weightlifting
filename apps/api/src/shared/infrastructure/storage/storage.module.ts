import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../../modules/auth/auth.module';
import { FILE_STORAGE_SERVICE } from './storage.token';
import { LocalFileStorageService } from './local-file-storage.service';
import { PrivateMediaController } from './private-media.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PrivateMediaController],
  providers: [{ provide: FILE_STORAGE_SERVICE, useClass: LocalFileStorageService }],
  exports: [FILE_STORAGE_SERVICE]
})
export class StorageModule {}
