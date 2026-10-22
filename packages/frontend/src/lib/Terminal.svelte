<script lang="ts">
  import { Button, ErrorMessage } from '@podman-desktop/ui-svelte';
  import TerminalSession from './TerminalSession.svelte';
  let { id, label }: { id: string; label: string } = $props();
  let error = $state('');
  let ended = $state(false);
  let generation = $state(0);
  let currentId: string | undefined;

  $effect(() => {
    if (currentId === id) {
      return;
    }

    currentId = id;
    error = '';
    ended = false;
  });
</script>

<section class="terminal-view">
  <div class="console-note">
    <span>{label} · {ended ? 'Session ended' : 'SSH terminal'}</span>
    {#if ended}<Button
        type="secondary"
        onclick={() => {
          error = '';
          ended = false;
          generation += 1;
        }}>Reconnect</Button
      >{/if}
  </div>
  {#if error}<ErrorMessage {error} />{/if}
  {#key id + ':' + generation}
    <TerminalSession
      {id}
      onerror={message => {
        error = message;
        ended = true;
      }}
      onend={() => (ended = true)} />
  {/key}
</section>

<style>
  .terminal-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }
</style>
