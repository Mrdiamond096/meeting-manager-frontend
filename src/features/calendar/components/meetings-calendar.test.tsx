import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
// '@/test/render' mocks next/navigation, so it is imported before the components.
import { jsonResponse, renderWithProviders, router, setSearchParams } from '@/test/render';
import { MeetingsDashboard } from '@/features/meetings/components/meetings-dashboard';
import type { Meeting } from '@/features/meetings/types';

let fetchMock: MockInstance<typeof fetch>;
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).toISOString();

const meeting = (id: string, overrides: Partial<Meeting>): Meeting => ({
  id,
  title: `Meeting ${id}`,
  description: '',
  dueDate: at(18, 10),
  endAt: at(18, 11),
  status: 'CONFIRMED',
  meetingType: 'ONSITE',
  provider: null,
  candidate: { id: `c-${id}`, name: `Candidate ${id}`, position: 'QA Engineer', createdAt: at(1, 9) },
  createdById: 'u1',
  isMine: true,
  version: 1,
  createdAt: at(1, 9),
  updatedAt: at(1, 9),
  ...overrides,
});

let requests: URL[];
function mockRange(items: Meeting[] | Response) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    requests.push(url);
    if (url.pathname === '/api/v1/meetings') return items instanceof Response ? items : jsonResponse(200, { items });
    throw new Error(`Unexpected request ${url.pathname}`);
  });
}

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  requests = [];
  setSearchParams('view=calendar&date=2026-11-18');
});
afterEach(() => vi.clearAllMocks());

describe('Calendar week view', () => {
  it('loads the Monday–Sunday range of the date in the URL, mine by default', async () => {
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText('0 meetings this week')).toBeTruthy();
    const q = requests[0]!.searchParams;
    expect(q.get('view')).toBe('range');
    expect(q.get('from')).toBe(new Date(2026, 10, 16).toISOString());
    expect(q.get('to')).toBe(new Date(2026, 10, 23).toISOString());
    expect(q.get('mine')).toBe('true');
    expect(q.has('page')).toBe(false);
  });

  it('passes the status and everyone filters to the range query', async () => {
    setSearchParams('view=calendar&date=2026-11-18&status=PENDING&mine=false');
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByText('0 meetings this week');
    expect(requests[0]!.searchParams.get('status')).toBe('PENDING');
    expect(requests[0]!.searchParams.has('mine')).toBe(false);
  });

  it('puts each meeting in its day and links it to the candidate summary', async () => {
    mockRange([meeting('a', {}), meeting('b', { dueDate: at(20, 14), endAt: at(20, 15), status: 'PENDING' })]);
    renderWithProviders(<MeetingsDashboard />);
    const wednesday = await screen.findByRole('list', { name: /Wednesday, November 18, 2026/ });
    const event = within(wednesday).getByRole('link', { name: /Candidate a, 10:00 AM – 11:00 AM, Confirmed/ });
    expect(event.getAttribute('href')).toBe('/candidates/c-a?meeting=a');
    const friday = screen.getByRole('list', { name: /Friday, November 20, 2026/ });
    expect(within(friday).getByRole('link', { name: /Candidate b.*Pending/ })).toBeTruthy();
    expect(screen.getByText('2 meetings this week')).toBeTruthy();
  });

  it('shows meetings that started before Monday on the days they still run, but not ones that ended before', async () => {
    mockRange([
      // The API returns overlapping meetings; this one runs from Saturday night into Monday.
      meeting('night', { dueDate: at(14, 23), endAt: at(16, 1) }),
      meeting('sunday', { dueDate: at(15, 10), endAt: at(15, 11) }),
    ]);
    renderWithProviders(<MeetingsDashboard />);
    const monday = await screen.findByRole('list', { name: /Monday, November 16, 2026/ });
    expect(within(monday).getByRole('link', { name: /Candidate night/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Candidate sunday/ })).toBeNull();
    expect(screen.getByText('1 meetings this week')).toBeTruthy();
  });

  it('keeps showing the loaded week with the error when a refresh fails', async () => {
    mockRange([meeting('a', {})]);
    const { client } = renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('link', { name: /Candidate a/ });
    mockRange(jsonResponse(500, { error: { code: 'INTERNAL', message: 'boom', requestId: 'r-refresh' } }));
    await client.refetchQueries({ queryKey: ['meetings'] });
    expect(await screen.findByText(/r-refresh/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Candidate a/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('moves a week back and forward and returns to today through the URL', async () => {
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Next week' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&date=2026-11-23');
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&date=2026-11-09');
  });

  it('shows the request id when the range cannot be loaded', async () => {
    mockRange(jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'Range too long', requestId: 'r-range' } }));
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText(/r-range/)).toBeTruthy();
  });
});

describe('List | Calendar switch', () => {
  it('switches to the calendar keeping the filters but not the list page', async () => {
    setSearchParams('status=CONFIRMED&page=2');
    fetchMock.mockImplementation(async () => jsonResponse(200, { items: [], page: 2, pageSize: 12, total: 0 }));
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Calendar' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&status=CONFIRMED');
  });

  it('returns to the list from the calendar', async () => {
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('radio', { name: 'List' }));
    await waitFor(() => expect(router.replace).toHaveBeenLastCalledWith('/'));
  });
});
