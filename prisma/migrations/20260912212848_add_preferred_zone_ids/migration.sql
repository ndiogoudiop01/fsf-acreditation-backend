-- AlterTable
ALTER TABLE "accreditation_requests" ADD COLUMN     "preferredZoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
