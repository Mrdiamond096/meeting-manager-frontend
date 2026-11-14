import { expect, test } from 'vitest';
import { metadata } from './layout';

test('app title matches wireframe', () => {
  expect(metadata.title).toBe('Candidate Meeting Scheduler');
});
