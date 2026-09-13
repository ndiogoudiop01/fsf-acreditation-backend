import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RevokeAccreditationDto {
  @ApiProperty({
    description:
      'Motif de revocation (cahier §16 : identifiable immediatement au controle)',
  })
  @IsString()
  @MinLength(3)
  reason: string;
}
