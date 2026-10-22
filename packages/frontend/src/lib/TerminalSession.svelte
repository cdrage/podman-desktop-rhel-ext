<script lang="ts">
  import { client } from '../api/client';
  import TerminalWindow, { type TerminalSize, type TerminalView } from './TerminalWindow.svelte';

  const POLL_INTERVAL_MS = 200;

  let { id, onerror, onend }: { id: string; onerror: (message: string) => void; onend: () => void } = $props();
  let session: string | undefined;
  let closed = false;
  let timer: ReturnType<typeof setTimeout>;

  function close(): void {
    closed = true;
    clearTimeout(timer);

    const token = session;
    session = undefined;
    if (token) {
      client.close(token).catch(() => {});
    }
  }

  function fail(cause: unknown): void {
    if (closed) {
      return;
    }

    close();
    onerror(cause instanceof Error ? cause.message : String(cause));
  }

  function send(data: string): void {
    if (session && !closed) {
      client.input(session, data).catch(fail);
    }
  }

  function resize({ cols, rows }: TerminalSize): void {
    if (session && !closed) {
      client.resize(session, cols, rows).catch(fail);
    }
  }

  function connect(terminal: TerminalView): () => void {
    let offset = 0;

    async function poll(): Promise<void> {
      if (!session || closed) {
        return;
      }

      try {
        const output = await client.output(session, offset);
        if (closed) {
          return;
        }

        terminal.write(output.text);
        offset = output.offset;
        if (output.ended) {
          close();
          onend();
          return;
        }

        timer = setTimeout(() => {
          poll().catch(fail);
        }, POLL_INTERVAL_MS);
      } catch (cause) {
        fail(cause);
      }
    }

    async function open(): Promise<void> {
      const token = await client.open(id);
      if (closed) {
        await client.close(token);
        return;
      }

      session = token;
      const { cols, rows } = terminal.size();
      await client.resize(token, cols, rows);
      if (closed) {
        return;
      }

      terminal.focus();
      await poll();
    }

    open().catch(fail);
    return close;
  }
</script>

<TerminalWindow
  label="SSH terminal"
  disableStdIn={false}
  showCursor
  onready={connect}
  ondata={send}
  onresize={resize} />
