import { ApiProperty } from '@nestjs/swagger';
import { RequesterStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRequesterStatusDto {
  @ApiProperty({ enum: RequesterStatus })
  @IsEnum(RequesterStatus)
  status: RequesterStatus;
}
