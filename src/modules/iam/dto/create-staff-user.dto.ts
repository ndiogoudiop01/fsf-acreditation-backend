import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Creation d'un compte interne par un administrateur (cahier §23). Pas de
 * flux d'invitation par lien pour le MVP : l'admin definit un mot de passe
 * initial et le communique de maniere securisee au titulaire du compte, qui
 * pourra le changer ensuite. Une invitation en libre-service (jeton a usage
 * unique par email) est une amelioration Phase 2 documentee dans
 * docs/01-fonctionnalites.md.
 */
export class CreateStaffUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  temporaryPassword: string;

  @ApiPropertyOptional({
    description: 'Nom affiche (ex. "Agent Cdt. Sarr"), utile sur le terrain',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
