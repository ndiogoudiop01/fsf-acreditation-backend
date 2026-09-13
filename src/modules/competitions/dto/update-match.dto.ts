import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MatchStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateMatchDto } from './create-match.dto.js';

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
