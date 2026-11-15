import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Badge } from './badge';

it('renders status colors from tokens', () => {
  render(<Badge status="CONFIRMED">Confirmed</Badge>);
  expect(screen.getByText('Confirmed').className).toContain('bg-success-subtle');
});
