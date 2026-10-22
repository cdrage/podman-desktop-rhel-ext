<script lang="ts">
  import type { Snippet } from 'svelte';

  // Adapt bootc's DashboardGuideCard layout for virtual machine status.
  let {
    title,
    description,
    count,
    icon,
  }: {
    title: string;
    description: string;
    count: number;
    icon: Snippet;
  } = $props();
</script>

<article
  aria-label={title}
  class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 rounded-lg shadow-sm bg-(--pd-content-card-bg)">
  <div class="flex items-center justify-center w-10 h-10 text-[40px] text-(--pd-content-header)" aria-hidden="true">
    {@render icon()}
  </div>
  <div class="flex flex-col gap-1 min-w-0">
    <h3 class="text-lg font-semibold text-(--pd-content-header)">{title}</h3>
    <p>{description}</p>
  </div>
  <span class="text-2xl font-semibold text-(--pd-content-header)">{count}</span>
</article>
