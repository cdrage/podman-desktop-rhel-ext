<script lang="ts">
  import type { VmRow } from './types';
  let { object }: { object: VmRow } = $props();
</script>

<a class="vm-name" href="#/vm/{encodeURIComponent(object.id)}/summary">{object.name}</a>
<div class="muted truncate" title={object.image}>{object.image}</div>
