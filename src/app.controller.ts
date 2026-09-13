import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './shared/decorators/public.decorator.js';
import { AppService } from './app.service.js';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getInfo() {
    return this.appService.getInfo();
  }
}
