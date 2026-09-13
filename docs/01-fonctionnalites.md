# Fonctionnalités de la plateforme d'accréditation FSF

Ce document liste les fonctionnalités nécessaires pour terminer le projet décrit dans
`cahier_charges_accreditations_fsf.pdf`, organisées par domaine métier et classées **MVP
(livré dans ce backend)** ou **Backlog Phase 2 (hors périmètre v1, cf. cahier §35 "Évolutions
futures")**. Chaque ligne référence la section correspondante du cahier des charges.

## 1. Comptes & utilisateurs internes (§4, §23)

- [MVP] Authentification par email/mot de passe (JWT access + refresh), révocation de session.
- [MVP] 5 rôles internes : Administrateur, Responsable accréditation, Commission de validation,
  Agent de contrôle d'accès, Superviseur/Reporting — permissions par rôle (principe du moindre
  privilège, matrice §23).
- [MVP] Création, invitation, activation/désactivation d'un compte interne.
- [Backlog] Authentification à deux facteurs (MFA) — "si retenue" par la FSF.
- [Backlog] Revue périodique automatisée des habilitations (rappel planifié).

## 2. Médias & demandeurs (§7, §8)

- [MVP] Référentiel des médias : nom, type (TV, radio, presse écrite/en ligne, agence,
  photographe, créateur de contenu, média international, autre), pays, contact, statut de
  validation.
- [MVP] Détection de doublons de médias à la création.
- [MVP] Profil demandeur (journaliste/photographe/technicien) rattaché à un média : identité,
  fonction, spécialité, numéro de carte professionnelle, historique des accréditations.
- [MVP] Auto-inscription du demandeur (création de compte + profil) depuis le portail public.

## 3. Compétitions & matchs (§5, §6)

- [MVP] CRUD compétitions (nom, saison, organisateur, dates, statut, description).
- [MVP] CRUD matchs (équipes, date/heure avec fuseau horaire, stade, ville, statut, capacité,
  ouverture/clôture des demandes, notes de règles, contacts opérationnels).
- [MVP] Fermeture automatique des demandes à la date de clôture programmée.
- [MVP] Journalisation de toute modification de match ayant un impact sur des demandes en cours.
- [Backlog] Gestion multi-saison consolidée (historique inter-compétitions).

## 4. Catégories, zones & quotas (§10, §11, §19)

- [MVP] Catalogue des catégories d'accréditation configurable (code, libellé, documents requis,
  règles de validité) — ex. MEDIA, PHOTO, TV, RADIO, DIGITAL, TECHNIQUE, PRODUCTION,
  VIP/PARTENAIRE, AUTRE.
- [MVP] Catalogue des zones d'accès configurable (tribune presse, tribune média, zone
  photographes, TV, radio, mixte, technique, production, VIP, parking).
- [MVP] Quotas par match et par catégorie, avec zones autorisées et politique de dépassement
  (file d'attente, arbitrage manuel, priorité, clôture) appliquée sous verrou transactionnel.
- [MVP] Tableau de suivi des quotas (reçues / complètes / validées / refusées / en attente /
  restant disponible).

## 5. Formulaire de demande & documents (§9, §12)

- [MVP] Parcours de demande progressif et sauvegardable (brouillon) : match → infos
  personnelles → infos professionnelles/média → type d'accréditation → pièces justificatives →
  récapitulatif et soumission.
- [MVP] Contrôle des champs, blocage hors période d'ouverture, détection de doublon probable,
  accusé de réception avec identifiant unique.
- [MVP] Dépôt de documents (carte de presse, pièce d'identité, photo, lettre de mission,
  attestation média, autre) avec contrôle de format/taille, versioning, historique.
- [MVP] Révision des documents par un gestionnaire : validation, rejet motivé, remplacement.
- [MVP] URLs de téléchargement temporaires et signées (jamais de lien public permanent).

## 6. Cycle de vie de la demande (§13, §14, §15)

- [MVP] Machine à statuts explicite : Brouillon → Soumise → En cours de vérification →
  Informations complémentaires demandées → Complète → En attente de validation → Validée /
  Refusée → Annulée ; puis Accréditation générée → Accès utilisé.
- [MVP] Demande de complément (élément manquant, commentaire, délai, relances) avec retour
  automatique dans la file de traitement une fois complétée.
- [MVP] Décision motivée (validation/refus) journalisée avec acteur et horodatage.
- [MVP] Attribution de catégorie et de zone(s) à la validation.

## 7. Accréditations, badges & QR Code (§16, §17)

- [MVP] Génération d'un badge numérique (logo FSF, photo, identité, média, fonction, catégorie,
  match, zone, identifiant unique, dates d'émission/expiration, QR Code) au format PDF
  imprimable.
- [MVP] QR Code contenant un jeton opaque non prédictible (aucune donnée personnelle lisible) ;
  seul le hash du jeton est stocké côté serveur.
- [MVP] Révocation de badge avec motif, immédiatement visible au contrôle.

## 8. Contrôle d'accès (§17, §18, §22)

- [MVP] Vérification de scan en ligne : VALIDE / INVALIDE / EXPIRÉ / RÉVOQUÉ / DÉJÀ UTILISÉ /
  HORS PÉRIMÈTRE, avec motif pour l'agent.
- [MVP] Journal des scans (appareil, agent, horodatage, résultat, zone).
- [MVP] Tableau de bord jour de match (accrédités, entrées, refus, anomalies, répartition par
  zone), pensé pour un usage mobile et un réseau instable.
- [Backlog] Mode de contrôle hors connexion complet : préchargement chiffré, résolution de
  conflits, synchronisation idempotente, purge locale, procédure de perte d'appareil. Le contrat
  d'API (export + synchronisation) est prévu dans le module `access-control`, mais la robustesse
  offline complète (cf. Annexe B du cahier : risque "réseau instable au stade") est repoussée
  pour tenir le délai MVP — cf. `docs/06-qr-code-et-controle-acces.md`.
- [Backlog] Application mobile dédiée au contrôleur (le contrat API REST existe déjà et peut être
  consommé par tout client, web ou natif).

## 9. Notifications (§20)

- [MVP] Email (SMTP) pour : création de compte, demande reçue, complément demandé, validation,
  refus, badge disponible, modification de match, rappel de clôture, révocation.
- [MVP] Modèles personnalisables (sujet, corps, variables), historique d'envoi et statut de
  livraison.
- [Backlog] SMS / WhatsApp — port applicatif déjà défini (`SmsPort`), en attente d'une décision
  FSF sur le fournisseur (cf. cahier §20 : "aucun canal supplémentaire ne sera activé sans
  décision de la FSF").

## 10. Tableaux de bord, recherche, exports (§21, §22, §25, §26)

- [MVP] Indicateurs globaux : demandes par statut, badges générés/utilisés, taux de complétude,
  filtrables par compétition/match/média/catégorie/zone/statut.
- [MVP] Recherche transverse par demandeur, média, accréditation, match, référence unique ou
  jeton QR (droits respectés, exposition minimale des données personnelles).
- [MVP] Exports Excel/CSV/PDF avec mention d'auteur, date, périmètre et confidentialité.
- [Backlog] Statistiques historiques pluri-saisons et tableaux de pilotage avancés.

## 11. Sécurité, conformité & traçabilité (§24, §28)

- [MVP] HTTPS/TLS (à la charge du reverse proxy en prod), authentification JWT, RBAC serveur,
  protections OWASP (injection, XSS, CSRF n/a en API stateless, brute force via rate limiting).
- [MVP] Chiffrement des mots de passe (argon2id) et des jetons sensibles (QR, refresh — hachés,
  jamais stockés en clair).
- [MVP] Documents protégés (URLs temporaires signées), secrets hors du code (variables
  d'environnement).
- [MVP] Journal d'audit transversal (acteur, action, objet, ancienne/nouvelle valeur, résultat,
  motif) pour les événements sensibles (création, modification, décision, révocation, connexion,
  export, scan).
- [MVP] Hooks qualité (lint, détection de secrets, tests, audit de dépendances) avant chaque
  commit/push — cf. `docs/11-hooks-qualite.md`.
- [À valider avec un conseil juridique / référent conformité FSF, hors périmètre technique] mise
  en conformité formelle avec la loi sénégalaise n° 2008-12 (registre des traitements, durées de
  conservation, droits des personnes, notification d'incident) — cf.
  `docs/08-securite-et-conformite.md` pour ce que le backend fournit déjà comme briques
  techniques (minimisation, export/suppression par API, journalisation).

## 12. Hors périmètre explicite (cahier §3.2, §30, §35)

Billetterie grand public, gestion sportive du match, paie/comptabilité, carte de presse
nationale, reconnaissance biométrique, production physique des badges, intégration Odoo (aucune
décision fonctionnelle/technique prise à ce stade), véhicules/parkings nominatifs, badge
permanent pluri-saisons.

## Résumé exécutable

Le backend livré dans ce dépôt couvre l'intégralité du **cycle principal** exigé par le cahier
des charges (§36-37) : *demande → vérification → validation → attribution → notification →
contrôle d'accès → reporting*, avec Swagger, RBAC, audit, et hooks qualité. Les éléments listés
"Backlog" sont volontairement repoussés (ports/contrats déjà prévus dans le code) car ils
dépendent de décisions non techniques de la FSF (fournisseur SMS, licence Odoo, MFA) ou
demanderaient un investissement disproportionné pour un MVP à livrer rapidement (mode offline
complet, appli mobile native).
