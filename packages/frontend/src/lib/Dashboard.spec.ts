import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';

import type { Vm } from '/@shared/src/api';

import Dashboard from './Dashboard.svelte';

const machine: Vm = {
  id: 'rhel',
  name: 'rhel',
  vmType: 'applehv',
  status: 'running',
  busy: false,
  image: '/rhel.raw',
  cpus: 2,
  memory: 4 * 1024 ** 3,
  diskSize: 20 * 1024 ** 3,
  port: 2222,
  remoteUsername: 'core',
  identityPath: '/key',
};

afterEach(cleanup);

it('shows the welcome page and virtual machine counts', () => {
  const screen = render(Dashboard, {
    machines: [
      machine,
      { ...machine, id: 'stopped', status: 'stopped' },
      { ...machine, id: 'start', status: 'starting' },
    ],
    available: true,
    oncreate: vi.fn(),
  });

  expect(screen.getByRole('heading', { level: 1, name: 'Welcome to RHEL Virtual Machines' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: 'Get Started' })).toBeTruthy();
  expect(screen.getByText('3 Virtual machines')).toBeTruthy();
  expect(within(screen.getByRole('article', { name: 'Running' })).getByText('1')).toBeTruthy();
  expect(within(screen.getByRole('article', { name: 'Stopped' })).getByText('1')).toBeTruthy();
});

it('updates the counts after a virtual machine changes state', async () => {
  const screen = render(Dashboard, { machines: [machine], available: true, oncreate: vi.fn() });

  await screen.rerender({ machines: [{ ...machine, status: 'stopped' }] });

  expect(within(screen.getByRole('article', { name: 'Running' })).getByText('0')).toBeTruthy();
  expect(within(screen.getByRole('article', { name: 'Stopped' })).getByText('1')).toBeTruthy();
});

it('opens the existing virtual machine creation flow', async () => {
  const oncreate = vi.fn();
  const screen = render(Dashboard, { machines: [], available: true, oncreate });

  await fireEvent.click(screen.getByRole('button', { name: 'Create VM' }));

  expect(oncreate).toHaveBeenCalledOnce();
});

it('explains Macadam setup without an automatic installation', () => {
  const oncreate = vi.fn();
  const screen = render(Dashboard, { machines: [], available: false, oncreate });

  expect(
    screen.getByText('Create your first VM to set up Macadam. Setup can require administrator permission.'),
  ).toBeTruthy();
  expect(oncreate).not.toHaveBeenCalled();
});

it('navigates to the virtual machine list', async () => {
  history.replaceState(null, '', '#/');
  const screen = render(Dashboard, { machines: [], available: true, oncreate: vi.fn() });

  await fireEvent.click(screen.getByRole('button', { name: 'View virtual machines' }));

  expect(location.hash).toBe('#/vms');
});
