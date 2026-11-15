import { cookies } from 'next/headers';
import { dictionaries, LOCALE_COOKIE, toLocale, type MessageKey } from './dictionaries';

export async function getLocale() {
  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getT() {
  const dict = dictionaries[await getLocale()];
  return (key: MessageKey) => dict[key];
}
