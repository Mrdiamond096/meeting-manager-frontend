import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { CandidateDetail, Meeting } from '@/features/meetings/types';
import { jsonResponse, renderWithProviders, router, setSearchParams } from '@/test/render';
import { CandidateSummary } from './candidate-summary';

const ALICE = { id: 'c1', name: 'Alice Tan', position: 'Software Engineer', createdAt: '2030-01-02T10:00:00.000Z' };
const next: Meeting = {
  id: 'm1',
  title: 'Technical interview',
  description: '',
  dueDate: new Date(2030, 4, 10, 10).toISOString(),
  endAt: new Date(2030, 4, 10, 11).toISOString(),
  status: 'CONFIRMED',
  meetingType: 'ONSITE',
  provider: null,
  candidate: ALICE,
  createdById: 'u1',
  isMine: true,
  version: 3,
  createdAt: ALICE.createdAt,
  updatedAt: ALICE.createdAt,
};

type Handler = (body: unknown, url: URL) => Response;
let fetchMock: MockInstance<typeof fetch>;
let calls: { method: string; path: string; search: string; body: unknown }[];

function mockApi(handlers: Record<string, Handler> = {}, meeting: Meeting = next) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace('/api/v1', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, search: url.search, body });
    const handler = handlers[`${method} ${path}`];
    if (handler) return handler(body, url);
    if (path === '/candidates/c1') return jsonResponse(200, { candidate: ALICE, upcoming: [meeting], history: [] } satisfies CandidateDetail);
    if (path === '/auth/me') return jsonResponse(200, { user: { id: 'u1', email: 'me@example.test', role: 'USER' } });
    if (method === 'GET' && path === `/meetings/${meeting.id}`) return jsonResponse(200, { ...meeting, feedback: [] });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
}

const writes = () => calls.filter((c) => c.method !== 'GET');
const fetchesOf = (path: string) => calls.filter((c) => c.method === 'GET' && c.path === path).length;

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  calls = [];
  setSearchParams('');
});
afterEach(() => vi.clearAllMocks());

describe('Candidate summary actions', () => {
  it('cancels the meeting with its version after confirming and reloads the summary', async () => {
    mockApi({ 'POST /meetings/m1/cancel': () => jsonResponse(200, { ...next, status: 'CANCELLED', version: 4 }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel meeting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this meeting?' });
    expect(writes()).toEqual([]);
    const loads = fetchesOf('/candidates/c1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel meeting' }));
    expect(await screen.findByText('Meeting cancelled')).toBeTruthy();
    expect(writes()).toEqual([{ method: 'POST', path: '/meetings/m1/cancel', search: '', body: { version: 3 } }]);
    expect(fetchesOf('/candidates/c1')).toBeGreaterThan(loads);
  });

  it('does nothing when the user keeps the meeting', async () => {
    mockApi();
    renderWithProviders(<CandidateSummary id="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel meeting' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Keep meeting' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(writes()).toEqual([]);
  });

  it('offers no cancel for a meeting that is already cancelled', async () => {
    mockApi({}, { ...next, status: 'CANCELLED' });
    renderWithProviders(<CandidateSummary id="c1" />);
    await screen.findByRole('button', { name: 'Delete' });
    expect(screen.queryByRole('button', { name: 'Cancel meeting' })).toBeNull();
  });

  it('deletes with the version in the query and returns to the dashboard', async () => {
    mockApi({ 'DELETE /meetings/m1': () => new Response(null, { status: 204 }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this meeting?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete meeting' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(writes()).toEqual([{ method: 'DELETE', path: '/meetings/m1', search: '?version=3', body: undefined }]);
    expect(screen.getByText('Meeting deleted')).toBeTruthy();
  });

  it('explains a version conflict and reloads on request', async () => {
    mockApi({
      'POST /meetings/m1/cancel': () =>
        jsonResponse(409, { error: { code: 'VERSION_CONFLICT', message: 'Version mismatch', requestId: 'r-409' } }),
    });
    renderWithProviders(<CandidateSummary id="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel meeting' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel meeting' }));
    const conflict = await screen.findByRole('dialog', { name: 'This meeting was changed' });
    const loads = fetchesOf('/candidates/c1');
    await userEvent.click(within(conflict).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(fetchesOf('/candidates/c1')).toBeGreaterThan(loads));
  });

  it('keeps the dialog open with the request id on an unexpected error', async () => {
    mockApi({
      'DELETE /meetings/m1': () => jsonResponse(500, { error: { code: 'INTERNAL', message: 'boom', requestId: 'r-500' } }),
    });
    renderWithProviders(<CandidateSummary id="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete meeting' }));
    expect((await within(dialog).findByRole('alert')).textContent).toContain('r-500');
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('Add feedback', () => {
  it('adds a trimmed note, clears the field and reloads the notes', async () => {
    mockApi({
      'POST /meetings/m1/feedback': (body) =>
        jsonResponse(201, { id: 'f1', meetingId: 'm1', body: (body as { body: string }).body, createdById: 'u1', createdAt: next.createdAt }),
    });
    renderWithProviders(<CandidateSummary id="c1" />);
    const field = (await screen.findByLabelText('Add feedback')) as HTMLTextAreaElement;
    await userEvent.type(field, '  Strong fundamentals  ');
    const loads = fetchesOf('/meetings/m1');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add feedback' }).at(-1)!);
    expect(await screen.findByText('Feedback added')).toBeTruthy();
    expect(writes()).toEqual([{ method: 'POST', path: '/meetings/m1/feedback', search: '', body: { body: 'Strong fundamentals' } }]);
    expect(field.value).toBe('');
    expect(fetchesOf('/meetings/m1')).toBeGreaterThan(loads);
  });

  it('asks for text before sending an empty note', async () => {
    mockApi();
    renderWithProviders(<CandidateSummary id="c1" />);
    await screen.findByLabelText('Add feedback');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add feedback' }).at(-1)!);
    expect(await screen.findByText('Write something before adding it')).toBeTruthy();
    expect(writes()).toEqual([]);
  });

  it('the header button moves focus to the note field', async () => {
    mockApi();
    renderWithProviders(<CandidateSummary id="c1" />);
    const field = await screen.findByLabelText('Add feedback');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add feedback' })[0]);
    expect(document.activeElement).toBe(field);
  });
});
