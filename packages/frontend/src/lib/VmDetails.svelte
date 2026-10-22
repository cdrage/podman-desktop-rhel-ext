<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import { DetailsPage, Tab, StatusIcon, EmptyScreen, Button, ErrorMessage } from '@podman-desktop/ui-svelte';
  import { faTerminal, faFileLines } from '@fortawesome/free-solid-svg-icons';
  import VmIcon from './VmIcon.svelte';
  import VmSummary from './VmSummary.svelte';
  import Actions from './Actions.svelte';
  import { client } from '../api/client';
  import type { VmRow } from './types';

  let { vm, tab, onerror }: { vm: VmRow; tab: string; onerror: (error: unknown) => void } = $props();
  let Terminal = $state<Component<{ id: string; label: string }>>();
  let LogConsole = $state<Component<{ text: string }>>();
  let logs = $state('');
  let status = $derived(vm.error ? 'DEGRADED' : vm.status === 'stopping' ? 'STARTING' : vm.status.toUpperCase());

  const tabs = [
    { name: 'summary', title: 'Summary' },
    { name: 'terminal', title: 'Terminal' },
    { name: 'logs', title: 'Logs' },
  ];

  $effect(() => {
    if (tab === 'terminal' && vm.status === 'running' && !vm.busy && !Terminal) {
      import('./Terminal.svelte')
        .then(module => {
          Terminal = module.default;
        })
        .catch(onerror);
    }
  });
  $effect(() => {
    if (tab === 'logs' && logs && !LogConsole) {
      import('./LogConsole.svelte')
        .then(module => {
          LogConsole = module.default;
        })
        .catch(onerror);
    }
  });
  onMount(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh(): Promise<void> {
      try {
        const text = await client.logs(vm.id);
        if (!closed) {
          logs = text;
        }
      } catch (error) {
        if (!closed) {
          onerror(error);
        }
      }
      if (!closed) {
        timer = setTimeout(() => {
          refresh().catch(onerror);
        }, 1000);
      }
    }
    refresh().catch(onerror);
    return () => {
      closed = true;
      clearTimeout(timer);
    };
  });
  function back(): void {
    location.hash = '#/vms';
  }
</script>

<DetailsPage
  title={vm.name}
  breadcrumbLeftPart="Virtual Machines"
  breadcrumbRightPart="Virtual Machine Details"
  onclose={back}
  onbreadcrumbClick={back}>
  {#snippet iconSnippet()}
    <StatusIcon {status} icon={VmIcon} size={30} />
  {/snippet}
  {#snippet subtitleSnippet()}
    <div class="flex items-center gap-2 text-sm text-[var(--pd-content-sub-header)]">
      <span class="capitalize">{vm.status}</span>
      <span aria-hidden="true">·</span>
      <span>{vm.vmType}</span>
    </div>
  {/snippet}
  {#snippet actionsSnippet()}
    <Actions object={vm} detailed />
  {/snippet}
  {#snippet tabsSnippet()}
    {#each tabs as { name, title } (name)}
      <Tab {title} selected={tab === name} url="#/vm/{encodeURIComponent(vm.id)}/{name}" />
    {/each}
  {/snippet}
  {#snippet contentSnippet()}
    <section class="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {#if vm.error}
        <div class="shrink-0 px-5 pt-3"><ErrorMessage error={vm.error} /></div>
      {/if}
      {#if tab === 'terminal'}
        {#if vm.status !== 'running' || vm.busy}
          <EmptyScreen
            icon={faTerminal}
            title={vm.busy ? 'VM action in progress' : 'VM is stopped'}
            message="Start the VM before SSH terminal access.">
            <Button disabled={vm.busy} onclick={() => vm.onaction('start')}>Start VM</Button>
          </EmptyScreen>
        {:else if Terminal}
          <Terminal id={vm.id} label={vm.remoteUsername + '@localhost:' + vm.port} />
        {:else}
          <EmptyScreen icon={faTerminal} title="Load terminal..." />
        {/if}
      {:else if tab === 'logs'}
        {#if logs && LogConsole}
          <div class="console-note">Operation logs from this extension session. These are not guest system logs.</div>
          <LogConsole text={logs} />
        {:else}
          <EmptyScreen
            icon={faFileLines}
            title="No operation logs"
            message="VM actions from this page appear here. These are not guest system logs." />
        {/if}
      {:else}
        <VmSummary {vm} />
      {/if}
    </section>
  {/snippet}
</DetailsPage>
