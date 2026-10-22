import { expect, test, vi } from 'vitest';

import type { VmApi } from '../packages/shared/src/api';
import { CHANNEL } from '../packages/shared/src/api';
import { dispatch } from './vm-rpc';

test('rejects unlisted methods and ignores foreign channels', async () => {
  const api = { list: vi.fn(async () => ({ machines: [], available: true })) } as unknown as VmApi;
  expect(await dispatch(api, { channel: 'foreign' })).toBeUndefined();
  expect((await dispatch(api, { channel: CHANNEL, id: '1', method: 'constructor', args: [] }))?.error).toBe(
    'Invalid VM request',
  );
  expect((await dispatch(api, { channel: CHANNEL, id: '2', method: 'list', args: [] }))?.result).toEqual({
    machines: [],
    available: true,
  });
});
