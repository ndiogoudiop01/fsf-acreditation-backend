import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class DecideRequestDto {
  @ApiProperty({ enum: [RequestStatus.VALIDATED, RequestStatus.REJECTED] })
  @IsEnum([RequestStatus.VALIDATED, RequestStatus.REJECTED])
  status: typeof RequestStatus.VALIDATED | typeof RequestStatus.REJECTED;

  @ApiPropertyOptional({
    description: 'Obligatoire en cas de refus (cahier §13 : "refus motive")',
  })
  @ValidateIf((o: DecideRequestDto) => o.status === RequestStatus.REJECTED)
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Zones accordees (obligatoire si VALIDATED)',
  })
  @ValidateIf((o: DecideRequestDto) => o.status === RequestStatus.VALIDATED)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  zoneIds?: string[];

  @ApiPropertyOptional({
    description:
      'Force la validation au-dela du quota (reserve aux administrateurs, politique PRIORITY uniquement, cahier §11)',
  })
  @IsOptional()
  overrideQuota?: boolean;

  @ApiPropertyOptional({
    description: 'Cabine commentateur attribuee (diffuseurs, Phase 2)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedBoothNumber?: number;

  @ApiPropertyOptional({
    description: "Sas d'interview flash attribue (diffuseurs, Phase 2)",
  })
  @IsOptional()
  @IsString()
  assignedFlashSlot?: string;
}
