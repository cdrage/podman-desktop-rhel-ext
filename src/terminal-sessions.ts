import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';

import type {
  Disposable,
  ProviderConnectionShellAccess,
  ProviderConnectionShellAccessSession,
} from '@podman-desktop/api';

import type { MachineInfo, Output } from '../packages/shared/src/api';
import { MAX_TERMINAL_SIZE, OUTPUT_LIMIT } from '../packages/shared/src/api';

interface Session {
  shell: ProviderConnectionShellAccessSession;
  owner: Disposable;
  subscriptions: Disposable[];
  text: string;
  offset: number;
  ended: boolean;
}
const MAX_SESSIONS = 8;
const MAX_INPUT = 65536;

export class TerminalSessions implements Disposable {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly factory: (machine: MachineInfo) => ProviderConnectionShellAccess & Disposable) {}

  open(machine: MachineInfo): string {
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new Error('Close another terminal before a new session');
    }
    const owner = this.factory(machine);
    let shell: ProviderConnectionShellAccessSession;
    try {
      shell = owner.open();
    } catch (error) {
      owner.dispose();
      throw error;
    }
    const id = randomUUID();
    const session: Session = { shell, owner, subscriptions: [], text: '', offset: 0, ended: false };
    const append = (text: string): void => {
      session.text = (session.text + text).slice(-OUTPUT_LIMIT);
      session.offset += text.length;
    };
    // The SSH adapter can emit byte chunks despite the API's string contract.
    const decoder = new StringDecoder('utf8');
    session.subscriptions.push(
      shell.onData(event => append(typeof event.data === 'string' ? event.data : decoder.write(event.data))),
      shell.onError(event => {
        append('\r\nSSH error: ' + event.error + '\r\n');
        session.ended = true;
        shell.close();
      }),
      shell.onEnd(() => {
        session.ended = true;
      }),
    );
    this.sessions.set(id, session);
    return id;
  }

  private get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error('Terminal session is closed');
    }
    return session;
  }

  output(id: string, offset: number): Output {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error('Invalid output cursor');
    }
    const session = this.get(id);
    const start = session.offset - session.text.length;
    const cursor = Math.max(start, Math.min(offset, session.offset));
    return { text: session.text.slice(cursor - start), offset: session.offset, ended: session.ended };
  }

  input(id: string, data: string): void {
    if (typeof data !== 'string' || data.length > MAX_INPUT) {
      throw new Error('Invalid terminal input');
    }
    const session = this.get(id);
    if (session.ended) {
      throw new Error('Reconnect to the terminal');
    }
    session.shell.write(data);
  }

  resize(id: string, columns: number, rows: number): void {
    if (![columns, rows].every(value => Number.isInteger(value) && value > 0 && value <= MAX_TERMINAL_SIZE)) {
      throw new Error('Invalid terminal dimensions');
    }
    const session = this.get(id);
    if (!session.ended) {
      session.shell.resize({ cols: columns, rows });
    }
  }

  close(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }
    this.sessions.delete(id);
    for (const subscription of session.subscriptions) {
      subscription.dispose();
    }
    session.owner.dispose();
  }

  dispose(): void {
    for (const id of this.sessions.keys()) {
      this.close(id);
    }
  }
}
