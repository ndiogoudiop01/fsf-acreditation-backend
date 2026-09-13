import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { IsEnum, IsString, ValidateIf } from 'class-validator';

export class ReviewDocumentDto {
  @ApiProperty({ enum: DocumentStatus, enumName: 'ReviewDocumentStatus' })
  @IsEnum([DocumentStatus.VALIDATED, DocumentStatus.REJECTED])
  status: typeof DocumentStatus.VALIDATED | typeof DocumentStatus.REJECTED;

  @ApiPropertyOptional({
    description:
      'Obligatoire si status = REJECTED (cahier §12 : "rejet motive")',
  })
  @ValidateIf((o: ReviewDocumentDto) => o.status === DocumentStatus.REJECTED)
  @IsString()
  rejectionReason?: string;
}
