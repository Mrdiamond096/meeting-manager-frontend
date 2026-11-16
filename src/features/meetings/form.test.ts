import { describe, expect, it } from 'vitest';
import { fromLocalParts } from './datetime';
import { mapApiErrors, meetingFormSchema, meetingToFormValues, toCreateBody, toUpdateBody, emptyFormValues } from './form';
import type { Meeting } from './types';

const meeting: Meeting = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Interview: Alice',
  description: '',
  dueDate: fromLocalParts('2030-05-10', '10:00'),
  endAt: fromLocalParts('2030-05-10', '11:00'),
  status: 'PENDING',
  meetingType: 'ONLINE',
  provider: 'ZOOM',
  candidate: { id: 'c1', name: 'Alice', position: 'QA Engineer', createdAt: '2030-01-01T00:00:00.000Z' },
  createdById: 'u1',
  isMine: true,
  version: 3,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};

describe('meetingFormSchema', () => {
  const valid = { ...emptyFormValues(new Date()), title: 'T' };
  const messages = (v: object) => {
    const r = meetingFormSchema.safeParse(v);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it('accepts a minimal meeting', () => expect(messages(valid)).toEqual([]));
  it('requires a title and a start time', () => {
    expect(messages({ ...valid, title: '  ', startTime: '' })).toEqual(
      expect.arrayContaining(['meetings.validation.titleRequired', 'meetings.validation.startRequired']),
    );
  });
  it('requires end after start', () => {
    expect(messages({ ...valid, startTime: '10:00', endTime: '10:00' })).toContain('meetings.validation.endAfterStart');
    expect(messages({ ...valid, startTime: '10:00', endTime: '' })).toEqual([]);
  });
  it('requires name and position for a new candidate, and a pick for an existing one', () => {
    expect(messages({ ...valid, candidateMode: 'new', newName: ' ', newPosition: '' })).toEqual(
      expect.arrayContaining(['meetings.validation.nameRequired', 'meetings.validation.positionRequired']),
    );
    expect(messages({ ...valid, candidateMode: 'existing', candidate: null })).toContain('meetings.validation.candidateRequired');
  });
});

describe('toCreateBody', () => {
  it('sends an existing candidate by id and omits empty optionals', () => {
    const candidate = { id: 'c1', name: 'Alice', position: 'QA Engineer', createdAt: '2030-01-01T00:00:00.000Z' };
    const body = toCreateBody({
      ...emptyFormValues(new Date()),
      title: 'Interview: Alice',
      candidateMode: 'existing',
      candidate,
      meetingType: 'ONSITE',
      provider: 'ZOOM',
      endTime: '',
    });
    expect(body).toMatchObject({ title: 'Interview: Alice', candidateId: 'c1', meetingType: 'ONSITE', status: 'PENDING' });
    expect(body).not.toHaveProperty('provider');
    expect(body).not.toHaveProperty('endAt');
    expect(body).not.toHaveProperty('candidate');
  });

  it('sends a new candidate inline', () => {
    const body = toCreateBody({ ...emptyFormValues(new Date()), title: 'T', candidateMode: 'new', newName: ' Bo ', newPosition: 'QA Engineer' });
    expect(body.candidate).toEqual({ name: 'Bo', position: 'QA Engineer' });
    expect(body).not.toHaveProperty('candidateId');
  });
});

describe('toUpdateBody', () => {
  const initial = meetingToFormValues(meeting);

  it('returns null when nothing changed', () => {
    expect(toUpdateBody(meeting, initial, initial)).toBeNull();
  });

  it('sends only changed fields plus the version', () => {
    const body = toUpdateBody(meeting, initial, { ...initial, title: 'New title', status: 'CONFIRMED' });
    expect(body).toEqual({ version: 3, title: 'New title', status: 'CONFIRMED' });
  });

  it('re-sends both instants when the date moves', () => {
    const body = toUpdateBody(meeting, initial, { ...initial, date: '2030-05-11' });
    expect(body?.dueDate).toBe(fromLocalParts('2030-05-11', '10:00'));
    expect(body?.endAt).toBe(fromLocalParts('2030-05-11', '11:00'));
  });

  it('moves a cross-midnight end together with the start when only the date changes', () => {
    const overnight = { ...meeting, endAt: fromLocalParts('2030-05-11', '01:00') };
    const start = meetingToFormValues(overnight);
    const body = toUpdateBody(overnight, start, { ...start, date: '2030-05-20' });
    expect(body?.dueDate).toBe(fromLocalParts('2030-05-20', '10:00'));
    expect(body?.endAt).toBe(fromLocalParts('2030-05-21', '01:00'));
  });

  it('clears the end with null and the provider when switching to onsite', () => {
    const body = toUpdateBody(meeting, initial, { ...initial, endTime: '', meetingType: 'ONSITE' });
    expect(body).toMatchObject({ endAt: null, meetingType: 'ONSITE', provider: null });
  });

  it('keeps a cross-midnight end untouched when only the title changes', () => {
    const overnight = { ...meeting, endAt: fromLocalParts('2030-05-11', '01:00') };
    const start = meetingToFormValues(overnight);
    const body = toUpdateBody(overnight, start, { ...start, title: 'Renamed' });
    expect(body).toEqual({ version: 3, title: 'Renamed' });
  });

  it('changes and removes the candidate', () => {
    expect(toUpdateBody(meeting, initial, { ...initial, candidateMode: 'none', candidate: null })).toEqual({ version: 3, candidateId: null });
    const other = { id: 'c2', name: 'Bo', position: 'QA Engineer', createdAt: '2030-01-01T00:00:00.000Z' };
    expect(toUpdateBody(meeting, initial, { ...initial, candidate: other })).toEqual({ version: 3, candidateId: 'c2' });
  });

  it('sends a new candidate inline and never together with candidateId', () => {
    const body = toUpdateBody(meeting, initial, { ...initial, candidateMode: 'new', newName: ' Z ', newPosition: 'QA Engineer' });
    expect(body).toEqual({ version: 3, candidate: { name: 'Z', position: 'QA Engineer' } });
    expect(body).not.toHaveProperty('candidateId');
  });

  it('never sends CANCELLED as a status', () => {
    const cancelled = { ...meeting, status: 'CANCELLED' as const };
    const start = meetingToFormValues(cancelled);
    expect(toUpdateBody(cancelled, start, { ...start, title: 'Renamed' })).toEqual({ version: 3, title: 'Renamed' });
  });
});

describe('mapApiErrors', () => {
  it('maps API paths to form fields and keeps unknown ones', () => {
    const { fields, unmapped } = mapApiErrors([
      { path: 'body.dueDate', message: 'Invalid datetime' },
      { path: 'body.candidate.name', message: 'Too long' },
      { path: 'body', message: 'Nothing to update' },
    ]);
    expect(fields).toEqual({ date: 'Invalid datetime', newName: 'Too long' });
    expect(unmapped).toEqual(['Nothing to update']);
  });
});
