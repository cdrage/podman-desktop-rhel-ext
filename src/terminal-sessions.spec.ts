import type { ProviderConnectionShellAccess, ProviderConnectionShellAccessSession } from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import type { MachineInfo } from '../packages/shared/src/api';
import { OUTPUT_LIMIT } from '../packages/shared/src/api';
import { TerminalSessions } from './terminal-sessions';

let data: (event: { data: string }) => void;
let ended: () => void;
let error: (event: { error: string }) => void;
const dispose = vi.fn();
const shell = {
  onData: vi.fn(callback => {
    data = callback;
    return { dispose };
  }),
  onEnd: vi.fn(callback => {
    ended = callback;
    return { dispose };
  }),
  onError: vi.fn(callback => {
    error = callback;
    return { dispose };
  }),
  write: vi.fn(),
  resize: vi.fn(),
  close: vi.fn(),
} as unknown as ProviderConnectionShellAccessSession;
const owner = { open: vi.fn(() => shell), dispose: vi.fn() } as unknown as ProviderConnectionShellAccess & {
  dispose(): void;
};
let sessions: TerminalSessions;
beforeEach(() => {
  vi.clearAllMocks();
  sessions = new TerminalSessions(() => owner);
});
const machine = {} as MachineInfo;
test('forwards input and resize, with incremental output', () => {
  const id = sessions.open(machine);
  data({ data: 'hello' });
  expect(sessions.output(id, 0).text).toBe('hello');
  expect(sessions.output(id, 5).text).toBe('');
  sessions.input(id, 'root\r');
  sessions.resize(id, 100, 30);
  expect(shell.write).toHaveBeenCalledWith('root\r');
  expect(shell.resize).toHaveBeenCalledWith({ cols: 100, rows: 30 });
  sessions.dispose();
  expect(owner.dispose).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledTimes(3);
});
test('bounds terminal output and rejects invalid dimensions', () => {
  const id = sessions.open(machine);
  data({ data: 'x'.repeat(OUTPUT_LIMIT + 1) });
  expect(sessions.output(id, 0).text).toHaveLength(OUTPUT_LIMIT);
  expect(() => sessions.resize(id, 0, 24)).toThrow('dimensions');
  expect(() => sessions.input(id, 'x'.repeat(65537))).toThrow('input');
  sessions.dispose();
});
test('reports remote exits and SSH errors', () => {
  const id = sessions.open(machine);
  ended();
  expect(sessions.output(id, 0).ended).toBe(true);
  expect(() => sessions.input(id, 'x')).toThrow('Reconnect');
  error({ error: 'Connection refused' });
  expect(sessions.output(id, 0).text).toContain('Connection refused');
  sessions.close(id);
  expect(() => sessions.output(id, 0)).toThrow('closed');
});
test('decodes SSH byte chunks before the output cursor advances', () => {
  const id = sessions.open(machine);
  const bytes = Buffer.from('é');
  data({ data: bytes.subarray(0, 1) as unknown as string });
  data({ data: bytes.subarray(1) as unknown as string });
  expect(sessions.output(id, 0)).toMatchObject({ text: 'é', offset: 1 });
  sessions.dispose();
});
test('cleans up a failed shell open', () => {
  vi.mocked(owner.open).mockImplementationOnce(() => {
    throw new Error('Missing key');
  });
  expect(() => sessions.open(machine)).toThrow('Missing key');
  expect(owner.dispose).toHaveBeenCalledOnce();
});
