import { Injectable } from '@nestjs/common';

/**
 * Rendu de gabarit minimal par substitution `{{variable}}` — suffisant pour
 * les modeles de notification (cahier §20 : "modeles personnalisables avec
 * ... variables"). Pas de moteur de template lourd : les gabarits sont de
 * simples chaines stockees dans `NotificationTemplate.bodyTemplate`.
 */
@Injectable()
export class TemplateRendererService {
  render(
    template: string,
    variables: Record<string, string | number | undefined | null>,
  ): string {
    return template.replace(
      /\{\{\s*([\w.]+)\s*\}\}/g,
      (_match, key: string) => {
        const value = variables[key];
        return value === undefined || value === null ? '' : String(value);
      },
    );
  }
}
