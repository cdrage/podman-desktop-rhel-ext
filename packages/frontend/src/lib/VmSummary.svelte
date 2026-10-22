<script lang="ts">
  import type { VmRow } from './types';
  import { formatBytes } from './types';
  import StatusCell from './StatusCell.svelte';

  let { vm }: { vm: VmRow } = $props();
</script>

<div class="summary-content">
  <table aria-label="Virtual machine details">
    <tbody aria-labelledby="vm-details-title">
      <tr><th class="section-title" colspan="2"><h2 id="vm-details-title">Details</h2></th></tr>
      <tr><th scope="row">Status</th><td><StatusCell object={vm} /></td></tr>
      <tr><th scope="row">Provider</th><td>{vm.vmType}</td></tr>
      <tr><th scope="row">Disk image</th><td>{vm.image}</td></tr>
    </tbody>
    <tbody aria-labelledby="vm-resources-title">
      <tr><th class="section-title" colspan="2"><h2 id="vm-resources-title">Resources</h2></th></tr>
      <tr><th scope="row">CPUs</th><td>{vm.cpus}</td></tr>
      <tr><th scope="row">Memory</th><td>{formatBytes(vm.memory)}</td></tr>
      <tr><th scope="row">Disk size</th><td>{formatBytes(vm.diskSize)}</td></tr>
    </tbody>
    <tbody aria-labelledby="vm-connection-title">
      <tr><th class="section-title" colspan="2"><h2 id="vm-connection-title">Connection</h2></th></tr>
      <tr><th scope="row">Host</th><td>localhost</td></tr>
      <tr><th scope="row">SSH port</th><td>{vm.port}</td></tr>
      <tr><th scope="row">Username</th><td>{vm.remoteUsername}</td></tr>
      <tr><th scope="row">SSH identity</th><td>{vm.identityPath}</td></tr>
    </tbody>
  </table>
</div>

<style>
  .summary-content {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 16px 20px;
    overflow: auto;
    color: var(--pd-table-body-text);
  }

  table {
    width: 100%;
    height: fit-content;
  }

  th,
  td {
    padding: 4px 0 0 12px;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  th {
    font-weight: 400;
    white-space: nowrap;
  }

  .section-title {
    padding-left: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--pd-table-body-text-sub-secondary);
  }
</style>
