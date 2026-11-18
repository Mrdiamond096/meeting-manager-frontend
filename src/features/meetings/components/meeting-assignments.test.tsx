import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithProviders } from '@/test/render';
import type { Meeting } from '../types';
import { EditMeeting } from './edit-meeting';
import { MeetingForm } from './meeting-form';

const a = { id: '00000000-0000-4000-8000-000000000001', email: 'a@example.test' };
const b = { id: '00000000-0000-4000-8000-000000000002', email: 'b@example.test' };
const base: Meeting = {
  id: '00000000-0000-4000-8000-000000000009',
  title: 'Panel interview',
  description: 'Bring notes',
  dueDate: '2030-05-10T03:00:00.000Z',
  endAt: '2030-05-10T04:00:00.000Z',
  status: 'PENDING',
  meetingType: 'ONSITE',
  provider: null,
  candidate: null,
  interviewers: [a],
  createdById: 'recruiter',
  isMine: false,
  version: 1,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};
let current: Meeting;
let calls: { path: string; method: string; body: Record<string, unknown> | null }[];
let directoryFails: boolean;
beforeEach(() => {
  current = structuredClone(base);
  calls = [];
  directoryFails = false;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace('/api/v1', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, method, body });
    if (path === '/interviewers')
      return directoryFails
        ? jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Unavailable', requestId: 'directory-error' } })
        : jsonResponse(200, { items: [a, b] });
    if (method === 'POST' && path === '/meetings') return jsonResponse(201, current);
    if (path === `/meetings/${base.id}/cancel`) {
      current = { ...current, status: 'CANCELLED', version: current.version + 1 };
      return jsonResponse(200, current);
    }
    if (path === `/meetings/${base.id}`) {
      if (method === 'PATCH') current = { ...current, ...body, version: current.version + 1 };
      return jsonResponse(200, { ...current, feedback: [] });
    }
    throw new Error(`Unexpected ${method} ${path}`);
  });
});
afterEach(() => vi.restoreAllMocks());

const interviewer = (person = a) => ({ id: person.id, email: person.email, role: 'INTERVIEWER' as const });

describe('meeting assignment workflow', () => {
  it('lets a recruiter choose multiple interviewers when creating a meeting', async () => {
    renderWithProviders(<MeetingForm />);
    expect(calls.some((call) => call.path === '/interviewers')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Assign interviewers' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: a.email }));
    await userEvent.click(screen.getByRole('checkbox', { name: b.email }));
    await userEvent.type(screen.getByLabelText('Title'), 'New panel');
    await userEvent.click(screen.getByRole('button', { name: 'Book meeting' }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'POST')?.body?.interviewerIds).toEqual([a.id, b.id]),
    );
  });

  it('sends only the replacement assignment list and version after removing/changing assignees', async () => {
    renderWithProviders(<MeetingForm meeting={current} />);
    await userEvent.click(screen.getByRole('button', { name: `Remove ${a.email}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Assign interviewers' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: b.email }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ version: 1, interviewerIds: [b.id] }),
    );
  });

  it('shows assigned interviewers the edit form while keeping assignment controls unavailable', async () => {
    renderWithProviders(<EditMeeting id={base.id} />, { user: interviewer() });
    const title = await screen.findByLabelText('Title');
    expect(screen.queryByRole('button', { name: 'Assign interviewers' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    await userEvent.type(title, ' changed');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
        version: 1,
        title: 'Panel interview changed',
      }),
    );
    expect(calls.some((call) => call.path === '/interviewers')).toBe(false);
  });

  it('keeps unassigned interviewers on read-only details with feedback available', async () => {
    renderWithProviders(<EditMeeting id={base.id} />, { user: interviewer(b) });
    expect(await screen.findByRole('heading', { name: 'Panel interview' })).toBeTruthy();
    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel meeting' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add feedback' })).toBeTruthy();
    expect(screen.getByText('Bring notes')).toBeTruthy();
  });

  it('allows an assignee to cancel a candidate-less meeting without offering delete', async () => {
    renderWithProviders(<EditMeeting id={base.id} />, { user: interviewer() });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel meeting' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel meeting' }));
    await waitFor(() => expect(calls.find((call) => call.path.endsWith('/cancel'))?.body).toEqual({ version: 1 }));
    expect(await screen.findByText('Meeting cancelled')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('shows directory failures with request id and supports retry', async () => {
    directoryFails = true;
    renderWithProviders(<MeetingForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Assign interviewers' }));
    expect(await screen.findByText('Could not load interviewers')).toBeTruthy();
    expect(screen.getByText(/directory-error/)).toBeTruthy();
    directoryFails = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('checkbox', { name: a.email })).toBeTruthy();
  });
});
