import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEditorInChiefDto {
  @ApiProperty({
    description:
      'Habilite (true) ou revoque (false) l\'espace "Redacteur en Chef"',
  })
  @IsBoolean()
  isEditorInChief: boolean;
}
