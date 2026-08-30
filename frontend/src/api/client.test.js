// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchImageAsObjectUrl } from './client.js';

describe('fetchImageAsObjectUrl', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'abc123');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sends the bearer token and returns an object URL for the blob', async () => {
    const blob = new Blob(['image'], { type: 'image/jpeg' });
    const response = { ok: true, blob: vi.fn().mockResolvedValue(blob) };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn().mockReturnValue('blob:http://x/1');
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    const result = await fetchImageAsObjectUrl('/api/wardrobe/images/foo.jpg');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/wardrobe/images/foo.jpg', {
      headers: expect.any(Headers),
    });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(result).toBe('blob:http://x/1');
  });

  it('throws when the image request is not ok', async () => {
    const response = { ok: false, status: 401, blob: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(
      fetchImageAsObjectUrl('/api/wardrobe/images/missing.jpg'),
    ).rejects.toThrow('Request failed with status 401');
  });
});
