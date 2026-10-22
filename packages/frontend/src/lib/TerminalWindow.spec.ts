import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import LogConsole from './LogConsole.svelte';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  write: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn(),
  fit: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    constructor(options: unknown) {
      mocks.create(options);
    }
    write = mocks.write;
    reset = mocks.reset;
    dispose = mocks.dispose;
    loadAddon(): void {}
    open(): void {}
    onData(): { dispose: () => void } {
      return { dispose: vi.fn() };
    }
    onResize(): { dispose: () => void } {
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
  vi.unstubAllGlobals();
});

it('appends operation output without duplicate log lines', async () => {
  const screen = render(LogConsole, { text: 'Start VM\n' });
  await waitFor(() => expect(mocks.write).toHaveBeenLastCalledWith('Start VM\n'));
  expect(screen.getByRole('region', { name: 'Operation log output' })).toBeTruthy();
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ convertEol: true, disableStdin: true }));
  mocks.write.mockClear();

  await screen.rerender({ text: 'Start VM\nVM started\n' });

  await waitFor(() => expect(mocks.write).toHaveBeenCalledExactlyOnceWith('VM started\n'));
  expect(mocks.reset).not.toHaveBeenCalled();
});

it('replays a rotated log and keeps the cursor hidden', async () => {
  const screen = render(LogConsole, { text: 'Old operation\n' });
  await waitFor(() => expect(mocks.write).toHaveBeenLastCalledWith('Old operation\n'));
  mocks.write.mockClear();

  await screen.rerender({ text: 'Recent operation\n' });

  await waitFor(() => expect(mocks.reset).toHaveBeenCalledOnce());
  expect(mocks.write.mock.calls).toEqual([['\x1b[?25l'], ['Recent operation\n']]);
});

it('removes resize handlers and disposes the terminal when the tab closes', () => {
  const screen = render(LogConsole, { text: '' });
  const initialFits = mocks.fit.mock.calls.length;
  window.dispatchEvent(new Event('resize'));
  expect(mocks.fit).toHaveBeenCalledTimes(initialFits + 1);

  screen.unmount();
  window.dispatchEvent(new Event('resize'));

  expect(mocks.fit).toHaveBeenCalledTimes(initialFits + 1);
  expect(mocks.disconnect).toHaveBeenCalledOnce();
  expect(mocks.dispose).toHaveBeenCalledOnce();
});
