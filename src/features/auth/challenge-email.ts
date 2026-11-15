/**
 * Remembers which email a challenge was sent to, only to show it on the OTP screen.
 * Kept in sessionStorage (not the URL) so the address never lands in history or logs.
 */
const KEY = 'auth.challengeEmail';

export function rememberChallengeEmail(challengeId: string, email: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ challengeId, email }));
  } catch {
    // Storage blocked: the screen falls back to a generic sentence.
  }
}

export function challengeEmail(challengeId: string | null): string | null {
  if (!challengeId) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { challengeId: string; email: string } | null;
    return saved?.challengeId === challengeId ? saved.email : null;
  } catch {
    return null;
  }
}

export function moveChallengeEmail(fromId: string, toId: string) {
  const email = challengeEmail(fromId);
  if (email) rememberChallengeEmail(toId, email);
}
