import { Injectable } from '@nestjs/common';

export type HealthStatus = {
  status: 'ok';
  service: string;
};

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'lvm-api'
    };
  }
}
