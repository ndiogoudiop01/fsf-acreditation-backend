import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole, UserKind, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto.js';

export class ListUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserKind })
  @IsOptional()
  @IsEnum(UserKind)
  kind?: UserKind;

  @ApiPropertyOptional({ enum: StaffRole })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
