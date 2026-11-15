import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce } from './csp';
import { isPublicPath, loginRedirect } from './routes';

describe('csp', () => {
  it('uses the nonce for scripts and styles in production', () => {
    const csp = buildCsp('abc', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
  });

  it('only relaxes eval and inline styles in development', () => {
    const csp = buildCsp('abc', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('creates a different nonce each time', () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});

describe('routes', () => {
  it('treats auth pages as public', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/loginx')).toBe(false);
  });

  it('keeps the original path in ?next', () => {
    expect(loginRedirect('/')).toBe('/login');
    expect(loginRedirect('/candidates/1', '?tab=history')).toBe('/login?next=%2Fcandidates%2F1%3Ftab%3Dhistory');
  });
});
