import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto.js';

export class ListRequesterProfilesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Recherche par nom/prenom' })
  @IsOptional()
  @IsString()
  search?: string;
}
