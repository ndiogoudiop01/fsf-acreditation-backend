import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { CreateRequesterProfileDto } from '../../media/dto/create-requester-profile.dto.js';

/**
 * Ajout d'un envoye special par le Redacteur en Chef (Phase 2, espace
 * "Redacteur en Chef"). Le `mediaId` n'est PAS impose par le client : il est
 * force au media de l'editeur connecte, jamais choisi librement (impossible
 * d'accrediter un journaliste pour un autre media que le sien).
 */
export class AddJournalistDto extends OmitType(CreateRequesterProfileDto, [
  'mediaId',
] as const) {
  @ApiPropertyOptional({
    description: 'Ignore : force au media du redacteur en chef connecte.',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}
