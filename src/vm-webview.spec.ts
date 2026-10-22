import type { ExtensionContext } from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import { CHANNEL } from '../packages/shared/src/api';
import { type MachineSource, VmService } from './vm-service';
import { createVmWebview } from './vm-webview';

const mocks = vi.hoisted(() => ({
  receive: vi.fn(),
  post: vi.fn(async () => {}),
  disposed: vi.fn(),
  html: '',
}));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => '<script src="./main.js"></script><link href="./main.css">'),
}));
vi.mock('@podman-desktop/api', () => ({
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]): { fsPath: string } => ({
      fsPath: [base.fsPath, ...parts].join('/'),
    }),
  },
  window: {
    createWebviewPanel: vi.fn(() => ({
      onDidDispose: mocks.disposed,
      webview: {
        onDidReceiveMessage: mocks.receive,
        postMessage: mocks.post,
        asWebviewUri: (uri: { fsPath: string }): { toString(): string } => ({
          toString: (): string => 'webview:' + uri.fsPath,
        }),
        set html(value: string) {
          mocks.html = value;
        },
      },
    })),
  },
}));
vi.mock('./macadam-machine-stream', () => ({ ProviderConnectionShellAccessImpl: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});
const context = {
  extensionUri: { fsPath: '/extension' },
  subscriptions: [],
} as unknown as ExtensionContext;
const service = new VmService({
  list: async (): ReturnType<MachineSource['list']> => ({ machines: [], available: true }),
  action: vi.fn(),
  create: vi.fn(),
});
test('loads assets through webview URIs and registers cleanup', async () => {
  await createVmWebview(context, service);
  expect(mocks.html).toContain('src="webview:/extension/media/main.js"');
  expect(mocks.html).toContain('href="webview:/extension/media/main.css"');
  expect(mocks.disposed).toHaveBeenCalledOnce();
});
test('bridges allowlisted requests through the VM service', async () => {
  await createVmWebview(context, service);
  const receive = mocks.receive.mock.calls[0][0] as (message: unknown) => Promise<void>;
  await receive({ channel: CHANNEL, id: 'request', method: 'list', args: [] });
  expect(mocks.post).toHaveBeenCalledWith({
    channel: CHANNEL,
    id: 'request',
    result: { machines: [], available: true },
  });
});
