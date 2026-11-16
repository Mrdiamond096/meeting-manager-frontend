'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { candidateKeys, candidatesApi } from '../api';
import type { CandidateSummary } from '../types';

interface CandidateComboboxProps {
  value: CandidateSummary | null;
  error?: string;
  onSelect: (candidate: CandidateSummary) => void;
  onClear: () => void;
  /** Explicit "create new" (ADR-006): candidates are never linked by name automatically. */
  onCreateNew: (name: string) => void;
}

const SEARCH_DELAY_MS = 250;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CandidateCombobox({ value, error, onSelect, onClear, onCreateNew }: CandidateComboboxProps) {
  const { t, intl } = useI18n();
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const term = useDebounced(text.trim(), SEARCH_DELAY_MS);
  const search = useQuery({
    queryKey: candidateKeys.search(term),
    queryFn: ({ signal }) => candidatesApi.search(term, signal),
    enabled: open && term.length > 0,
  });
  const results = term === text.trim() ? (search.data ?? []) : [];
  // The last option is always "create new"; it carries the typed name so the form can prefill it.
  const optionCount = results.length + 1;
  const createIndex = results.length;

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t('meetingForm.candidate.label')}</span>
        <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">{value.position}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label={t('meetingForm.candidate.clear')} onClick={onClear}>
            <X aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  function choose(index: number) {
    setOpen(false);
    if (index === createIndex) onCreateNew(text.trim());
    else if (results[index]) onSelect(results[index]);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor={id}>{t('meetingForm.candidate.label')}</Label>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        placeholder={t('meetingForm.candidate.placeholder')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % optionCount);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + optionCount) % optionCount);
          } else if (e.key === 'Enter' && open && text.trim()) {
            e.preventDefault();
            choose(active);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      <FieldError id={errorId}>{error}</FieldError>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('meetingForm.candidate.label')}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {!term ? (
            <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
              {t('meetingForm.candidate.hint')}
            </li>
          ) : search.isFetching && results.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
              {t('meetingForm.candidate.searching')}
            </li>
          ) : results.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
              {t('meetingForm.candidate.none')}
            </li>
          ) : null}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={active === i}
              // mousedown (not click) so the input keeps focus and onBlur does not close the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('cursor-pointer rounded-sm px-3 py-2 text-sm', active === i && 'bg-accent text-accent-foreground')}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">
                {' '}
                · {c.position} · {t('meetingForm.candidate.added').replace('{date}', new Date(c.createdAt).toLocaleDateString(intl, { dateStyle: 'medium' }))}
              </span>
            </li>
          ))}
          <li
            id={`${id}-opt-${createIndex}`}
            role="option"
            aria-selected={active === createIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(createIndex);
            }}
            onMouseEnter={() => setActive(createIndex)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-primary',
              active === createIndex && 'bg-accent',
            )}
          >
            <Plus aria-hidden className="size-4" />
            {text.trim()
              ? t('meetingForm.candidate.createNamed').replace('{name}', () => text.trim())
              : t('meetingForm.candidate.create')}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
