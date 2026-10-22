import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Shell from './Terminal.svelte';
import TerminalSession from './TerminalSession.svelte';

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  output: vi.fn(),
  input: vi.fn(),
  resize: vi.fn(),
  close: vi.fn(),
  focus: vi.fn(),
  write: vi.fn(),
  dispose: vi.fn(),
  fit: vi.fn(),
  disconnect: vi.fn(),
  data: undefined as ((data: string) => void) | undefined,
  resized: undefined as ((size: { cols: number; rows: number }) => void) | undefined,
}));

vi.mock('../api/client', () => ({ client: mocks }));
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 120;
    rows = 30;
    focus = mocks.focus;
    write = mocks.write;
    dispose = mocks.dispose;
    loadAddon(): void {}
    open(): void {}
    onData(callback: (data: string) => void): { dispose: () => void } {
      mocks.data = callback;
      return { dispose: vi.fn() };
    }
    onResize(callback: (size: { cols: number; rows: number }) => void): { dispose: () => void } {
      mocks.resized = callback;
      return { dispose: vi.fn() };
    }
  },
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = mocks.fit;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.data = undefined;
  mocks.resized = undefined;
  mocks.open.mockResolvedValue('ssh-session');
  mocks.output.mockResolvedValue({ text: 'rhel$ ', offset: 6, ended: false });
  mocks.input.mockResolvedValue(undefined);
  mocks.resize.mockResolvedValue(undefined);
  mocks.close.mockResolvedValue(undefined);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect = mocks.disconnect;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('does not focus the terminal after an initial resize outlives the view', async () => {
  let finishResize: (() => void) | undefined;
  mocks.resize.mockImplementationOnce(() => new Promise<void>(resolve => (finishResize = resolve)));
  const screen = render(TerminalSession, { id: 'rhel', onerror: vi.fn(), onend: vi.fn() });
  await waitFor(() => expect(mocks.resize).toHaveBeenCalledWith('ssh-session', 120, 30));

  screen.unmount();
  finishResize?.();
  await Promise.resolve();
  await Promise.resolve();

  expect(mocks.focus).not.toHaveBeenCalled();
  expect(mocks.output).not.toHaveBeenCalled();
  expect(mocks.close).toHaveBeenCalledExactlyOnceWith('ssh-session');
});

it('replaces the SSH session when the selected VM changes', async () => {
  const screen = render(Shell, { id: 'rhel', label: 'core@localhost:2222' });
  await waitFor(() => expect(mocks.output).toHaveBeenCalledWith('ssh-session', 0));

  await screen.rerender({ id: 'another-vm', label: 'core@localhost:2223' });

  await waitFor(() => expect(mocks.open).toHaveBeenLastCalledWith('another-vm'));
  expect(mocks.close).toHaveBeenCalledWith('ssh-session');
});

it('forwards SSH input and the terminal dimensions through the VM API', async () => {
  render(TerminalSession, { id: 'rhel', onerror: vi.fn(), onend: vi.fn() });
  await waitFor(() => expect(mocks.output).toHaveBeenCalledWith('ssh-session', 0));

  mocks.data?.('uname -a\r');
  mocks.resized?.({ cols: 90, rows: 20 });

  expect(mocks.input).toHaveBeenCalledWith('ssh-session', 'uname -a\r');
  expect(mocks.resize).toHaveBeenLastCalledWith('ssh-session', 90, 20);
  expect(mocks.write).toHaveBeenCalledWith('rhel$ ');
});

it('polls from the returned offset and stops after the tab closes', async () => {
  vi.useFakeTimers();
  const screen = render(TerminalSession, { id: 'rhel', onerror: vi.fn(), onend: vi.fn() });
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.output).toHaveBeenCalledExactlyOnceWith('ssh-session', 0);

  await vi.runOnlyPendingTimersAsync();
  expect(mocks.output).toHaveBeenLastCalledWith('ssh-session', 6);

  screen.unmount();
  await vi.runOnlyPendingTimersAsync();

  expect(mocks.output).toHaveBeenCalledTimes(2);
  expect(mocks.close).toHaveBeenCalledExactlyOnceWith('ssh-session');
});

it('closes an SSH session that opens after the view closes', async () => {
  let finishOpen: ((token: string) => void) | undefined;
  mocks.open.mockImplementationOnce(() => new Promise<string>(resolve => (finishOpen = resolve)));
  const screen = render(TerminalSession, { id: 'rhel', onerror: vi.fn(), onend: vi.fn() });

  screen.unmount();
  finishOpen?.('late-session');

  await waitFor(() => expect(mocks.close).toHaveBeenCalledExactlyOnceWith('late-session'));
  expect(mocks.resize).not.toHaveBeenCalled();
  expect(mocks.output).not.toHaveBeenCalled();
});

it('ignores pending output after the terminal closes', async () => {
  let finishOutput: ((value: { text: string; offset: number; ended: boolean }) => void) | undefined;
  mocks.output.mockImplementationOnce(
    () => new Promise<{ text: string; offset: number; ended: boolean }>(resolve => (finishOutput = resolve)),
  );
  const onend = vi.fn();
  const screen = render(TerminalSession, { id: 'rhel', onerror: vi.fn(), onend });
  await waitFor(() => expect(mocks.output).toHaveBeenCalledWith('ssh-session', 0));

  screen.unmount();
  finishOutput?.({ text: 'late output', offset: 11, ended: true });
  await Promise.resolve();

  expect(mocks.write).not.toHaveBeenCalled();
  expect(onend).not.toHaveBeenCalled();
  expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(mocks.disconnect).toHaveBeenCalledOnce();
});

it('stops input after SSH ends and supports an explicit reconnect', async () => {
  mocks.open.mockResolvedValueOnce('first-session').mockResolvedValueOnce('second-session');
  mocks.output.mockResolvedValueOnce({ text: 'logout\r\n', offset: 8, ended: true });
  const screen = render(Shell, { id: 'rhel', label: 'core@localhost:2222' });
  const reconnect = await screen.findByRole('button', { name: 'Reconnect' });

  mocks.data?.('ignored');
  mocks.resized?.({ cols: 90, rows: 20 });
  expect(mocks.input).not.toHaveBeenCalled();
  expect(mocks.resize).toHaveBeenCalledOnce();
  expect(mocks.close).toHaveBeenCalledExactlyOnceWith('first-session');

  await fireEvent.click(reconnect);

  await waitFor(() => expect(mocks.output).toHaveBeenCalledWith('second-session', 0));
  expect(mocks.open).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull();
});

it('reports a transport error and releases its SSH session', async () => {
  const onerror = vi.fn();
  mocks.output.mockRejectedValueOnce(new Error('The SSH connection closed.'));
  render(TerminalSession, { id: 'rhel', onerror, onend: vi.fn() });
  await waitFor(() => expect(onerror).toHaveBeenCalledWith('The SSH connection closed.'));

  mocks.data?.('ignored');

  expect(mocks.input).not.toHaveBeenCalled();
  expect(mocks.close).toHaveBeenCalledExactlyOnceWith('ssh-session');
});
