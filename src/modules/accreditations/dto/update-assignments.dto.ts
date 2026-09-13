import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Attribution granulaire diffuseurs (cahier §16, Phase 2) : cabine commentateur / sas flash. */
export class UpdateAssignmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedBoothNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedFlashSlot?: string;
}
