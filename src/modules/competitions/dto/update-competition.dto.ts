import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CompetitionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCompetitionDto } from './create-competition.dto.js';

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {
  @ApiPropertyOptional({ enum: CompetitionStatus })
  @IsOptional()
  @IsEnum(CompetitionStatus)
  status?: CompetitionStatus;
}
