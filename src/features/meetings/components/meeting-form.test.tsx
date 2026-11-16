import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { jsonResponse, renderWithProviders, router } from '@/test/render';
import { fromLocalParts } from '../datetime';
import type { CandidateSummary, Meeting } from '../types';
import { EditMeeting } from './edit-meeting';
import { MeetingForm } from './meeting-form';

let fetchMock: MockInstance<typeof fetch>;

const ALICE: CandidateSummary = { id: 'c1', name: 'Alice Tan', position: 'Software Engineer', createdAt: '2030-01-01T00:00:00.000Z' };
const POSITIONS = ['Software Engineer', 'QA Engineer'];

const existing: Meeting = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Interview: Alice Tan',
  description: '',
  dueDate: fromLocalParts('2030-05-10', '10:00'),
  endAt: fromLocalParts('2030-05-10', '11:00'),
  status: 'PENDING',
  meetingType: 'ONLINE',
  provider: 'ZOOM',
  candidate: ALICE,
  createdById: 'u1',
  isMine: true,
  version: 4,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}
const calls: Call[] = [];
const requestOf = (c: Call) => c.body;

/** Routes fetch by "METHOD path"; unknown routes fail the test loudly. */
function mockApi(routes: Record<string, (call: Call) => Response>) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const call: Call = {
      method: init?.method ?? 'GET',
      path: `${url.pathname.replace('/api/v1', '')}${url.search}`,
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    if (!handler) throw new Error(`Unexpected request ${call.method} ${call.path}`);
    return handler(call);
  });
}

const candidateInput = () => screen.getByRole('combobox', { name: 'Candidate (optional)' });
const saved = (overrides: Partial<Meeting> = {}) => jsonResponse(201, { ...existing, ...overrides });
const conflict = () => jsonResponse(409, { error: { code: 'VERSION_CONFLICT', message: 'x', requestId: 'r' } });

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  calls.length = 0;
});
afterEach(() => vi.clearAllMocks());

describe('MeetingForm (create)', () => {
  it('validates before calling the API', async () => {
    renderWithProviders(<MeetingForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    expect(await screen.findByText('Enter a title')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an end time that is not after the start time', async () => {
    renderWithProviders(<MeetingForm />);
    await userEvent.type(screen.getByLabelText('Title'), 'Sync');
    await userEvent.selectOptions(screen.getByLabelText('Start time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText('End time'), '09:45');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    expect(await screen.findByText('End time must be after the start time')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('books a generic meeting and returns to the dashboard', async () => {
    mockApi({ 'POST /meetings': () => saved() });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(screen.getByLabelText('Title'), '  Hiring sync ');
    await userEvent.selectOptions(screen.getByLabelText('Start time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText('End time'), '11:30');
    await userEvent.click(screen.getByRole('radio', { name: 'Online' }));
    await userEvent.selectOptions(screen.getByLabelText('Online provider'), 'Google Meet');
    await userEvent.type(screen.getByLabelText('Notes'), 'Bring laptop');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    const body = requestOf(calls[0]!)!;
    expect(body).toMatchObject({ title: 'Hiring sync', description: 'Bring laptop', status: 'PENDING', meetingType: 'ONLINE', provider: 'GOOGLE_MEET' });
    expect(typeof body.dueDate).toBe('string');
    expect(new Date(body.endAt as string).getTime() - new Date(body.dueDate as string).getTime()).toBe(90 * 60_000);
    expect(body).not.toHaveProperty('candidateId');
    expect(await screen.findByText('Meeting booked')).toBeTruthy();
  });

  it('picks an existing candidate from search and suggests the title', async () => {
    mockApi({
      'GET /candidates?q=ali': () => jsonResponse(200, { items: [ALICE] }),
      'POST /meetings': () => saved(),
    });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(candidateInput(), 'ali');
    const option = await screen.findByRole('option', { name: /Alice Tan/ });
    expect(option.textContent).toContain('Software Engineer');
    await userEvent.click(option);

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Interview: Alice Tan');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(requestOf(calls.find((c) => c.method === 'POST')!)).toMatchObject({ candidateId: 'c1' });
  });

  it('selects an option with the keyboard', async () => {
    mockApi({ 'GET /candidates?q=ali': () => jsonResponse(200, { items: [ALICE] }) });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(candidateInput(), 'ali');
    await screen.findByRole('option', { name: /Alice Tan/ });
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('Software Engineer')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Candidate (optional)' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Remove candidate' }));
    expect(candidateInput()).toBeTruthy();
  });

  it('does not switch to a new candidate when Enter is pressed on an empty search', async () => {
    mockApi({});
    renderWithProviders(<MeetingForm />);
    await userEvent.click(candidateInput());
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByLabelText('Candidate name')).toBeNull();
    expect(candidateInput()).toBeTruthy();
  });

  it('shows a typed name literally in the create option', async () => {
    mockApi({ 'GET /candidates?q=A$&B': () => jsonResponse(200, { items: [] }) });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(candidateInput(), 'A$&B');
    expect(await screen.findByRole('option', { name: 'Create new candidate “A$&B”' })).toBeTruthy();
  });

  it('creates a new candidate only through the explicit option and sends it inline', async () => {
    mockApi({
      'GET /candidates?q=Bo': () => jsonResponse(200, { items: [] }),
      'GET /candidates/positions': () => jsonResponse(200, { items: POSITIONS }),
      'POST /meetings': () => saved(),
    });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(candidateInput(), 'Bo');
    await userEvent.click(await screen.findByRole('option', { name: /Create new candidate “Bo”/ }));

    expect((screen.getByLabelText('Candidate name') as HTMLInputElement).value).toBe('Bo');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    // The same words are also the select's placeholder option, so look at the error element only.
    expect((await screen.findByRole('alert')).textContent).toBe('Select a position');

    await screen.findByRole('option', { name: 'QA Engineer' });
    await userEvent.selectOptions(screen.getByLabelText('Position'), 'QA Engineer');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(requestOf(calls.find((c) => c.method === 'POST')!)).toMatchObject({
      title: 'Interview: Bo',
      candidate: { name: 'Bo', position: 'QA Engineer' },
    });
  });

  it('explains a failed positions lookup with the request id and retries it', async () => {
    let attempts = 0;
    mockApi({
      'GET /candidates?q=Bo': () => jsonResponse(200, { items: [] }),
      'GET /candidates/positions': () =>
        ++attempts === 1
          ? jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-7' } })
          : jsonResponse(200, { items: POSITIONS }),
    });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(candidateInput(), 'Bo');
    await userEvent.click(await screen.findByRole('option', { name: /Create new candidate “Bo”/ }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Could not load the positions')).toBeTruthy();
    expect(within(alert).getByText(/req-7/)).toBeTruthy();
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'QA Engineer' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('maps API validation details onto the field', async () => {
    mockApi({
      'POST /meetings': () =>
        jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'x', requestId: 'r', details: [{ path: 'body.dueDate', message: 'Invalid datetime' }] } }),
    });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(screen.getByLabelText('Title'), 'Sync');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    const date = screen.getByLabelText('Date');
    await waitFor(() => expect(date.getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText('Invalid datetime')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows the request id for an unexpected server error and keeps the form', async () => {
    mockApi({ 'POST /meetings': () => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-9' } }) });
    renderWithProviders(<MeetingForm />);
    await userEvent.type(screen.getByLabelText('Title'), 'Sync');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Could not save the meeting/)).toBeTruthy();
    expect(within(alert).getByText(/req-9/)).toBeTruthy();
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Sync');
  });
});

describe('EditMeeting', () => {
  const detail = `GET /meetings/${existing.id}`;

  it('loads the meeting into the form and sends only the changes with the version', async () => {
    mockApi({
      [detail]: () => jsonResponse(200, existing),
      [`PATCH /meetings/${existing.id}`]: () => jsonResponse(200, { ...existing, version: 5 }),
    });
    renderWithProviders(<EditMeeting id={existing.id} />);
    expect(await screen.findByRole('heading', { name: 'Edit meeting' })).toBeTruthy();
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Interview: Alice Tan');
    expect((screen.getByLabelText('Start time') as HTMLSelectElement).value).toBe('10:00');
    expect((screen.getByLabelText('Online provider') as HTMLSelectElement).value).toBe('ZOOM');

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'CONFIRMED');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(requestOf(calls.find((c) => c.method === 'PATCH')!)).toEqual({ version: 4, status: 'CONFIRMED' });
  });

  it('does not call the API when nothing changed', async () => {
    mockApi({ [detail]: () => jsonResponse(200, existing) });
    renderWithProviders(<EditMeeting id={existing.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('No changes to save')).toBeTruthy();
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });

  it('sends a new candidate inline with the update in a single request', async () => {
    mockApi({
      [detail]: () => jsonResponse(200, existing),
      'GET /candidates/positions': () => jsonResponse(200, { items: POSITIONS }),
      [`PATCH /meetings/${existing.id}`]: () => jsonResponse(200, { ...existing, version: 5 }),
    });
    renderWithProviders(<EditMeeting id={existing.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove candidate' }));
    await userEvent.type(candidateInput(), 'Zed');
    await userEvent.click(await screen.findByRole('option', { name: /Create new candidate/ }).catch(async () => screen.findByText(/Create new candidate/)));
    await screen.findByRole('option', { name: 'QA Engineer' });
    await userEvent.selectOptions(screen.getByLabelText('Position'), 'QA Engineer');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path.split('/').slice(0, 2).join('/')}`)).toEqual(['PATCH /meetings']);
    expect(requestOf(calls.find((c) => c.method === 'PATCH')!)).toEqual({ version: 4, candidate: { name: 'Zed', position: 'QA Engineer' } });
  });

  it('on a version conflict explains it and reloads the latest version', async () => {
    let reads = 0;
    mockApi({
      [detail]: () => jsonResponse(200, ++reads === 1 ? existing : { ...existing, title: 'Changed elsewhere', version: 5 }),
      [`PATCH /meetings/${existing.id}`]: conflict,
    });
    renderWithProviders(<EditMeeting id={existing.id} />);
    await userEvent.type(await screen.findByLabelText('Title'), ' (mine)');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('This meeting was updated elsewhere')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Changed elsewhere'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains a meeting that no longer exists', async () => {
    mockApi({ [detail]: () => jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } }) });
    renderWithProviders(<EditMeeting id={existing.id} />);
    expect(await screen.findByText('This meeting no longer exists')).toBeTruthy();
  });

  it('keeps a cancelled meeting cancelled unless the user reopens it', async () => {
    mockApi({
      [`GET /meetings/${existing.id}`]: () => jsonResponse(200, { ...existing, status: 'CANCELLED' }),
      [`PATCH /meetings/${existing.id}`]: () => jsonResponse(200, { ...existing, version: 5 }),
    });
    renderWithProviders(<EditMeeting id={existing.id} />);
    const status = (await screen.findByLabelText('Status')) as HTMLSelectElement;
    expect(status.value).toBe('CANCELLED');
    expect(screen.getByText(/This meeting is cancelled/)).toBeTruthy();

    await userEvent.type(screen.getByLabelText('Notes'), 'note');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(requestOf(calls.find((c) => c.method === 'PATCH')!)).toEqual({ version: 4, description: 'note' });
  });
});
