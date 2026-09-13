import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertTemplateDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Corps HTML, variables entre {{ }}' })
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
