import { ApiProperty } from '@nestjs/swagger';
import { MediaStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMediaStatusDto {
  @ApiProperty({ enum: MediaStatus })
  @IsEnum(MediaStatus)
  status: MediaStatus;
}
