import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    expect(within(wednesday).getByRole('button', { name: /Candidate a, 10:00 AM – 11:00 AM, Confirmed/ })).toBeTruthy();
    const friday = screen.getByRole('list', { name: /Friday, November 20, 2026/ });
    expect(within(friday).getByRole('button', { name: /Candidate b.*Pending/ })).toBeTruthy();
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
    expect(within(monday).getByRole('button', { name: /Candidate night/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Candidate sunday/ })).toBeNull();
    expect(screen.getByText('1 meetings this week')).toBeTruthy();
  });

  it('keeps showing the loaded week with the error when a refresh fails', async () => {
    mockRange([meeting('a', {})]);
    const { client } = renderWithProviders(<MeetingsDashboard />);
    await screen.findByRole('button', { name: /Candidate a/ });
    mockRange(jsonResponse(500, { error: { code: 'INTERNAL', message: 'boom', requestId: 'r-refresh' } }));
    await client.refetchQueries({ queryKey: ['meetings'] });
    expect(await screen.findByText(/r-refresh/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Candidate a/ })).toBeTruthy();
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

describe('Calendar month view', () => {
  beforeEach(() => setSearchParams('view=calendar&mode=month&date=2026-11-18'));

  it('loads the 42 days of the 6×7 grid and counts only the meetings of the month', async () => {
    mockRange([meeting('nov', { dueDate: at(18, 10), endAt: at(18, 11) }), meeting('oct', { dueDate: new Date(2026, 9, 27, 9).toISOString(), endAt: new Date(2026, 9, 27, 10).toISOString() })]);
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText('1 meetings in November')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeTruthy();
    expect(requests[0]!.searchParams.get('from')).toBe(new Date(2026, 9, 26).toISOString());
    expect(requests.at(-1)!.searchParams.get('to')).toBe(new Date(2026, 11, 7).toISOString());
    // The October meeting still shows in its grid cell.
    expect(within(screen.getByRole('list', { name: /Tuesday, October 27, 2026/ })).getByRole('button', { name: /Candidate oct/ })).toBeTruthy();
  });

  it('loads the month in chunks within the API limit and keeps a meeting crossing chunks once', async () => {
    const crossing = meeting('crossing', { dueDate: at(15, 23), endAt: at(16, 1) }); // Sun 15 → Mon 16 Nov, the chunk edge
    mockRange([crossing]);
    renderWithProviders(<MeetingsDashboard />);
    expect(await screen.findByText('1 meetings in November')).toBeTruthy();
    const ranges = requests.map((u) => [new Date(u.searchParams.get('from')!), new Date(u.searchParams.get('to')!)] as const);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]![0]).toEqual(new Date(2026, 9, 26));
    expect(ranges[0]![1]).toEqual(ranges[1]![0]);
    expect(ranges[1]![1]).toEqual(new Date(2026, 11, 7));
    for (const [f, t] of ranges) expect(t.getTime() - f.getTime()).toBeLessThanOrEqual(42 * 24 * 3_600_000);
    expect(screen.getAllByRole('button', { name: /Candidate crossing/ })).toHaveLength(2); // Sunday and Monday cells
  });

  it('shows three meetings a day and opens the week for the rest', async () => {
    mockRange([9, 10, 11, 12, 13].map((h) => meeting(`m${h}`, { dueDate: at(18, h), endAt: at(18, h, 30) })));
    renderWithProviders(<MeetingsDashboard />);
    const wednesday = await screen.findByRole('list', { name: /Wednesday, November 18, 2026/ });
    expect(within(wednesday).getAllByRole('button').map((a) => a.textContent)).toEqual(['9:00 AM Candidate m9', '10:00 AM Candidate m10', '11:00 AM Candidate m11']);
    await userEvent.click(screen.getByRole('button', { name: '+2 more' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&date=2026-11-18');
  });

  it('shows a meeting still running from the night before without a start time', async () => {
    mockRange([meeting('night', { dueDate: at(17, 23), endAt: at(18, 1) })]);
    renderWithProviders(<MeetingsDashboard />);
    const wednesday = await screen.findByRole('list', { name: /Wednesday, November 18, 2026/ });
    expect(within(wednesday).getByRole('button', { name: /Candidate night, continues from the day before/ }).textContent).toBe('Candidate night');
  });

  it('moves by month and switches back to the week in the URL', async () => {
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Next month' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&mode=month&date=2026-12-01');
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(router.replace).toHaveBeenLastCalledWith('/?view=calendar&date=2026-11-18');
  });
});

describe('Event popover', () => {
  it('opens details from an event with links to the summary and the edit form, and closes on Escape', async () => {
    mockRange([meeting('a', { title: 'Technical interview', meetingType: 'ONLINE', provider: 'ZOOM' })]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: /Candidate a, 10:00 AM/ }));
    const popover = await screen.findByRole('dialog', { name: 'Candidate a' });
    expect(within(popover).getByText('Technical interview')).toBeTruthy();
    expect(within(popover).getByText('Online · Zoom')).toBeTruthy();
    expect(within(popover).getByRole('link', { name: 'View details' }).getAttribute('href')).toBe('/candidates/c-a?meeting=a');
    expect(within(popover).getByRole('link', { name: 'Edit meeting' }).getAttribute('href')).toBe('/meetings/a/edit');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('works the same from the month view', async () => {
    setSearchParams('view=calendar&mode=month&date=2026-11-18');
    mockRange([meeting('a', {})]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: /Candidate a, 10:00 AM/ }));
    expect(within(await screen.findByRole('dialog')).getByRole('link', { name: 'View details' })).toBeTruthy();
  });
});

describe('Creating from an empty slot', () => {
  it('opens the new-meeting form at the clicked half hour of the week', async () => {
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    const wednesday = await screen.findByRole('list', { name: /Wednesday, November 18, 2026/ });
    fireEvent.click(wednesday, { clientY: 10.75 * 48 }); // 10:45 rounds down to the 10:30 slot
    expect(router.push).toHaveBeenCalledWith('/meetings/new?date=2026-11-18&start=10:30&returnTo=%2F%3Fview%3Dcalendar%26date%3D2026-11-18');
  });

  it('does not create when an event is clicked', async () => {
    mockRange([meeting('a', {})]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: /Candidate a, 10:00 AM/ }));
    await screen.findByRole('dialog');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not create when the click only closes an open event popover', async () => {
    mockRange([meeting('a', {})]);
    renderWithProviders(<MeetingsDashboard />);
    await userEvent.click(await screen.findByRole('button', { name: /Candidate a, 10:00 AM/ }));
    await screen.findByRole('dialog');
    const friday = screen.getByRole('list', { name: /Friday, November 20, 2026/, hidden: true });
    fireEvent.pointerDown(friday);
    fireEvent.click(friday, { clientY: 100 });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens the form for a day of the month at 09:00', async () => {
    setSearchParams('view=calendar&mode=month&date=2026-11-18');
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    fireEvent.click(await screen.findByRole('list', { name: /Thursday, November 26, 2026/ }));
    expect(router.push).toHaveBeenCalledWith('/meetings/new?date=2026-11-26&start=09:00&returnTo=%2F%3Fview%3Dcalendar%26mode%3Dmonth%26date%3D2026-11-18');
  });

  it('keeps month/date/status/scope when opening creation from the calendar header', async () => {
    setSearchParams('view=calendar&mode=month&date=2026-11-18&status=PENDING&mine=false');
    mockRange([]);
    renderWithProviders(<MeetingsDashboard />);
    await screen.findByText('0 meetings in November');
    const href = screen.getByRole('link', { name: 'Schedule meeting' }).getAttribute('href')!;
    const url = new URL(href, 'http://localhost');
    expect(url.pathname).toBe('/meetings/new');
    expect(url.searchParams.get('returnTo')).toBe('/?view=calendar&mode=month&date=2026-11-18&status=PENDING&mine=false');
  });
});

describe('Phone agenda', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the week day by day with a create link for each day', async () => {
    mockRange([meeting('a', {})]);
    renderWithProviders(<MeetingsDashboard />);
    const wednesday = await screen.findByRole('region', { name: /Wednesday, November 18, 2026/ });
    expect(within(wednesday).getByRole('button', { name: /Candidate a, 10:00 AM – 11:00 AM, Confirmed/ })).toBeTruthy();
    expect(within(wednesday).getByRole('link', { name: 'New meeting on Wednesday, November 18, 2026' }).getAttribute('href')).toBe(
      '/meetings/new?date=2026-11-18&start=09:00&returnTo=%2F%3Fview%3Dcalendar%26date%3D2026-11-18',
    );
    expect(within(screen.getByRole('region', { name: /Thursday, November 19, 2026/ })).getByText('No meetings')).toBeTruthy();
    expect(screen.queryByRole('list', { name: /Wednesday/ })).toBeNull();
  });
});
