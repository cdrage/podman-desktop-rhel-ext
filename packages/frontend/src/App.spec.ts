import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { Vm } from '/@shared/src/api';

import App from './App.svelte';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  action: vi.fn(),
  create: vi.fn(async (): Promise<void> => {}),
  logs: vi.fn(async () => ''),
}));
vi.mock('./api/client', () => ({ client: mocks, loadRoute: (): string => '#/', saveRoute: vi.fn() }));
const vm: Vm = {
  id: '["applehv","rhel"]',
  name: 'rhel',
  vmType: 'applehv',
  status: 'stopped',
  busy: false,
  image: '/rhel.raw',
  cpus: 2,
  memory: 4 * 1024 ** 3,
  diskSize: 20 * 1024 ** 3,
  port: 2222,
  remoteUsername: 'core',
  identityPath: '/key',
};
beforeEach(() => {
  vi.clearAllMocks();
  history.replaceState(null, '', '#/vms');
  mocks.list.mockResolvedValue({ machines: [vm], available: true });
});
afterEach(cleanup);

it('shows resource columns and the VM detail link', async () => {
  const screen = render(App);
  const link = await screen.findByRole('link', { name: 'rhel' });
  expect(link.getAttribute('href')).toBe('#/vm/' + encodeURIComponent(vm.id) + '/summary');
  expect(screen.getByText('4 GiB')).toBeTruthy();
});

it('starts a VM through the service', async () => {
  const screen = render(App);
  await fireEvent.click(await screen.findByRole('button', { name: 'Start VM' }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(vm.id, 'start'));
});

it('sorts VM resources by numeric value', async () => {
  mocks.list.mockResolvedValue({
    machines: [vm, { ...vm, id: 'large', name: 'rhel-large', memory: 16 * 1024 ** 3 }],
    available: true,
  });
  const screen = render(App);
  const table = await screen.findByRole('table', { name: 'rhel-vms' });

  await fireEvent.click(within(table).getByRole('columnheader', { name: 'Memory' }));
  expect(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map(row => row.getAttribute('aria-label')),
  ).toEqual(['rhel', 'rhel-large']);

  await fireEvent.click(within(table).getByRole('columnheader', { name: 'Memory' }));
  expect(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map(row => row.getAttribute('aria-label')),
  ).toEqual(['rhel-large', 'rhel']);
});

it('stops a running VM through the service', async () => {
  mocks.list.mockResolvedValue({ machines: [{ ...vm, status: 'running' }], available: true });
  const screen = render(App);

  await fireEvent.click(await screen.findByRole('button', { name: 'Stop VM' }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(vm.id, 'stop'));
  expect(screen.queryByRole('button', { name: 'Delete VM' })).toBeNull();
});

it('disables actions while a VM operation is in progress', async () => {
  mocks.list.mockResolvedValue({ machines: [{ ...vm, status: 'stopping', busy: true }], available: true });
  const screen = render(App);
  const stop = await screen.findByRole('button', { name: 'Stop VM' });

  expect((stop as HTMLButtonElement).disabled).toBe(true);
  stop.click();
  expect(mocks.action).not.toHaveBeenCalled();
});

it('requires confirmation before Macadam deletion', async () => {
  const screen = render(App);
  await fireEvent.click(await screen.findByRole('button', { name: 'Delete VM' }));
  expect(mocks.action).not.toHaveBeenCalled();
  await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete VM' }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(vm.id, 'delete'));
});

it('opens the existing RHEL creation flow', async () => {
  const screen = render(App);
  await fireEvent.click(await screen.findByRole('button', { name: 'Create VM' }));
  expect(mocks.create).toHaveBeenCalledOnce();
});

it('shows setup information without an automatic installation', async () => {
  mocks.list.mockResolvedValue({ machines: [], available: false });
  const screen = render(App);
  expect(await screen.findByText('Macadam setup required')).toBeTruthy();
  expect(mocks.create).not.toHaveBeenCalled();
});

it('shows bootc-style secondary navigation and a dashboard', async () => {
  history.replaceState(null, '', '#/');
  const screen = render(App);
  const heading = await screen.findByRole('heading', { name: 'Welcome to RHEL Virtual Machines' });
  expect(heading).toBeTruthy();
  const navigation = screen.getByRole('navigation', { name: 'RHEL VMs' });
  expect(navigation.contains(screen.getByRole('link', { name: 'Dashboard' }))).toBe(true);
  expect(screen.getByRole('link', { name: 'Virtual Machines' }).getAttribute('href')).toBe('#/vms');
  await fireEvent.click(screen.getByRole('link', { name: 'Virtual Machines' }));
  expect(await screen.findByRole('link', { name: 'rhel' })).toBeTruthy();
});

it('uses a compact page title and a short search placeholder', async () => {
  const screen = render(App);
  expect(await screen.findByRole('heading', { name: 'virtual machines' })).toBeTruthy();
  const input = screen.getByRole('textbox', { name: 'search virtual machines' });
  expect(input.getAttribute('placeholder')).toBe('Search virtual machines...');
  await fireEvent.input(input, { target: { value: 'missing' } });
  expect(await screen.findByRole('heading', { name: /No virtual machines matching/ })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
  expect(await screen.findByRole('link', { name: 'rhel' })).toBeTruthy();
});

it('keeps navigation on detail pages and returns to the VM list', async () => {
  history.replaceState(null, '', '#/vm/' + encodeURIComponent(vm.id) + '/summary');
  const screen = render(App);
  expect(await screen.findByText('Connection')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'RHEL VMs' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('link', { name: 'Back' }));
  await waitFor(() => expect(location.hash).toBe('#/vms'));
});

it('groups VM resources and connection information in the details table', async () => {
  history.replaceState(null, '', '#/vm/' + encodeURIComponent(vm.id) + '/summary');
  const screen = render(App);
  expect(await screen.findByRole('table', { name: 'Virtual machine details' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Resources' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Connection' })).toBeTruthy();
});

it('uses the standard empty screen for an unavailable terminal', async () => {
  history.replaceState(null, '', '#/vm/' + encodeURIComponent(vm.id) + '/terminal');
  const screen = render(App);
  expect(await screen.findByRole('heading', { name: 'VM is stopped' })).toBeTruthy();
  await fireEvent.click(
    within(screen.getByRole('region', { name: 'Tab Content' })).getByRole('button', { name: 'Start VM' }),
  );
  await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(vm.id, 'start'));
});

it('uses the standard empty screen for operation logs', async () => {
  history.replaceState(null, '', '#/vm/' + encodeURIComponent(vm.id) + '/logs');
  const screen = render(App);
  expect(await screen.findByRole('heading', { name: 'No operation logs' })).toBeTruthy();
});

it('loads summary and tabs for a deep link', async () => {
  history.replaceState(null, '', '#/vm/' + encodeURIComponent(vm.id) + '/summary');
  const screen = render(App);
  expect(await screen.findByText('Connection')).toBeTruthy();
  expect(screen.getByText('localhost')).toBeTruthy();
  expect(screen.getByText('Terminal')).toBeTruthy();
  expect(screen.getByText('Logs')).toBeTruthy();
});
