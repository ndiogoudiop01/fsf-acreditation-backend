import { PartialType } from '@nestjs/swagger';
import { CreateMediaDto } from './create-media.dto.js';

export class UpdateMediaDto extends PartialType(CreateMediaDto) {}
