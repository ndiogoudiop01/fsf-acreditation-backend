import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Suivi public d'un dossier (cahier §9 : "module de suivi par numero de
 * dossier ou email"). Les deux champs sont requis ensemble : le numero de
 * dossier seul est deja peu devinable, mais on evite toute enumeration en
 * exigeant la correspondance avec l'email du compte demandeur.
 */
export class TrackRequestDto {
  @ApiProperty({ example: 'FSF-2026-841140' })
  @IsString()
  @MinLength(4)
  reference: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}
