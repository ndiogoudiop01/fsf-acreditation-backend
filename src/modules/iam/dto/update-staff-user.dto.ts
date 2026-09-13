import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/** Modification d'un compte interne existant par un administrateur (cahier §23). */
export class UpdateStaffUserDto {
  @ApiPropertyOptional({
    enum: StaffRole,
    description: "Reaffectation du role (droits d'acces)",
  })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;
}
