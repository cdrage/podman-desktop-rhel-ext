<script lang="ts">
  import type { VmRow } from './types';
  import { StatusIcon } from '@podman-desktop/ui-svelte';
  import VmIcon from './VmIcon.svelte';
  let { object }: { object: VmRow } = $props();
</script>

<span class="inline-flex items-center gap-2" title={object.error}>
  <StatusIcon
    icon={VmIcon}
    size={14}
    status={object.error ? 'DEGRADED' : object.status === 'stopping' ? 'STARTING' : object.status.toUpperCase()} />
  <span class="capitalize">{object.status}</span>
</span>
{#if object.error}<span class="muted" title={object.error}> · Action failed</span>{/if}
