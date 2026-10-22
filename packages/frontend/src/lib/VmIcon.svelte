<script lang="ts">
  import { faDesktop } from '@fortawesome/free-solid-svg-icons';
  import { Fa } from 'svelte-fa';

  let { size = 14 }: { size?: number } = $props();
</script>

<!-- StatusIcon passes pixel sizes that its Font Awesome adapter rejects. -->
<Fa icon={faDesktop} style="width: {size}px; height: {size}px;" />
