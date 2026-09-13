import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto.js';

export class ListLoginAttemptsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filtre exact sur l'email tente" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ne montrer que les succes ou que les echecs',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  succeeded?: boolean;
}
