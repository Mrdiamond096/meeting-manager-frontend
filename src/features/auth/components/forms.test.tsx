import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { currentUserKey } from '@/components/shell/use-current-user';
import { jsonResponse, renderWithProviders, router, setSearchParams } from '@/test/render';
import { ForgotForm } from './forgot-form';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { VerifyForm } from './verify-form';

const CHALLENGE = '11111111-1111-4111-8111-111111111111';
let fetchMock: MockInstance<typeof fetch>;

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  sessionStorage.clear();
  setSearchParams('');
});
afterEach(() => vi.clearAllMocks());

describe('LoginForm', () => {
  it('validates before calling the API', async () => {
    renderWithProviders(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter your email')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('goes to OTP verification with the challenge and keeps ?next', async () => {
    setSearchParams('next=%2Fcandidates%2F9');
    fetchMock.mockResolvedValue(jsonResponse(200, { challengeId: CHALLENGE, expiresAt: '2026-11-15T10:00:00Z' }));
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), ' Alice@Company.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/verify?c=${CHALLENGE}&next=%2Fcandidates%2F9`));
    expect(sessionStorage.getItem('auth.challengeEmail')).toContain('alice@company.com');
  });

  it('shows one message for wrong credentials', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x', requestId: 'r' } }),
    );
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Incorrect email or password');
  });
});

describe('VerifyForm', () => {
  const typeCode = (code: string) =>
    fireEvent.paste(screen.getByLabelText('Verification code digit 1'), { clipboardData: { getData: () => code } });

  it('shows remaining attempts on a wrong code', async () => {
    setSearchParams(`c=${CHALLENGE}`);
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'OTP_INVALID',
          message: 'x',
          requestId: 'r',
          details: [{ path: 'attemptsRemaining', message: '3' }],
        },
      }),
    );
    renderWithProviders(<VerifyForm />);
    typeCode('000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect((await screen.findByRole('alert')).textContent).toContain('3 attempts left');
  });

  it('stores the user and redirects to next on success', async () => {
    setSearchParams(`c=${CHALLENGE}&next=%2Fmeetings%2Fnew`);
    const user = { id: 'u1', email: 'a@b.co', role: 'USER' };
    fetchMock.mockResolvedValue(jsonResponse(200, { user }));
    const { client } = renderWithProviders(<VerifyForm />);
    typeCode('112233');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/meetings/new'));
    expect(client.getQueryData(currentUserKey)).toEqual(user);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ challengeId: CHALLENGE, code: '112233' });
  });

  it('asks for all six digits before calling the API', async () => {
    setSearchParams(`c=${CHALLENGE}`);
    renderWithProviders(<VerifyForm />);
    typeCode('123');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter all 6 digits');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ForgotForm', () => {
  it('shows the same neutral message and links to reset with the challenge', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { challengeId: CHALLENGE, expiresAt: '2026-11-15T10:00:00Z' }));
    renderWithProviders(<ForgotForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'nobody@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('If an account exists for this email, we sent a code.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe(`/reset-password?c=${CHALLENGE}`);
  });
});

describe('pending actions', () => {
  it('shows login progress, prevents duplicate requests, and restores the action on error', async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1');
    const button = screen.getByRole('button', { name: 'Log in' }) as HTMLButtonElement;
    await userEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(button.querySelector('svg')).toBeTruthy();
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => resolve(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } })));
    await screen.findByRole('alert');
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it.each(['Verify', 'Resend code'])(
    'blocks both OTP actions while %s is pending and restores them on error',
    async (action) => {
      setSearchParams(`c=${CHALLENGE}`);
      let resolve!: (value: Response) => void;
      fetchMock.mockImplementation(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      );
      renderWithProviders(<VerifyForm />);
      fireEvent.paste(screen.getByLabelText('Verification code digit 1'), {
        clipboardData: { getData: () => '112233' },
      });
      const verify = screen.getByRole('button', { name: 'Verify' }) as HTMLButtonElement;
      const resend = screen.getByRole('button', { name: 'Resend code' }) as HTMLButtonElement;
      const selected = action === 'Verify' ? verify : resend;
      await userEvent.click(selected);
      await waitFor(() => expect(selected.getAttribute('aria-busy')).toBe('true'));
      expect(verify.disabled).toBe(true);
      expect(resend.disabled).toBe(true);
      await userEvent.click(verify);
      await userEvent.click(resend);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await act(async () => resolve(jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } })));
      await screen.findByRole('alert');
      await waitFor(() => expect(verify.disabled).toBe(false));
      expect(resend.disabled).toBe(false);
    },
  );
});

describe('RegisterForm', () => {
  it('sends the chosen role, recruiter by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { challengeId: CHALLENGE, expiresAt: '2030-01-01T00:00:00.000Z' }));
    renderWithProviders(<RegisterForm />, { user: null });
    expect((screen.getByRole('radio', { name: /Recruiter/ }) as HTMLInputElement).checked).toBe(true);
    await userEvent.type(screen.getByLabelText('Email'), 'i@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password1');
    await userEvent.click(screen.getByRole('radio', { name: /Interviewer/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'i@b.co',
      password: 'password1',
      role: 'INTERVIEWER',
    });
  });
});
