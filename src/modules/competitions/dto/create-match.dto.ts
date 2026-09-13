import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @ApiProperty()
  @IsUUID()
  competitionId: string;

  @ApiProperty()
  @IsString()
  homeTeam: string;

  @ApiProperty()
  @IsString()
  awayTeam: string;

  @ApiProperty({ description: "Date/heure du coup d'envoi (ISO 8601)" })
  @IsDateString()
  kickoffAt: string;

  @ApiPropertyOptional({ default: 'Africa/Dakar' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty()
  @IsString()
  stadium: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  capacityTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestsOpenAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestsCloseAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rulesNotes?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  operationalContacts?: Record<string, unknown>;
}
