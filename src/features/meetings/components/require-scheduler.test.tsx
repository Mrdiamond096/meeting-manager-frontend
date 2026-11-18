import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Meeting } from '../types';
import { jsonResponse, renderWithProviders, setSearchParams } from '@/test/render';
import { MeetingForm } from './meeting-form';
import { MeetingReadOnly } from './meeting-read-only';
import { RequireScheduler } from './require-scheduler';

const meeting: Meeting = {
  id: '00000000-0000-4000-8000-000000000009',
  title: 'Panel sync',
  description: 'Bring the laptop.\nRoom 4A, second floor',
  dueDate: '2030-05-10T03:00:00.000Z',
  endAt: '2030-05-10T04:00:00.000Z',
  status: 'PENDING',
  meetingType: 'ONSITE',
  provider: null,
  candidate: null,
  interviewers: [],
  createdById: 'u-rec',
  isMine: false,
  version: 2,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};

let fetchMock: MockInstance<typeof fetch>;
let answerMe: (role: string) => void;
let meFails = false;

beforeEach(() => {
  setSearchParams('');
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = new URL(String(input), 'http://localhost').pathname.replace('/api/v1', '');
    if (path === '/auth/me' && meFails) return jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } });
    if (path === '/auth/me')
      return new Promise<Response>((resolve) => {
        answerMe = (role) => resolve(jsonResponse(200, { user: { id: 'u-me', email: 'me@example.test', role } }));
      });
    if (path === `/meetings/${meeting.id}`) return jsonResponse(200, { ...meeting, feedback: [] });
    throw new Error(`Unexpected request ${path}`);
  });
});
afterEach(() => {
  meFails = false;
  vi.restoreAllMocks();
});

const newForm = () => (
  <RequireScheduler>
    <MeetingForm />
  </RequireScheduler>
);

describe('RequireScheduler (ADR-015)', () => {
  it('shows no form until the role is known, then the form for a recruiter', async () => {
    renderWithProviders(newForm(), { user: null });
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Book meeting' })).toBeNull();
    expect(screen.queryByLabelText('Title')).toBeNull();
    await act(async () => answerMe('RECRUITER'));
    expect(await screen.findByRole('button', { name: 'Book meeting' })).toBeTruthy();
  });

  it('never offers an interviewer a form to type into', async () => {
    renderWithProviders(newForm(), { user: null });
    expect(screen.queryByLabelText('Title')).toBeNull();
    await act(async () => answerMe('INTERVIEWER'));
    expect(await screen.findByText(/You cannot manage this meeting/)).toBeTruthy();
    expect(screen.queryByLabelText('Title')).toBeNull();
  });

  it('keeps the form closed when the role cannot be loaded, and opens it after a successful retry', async () => {
    meFails = true;
    renderWithProviders(newForm(), { user: null });
    expect(await screen.findByText('Could not check your permissions. Try again.')).toBeTruthy();
    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Book meeting' })).toBeNull();
    meFails = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => answerMe('RECRUITER'));
    expect(await screen.findByRole('button', { name: 'Book meeting' })).toBeTruthy();
  });

  it('shows an interviewer a meeting without a candidate read-only, with feedback, at its edit URL', async () => {
    renderWithProviders(
      <RequireScheduler readOnly={<MeetingReadOnly id={meeting.id} />}>
        <p>edit form</p>
      </RequireScheduler>,
      { user: { id: 'u-me', email: 'me@example.test', role: 'INTERVIEWER' } },
    );
    expect(await screen.findByRole('heading', { name: 'Panel sync' })).toBeTruthy();
    const notes = screen.getByText(/Bring the laptop\./);
    expect(notes.textContent).toBe('Bring the laptop.\nRoom 4A, second floor');
    expect(notes.className).toContain('whitespace-pre-wrap');
    expect(screen.queryByText('edit form')).toBeNull();
    expect(screen.queryByText(/You cannot manage/)).toBeNull();
    expect(await screen.findByRole('button', { name: 'Add feedback' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });
});
