import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaStatus, MediaType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto.js';

export class ListMediaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MediaStatus })
  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional({
    description: 'Recherche par nom (contient, insensible a la casse)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
