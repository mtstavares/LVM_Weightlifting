export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface MailService {
  send(message: MailMessage): Promise<void>;
}
