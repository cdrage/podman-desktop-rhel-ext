<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, ErrorMessage } from '@podman-desktop/ui-svelte';
  import { client, loadRoute, saveRoute } from './api/client';
  import type { Vm, VmAction } from '/@shared/src/api';
  import type { VmRow } from './lib/types';
  import VmList from './lib/VmList.svelte';
  import VmDetails from './lib/VmDetails.svelte';
  import Confirm from './lib/Confirm.svelte';
  import Navigation from './Navigation.svelte';
  import Dashboard from './lib/Dashboard.svelte';
  let machines = $state<Vm[]>([]);
  let available = $state(true);
  let error = $state('');
  let loading = $state(true);
  let route = $state(location.hash || loadRoute());
  let busy = $state<string[]>([]);
  let confirm = $state<Vm>();
  let parts = $derived(route.replace(/^#\//, '').split('/'));
  function routeId(value: string | undefined): string {
    try {
      return decodeURIComponent(value ?? '');
    } catch {
      return '';
    }
  }
  let rows = $derived(
    machines.map(
      vm =>
        ({
          ...vm,
          busy: vm.busy || busy.includes(vm.id),
          onaction: (action: VmAction) => requestAction(vm, action),
        }) satisfies VmRow,
    ),
  );
  let current = $derived(rows.find(vm => vm.id === routeId(parts[1])));
  function showError(cause: unknown): void {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  async function refresh(): Promise<void> {
    try {
      const result = await client.list();
      machines = result.machines;
      available = result.available;
      if (result.error) {
        error = result.error;
      }
    } catch (cause) {
      showError(cause);
    } finally {
      loading = false;
    }
  }
  function requestAction(vm: Vm, action: VmAction): void {
    if (action === 'delete') {
      confirm = vm;
      return;
    }
    execute(vm, action).catch(showError);
  }
  async function execute(vm: Vm, action: VmAction): Promise<void> {
    if (busy.includes(vm.id)) {
      return;
    }
    busy = [...busy, vm.id];
    error = '';
    confirm = undefined;
    try {
      await client.action(vm.id, action);
      if (action === 'delete' && current?.id === vm.id) {
        location.hash = '#/vms';
      }
    } catch (cause) {
      showError(cause);
    } finally {
      busy = busy.filter(id => id !== vm.id);
      await refresh();
    }
  }
  function create(): void {
    client.create().catch(showError);
  }
  onMount(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const navigate = (): void => {
      route = location.hash || '#/';
      saveRoute(route);
    };
    window.addEventListener('hashchange', navigate);
    if (!location.hash) {
      location.hash = route;
    }
    async function poll(): Promise<void> {
      await refresh();
      if (!disposed) {
        timer = setTimeout(() => {
          poll().catch(showError);
        }, 2000);
      }
    }
    poll().catch(showError);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('hashchange', navigate);
    };
  });
</script>

<main>
  <Navigation {route} />
  <div class="workspace">
    {#if error}<div class="error-bar">
        <ErrorMessage {error} /><Button onclick={() => (error = '')}>Dismiss</Button>
      </div>{/if}
    <div class="page">
      {#if loading}<div class="empty" role="status">Load virtual machines...</div>
      {:else if parts[0] === ''}
        <Dashboard {machines} {available} oncreate={create} />
      {:else if parts[0] === 'vm' && current}
        {#key current.id}<VmDetails vm={current} tab={parts[2] || 'summary'} onerror={showError} />{/key}
      {:else}
        <VmList
          data={rows}
          {available}
          oncreate={create}
          onrefresh={() => {
            refresh().catch(showError);
          }} />
      {/if}
    </div>
  </div>
  {#if confirm}
    <Confirm
      title={'Delete ' + confirm.name + '?'}
      message="Macadam removes this virtual machine and its managed disk. This action cannot be undone."
      onconfirm={() => {
        if (confirm) {
          execute(confirm, 'delete').catch(showError);
        }
      }}
      oncancel={() => (confirm = undefined)} />
  {/if}
</main>
