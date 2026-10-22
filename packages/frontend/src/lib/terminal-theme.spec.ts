import { afterEach, expect, it } from 'vitest';

import { getTerminalTheme } from './terminal-theme';

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

it('uses the host foreground, background, and selection colors', () => {
  const style = document.documentElement.style;
  style.setProperty('--pd-terminal-background', '#ffffff');
  style.setProperty('--pd-terminal-foreground', '#222222');
  style.setProperty('--pd-terminal-selectionBackground', '#eeeeee');
  expect(getTerminalTheme()).toMatchObject({
    background: '#ffffff',
    foreground: '#222222',
    selectionBackground: '#eeeeee',
  });
});

it('maps Podman Desktop ANSI tokens to xterm colors', () => {
  const style = document.documentElement.style;
  style.setProperty('--pd-terminal-ansiRed', '#ff0000');
  style.setProperty('--pd-terminal-ansiBrightBlue', '#0099ff');
  expect(getTerminalTheme()).toMatchObject({ red: '#ff0000', brightBlue: '#0099ff' });
});

it('leaves unspecified colors at the xterm defaults', () => {
  expect(getTerminalTheme()).toEqual({});
});
