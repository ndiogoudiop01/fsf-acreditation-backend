-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('STAFF', 'REQUESTER');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'RESPONSABLE_ACCREDITATION', 'COMMISSION_VALIDATION', 'AGENT_CONTROLE', 'SUPERVISEUR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('TELEVISION', 'RADIO', 'PRESSE_ECRITE', 'PRESSE_EN_LIGNE', 'AGENCE', 'PHOTOGRAPHE', 'CREATEUR_CONTENU', 'MEDIA_INTERNATIONAL', 'AUTRE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RequesterStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'PLAYED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OverflowPolicy" AS ENUM ('QUEUE', 'MANUAL_ARBITRATION', 'PRIORITY', 'CLOSE');

-- CreateEnum
CREATE TYPE "DocumentSubjectType" AS ENUM ('MEDIA', 'REQUESTER', 'REQUEST');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CARTE_PRESSE', 'PIECE_IDENTITE', 'PHOTO', 'LETTRE_MISSION', 'ATTESTATION_MEDIA', 'AUTRE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'COMPLETE', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'CANCELLED', 'BADGE_GENERATED', 'ACCESS_USED');

-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('VALID', 'INVALID', 'EXPIRED', 'REVOKED', 'ALREADY_USED', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('ONLINE', 'OFFLINE_SYNCED');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('ACCOUNT_CREATED', 'REQUEST_RECEIVED', 'COMPLEMENT_REQUESTED', 'REQUEST_VALIDATED', 'REQUEST_REJECTED', 'BADGE_AVAILABLE', 'MATCH_UPDATED', 'CLOSURE_REMINDER', 'ACCREDITATION_REVOKED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "kind" "UserKind" NOT NULL,
    "role" "StaffRole",
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "responsibleName" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "internalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requester_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photoDocumentId" TEXT,
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "function" TEXT NOT NULL,
    "specialty" TEXT,
    "pressCardNumber" TEXT,
    "professionalPhone" TEXT,
    "professionalEmail" TEXT,
    "status" "RequesterStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requester_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "organizer" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Dakar',
    "stadium" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'DRAFT',
    "capacityTotal" INTEGER,
    "requestsOpenAt" TIMESTAMP(3),
    "requestsCloseAt" TIMESTAMP(3),
    "rulesNotes" TEXT,
    "operationalContacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accreditation_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requiredDocumentTypes" "DocumentType"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accreditation_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_category_quotas" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quotaTotal" INTEGER NOT NULL,
    "overflowPolicy" "OverflowPolicy" NOT NULL DEFAULT 'MANUAL_ARBITRATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_category_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_category_quota_zones" (
    "id" TEXT NOT NULL,
    "quotaId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "match_category_quota_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "subjectType" "DocumentSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "rejectionReason" TEXT,
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accreditation_requests" (
    "id" TEXT NOT NULL,
    "uniqueReference" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "categoryRequestedId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "decisionById" TEXT,
    "decisionReason" TEXT,
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accreditation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_complements" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "missingItem" TEXT NOT NULL,
    "comment" TEXT,
    "dueDate" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_complements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_decisions" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "RequestStatus" NOT NULL,
    "toStatus" "RequestStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accreditations" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "AccreditationStatus" NOT NULL DEFAULT 'ACTIVE',
    "qrTokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revocationReason" TEXT,
    "photoDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accreditation_zones" (
    "id" TEXT NOT NULL,
    "accreditationId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "accreditation_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" TEXT NOT NULL,
    "accreditationId" TEXT,
    "scannedTokenHash" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "zoneId" TEXT,
    "deviceId" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "result" "ScanResult" NOT NULL,
    "reason" TEXT,
    "source" "ScanSource" NOT NULL DEFAULT 'ONLINE',
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipientUserId" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerResponse" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "deviceInfo" TEXT,
    "result" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_kind_role_idx" ON "users"("kind", "role");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_internalRef_key" ON "media"("internalRef");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE INDEX "media_name_idx" ON "media"("name");

-- CreateIndex
CREATE UNIQUE INDEX "requester_profiles_userId_key" ON "requester_profiles"("userId");

-- CreateIndex
CREATE INDEX "requester_profiles_mediaId_idx" ON "requester_profiles"("mediaId");

-- CreateIndex
CREATE INDEX "requester_profiles_status_idx" ON "requester_profiles"("status");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE INDEX "matches_competitionId_idx" ON "matches"("competitionId");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_kickoffAt_idx" ON "matches"("kickoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "accreditation_categories_code_key" ON "accreditation_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "match_category_quotas_matchId_categoryId_key" ON "match_category_quotas"("matchId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "match_category_quota_zones_quotaId_zoneId_key" ON "match_category_quota_zones"("quotaId", "zoneId");

-- CreateIndex
CREATE INDEX "documents_subjectType_subjectId_idx" ON "documents"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "accreditation_requests_uniqueReference_key" ON "accreditation_requests"("uniqueReference");

-- CreateIndex
CREATE INDEX "accreditation_requests_matchId_status_idx" ON "accreditation_requests"("matchId", "status");

-- CreateIndex
CREATE INDEX "accreditation_requests_requesterId_idx" ON "accreditation_requests"("requesterId");

-- CreateIndex
CREATE INDEX "request_complements_requestId_idx" ON "request_complements"("requestId");

-- CreateIndex
CREATE INDEX "request_decisions_requestId_idx" ON "request_decisions"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "accreditations_requestId_key" ON "accreditations"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "accreditations_number_key" ON "accreditations"("number");

-- CreateIndex
CREATE UNIQUE INDEX "accreditations_qrTokenHash_key" ON "accreditations"("qrTokenHash");

-- CreateIndex
CREATE INDEX "accreditations_status_idx" ON "accreditations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accreditation_zones_accreditationId_zoneId_key" ON "accreditation_zones"("accreditationId", "zoneId");

-- CreateIndex
CREATE INDEX "scan_logs_matchId_result_idx" ON "scan_logs"("matchId", "result");

-- CreateIndex
CREATE INDEX "scan_logs_accreditationId_idx" ON "scan_logs"("accreditationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_event_channel_locale_key" ON "notification_templates"("event", "channel", "locale");

-- CreateIndex
CREATE INDEX "notification_logs_recipientUserId_idx" ON "notification_logs"("recipientUserId");

-- CreateIndex
CREATE INDEX "notification_logs_event_status_idx" ON "notification_logs"("event", "status");

-- CreateIndex
CREATE INDEX "audit_logs_objectType_objectId_idx" ON "audit_logs"("objectType", "objectId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requester_profiles" ADD CONSTRAINT "requester_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requester_profiles" ADD CONSTRAINT "requester_profiles_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_category_quotas" ADD CONSTRAINT "match_category_quotas_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_category_quotas" ADD CONSTRAINT "match_category_quotas_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "accreditation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_category_quota_zones" ADD CONSTRAINT "match_category_quota_zones_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "match_category_quotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_category_quota_zones" ADD CONSTRAINT "match_category_quota_zones_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_requests" ADD CONSTRAINT "accreditation_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "requester_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_requests" ADD CONSTRAINT "accreditation_requests_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_requests" ADD CONSTRAINT "accreditation_requests_categoryRequestedId_fkey" FOREIGN KEY ("categoryRequestedId") REFERENCES "accreditation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_requests" ADD CONSTRAINT "accreditation_requests_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "accreditation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_complements" ADD CONSTRAINT "request_complements_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "accreditation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_complements" ADD CONSTRAINT "request_complements_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_decisions" ADD CONSTRAINT "request_decisions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "accreditation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_decisions" ADD CONSTRAINT "request_decisions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditations" ADD CONSTRAINT "accreditations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "accreditation_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditations" ADD CONSTRAINT "accreditations_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_zones" ADD CONSTRAINT "accreditation_zones_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "accreditations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditation_zones" ADD CONSTRAINT "accreditation_zones_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "accreditations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
