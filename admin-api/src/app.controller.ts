import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SkipThrottle()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Liveness/readiness for orchestrators and Docker HEALTHCHECK (no auth). */
  @Get('health')
  @SkipThrottle()
  health(): { status: string } {
    return { status: 'ok' };
  }
}
