import { ApiProperty } from '@nestjs/swagger';
import { ScanResult } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * Contrat de synchronisation hors-connexion (cahier §18). La robustesse
 * complete (resolution de conflits, purge locale, procedure de perte
 * d'appareil) est en Phase 2 — cf. docs/06-qr-code-et-controle-acces.md.
 * Ce DTO fixe deja la forme des donnees echangees pour ne pas bloquer un
 * futur client offline.
 */
export class OfflineScanRecordDto {
  @ApiProperty()
  @IsUUID()
  accreditationId: string;

  @ApiProperty()
  @IsUUID()
  matchId: string;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiProperty()
  @IsString()
  deviceId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gate?: string;

  @ApiProperty({ enum: ScanResult })
  @IsEnum(ScanResult)
  result: ScanResult;

  @ApiProperty()
  @IsDateString()
  scannedAt: string;
}

export class SyncOfflineScansDto {
  @ApiProperty({ type: [OfflineScanRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanRecordDto)
  scans: OfflineScanRecordDto[];
}
