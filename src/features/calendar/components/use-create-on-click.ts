'use client';

import { useRouter } from 'next/navigation';
import { useRef, type MouseEvent } from 'react';
import { newMeetingAt } from '@/lib/routes';
import { toDateParam } from '../dates';

/**
 * Mouse shortcut: a click on empty calendar space opens the new-meeting form at that day and time.
 * Keyboard users have the "New meeting" button. A click that only closes an open event popover does nothing.
 */
export function useCreateOnClick() {
  const router = useRouter();
  const closingPopover = useRef(false);
  return (day: Date, time: string | ((e: MouseEvent<HTMLElement>) => string)) => ({
    onPointerDown: () => {
      closingPopover.current = document.querySelector('[data-radix-popper-content-wrapper]') !== null;
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget || closingPopover.current) return;
      router.push(newMeetingAt(toDateParam(day), typeof time === 'string' ? time : time(e)));
    },
  });
}
