import { describe, expect, it } from 'vitest';
import { emptyFormValues, mapApiErrors, meetingFormSchema, toCreateBody } from './form';

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
