<script lang="ts">
  import { faCirclePlay, faCircleStop, faDesktop, faEye, faPlus } from '@fortawesome/free-solid-svg-icons';
  import { Button } from '@podman-desktop/ui-svelte';
  import { Fa } from 'svelte-fa';

  import type { Vm } from '/@shared/src/api';

  import DashboardPage from './dashboard/DashboardPage.svelte';
  import DashboardResourceCard from './dashboard/DashboardResourceCard.svelte';
  import DashboardStatusCard from './dashboard/DashboardStatusCard.svelte';

  let {
    machines,
    available,
    oncreate,
  }: {
    machines: Vm[];
    available: boolean;
    oncreate: () => void;
  } = $props();

  const VM_LIST_ROUTE = '#/vms';

  let running = $derived(machines.filter(vm => vm.status === 'running').length);
  let stopped = $derived(machines.filter(vm => vm.status === 'stopped').length);

  function showMachines(): void {
    location.hash = VM_LIST_ROUTE;
  }
</script>

<DashboardPage>
  {#snippet pageTitle()}
    Welcome to RHEL Virtual Machines
  {/snippet}
  {#snippet header()}
    <p>
      Create and manage Red Hat Enterprise Linux virtual machines with Macadam.<br />
      Open an SSH terminal and review operation logs from each virtual machine.
    </p>
  {/snippet}

  <section aria-labelledby="dashboard-get-started" class="flex flex-col gap-4">
    <h2 id="dashboard-get-started" class="text-lg font-semibold text-(--pd-content-header)">Get Started</h2>
    <div class="grid grid-cols-1 @min-[36rem]:grid-cols-2 gap-1">
      <DashboardResourceCard
        title="Create a virtual machine"
        description={available
          ? 'Choose a RHEL image and configure the resources for your virtual machine.'
          : 'Create your first VM to set up Macadam. Setup can require administrator permission.'}>
        {#snippet icon()}<Fa icon={faPlus} />{/snippet}
        <Button type="primary" icon={faPlus} onclick={oncreate}>Create VM</Button>
      </DashboardResourceCard>
      <DashboardResourceCard
        title="Virtual machines"
        description="Start and stop your virtual machines, open an SSH terminal, and review operation logs."
        count={machines.length}>
        {#snippet icon()}<Fa icon={faDesktop} />{/snippet}
        <Button type="primary" icon={faEye} onclick={showMachines}>View virtual machines</Button>
      </DashboardResourceCard>
    </div>
  </section>

  <section aria-labelledby="dashboard-status" class="flex flex-col gap-4">
    <h2 id="dashboard-status" class="text-lg font-semibold text-(--pd-content-header)">Virtual machine status</h2>
    <div class="flex flex-col gap-1">
      <DashboardStatusCard
        title="Running"
        description="Open a terminal or stop a virtual machine from its details."
        count={running}>
        {#snippet icon()}<Fa icon={faCirclePlay} />{/snippet}
      </DashboardStatusCard>
      <DashboardStatusCard title="Stopped" description="Start a virtual machine to open its terminal." count={stopped}>
        {#snippet icon()}<Fa icon={faCircleStop} />{/snippet}
      </DashboardStatusCard>
    </div>
  </section>
</DashboardPage>
