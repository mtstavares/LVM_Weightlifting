import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer = require('nodemailer');
import type { Transporter } from 'nodemailer';
import { MailMessage, MailService } from '../../domain/mail.service';

@Injectable()
export class NodemailerMailService implements MailService {
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(this.config.get<string>('SMTP_PORT', '587')),
          secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
          auth: this.config.get<string>('SMTP_USER')
            ? {
                user: this.config.getOrThrow<string>('SMTP_USER'),
                pass: this.config.getOrThrow<string>('SMTP_PASSWORD')
              }
            : undefined
        })
      : null;
  }

  async send(message: MailMessage): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'LVM Weightlifting <no-reply@lvm.local>'),
        ...message
      });
      return;
    }

    const storageRoot = this.config.get<string>('LOCAL_STORAGE_ROOT', './storage');
    const outbox = join(storageRoot, 'mail-outbox');
    await mkdir(outbox, { recursive: true });
    const safeRecipient = message.to.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const fileName = `${Date.now()}-${safeRecipient}.json`;
    await writeFile(
      join(outbox, fileName),
      JSON.stringify(
        {
          from: this.config.get<string>('SMTP_FROM', 'LVM Weightlifting <no-reply@lvm.local>'),
          ...message
        },
        null,
        2
      ),
      'utf8'
    );
  }
}
