import { ApiProperty } from '@nestjs/swagger';
import { DocumentSubjectType, DocumentType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentSubjectType })
  @IsEnum(DocumentSubjectType)
  subjectType: DocumentSubjectType;

  @ApiProperty({
    description: 'Identifiant du média, du profil demandeur ou de la demande',
  })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;
}
