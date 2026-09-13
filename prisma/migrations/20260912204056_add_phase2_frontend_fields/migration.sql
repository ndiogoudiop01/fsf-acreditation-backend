-- CreateEnum
CREATE TYPE "BroadcasterTier" AS ENUM ('HOST_BROADCASTER', 'CAF_RIGHTS_HOLDER', 'FIFA_RIGHTS_HOLDER', 'NON_RIGHTS_HOLDER', 'WRITTEN_PRESS_ACCREDITED');

-- CreateEnum
CREATE TYPE "RoleInEvent" AS ENUM ('JOURNALISTE_REPORTER', 'PHOTOGRAPHE', 'CAMERAMAN', 'COMMENTATEUR', 'TECHNICIEN_REGIE');

-- CreateEnum
CREATE TYPE "ScanAction" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- AlterTable
ALTER TABLE "accreditation_requests" ADD COLUMN     "carPlateNumber" TEXT,
ADD COLUMN     "needsDesk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsLanWifi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsPower" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleInEvent" "RoleInEvent";

-- AlterTable
ALTER TABLE "accreditations" ADD COLUMN     "assignedBoothNumber" INTEGER,
ADD COLUMN     "assignedFlashSlot" TEXT,
ADD COLUMN     "cryptoSignature" JSONB;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "broadcasterTier" "BroadcasterTier";

-- AlterTable
ALTER TABLE "requester_profiles" ADD COLUMN     "isEditorInChief" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "scan_logs" ADD COLUMN     "action" "ScanAction" NOT NULL DEFAULT 'CHECK_IN',
ADD COLUMN     "gate" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "displayName" TEXT;
