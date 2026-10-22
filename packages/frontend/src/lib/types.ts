import type { Vm, VmAction } from '/@shared/src/api';

export interface VmRow extends Vm {
  onaction: (action: VmAction) => void;
}
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return 'Unknown';
  }
  const GIB = 1024 ** 3;
  return (value / GIB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' GiB';
}
