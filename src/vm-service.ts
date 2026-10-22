import type { Logger } from '@podman-desktop/api';

import type { MachineInfo, Vm, VmAction, VmList } from '../packages/shared/src/api';
import { OUTPUT_LIMIT } from '../packages/shared/src/api';

export interface MachineRecord extends MachineInfo {
  running: boolean;
  starting: boolean;
}
export interface MachineSource {
  list(): Promise<{ machines: MachineRecord[]; available: boolean; error?: string }>;
  action(machine: MachineInfo, action: VmAction, logger: Logger): Promise<void>;
  create(): Promise<void>;
}

export class VmService {
  private readonly pending = new Map<string, VmAction>();
  private readonly errors = new Map<string, string>();
  private readonly output = new Map<string, string>();

  constructor(private readonly source: MachineSource) {}

  private key(machine: MachineInfo): string {
    return JSON.stringify([machine.vmType, machine.name]);
  }

  async list(): Promise<VmList> {
    const result = await this.source.list();
    return {
      ...result,
      machines: result.machines.map(machine => {
        const id = this.key(machine);
        const action = this.pending.get(id);
        return {
          ...machine,
          id,
          busy: !!action,
          error: this.errors.get(id),
          status:
            action === 'delete'
              ? 'deleting'
              : action === 'stop'
                ? 'stopping'
                : action === 'start' || machine.starting
                  ? 'starting'
                  : machine.running
                    ? 'running'
                    : 'stopped',
        };
      }),
    };
  }

  async machine(id: string): Promise<Vm> {
    const result = await this.list();
    const vm = result.machines.find(machine => machine.id === id);
    if (!vm) {
      throw new Error(result.error ?? 'Virtual machine not found. Refresh the list.');
    }
    return vm;
  }

  private append(id: string, text: string): void {
    this.output.set(id, ((this.output.get(id) ?? '') + text).slice(-OUTPUT_LIMIT));
  }

  async action(id: string, action: VmAction): Promise<void> {
    if (!['start', 'stop', 'delete'].includes(action)) {
      throw new Error('Unsupported VM action');
    }
    if (this.pending.has(id)) {
      throw new Error('Another action is in progress for this VM');
    }

    // Lock before the asynchronous lookup so concurrent requests cannot both pass.
    this.pending.set(id, action);
    try {
      const result = await this.source.list();
      const machine = result.machines.find(item => this.key(item) === id);
      if (!machine) {
        throw new Error(result.error ?? 'Virtual machine not found');
      }
      const active = machine.running || machine.starting;
      if (action === 'start' && active) {
        throw new Error('The VM is already active');
      }
      if (action === 'delete' && active) {
        throw new Error('Stop the VM before deletion');
      }
      if (action === 'stop' && !active) {
        return;
      }
      this.errors.delete(id);
      this.append(id, '\n' + action + ' ' + machine.name + '\n');
      const log = (...data: unknown[]): void => {
        this.append(id, data.map(item => String(item)).join(' ') + '\n');
      };
      await this.source.action(machine, action, { log, error: log, warn: log });
      this.append(id, action + ' completed\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.errors.set(id, message);
      this.append(id, message + '\n');
      throw error;
    } finally {
      this.pending.delete(id);
    }
  }

  async logs(id: string): Promise<string> {
    await this.machine(id);
    return this.output.get(id) ?? '';
  }

  create(): Promise<void> {
    return this.source.create();
  }
}
