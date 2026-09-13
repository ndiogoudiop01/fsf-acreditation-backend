import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Portion "profil professionnel" du formulaire d'inscription (cahier §8).
 * Les champs d'identifiants de compte (email/mot de passe) sont portes par
 * le DTO d'inscription du module `iam`.
 */
export class CreateRequesterProfileDto {
  @ApiProperty()
  @IsUUID()
  mediaId: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Fonction (ex : journaliste, photographe, technicien)',
  })
  @IsString()
  function: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pressCardNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalEmail?: string;
}
