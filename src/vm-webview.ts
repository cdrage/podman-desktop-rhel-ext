import { readFile } from 'node:fs/promises';

import * as api from '@podman-desktop/api';

import type { VmApi } from '../packages/shared/src/api';
import { ProviderConnectionShellAccessImpl } from './macadam-machine-stream';
import { TerminalSessions } from './terminal-sessions';
import { dispatch } from './vm-rpc';
import type { VmService } from './vm-service';

export async function createVmWebview(context: api.ExtensionContext, service: VmService): Promise<void> {
  const media = api.Uri.joinPath(context.extensionUri, 'media');
  const panel = api.window.createWebviewPanel('rhel-vms', 'RHEL VMs', { localResourceRoots: [media] });
  const terminals = new TerminalSessions(machine => new ProviderConnectionShellAccessImpl(machine));
  context.subscriptions.push(panel, terminals);
  context.subscriptions.push(panel.onDidDispose(() => terminals.dispose()));

  const backend: VmApi = {
    list: () => service.list(),
    action: (id, action) => service.action(id, action),
    create: () => service.create(),
    logs: id => service.logs(id),
    open: async id => {
      const machine = await service.machine(id);
      if (machine.status !== 'running' || machine.busy) {
        throw new Error('Start the VM before terminal access');
      }
      return terminals.open(machine);
    },
    output: async (session, offset) => terminals.output(session, offset),
    input: async (session, data) => terminals.input(session, data),
    resize: async (session, columns, rows) => terminals.resize(session, columns, rows),
    close: async session => terminals.close(session),
  };
  context.subscriptions.push(
    panel.webview.onDidReceiveMessage(async (message: unknown): Promise<void> => {
      const response = await dispatch(backend, message);
      if (response) {
        await panel.webview.postMessage(response);
      }
    }),
  );

  let html = await readFile(api.Uri.joinPath(media, 'index.html').fsPath, 'utf8');
  html = html.replace(
    /(src|href)="\.\/([^"]+)"/g,
    (_match, attribute: string, path: string) =>
      attribute + '="' + panel.webview.asWebviewUri(api.Uri.joinPath(media, path)).toString() + '"',
  );
  panel.webview.html = html;
}
