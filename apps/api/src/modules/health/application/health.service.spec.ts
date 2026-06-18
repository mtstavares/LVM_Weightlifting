import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns api health status', () => {
    const service = new HealthService();

    expect(service.check()).toEqual({
      status: 'ok',
      service: 'lvm-api'
    });
  });
});
