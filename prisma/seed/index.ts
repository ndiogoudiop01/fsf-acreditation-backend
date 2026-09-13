import {
  PrismaClient,
  StaffRole,
  UserKind,
  UserStatus,
  MediaType,
  MediaStatus,
  BroadcasterTier,
  CompetitionStatus,
  MatchStatus,
  DocumentType,
  RequesterStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Donnees de demonstration pour un environnement de developpement/recette.
 * Ne JAMAIS executer en production (le mot de passe admin est public dans
 * ce fichier, a usage local uniquement) — cf. docs/12-deploiement.md.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedAdmin();
  await seedStaff();
  const mediaIds = await seedMedia();
  const categoryIds = await seedCategories();
  const zoneIds = await seedZones();
  const matchId = await seedCompetitionAndMatch();
  await seedQuotas(matchId, categoryIds, zoneIds);
  await seedEditorInChief(mediaIds.RTS);

  console.log('\nSeed termine. Comptes de demonstration :');
  console.log('  Admin             : admin@fsf.sn / Admin123!');
  console.log('  Responsable       : responsable@fsf.sn / Responsable123!');
  console.log('  Commission        : commission@fsf.sn / Commission123!');
  console.log(
    '  Controle          : controle@fsf.sn / Controle123! (personnaliser le nom via PATCH /auth/me/display-name)',
  );
  console.log('  Superviseur       : superviseur@fsf.sn / Superviseur123!');
  console.log(
    '  Redacteur en chef : redacteur.rts@fsf.sn / RedacteurChef123! (espace /media-desk, media RTS)',
  );
}

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@fsf.sn';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  await upsertStaff(email, password, StaffRole.ADMIN);
}

async function seedStaff(): Promise<void> {
  await upsertStaff(
    'responsable@fsf.sn',
    'Responsable123!',
    StaffRole.RESPONSABLE_ACCREDITATION,
  );
  await upsertStaff(
    'commission@fsf.sn',
    'Commission123!',
    StaffRole.COMMISSION_VALIDATION,
  );
  await upsertStaff(
    'controle@fsf.sn',
    'Controle123!',
    StaffRole.AGENT_CONTROLE,
  );
  await upsertStaff(
    'superviseur@fsf.sn',
    'Superviseur123!',
    StaffRole.SUPERVISEUR,
  );
}

async function upsertStaff(
  email: string,
  password: string,
  role: StaffRole,
): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      kind: UserKind.STAFF,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Compte ${role} cree : ${email}`);
}

async function seedMedia(): Promise<Record<string, string>> {
  const demoMedia = [
    {
      key: 'RTS',
      name: 'RTS (Radiodiffusion Television Senegalaise)',
      type: MediaType.TELEVISION,
      country: 'Senegal',
      broadcasterTier: BroadcasterTier.HOST_BROADCASTER,
    },
    {
      key: 'CANAL',
      name: 'Canal+ Sport Afrique',
      type: MediaType.TELEVISION,
      country: 'International / France - Afrique',
      broadcasterTier: BroadcasterTier.CAF_RIGHTS_HOLDER,
    },
    {
      key: 'APS',
      name: 'APS (Agence de Presse Senegalaise)',
      type: MediaType.AGENCE,
      country: 'Senegal',
      broadcasterTier: BroadcasterTier.WRITTEN_PRESS_ACCREDITED,
    },
    {
      key: 'SOLEIL',
      name: 'Le Soleil',
      type: MediaType.PRESSE_ECRITE,
      country: 'Senegal',
      broadcasterTier: BroadcasterTier.WRITTEN_PRESS_ACCREDITED,
    },
    {
      key: 'WALF',
      name: 'Walfadjri',
      type: MediaType.PRESSE_EN_LIGNE,
      country: 'Senegal',
      broadcasterTier: BroadcasterTier.WRITTEN_PRESS_ACCREDITED,
    },
    {
      key: 'RFI',
      name: 'RFI',
      type: MediaType.RADIO,
      country: 'France',
      broadcasterTier: BroadcasterTier.NON_RIGHTS_HOLDER,
    },
  ];
  const ids: Record<string, string> = {};
  for (const { key, ...media } of demoMedia) {
    const existing = await prisma.media.findFirst({
      where: { name: media.name },
    });
    if (existing) {
      ids[key] = existing.id;
      continue;
    }
    const created = await prisma.media.create({
      data: { ...media, status: MediaStatus.VALIDATED },
    });
    ids[key] = created.id;
    console.log(
      `Media de demonstration cree : ${media.name} (${media.broadcasterTier})`,
    );
  }
  return ids;
}

async function seedEditorInChief(mediaId: string): Promise<void> {
  const email = 'redacteur.rts@fsf.sn';
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return;

  const passwordHash = await argon2.hash('RedacteurChef123!', {
    type: argon2.argon2id,
  });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      kind: UserKind.REQUESTER,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.requesterProfile.create({
    data: {
      userId: user.id,
      mediaId,
      firstName: 'Ousseynou',
      lastName: 'Diop',
      phone: '+221 33 849 12 00',
      function: 'Redacteur en chef',
      status: RequesterStatus.VALIDATED,
      isEditorInChief: true,
    },
  });
  console.log(`Redacteur en chef de demonstration cree : ${email}`);
}

async function seedCategories(): Promise<Record<string, string>> {
  const categories = [
    {
      code: 'MEDIA',
      label: 'Presse ecrite/en ligne',
      requiredDocumentTypes: [DocumentType.CARTE_PRESSE],
    },
    {
      code: 'PHOTO',
      label: 'Photographe',
      requiredDocumentTypes: [DocumentType.CARTE_PRESSE, DocumentType.PHOTO],
    },
    {
      code: 'TV',
      label: 'Television',
      requiredDocumentTypes: [DocumentType.LETTRE_MISSION],
    },
    {
      code: 'RADIO',
      label: 'Radio',
      requiredDocumentTypes: [DocumentType.CARTE_PRESSE],
    },
    {
      code: 'DIGITAL',
      label: 'Createur de contenu digital',
      requiredDocumentTypes: [],
    },
    {
      code: 'TECHNIQUE',
      label: 'Equipe technique',
      requiredDocumentTypes: [DocumentType.LETTRE_MISSION],
    },
  ];
  const ids: Record<string, string> = {};
  for (const category of categories) {
    const row = await prisma.accreditationCategory.upsert({
      where: { code: category.code },
      create: category,
      update: {},
    });
    ids[category.code] = row.id;
  }
  console.log(`Categories d'accreditation : ${categories.length} disponibles.`);
  return ids;
}

async function seedZones(): Promise<Record<string, string>> {
  const zones = [
    {
      code: 'TRIBUNE_PRESSE',
      label: 'Tribune presse',
      description: 'Places assises avec pupitres et prises electriques.',
    },
    {
      code: 'TRIBUNE_MEDIA',
      label: 'Tribune media',
      description: 'Tribune reservee aux equipes TV/radio.',
    },
    {
      code: 'ZONE_PHOTOGRAPHES',
      label: 'Zone photographes (pelouse / main courante)',
      description: 'Bord de pelouse, chasuble FSF obligatoire.',
    },
    {
      code: 'ZONE_TV',
      label: 'Zone TV',
      description: 'Plateaux et positions cameras.',
    },
    {
      code: 'ZONE_MIXTE',
      label: "Zone mixte (interviews d'apres-match)",
      description: 'Couloir de passage joueurs/selectionneurs.',
    },
    {
      code: 'SALLE_CONFERENCE',
      label: 'Salle de conference de presse',
      description: "Conferences officielles d'avant/apres match.",
    },
    {
      code: 'STUDIO_TV',
      label: 'Studio TV',
      description: 'Plateaux et studios de production TV.',
    },
    {
      code: 'CABINE_COMMENTATEUR',
      label: 'Cabine commentateur',
      description: 'Cabines vitrees insonorisees, tribune officielle.',
    },
    {
      code: 'FLASH_INTERVIEW',
      label: "Sas d'interview flash",
      description: "Sas d'avant/apres match pour interviews courtes.",
    },
    {
      code: 'PARKING_MEDIA',
      label: 'Parking media',
      description: 'Acces vehicules regie / medias.',
    },
    {
      code: 'ZONE_TECHNIQUE',
      label: 'Zone technique',
      description: 'Regie, transmission, equipes techniques.',
    },
  ];
  const ids: Record<string, string> = {};
  for (const zone of zones) {
    const row = await prisma.zone.upsert({
      where: { code: zone.code },
      create: zone,
      update: {},
    });
    ids[zone.code] = row.id;
  }
  console.log(`Zones d'acces : ${zones.length} disponibles.`);
  return ids;
}

async function seedCompetitionAndMatch(): Promise<string> {
  const competition = await prisma.competition.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Eliminatoires CAN 2027',
      season: '2026-2027',
      organizer: 'CAF',
      status: CompetitionStatus.ACTIVE,
    },
    update: {},
  });

  const kickoffAt = new Date();
  kickoffAt.setDate(kickoffAt.getDate() + 30);
  const requestsCloseAt = new Date(kickoffAt);
  requestsCloseAt.setDate(requestsCloseAt.getDate() - 2);

  const match = await prisma.match.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      competitionId: competition.id,
      homeTeam: 'Senegal',
      awayTeam: 'Egypte',
      kickoffAt,
      stadium: 'Stade Abdoulaye Wade',
      city: 'Diamniadio',
      status: MatchStatus.OPEN,
      capacityTotal: 50000,
      requestsOpenAt: new Date(),
      requestsCloseAt,
    },
    update: {},
  });
  console.log(
    `Match de demonstration : ${match.homeTeam} vs ${match.awayTeam} (${match.id}), demandes ouvertes.`,
  );
  return match.id;
}

async function seedQuotas(
  matchId: string,
  categoryIds: Record<string, string>,
  zoneIds: Record<string, string>,
): Promise<void> {
  const quotas: Array<{
    code: keyof typeof categoryIds;
    total: number;
    zones: (keyof typeof zoneIds)[];
  }> = [
    { code: 'MEDIA', total: 50, zones: ['TRIBUNE_PRESSE'] },
    { code: 'PHOTO', total: 30, zones: ['ZONE_PHOTOGRAPHES'] },
    { code: 'TV', total: 20, zones: ['ZONE_TV', 'TRIBUNE_MEDIA'] },
    { code: 'RADIO', total: 15, zones: ['TRIBUNE_MEDIA'] },
    { code: 'DIGITAL', total: 15, zones: ['ZONE_MIXTE'] },
  ];
  for (const quota of quotas) {
    const categoryId = categoryIds[quota.code];
    if (!categoryId) continue;
    const row = await prisma.matchCategoryQuota.upsert({
      where: { matchId_categoryId: { matchId, categoryId } },
      create: { matchId, categoryId, quotaTotal: quota.total },
      update: {},
    });
    for (const zoneCode of quota.zones) {
      const zoneId = zoneIds[zoneCode];
      if (!zoneId) continue;
      await prisma.matchCategoryQuotaZone.upsert({
        where: { quotaId_zoneId: { quotaId: row.id, zoneId } },
        create: { quotaId: row.id, zoneId },
        update: {},
      });
    }
  }
  console.log(
    `Quotas configures pour le match de demonstration (${quotas.length} categories).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
