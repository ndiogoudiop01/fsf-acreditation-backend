import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty({ example: 'TRIBUNE_PRESSE' })
  @IsString()
  @Matches(/^[A-Z0-9_]{2,30}$/, {
    message: 'Le code doit etre en majuscules, chiffres ou underscore.',
  })
  code: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
