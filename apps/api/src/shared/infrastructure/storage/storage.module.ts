import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../../../modules/auth/auth.module';
import { FILE_STORAGE_SERVICE } from './storage.token';
import { LocalFileStorageService } from './local-file-storage.service';
import { PrivateMediaController } from './private-media.controller';
import { S3FileStorageService } from './s3-file-storage.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PrivateMediaController],
  providers: [
    LocalFileStorageService,
    {
      provide: FILE_STORAGE_SERVICE,
      inject: [ConfigService, LocalFileStorageService],
      useFactory: (
        config: ConfigService,
        localStorage: LocalFileStorageService
      ) => (config.get<string>('FILE_STORAGE_DRIVER', 'local') === 's3' ? new S3FileStorageService(config) : localStorage)
    }
  ],
  exports: [FILE_STORAGE_SERVICE]
})
export class StorageModule {}
