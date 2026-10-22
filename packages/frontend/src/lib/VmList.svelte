<script lang="ts">
  import {
    NavPage,
    Button,
    Table,
    TableColumn,
    TableRow,
    TableSimpleColumn,
    EmptyScreen,
    FilteredEmptyScreen,
  } from '@podman-desktop/ui-svelte';
  import { faDesktop, faPlus, faRotateRight } from '@fortawesome/free-solid-svg-icons';
  import NameCell from './NameCell.svelte';
  import StatusCell from './StatusCell.svelte';
  import Actions from './Actions.svelte';
  import { formatBytes, type VmRow } from './types';
  let {
    data,
    available,
    oncreate,
    onrefresh,
  }: { data: VmRow[]; available: boolean; oncreate: () => void; onrefresh: () => void } = $props();
  let search = $state('');
  let filtered = $derived(
    data.filter(vm => (vm.name + ' ' + vm.vmType + ' ' + vm.status).toLowerCase().includes(search.toLowerCase())),
  );
  const columns = [
    new TableColumn<VmRow>('Status', { width: '100px', renderer: StatusCell }),
    new TableColumn<VmRow>('Name', {
      width: 'minmax(180px, 2fr)',
      renderer: NameCell,
      comparator: (a, b) => a.name.localeCompare(b.name),
    }),
    new TableColumn<VmRow, string>('Provider', {
      width: '80px',
      renderer: TableSimpleColumn,
      renderMapping: vm => vm.vmType,
      comparator: (a, b) => a.vmType.localeCompare(b.vmType),
    }),
    new TableColumn<VmRow, string>('CPUs', {
      width: '50px',
      renderer: TableSimpleColumn,
      renderMapping: vm => String(vm.cpus),
      comparator: (a, b) => a.cpus - b.cpus,
    }),
    new TableColumn<VmRow, string>('Memory', {
      width: '80px',
      renderer: TableSimpleColumn,
      renderMapping: vm => formatBytes(vm.memory),
      comparator: (a, b) => a.memory - b.memory,
    }),
    new TableColumn<VmRow, string>('Disk', {
      width: '80px',
      renderer: TableSimpleColumn,
      renderMapping: vm => formatBytes(vm.diskSize),
      comparator: (a, b) => a.diskSize - b.diskSize,
    }),
    new TableColumn<VmRow>('Actions', { width: '80px', renderer: Actions, align: 'right' }),
  ];
  const row = new TableRow<VmRow>({});
</script>

<NavPage title="virtual machines" bind:searchTerm={search}>
  {#snippet additionalActions()}
    <Button type="link" icon={faRotateRight} onclick={onrefresh}>Refresh</Button>
    <Button icon={faPlus} onclick={oncreate}>Create VM</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}<span class="muted">{data.length} VM{data.length === 1 ? '' : 's'}</span
    >{/snippet}
  {#snippet content()}
    <div class="list-content">
      {#if filtered.length}
        <Table kind="rhel-vms" data={filtered} {columns} {row} key={vm => vm.id} defaultSortColumn="Name" />
      {:else if search}
        <FilteredEmptyScreen icon={faDesktop} kind="virtual machines" bind:searchTerm={search} />
      {:else}
        <EmptyScreen
          icon={faDesktop}
          title={available ? 'No virtual machines' : 'Macadam setup required'}
          message={available
            ? 'Create a RHEL VM or use a local Linux image through the RHEL creation flow.'
            : 'Create a VM to start Macadam setup. Installation can require administrator permission.'}>
          <Button onclick={oncreate}>Create VM</Button>
        </EmptyScreen>
      {/if}
    </div>
  {/snippet}
</NavPage>
