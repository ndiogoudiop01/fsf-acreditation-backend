export const MAILER_PORT = Symbol('MAILER_PORT');

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailerPort {
  send(input: SendMailInput): Promise<{ providerResponse?: string }>;
}
