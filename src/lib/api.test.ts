import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, buildUrl } from './api';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('builds same-origin URLs and drops empty query values', () => {
    expect(buildUrl('/meetings', { page: 2, status: undefined, mine: true, q: '' })).toBe('/api/v1/meetings?page=2&mine=true');
  });

  it('returns parsed JSON on success and sends JSON bodies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(201, { id: '1' }));
    await expect(api('/meetings', { method: 'POST', body: { title: 'x' } })).resolves.toEqual({ id: '1' });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBe('{"title":"x"}');
  });

  it('returns undefined for 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('maps the API error body to ApiError with requestId', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(409, { error: { code: 'VERSION_CONFLICT', message: 'changed', requestId: 'r-1' } }),
    );
    const err = await api('/meetings/1', { method: 'PATCH', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', requestId: 'r-1' });
  });

  it('falls back to the X-Request-Id header for non-JSON errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad gateway', { status: 502, headers: { 'x-request-id': 'h-1' } }));
    await expect(api('/meetings')).rejects.toMatchObject({ status: 502, code: 'INTERNAL_ERROR', requestId: 'h-1' });
  });

  it('maps network failures to NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/meetings')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
