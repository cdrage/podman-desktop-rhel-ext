<script lang="ts">
  import { faPlay, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
  import ActionButton from './ActionButton.svelte';
  import type { VmRow } from './types';
  let { object, detailed = false }: { object: VmRow; detailed?: boolean } = $props();
  let active = $derived(['running', 'starting', 'stopping'].includes(object.status));
</script>

<div class="actions">
  {#if active}
    <ActionButton
      title="Stop VM"
      icon={faStop}
      {detailed}
      disabled={object.busy}
      inProgress={object.status === 'stopping'}
      onclick={() => object.onaction('stop')} />
  {:else}
    <ActionButton
      title="Start VM"
      icon={faPlay}
      {detailed}
      disabled={object.busy}
      onclick={() => object.onaction('start')} />
    <ActionButton
      title="Delete VM"
      icon={faTrash}
      {detailed}
      disabled={object.busy}
      inProgress={object.status === 'deleting'}
      onclick={() => object.onaction('delete')} />
  {/if}
</div>
