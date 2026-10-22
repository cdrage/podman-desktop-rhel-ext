import type { Logger } from '@podman-desktop/api';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { MachineRecord, MachineSource } from './vm-service';
import { VmService } from './vm-service';

const record: MachineRecord = {
  name: 'rhel',
  vmType: 'applehv',
  cpus: 2,
  memory: 4 * 1024 ** 3,
  diskSize: 20 * 1024 ** 3,
  image: '/disk.raw',
  port: 2222,
  identityPath: '/key',
  remoteUsername: 'core',
  running: false,
  starting: false,
};
let source: MachineSource;
let service: VmService;
beforeEach(() => {
  source = { list: vi.fn(async () => ({ machines: [record], available: true })), action: vi.fn(), create: vi.fn() };
  service = new VmService(source);
});
describe('VM service', () => {
  test('uses provider-qualified identities and byte-valued resources', async () => {
    vi.mocked(source.list).mockResolvedValue({ machines: [record, { ...record, vmType: 'wsl' }], available: true });
    const result = await service.list();
    expect(result.machines[0].id).not.toBe(result.machines[1].id);
    expect(result.machines[0].memory).toBe(4 * 1024 ** 3);
  });
  test('delegates actions and captures operation logs', async () => {
    vi.mocked(source.action).mockImplementation(async (_machine, _action, logger: Logger) => {
      logger.log('Boot');
    });
    const vm = (await service.list()).machines[0];
    await service.action(vm.id, 'start');
    expect(source.action).toHaveBeenCalledWith(expect.objectContaining({ name: 'rhel' }), 'start', expect.anything());
    expect(await service.logs(vm.id)).toContain('Boot');
  });
  test('blocks deletion of active machines', async () => {
    vi.mocked(source.list).mockResolvedValue({ machines: [{ ...record, running: true }], available: true });
    const vm = (await service.list()).machines[0];
    await expect(service.action(vm.id, 'delete')).rejects.toThrow('Stop');
    expect(source.action).not.toHaveBeenCalled();
  });
  test('locks actions before lookup and reports transitional states', async () => {
    let finish: () => void = (): void => {};
    vi.mocked(source.action).mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    const vm = (await service.list()).machines[0];
    const action = service.action(vm.id, 'start');
    await vi.waitFor(() => expect(source.action).toHaveBeenCalledOnce());
    expect((await service.list()).machines[0].status).toBe('starting');
    await expect(service.action(vm.id, 'start')).rejects.toThrow('Another action');
    finish();
    await action;
    expect((await service.list()).machines[0].busy).toBe(false);
  });
  test('surfaces action failures and releases the lock', async () => {
    vi.mocked(source.action).mockRejectedValue(new Error('Start failed'));
    const vm = (await service.list()).machines[0];
    await expect(service.action(vm.id, 'start')).rejects.toThrow('Start failed');
    expect((await service.list()).machines[0]).toMatchObject({ busy: false, error: 'Start failed' });
  });
  test('rejects missing machines and unknown actions', async () => {
    await expect(service.action('missing', 'start')).rejects.toThrow('not found');
    await expect(service.action('missing', 'oops' as 'start')).rejects.toThrow('Unsupported');
  });
  test('delegates creation to the existing RHEL flow', async () => {
    await service.create();
    expect(source.create).toHaveBeenCalledOnce();
  });
});
