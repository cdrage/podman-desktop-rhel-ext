import { CHANNEL, type Method, type Response, type VmApi } from '/@shared/src/api';

interface RouterState {
  route?: string;
}
interface DesktopApi {
  postMessage(message: unknown): void;
  getState(): RouterState | undefined;
  setState(state: RouterState): void;
}
declare global {
  function acquirePodmanDesktopApi(): DesktopApi;
}
const desktop = acquirePodmanDesktopApi();
const REQUEST_TIMEOUT = 180000;
const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
window.addEventListener('message', (event: MessageEvent<Response>) => {
  // Podman Desktop dispatches a synthetic event without an origin or source.
  if (event.origin !== '' || event.source) {
    return;
  }
  const response = event.data;
  if (response?.channel !== CHANNEL) {
    return;
  }
  const request = pending.get(response.id);
  if (!request) {
    return;
  }
  clearTimeout(request.timer);
  pending.delete(response.id);
  if (response.error) {
    request.reject(new Error(response.error));
  } else {
    request.resolve(response.result);
  }
});
function call(method: Method, ...args: unknown[]): Promise<unknown> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('The request timed out. Refresh the VM list before another action.'));
    }, REQUEST_TIMEOUT);
    pending.set(id, { resolve, reject, timer });
    desktop.postMessage({ channel: CHANNEL, id, method, args });
  });
}
export const client: VmApi = {
  list: () => call('list') as ReturnType<VmApi['list']>,
  action: (id, action) => call('action', id, action) as Promise<void>,
  create: () => call('create') as Promise<void>,
  logs: id => call('logs', id) as Promise<string>,
  open: id => call('open', id) as Promise<string>,
  output: (session, offset) => call('output', session, offset) as ReturnType<VmApi['output']>,
  input: (session, data) => call('input', session, data) as Promise<void>,
  resize: (session, cols, rows) => call('resize', session, cols, rows) as Promise<void>,
  close: session => call('close', session) as Promise<void>,
};
export function saveRoute(route: string): void {
  desktop.setState({ route });
}
export function loadRoute(): string {
  return desktop.getState()?.route ?? '#/';
}
