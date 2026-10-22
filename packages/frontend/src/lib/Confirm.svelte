<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Modal } from '@podman-desktop/ui-svelte';
  let {
    title,
    message,
    onconfirm,
    oncancel,
  }: { title: string; message: string; onconfirm: () => void; oncancel: () => void } = $props();
  let content: HTMLDivElement;
  onMount(() => {
    content.querySelector('button')?.focus();
  });
</script>

<Modal name={title} onclose={oncancel} ignoreFocusOut>
  <div class="p-6 flex flex-col gap-4 text-[var(--pd-content-text)]" bind:this={content}>
    <h2 class="text-xl font-semibold text-[var(--pd-content-header)]">{title}</h2>
    <p>{message}</p>
    <div class="flex justify-end gap-2">
      <Button type="secondary" onclick={oncancel}>Cancel</Button>
      <Button type="danger" onclick={onconfirm}>Delete VM</Button>
    </div>
  </div>
</Modal>
