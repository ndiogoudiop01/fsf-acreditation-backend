export const SMS_PORT = Symbol('SMS_PORT');

export interface SendSmsInput {
  to: string;
  body: string;
}

/**
 * Port SMS/WhatsApp — cahier des charges §20 : "aucun canal supplementaire
 * ne sera active sans decision de la FSF". L'adaptateur par defaut
 * (`log-sms.adapter.ts`) journalise sans envoyer reellement, en attendant
 * le choix d'un fournisseur.
 */
export interface SmsPort {
  send(input: SendSmsInput): Promise<{ providerResponse?: string }>;
}
