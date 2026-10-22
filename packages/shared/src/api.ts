export const CHANNEL = 'rhel-vms:rpc';
export const OUTPUT_LIMIT = 1024 * 1024;
export const MAX_TERMINAL_SIZE = 500;

export interface MachineInfo {
  name: string;
  image: string;
  cpus: number;
  memory: number;
  diskSize: number;
  port: number;
  remoteUsername: string;
  identityPath: string;
  vmType: string;
}

export type VmAction = 'start' | 'stop' | 'delete';
export type VmStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'deleting';
export interface Vm extends MachineInfo {
  id: string;
  status: VmStatus;
  busy: boolean;
  error?: string;
}
export interface VmList {
  machines: Vm[];
  available: boolean;
  error?: string;
}
export interface Output {
  text: string;
  offset: number;
  ended?: boolean;
}
export interface VmApi {
  list(): Promise<VmList>;
  action(id: string, action: VmAction): Promise<void>;
  create(): Promise<void>;
  logs(id: string): Promise<string>;
  open(id: string): Promise<string>;
  output(session: string, offset: number): Promise<Output>;
  input(session: string, data: string): Promise<void>;
  resize(session: string, columns: number, rows: number): Promise<void>;
  close(session: string): Promise<void>;
}
export type Method = keyof VmApi;
export interface Request {
  channel: typeof CHANNEL;
  id: string;
  method: Method;
  args: unknown[];
}
export interface Response {
  channel: typeof CHANNEL;
  id: string;
  result?: unknown;
  error?: string;
}
