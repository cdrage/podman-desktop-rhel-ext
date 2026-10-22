import { cleanup, render, within } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';

import type { VmRow } from './types';
import VmDetails from './VmDetails.svelte';

vi.mock('../api/client', () => ({ client: { logs: vi.fn(async () => '') } }));

const vm: VmRow = {
  id: '["applehv","rhel"]',
  name: 'rhel',
  vmType: 'applehv',
  status: 'stopping',
  busy: true,
  image: '/rhel.raw',
  cpus: 2,
  memory: 4 * 1024 ** 3,
  diskSize: 20 * 1024 ** 3,
  port: 2222,
  remoteUsername: 'core',
  identityPath: '/key',
  onaction: vi.fn(),
};

afterEach(cleanup);

it('renders the VM icon in the header and summary', () => {
  const screen = render(VmDetails, { vm, tab: 'summary', onerror: vi.fn() });
  const header = within(screen.getByRole('region', { name: 'Header' }));
  const summary = within(screen.getByRole('table', { name: 'Virtual machine details' }));

  expect(header.getByRole('status').querySelector('svg')).toBeTruthy();
  expect(summary.getByRole('status').querySelector('svg')).toBeTruthy();
});

it('shows the pending status in the detail header', () => {
  const screen = render(VmDetails, { vm, tab: 'summary', onerror: vi.fn() });
  const header = within(screen.getByRole('region', { name: 'Header' }));

  expect(header.getByRole('status').getAttribute('title')).toBe('STARTING');
  expect(header.getByText('stopping')).toBeTruthy();
});

it('shows a failed VM action in the detail header', () => {
  const screen = render(VmDetails, {
    vm: { ...vm, status: 'stopped', busy: false, error: 'Cannot start VM' },
    tab: 'summary',
    onerror: vi.fn(),
  });
  const header = within(screen.getByRole('region', { name: 'Header' }));

  expect(header.getByRole('status').getAttribute('title')).toBe('DEGRADED');
  expect(screen.getByText('Cannot start VM')).toBeTruthy();
});
