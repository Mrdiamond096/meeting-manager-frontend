import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { jsonResponse, renderWithProviders, router, setSearchParams } from '@/test/render';
import type { Meeting } from '../types';
import { MeetingsDashboard } from './meetings-dashboard';

let fetchMock: MockInstance<typeof fetch>;

const at = (dayOffset: number, hour: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, hour);
};

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  const start = at(1, 10);
  return {
    id: crypto.randomUUID(),
    title: 'Interview: Alice Tan',
    description: '',
    dueDate: start.toISOString(),
    endAt: new Date(start.getTime() + 3_600_000).toISOString(),
    status: 'CONFIRMED',
    meetingType: 'ONLINE',
    provider: 'GOOGLE_MEET',
    candidate: { id: 'c1', name: 'Alice Tan', position: 'Software Engineer', createdAt: '2030-01-01T00:00:00.000Z' },
    createdById: 'u1',
    isMine: true,
    version: 1,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const page = (items: Meeting[], total = items.length, pageNo = 1) => jsonResponse(200, { items, page: pageNo, pageSize: 12, total });

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  setSearchParams('');
});
afterEach(() => vi.clearAllMocks());

describe('MeetingsDashboard', () => {
  it('shows skeletons, then cards with status, schedule and where', async () => {
    fetchMock.mockResolvedValue(page([meeting(), meeting({ title: 'Hiring sync', candidate: null, status: 'PENDING', meetingType: 'ONSITE', provider: null })]));
    renderWithProviders(<MeetingsDashboard />);
    expect(document.querySelector('[aria-busy]')).toBeTruthy();

    expect(await screen.findByRole('heading', { name: 'Alice Tan' })).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    // One in the status filter, one badge on the card.
    expect(screen.getAllByText('Confirmed')).toHaveLength(2);
    expect(screen.getByText('Online · Google Meet')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Hiring sync' })).toBeTruthy();
    expect(screen.getByText('No candidate')).toBeTruthy();
    expect(screen.getByText('Showing 1–2 of 2')).toBeTruthy();
    expect(screen.getByText('2 meetings')).toBeTruthy();
  });

  it('asks for upcoming meetings from the start of today, 12 per page', async () => {
    fetchMock.mockResolvedValue(page([meeting()]));
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('heading', { name: 'Alice Tan' });
    const url = new URL(String(fetchMock.mock.calls[0]![0]), 'http://localhost');
    expect(url.pathname).toBe('/api/v1/meetings');
    expect(url.searchParams.get('pageSize')).toBe('12');
    const from = new Date(url.searchParams.get('from')!);
    expect(from.getHours()).toBe(0);
    expect(url.searchParams.has('status')).toBe(false);
    expect(url.searchParams.has('mine')).toBe(false);
  });

  it('marks today with a label and a finished meeting as Past', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2030, 4, 10, 15, 0));
    try {
      const slot = (hour: number) => ({
        dueDate: new Date(2030, 4, 10, hour).toISOString(),
        endAt: new Date(2030, 4, 10, hour + 1).toISOString(),
      });
      fetchMock.mockResolvedValue(page([meeting(slot(12)), meeting(slot(16)), meeting({ ...slot(16), dueDate: new Date(2030, 4, 11, 9).toISOString(), endAt: new Date(2030, 4, 11, 10).toISOString() })]));
      renderWithProviders(<MeetingsDashboard />);
      await screen.findAllByRole('heading', { name: 'Alice Tan' });
      expect(screen.getAllByText('Past')).toHaveLength(1);
      expect(screen.getAllByText('Today')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads filters from the URL and sends them to the API', async () => {
    setSearchParams('status=PENDING&mine=true&page=2');
    fetchMock.mockResolvedValue(page([meeting({ status: 'PENDING' })], 13, 2));
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('heading', { name: 'Alice Tan' });
    const url = new URL(String(fetchMock.mock.calls[0]![0]), 'http://localhost');
    expect(url.searchParams.get('status')).toBe('PENDING');
    expect(url.searchParams.get('mine')).toBe('true');
    expect(url.searchParams.get('page')).toBe('2');
    expect(screen.getByRole('radio', { name: 'Pending' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Mine' }).getAttribute('aria-checked')).toBe('true');
  });

  it('changing a filter resets to page 1 in the URL', async () => {
    setSearchParams('page=2');
    fetchMock.mockResolvedValue(page([meeting()], 24, 2));
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('heading', { name: 'Alice Tan' });
    await userEvent.click(screen.getByRole('radio', { name: 'Confirmed' }));
    expect(router.replace).toHaveBeenCalledWith('/?status=CONFIRMED');
  });

  it('pages with Previous / Next', async () => {
    fetchMock.mockResolvedValue(page([meeting()], 30, 1));
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('heading', { name: 'Alice Tan' });
    expect((screen.getByRole('button', { name: /Previous/ }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(router.replace).toHaveBeenCalledWith('/?page=2');
    expect(screen.getByText('Showing 1–1 of 30')).toBeTruthy();
  });

  it('shows an empty state with a call to action', async () => {
    fetchMock.mockResolvedValue(page([]));
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText('No upcoming meetings')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Schedule one' }).getAttribute('href')).toBe('/meetings/new');
  });

  it('explains an empty filtered result', async () => {
    setSearchParams('status=CANCELLED');
    fetchMock.mockResolvedValue(page([]));
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText('No meetings match these filters.')).toBeTruthy();
  });

  it('shows an error with the request id and retries', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-42' } }));
    renderWithProviders(<MeetingsDashboard />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Could not load meetings')).toBeTruthy();
    expect(within(alert).getByText(/req-42/)).toBeTruthy();

    fetchMock.mockResolvedValueOnce(page([meeting()]));
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alice Tan' })).toBeTruthy());
  });

  it('links each card to its meeting and the header to the booking form', async () => {
    const m = meeting();
    fetchMock.mockResolvedValue(page([m]));
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('heading', { name: 'Alice Tan' });
    expect(screen.getByRole('link', { name: /View details/ }).getAttribute('href')).toBe(`/meetings/${m.id}/edit`);
    expect(screen.getByRole('link', { name: 'Schedule meeting' }).getAttribute('href')).toBe('/meetings/new');
  });
});
