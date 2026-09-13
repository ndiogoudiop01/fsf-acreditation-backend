import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleInEvent } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Etape 1 du formulaire (cahier §9). Les informations personnelles/
 * professionnelles ne sont PAS ressaisies ici : elles vivent une fois pour
 * toutes dans le profil demandeur (`RequesterProfile`, cree a l'inscription)
 * et sont reutilisees pour chaque demande — simplification volontaire par
 * rapport au parcours papier du cahier des charges, documentee dans
 * docs/05-workflow-demandes.md.
 *
 * Les champs de besoins logistiques (Phase 2) correspondent a l'etape
 * "Zonage & specifications techniques" du parcours front-end.
 */
export class CreateDraftRequestDto {
  @ApiProperty()
  @IsUUID()
  matchId: string;

  @ApiProperty()
  @IsUUID()
  categoryRequestedId: string;

  @ApiPropertyOptional({ enum: RoleInEvent })
  @IsOptional()
  @IsEnum(RoleInEvent)
  roleInEvent?: RoleInEvent;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsDesk?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsPower?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsLanWifi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carPlateNumber?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Zones souhaitees (etape 3, carte 3D du stade) — indicatif, la Commission attribue les zones definitives a la validation.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  preferredZoneIds?: string[];
}
