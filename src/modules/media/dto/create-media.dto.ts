import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BroadcasterTier, MediaType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMediaDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleName?: string;

  @ApiPropertyOptional({
    enum: BroadcasterTier,
    description:
      'Statut vis-a-vis des droits de diffusion (Phase 2 : cabines, sas flash-interview)',
  })
  @IsOptional()
  @IsEnum(BroadcasterTier)
  broadcasterTier?: BroadcasterTier;
}
