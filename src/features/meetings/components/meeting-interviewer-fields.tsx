'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ActionStatus } from '@/components/ui/action-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { interviewersApi } from '../api';
import type { MeetingFormValues } from '../form';
import type { AssignedInterviewer, Meeting } from '../types';
import { Group, useMeetingFieldError } from './meeting-form-fields';

export function MeetingInterviewerFields({ meeting }: { meeting?: Meeting }) {
  const { t } = useI18n();
  const { canSchedule } = usePermissions();
  const { watch, setValue } = useFormContext<MeetingFormValues>();
  const error = useMeetingFieldError()('interviewerIds');
  const selected = watch('interviewerIds');
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [queryText, setQueryText] = useState('');
  const [people, setPeople] = useState<AssignedInterviewer[]>(meeting?.interviewers ?? []);
  useEffect(() => {
    const timer = setTimeout(() => setQueryText(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ['interviewers', queryText],
    queryFn: ({ signal }) => interviewersApi.search(queryText, signal),
    enabled: canSchedule && open,
  });
  function toggle(person: AssignedInterviewer) {
    setPeople((current) => (current.some((p) => p.id === person.id) ? current : [...current, person]));
    setValue(
      'interviewerIds',
      selected.includes(person.id) ? selected.filter((value) => value !== person.id) : [...selected, person.id],
      { shouldDirty: true, shouldValidate: true },
    );
  }
  return (
    <Group title={t('assignment.title')}>
      <p className="text-sm text-muted-foreground">{t('assignment.hint')}</p>
      {selected.length ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((value) => {
            const person = people.find((p) => p.id === value) ?? query.data?.find((p) => p.id === value);
            if (!person) return null;
            return (
                <li key={value} className="flex max-w-full items-center gap-2 rounded-md bg-secondary px-3 py-1 text-sm">
                  <span className="min-w-0 break-all">{person.email}</span>
                {canSchedule ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggle(person)}
                    aria-label={t('assignment.remove').replace('{email}', person.email)}
                  >
                    ×
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('assignment.none')}</p>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
      {canSchedule ? (
        <Button
          variant="outline"
          className="self-start"
          aria-expanded={open}
          aria-controls={`${id}-picker`}
          onClick={() => setOpen((value) => !value)}
        >
          {t('assignment.choose')}
        </Button>
      ) : null}
      {canSchedule && open ? (
        <div id={`${id}-picker`} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <Label htmlFor={`${id}-search`}>{t('assignment.search')}</Label>
          <Input id={`${id}-search`} value={search} onChange={(event) => setSearch(event.target.value)} />
          {query.isFetching ? <ActionStatus /> : null}
          {query.isError ? (
            <Alert tone="error">
              <p>{t('assignment.error')}</p>
              {isApiError(query.error) && query.error.requestId ? (
                <p className="text-xs">
                  {t('error.requestId')}: {query.error.requestId}
                </p>
              ) : null}
              <Button variant="outline" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
                {t('error.retry')}
              </Button>
            </Alert>
          ) : query.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('assignment.empty')}</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {query.data?.map((person) => (
                <li key={person.id}>
                      <label className="flex min-w-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selected.includes(person.id)}
                      disabled={!selected.includes(person.id) && selected.length >= 50}
                      onChange={() => toggle(person)}
                    />
                        <span className="min-w-0 break-all">{person.email}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Group>
  );
}
