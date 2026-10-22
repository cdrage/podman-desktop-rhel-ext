import type { ITheme } from '@xterm/xterm';

const BASE_COLORS = ['foreground', 'background', 'cursor', 'selectionBackground', 'selectionForeground'] as const;
const ANSI_COLORS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const;

export function getTerminalTheme(): ITheme {
  const style = getComputedStyle(document.documentElement);
  const theme: ITheme = {};

  // Use the same terminal color registry as Podman Desktop and bootc.
  for (const color of BASE_COLORS) {
    const value = style.getPropertyValue('--pd-terminal-' + color).trim();
    if (value) {
      theme[color] = value;
    }
  }

  for (const color of ANSI_COLORS) {
    const token = 'ansi' + color[0].toUpperCase() + color.slice(1);
    const value = style.getPropertyValue('--pd-terminal-' + token).trim();
    if (value) {
      theme[color] = value;
    }
  }

  return theme;
}
