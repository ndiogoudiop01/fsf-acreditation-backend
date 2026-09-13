import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  matchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
