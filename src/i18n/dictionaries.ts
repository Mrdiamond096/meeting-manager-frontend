export const LOCALES = ['en', 'th'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'lang';

const en = {
  'app.title': 'Candidate Meeting Scheduler',
  'shell.language': 'Language',
  'shell.userMenu': 'Account menu',
  'shell.logout': 'Log out',
  'shell.skipToContent': 'Skip to content',
  'error.title': 'Something went wrong',
  'error.retry': 'Retry',
  'error.requestId': 'Request ID',
  'notFound.title': 'Page not found',
  'notFound.body': 'The page you are looking for does not exist or was removed.',
  'notFound.back': 'Back to meetings',
  'dialog.close': 'Close',
  'toast.dismiss': 'Dismiss',
} as const;

export type MessageKey = keyof typeof en;

const th: Record<MessageKey, string> = {
  'app.title': 'ระบบนัดสัมภาษณ์ผู้สมัคร',
  'shell.language': 'ภาษา',
  'shell.userMenu': 'เมนูบัญชี',
  'shell.logout': 'ออกจากระบบ',
  'shell.skipToContent': 'ข้ามไปยังเนื้อหา',
  'error.title': 'เกิดข้อผิดพลาด',
  'error.retry': 'ลองอีกครั้ง',
  'error.requestId': 'รหัสคำขอ',
  'notFound.title': 'ไม่พบหน้านี้',
  'notFound.body': 'หน้าที่คุณค้นหาไม่มีอยู่หรือถูกลบไปแล้ว',
  'notFound.back': 'กลับไปหน้านัดหมาย',
  'dialog.close': 'ปิด',
  'toast.dismiss': 'ปิด',
};

export const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, th };

export const toLocale = (value: string | undefined): Locale =>
  (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE;

/** Intl locale: Thai uses the Buddhist calendar and 24h time (Figma TH frames). */
export const intlLocale = (locale: Locale) => (locale === 'th' ? 'th-TH-u-ca-buddhist' : 'en-US');
