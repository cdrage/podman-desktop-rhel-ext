import type { Method, Request, Response, VmApi } from '../packages/shared/src/api';
import { CHANNEL } from '../packages/shared/src/api';

const METHODS: Method[] = ['list', 'action', 'create', 'logs', 'open', 'output', 'input', 'resize', 'close'];

export async function dispatch(api: VmApi, message: unknown): Promise<Response | undefined> {
  const request = message as Request;
  if (request?.channel !== CHANNEL || typeof request.id !== 'string') {
    return;
  }
  try {
    if (!METHODS.includes(request.method) || !Array.isArray(request.args)) {
      throw new Error('Invalid VM request');
    }
    const method = api[request.method] as (...args: unknown[]) => Promise<unknown>;
    const result = await method.apply(api, request.args);
    return { channel: CHANNEL, id: request.id, result };
  } catch (error) {
    return { channel: CHANNEL, id: request.id, error: error instanceof Error ? error.message : String(error) };
  }
}
