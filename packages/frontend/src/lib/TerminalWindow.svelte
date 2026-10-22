<script module lang="ts">
  export interface TerminalSize {
    cols: number;
    rows: number;
  }

  export interface TerminalView {
    write(text: string): void;
    focus(): void;
    size(): TerminalSize;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import '@xterm/xterm/css/xterm.css';
  import { getTerminalTheme } from './terminal-theme';

  // Adapt Podman Desktop's TerminalWindow to the extension webview.
  // Source: packages/renderer/src/lib/ui/TerminalWindow.svelte (Apache-2.0).
  const DEFAULT_COLS = 80;
  const DEFAULT_ROWS = 24;
  const FONT_SIZE = 13;
  const SCROLLBACK_LINES = 5000;
  const HIDE_CURSOR = '\x1b[?25l';

  let {
    text,
    label,
    convertEol = false,
    disableStdIn = true,
    showCursor = false,
    onready,
    ondata,
    onresize,
  }: {
    text?: string;
    label: string;
    convertEol?: boolean;
    disableStdIn?: boolean;
    showCursor?: boolean;
    onready?: (view: TerminalView) => (() => void) | void;
    ondata?: (data: string) => void;
    onresize?: (size: TerminalSize) => void;
  } = $props();

  let container: HTMLDivElement;
  let terminal = $state<Terminal>();
  let previous = '';

  $effect(() => {
    if (!terminal || text === undefined) {
      return;
    }

    // Replay the buffer when the bounded operation log rotates.
    if (!text.startsWith(previous)) {
      terminal.reset();
      if (!showCursor) {
        terminal.write(HIDE_CURSOR);
      }
      previous = '';
    }

    terminal.write(text.slice(previous.length));
    previous = text;
  });

  onMount(() => {
    const view = new Terminal({
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      fontSize: FONT_SIZE,
      scrollback: SCROLLBACK_LINES,
      convertEol,
      disableStdin: disableStdIn,
      cursorBlink: showCursor,
      theme: getTerminalTheme(),
    });
    const fit = new FitAddon();
    view.loadAddon(fit);
    view.open(container);

    if (!showCursor) {
      view.write(HIDE_CURSOR);
    }

    const input = view.onData(data => ondata?.(data));
    const resize = view.onResize(size => onresize?.(size));
    const fitTerminal = (): void => fit.fit();
    const observer = new ResizeObserver(fitTerminal);
    observer.observe(container);
    window.addEventListener('resize', fitTerminal);
    fitTerminal();

    terminal = view;
    const close = onready?.({
      write: text => view.write(text),
      focus: () => view.focus(),
      size: () => ({ cols: view.cols, rows: view.rows }),
    });

    return () => {
      close?.();
      observer.disconnect();
      window.removeEventListener('resize', fitTerminal);
      resize.dispose();
      input.dispose();
      view.dispose();
    };
  });
</script>

<div class="terminal-window" role="region" aria-label={label} bind:this={container}></div>

<style>
  .terminal-window {
    flex: 1;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 5px 0 5px 5px;
    background: var(--pd-terminal-background);
  }
</style>
