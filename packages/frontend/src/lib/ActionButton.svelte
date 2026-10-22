<script lang="ts">
  import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
  import { Spinner } from '@podman-desktop/ui-svelte';
  import { Fa } from 'svelte-fa';

  let {
    title,
    icon,
    disabled = false,
    detailed = false,
    inProgress = false,
    onclick,
  }: {
    title: string;
    icon: IconDefinition;
    disabled?: boolean;
    detailed?: boolean;
    inProgress?: boolean;
    onclick: () => void;
  } = $props();
</script>

<!-- Match the action buttons in bootc's lists and detail headers. -->
<button
  type="button"
  class="action-button"
  class:detailed
  {title}
  aria-label={title}
  disabled={disabled || inProgress}
  {onclick}>
  {#if inProgress}
    <Spinner size="16px" />
  {:else}
    <Fa {icon} class="h-4 w-4" />
  {/if}
</button>

<style>
  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 50%;
    color: var(--pd-action-button-text);
  }

  .action-button:hover:enabled {
    color: var(--pd-action-button-hover-text);
    background: var(--pd-action-button-hover-bg);
  }

  .action-button:disabled {
    color: var(--pd-action-button-disabled-text);
  }

  .detailed {
    padding: 8px 12px;
    border-radius: 8px;
    color: var(--pd-action-button-details-text);
    background: var(--pd-action-button-details-bg);
  }

  .detailed:hover:enabled {
    color: var(--pd-action-button-details-hover-text);
    background: var(--pd-action-button-details-bg);
  }

  .detailed:disabled {
    color: var(--pd-action-button-details-disabled-text);
    background: var(--pd-action-button-details-disabled-bg);
  }
</style>
