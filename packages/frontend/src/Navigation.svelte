<script lang="ts">
  import { SettingsNavItem } from '@podman-desktop/ui-svelte';
  import { faHouse, faDesktop } from '@fortawesome/free-solid-svg-icons';
  import logo from '../../../icon.png';

  let { route }: { route: string } = $props();
</script>

<nav class="secondary-nav" aria-label="RHEL VMs">
  <a class="nav-brand" href="#/" title="RHEL VMs dashboard">
    <img src={logo} alt="" width="28" height="28" />
    <span>RHEL VMs</span>
  </a>
  <SettingsNavItem title="Dashboard" icon={faHouse} href="#/" selected={route === '#/'} />
  <SettingsNavItem title="Virtual Machines" icon={faDesktop} href="#/vms" selected={route.startsWith('#/vm')} />
</nav>

<style>
  .secondary-nav {
    flex: 0 0 var(--spacing-leftsidebar);
    overflow-y: auto;
    background: var(--pd-secondary-nav-bg);
    border-right: 1px solid var(--pd-global-nav-bg-border);
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 12px 0;
    margin-bottom: 20px;
    color: var(--pd-secondary-nav-header-text);
    font-size: var(--text-xl);
    font-weight: 600;
    text-decoration: none;
  }

  .secondary-nav :global(svg) {
    width: 1.25em;
  }
</style>
