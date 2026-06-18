import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from '../application/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'lvm-api'
      }
    }
  })
  check(): HealthStatus {
    return this.healthService.check();
  }
}
