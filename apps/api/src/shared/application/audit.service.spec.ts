import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('sanitizes sensitive metadata recursively', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({ authAuditLog: { create } } as any);

    await service.record({
      event: 'ACCESS_DENIED',
      metadata: {
        safe: 'ok',
        password: 'secret',
        nested: {
          tokenValue: 'token',
          visible: 'yes',
          list: [{ code: '123456', kept: true }]
        }
      }
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: {
          safe: 'ok',
          nested: {
            visible: 'yes',
            list: [{ kept: true }]
          }
        }
      })
    });
  });
});
