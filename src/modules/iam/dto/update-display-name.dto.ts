import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateDisplayNameDto {
  @ApiProperty({ example: 'Agent Cdt. Sarr' })
  @IsString()
  @MinLength(2)
  displayName: string;
}
