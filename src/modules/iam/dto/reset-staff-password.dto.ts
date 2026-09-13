import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Reinitialisation d'un mot de passe par un administrateur (cahier §23,
 * fonction "reinitialisation"). Meme logique que la creation : l'admin
 * choisit un mot de passe temporaire et le communique hors bande — pas de
 * flux d'email en libre-service pour le MVP (cf. `CreateStaffUserDto`).
 */
export class ResetStaffPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newTemporaryPassword: string;
}
