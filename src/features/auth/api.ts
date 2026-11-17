import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  role: 'USER';
}

export interface Challenge {
  challengeId: string;
  expiresAt: string;
}

const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body });

export const authApi = {
  register: (body: { email: string; password: string; role: 'RECRUITER' | 'INTERVIEWER' }) => post<Challenge>('/auth/register', body),
  login: (body: { email: string; password: string }) => post<Challenge>('/auth/login', body),
  verifyOtp: (body: { challengeId: string; code: string }) => post<{ user: User }>('/auth/otp/verify', body),
  resendOtp: (body: { challengeId: string }) => post<Challenge>('/auth/otp/resend', body),
  forgotPassword: (body: { email: string }) => post<Challenge>('/auth/password/forgot', body),
  resetPassword: (body: { challengeId: string; code: string; newPassword: string }) =>
    post<void>('/auth/password/reset', body),
};
