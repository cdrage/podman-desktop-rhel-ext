<script lang="ts">
  import TerminalWindow from './TerminalWindow.svelte';

  let { text }: { text: string } = $props();
</script>

<TerminalWindow {text} label="Operation log output" convertEol />
