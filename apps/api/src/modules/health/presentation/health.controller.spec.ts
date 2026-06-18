import { HealthService } from '../application/health.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns health status from service', () => {
    const service = new HealthService();
    const controller = new HealthController(service);

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'lvm-api'
    });
  });
});
