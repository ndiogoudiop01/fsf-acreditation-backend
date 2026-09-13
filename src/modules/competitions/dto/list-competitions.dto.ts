import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto.js';

export class ListCompetitionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CompetitionStatus })
  @IsOptional()
  @IsEnum(CompetitionStatus)
  status?: CompetitionStatus;
}
