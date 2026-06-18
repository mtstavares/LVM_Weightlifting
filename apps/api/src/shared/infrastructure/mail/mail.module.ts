import { Global, Module } from '@nestjs/common';
import { MAIL_SERVICE } from '../../domain/mail.service';
import { NodemailerMailService } from './nodemailer-mail.service';

@Global()
@Module({
  providers: [{ provide: MAIL_SERVICE, useClass: NodemailerMailService }],
  exports: [MAIL_SERVICE]
})
export class MailModule {}
