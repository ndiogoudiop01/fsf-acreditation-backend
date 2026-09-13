import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'PHOTO',
    description: 'Code unique, majuscules (cahier §10)',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]{2,30}$/, {
    message: 'Le code doit etre en majuscules, chiffres ou underscore.',
  })
  code: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DocumentType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  requiredDocumentTypes?: DocumentType[];
}
