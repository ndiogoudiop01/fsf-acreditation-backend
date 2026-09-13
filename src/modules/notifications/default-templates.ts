import { NotificationEvent } from '@prisma/client';

/**
 * Gabarits par defaut (langue fr), utilises tant que la FSF n'a pas
 * personnalise un modele en base (`NotificationTemplate`, cahier §20 :
 * "modeles personnalisables"). Variables entre `{{ }}`.
 */
export const DEFAULT_TEMPLATES: Record<
  NotificationEvent,
  { subject: string; body: string }
> = {
  [NotificationEvent.ACCOUNT_CREATED]: {
    subject: "Bienvenue sur la plateforme d'accreditation FSF",
    body: "<p>Bonjour,</p><p>Votre compte a bien ete cree. Vous pouvez desormais soumettre vos demandes d'accreditation.</p>",
  },
  [NotificationEvent.REQUEST_RECEIVED]: {
    subject: "Demande d'accreditation recue — {{reference}}",
    body: '<p>Votre demande {{reference}} a bien ete recue et est en cours de traitement.</p>',
  },
  [NotificationEvent.COMPLEMENT_REQUESTED]: {
    subject: 'Complement demande pour votre dossier {{reference}}',
    body: '<p>Un element est manquant sur votre dossier {{reference}} : <strong>{{missingItem}}</strong>.</p><p>Merci de le fournir depuis votre espace demandeur.</p>',
  },
  [NotificationEvent.REQUEST_VALIDATED]: {
    subject: 'Demande {{reference}} validee',
    body: '<p>Votre demande {{reference}} a ete validee. Votre badge est en cours de generation.</p>',
  },
  [NotificationEvent.REQUEST_REJECTED]: {
    subject: 'Demande {{reference}} refusee',
    body: '<p>Votre demande {{reference}} a ete refusee.</p><p>Motif : {{reason}}</p>',
  },
  [NotificationEvent.BADGE_AVAILABLE]: {
    subject: 'Votre badge est disponible — {{reference}}',
    body: '<p>Votre accreditation est prete. Vous pouvez la telecharger depuis votre espace demandeur.</p>',
  },
  [NotificationEvent.MATCH_UPDATED]: {
    subject: 'Modification du match {{matchLabel}}',
    body: '<p>Une information a change concernant le match {{matchLabel}} : {{changedFields}}.</p>',
  },
  [NotificationEvent.CLOSURE_REMINDER]: {
    subject: 'Cloture prochaine des demandes — {{matchLabel}}',
    body: '<p>La periode de depot des demandes pour {{matchLabel}} se termine bientot.</p>',
  },
  [NotificationEvent.ACCREDITATION_REVOKED]: {
    subject: 'Votre accreditation a ete revoquee',
    body: '<p>Votre accreditation {{reference}} a ete revoquee.</p><p>Motif : {{reason}}</p>',
  },
};
