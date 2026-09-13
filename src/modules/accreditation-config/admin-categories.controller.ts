import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories accreditation')
@ApiBearerAuth('access-token')
@Controller('admin/accreditation-categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  @ApiOperation({ summary: "Creer une categorie d'accreditation (cahier §10)" })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }
}
