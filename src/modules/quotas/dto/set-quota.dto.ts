import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OverflowPolicy } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class SetQuotaDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quotaTotal: number;

  @ApiPropertyOptional({
    enum: OverflowPolicy,
    default: OverflowPolicy.MANUAL_ARBITRATION,
  })
  @IsOptional()
  @IsEnum(OverflowPolicy)
  overflowPolicy?: OverflowPolicy;

  @ApiProperty({
    type: [String],
    description: 'Zones accordees pour ce couple match/categorie',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  zoneIds: string[];
}
