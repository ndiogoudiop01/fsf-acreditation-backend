import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { CreateRequesterProfileDto } from '../../media/dto/create-requester-profile.dto.js';

export class RegisterRequesterDto extends CreateRequesterProfileDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
