import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('Categories accreditation')
@Controller('accreditation-categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Public()
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiOperation({
    summary: "Catalogue des categories d'accreditation (cahier §10)",
  })
  list(@Query('activeOnly') activeOnly?: string) {
    return this.categories.list(activeOnly === 'true');
  }

  @Get(':id')
  @Public()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.get(id);
  }
}
