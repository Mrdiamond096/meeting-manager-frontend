import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { CandidateDetail, Feedback, Meeting } from '@/features/meetings/types';
import { jsonResponse, renderWithProviders, setSearchParams } from '@/test/render';
import { CandidateSummary } from './candidate-summary';

let fetchMock: MockInstance<typeof fetch>;

const ALICE = { id: 'c1', name: 'Alice Tan', position: 'Software Engineer', createdAt: '2030-01-02T10:00:00.000Z' };
const at = (day: number, hour: number) => new Date(2030, 4, day, hour).toISOString();

function meeting(id: string, overrides: Partial<Meeting> = {}): Meeting {
  return {
    id,
    title: `Meeting ${id}`,
    description: '',
    dueDate: at(10, 10),
    endAt: at(10, 11),
    status: 'CONFIRMED',
    meetingType: 'ONLINE',
    provider: 'GOOGLE_MEET',
    candidate: ALICE,
    interviewers: [],
    createdById: 'u1',
    isMine: true,
    version: 1,
    createdAt: ALICE.createdAt,
    updatedAt: ALICE.createdAt,
    ...overrides,
  };
}

const feedback = (id: string, body: string, createdById: string | null): Feedback => ({
  id,
  meetingId: 'next',
  body,
  createdById,
  createdAt: at(9, 16),
});

const next = meeting('next', { title: 'Technical interview' });
const before = (day: number, hour: number) => new Date(2020, 4, day, hour).toISOString();
const past = meeting('past', { title: 'Phone screen', dueDate: before(2, 9), endAt: before(2, 10) });
const cancelled = meeting('cancelled', {
  title: 'Intro call',
  status: 'CANCELLED',
  dueDate: before(1, 9),
  endAt: null,
});

interface Setup {
  detail?: Response;
  notes?: Response;
}

function mockApi({ detail, notes }: Setup = {}) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input), 'http://localhost').pathname.replace('/api/v1', '');
    if (path === '/candidates/c1') {
      return (
        detail ??
        jsonResponse(200, { candidate: ALICE, upcoming: [next], history: [past, cancelled] } satisfies CandidateDetail)
      );
    }
    if (path === '/auth/me')
      return jsonResponse(200, { user: { id: 'u1', email: 'me@example.test', role: 'RECRUITER' } });
    if (path.startsWith('/meetings/')) {
      return (
        notes ??
        jsonResponse(200, {
          ...next,
          feedback: [feedback('f1', 'Strong design skills', 'u1'), feedback('f2', 'Clear communicator', 'u2')],
        })
      );
    }
    throw new Error(`Unexpected request ${path}`);
  });
}

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  setSearchParams('');
});
afterEach(() => vi.clearAllMocks());

describe('CandidateSummary', () => {
  it('shows the candidate, the next meeting, notes and history', async () => {
    mockApi();
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(document.querySelector('[aria-busy]')).toBeTruthy();

    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
    expect(screen.getByText(/Software Engineer · Candidate since/)).toBeTruthy();
    expect(screen.getByText('Upcoming meeting')).toBeTruthy();
    expect(screen.getByText('Technical interview')).toBeTruthy();
    expect(screen.getByText('Online · Google Meet')).toBeTruthy();

    const history = screen.getByRole('heading', { name: 'History' }).closest('div')!.parentElement!;
    expect(within(history).getByText('Phone screen')).toBeTruthy();
    expect(within(history).getByText('Intro call')).toBeTruthy();
    expect(within(history).getByText('Past')).toBeTruthy();
    expect(within(history).getByText('Cancelled')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit meeting' }).getAttribute('href')).toBe('/meetings/next/edit');
    expect(screen.getByRole('link', { name: /Back to meetings/ }).getAttribute('href')).toBe('/');
  });

  it("lists the notes of the shown meeting, labelling the current user's own", async () => {
    mockApi();
    renderWithProviders(<CandidateSummary id="c1" />, { user: null });
    expect(await screen.findByText('Strong design skills')).toBeTruthy();
    expect(screen.getByText('Clear communicator')).toBeTruthy();
    expect(await screen.findByText(/^You ·/)).toBeTruthy();
    expect(screen.getByText(/^Team member ·/)).toBeTruthy();
  });

  it('says so when a meeting has no notes yet', async () => {
    mockApi({ notes: jsonResponse(200, { ...next, feedback: [] }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByText('No notes yet.')).toBeTruthy();
  });

  it('shows the meeting picked in the URL and marks it in the list', async () => {
    setSearchParams('meeting=past');
    mockApi({ notes: jsonResponse(200, { ...past, feedback: [] }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
    expect(screen.getByText('Meeting')).toBeTruthy();
    expect(screen.queryByText('Upcoming meeting')).toBeNull();
    expect(screen.getByRole('link', { name: 'Edit meeting' }).getAttribute('href')).toBe('/meetings/past/edit');
    const current = screen.getByRole('link', { name: /Phone screen/ });
    expect(current.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('link', { name: /Intro call/ }).getAttribute('href')).toBe(
      '/candidates/c1?meeting=cancelled',
    );
  });

  it('keeps a way back to the single upcoming meeting while a past one is shown', async () => {
    setSearchParams('meeting=past');
    mockApi({ notes: jsonResponse(200, { ...past, feedback: [] }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    const upcoming = (await screen.findByRole('heading', { name: 'Upcoming' })).closest('div')!.parentElement!;
    expect(within(upcoming).getByRole('link').getAttribute('href')).toBe(`/candidates/c1?meeting=${next.id}`);
  });

  it('does not repeat the single upcoming meeting in a list while it is shown', async () => {
    mockApi({});
    renderWithProviders(<CandidateSummary id="c1" />);
    await screen.findByText('Upcoming meeting');
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull();
  });

  it('falls back to the latest past meeting when nothing is upcoming', async () => {
    mockApi({
      detail: jsonResponse(200, { candidate: ALICE, upcoming: [], history: [past, cancelled] }),
      notes: jsonResponse(200, { ...past, feedback: [] }),
    });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit meeting' }).getAttribute('href')).toBe('/meetings/past/edit');
  });

  it('lets the user pick between several upcoming meetings', async () => {
    const later = meeting('later', { title: 'Final round', dueDate: at(20, 10), endAt: at(20, 11) });
    mockApi({ detail: jsonResponse(200, { candidate: ALICE, upcoming: [next, later], history: [] }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    const upcoming = (await screen.findByRole('heading', { name: 'Upcoming' })).closest('div')!.parentElement!;
    expect(
      within(upcoming)
        .getByRole('link', { name: /Final round/ })
        .getAttribute('href'),
    ).toBe('/candidates/c1?meeting=later');
    expect(screen.getByText('No past meetings yet.')).toBeTruthy();
  });

  it('explains a candidate without any meeting', async () => {
    mockApi({ detail: jsonResponse(200, { candidate: ALICE, upcoming: [], history: [] }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByText('No meetings with this candidate yet.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit meeting' })).toBeNull();
  });

  it('explains an unknown candidate', async () => {
    mockApi({ detail: jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByText('This candidate does not exist')).toBeTruthy();
  });

  it('shows the request id on a server error and retries', async () => {
    mockApi({ detail: jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-3' } }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Could not load this candidate')).toBeTruthy();
    expect(within(alert).getByText(/req-3/)).toBeTruthy();

    mockApi();
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
  });

  it('keeps the page usable when only the notes fail to load', async () => {
    mockApi({ notes: jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-4' } }) });
    renderWithProviders(<CandidateSummary id="c1" />);
    expect(await screen.findByText('Could not load the notes')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
    expect(screen.getByText(/req-4/)).toBeTruthy();
  });
});
