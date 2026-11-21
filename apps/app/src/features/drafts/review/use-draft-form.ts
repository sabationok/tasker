import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCloseGuard } from '@/lib/close-guard';
import type { DraftFieldError, DraftView } from '@/contracts/tasker';
import { formFields, toDto, toFormValues, type DraftFormField, type DraftFormValues } from '../draft-form.lib';

/**
 * The «Змінити» form over one draft's DTO. One react-hook-form instance, so the button and the agent's `page_form_fill`
 * set values the same way (dirty state included). `build()` turns the values into the edited DTO, or local field errors.
 */
export function useDraftForm(draft: DraftView | null) {
  const fields = useMemo<DraftFormField[]>(() => (draft ? formFields(draft.tool, draft.dto) : []), [draft]);
  const form = useForm<DraftFormValues>({ values: draft ? toFormValues(fields, draft.dto) : {}, resetOptions: { keepDirtyValues: true } });
  useCloseGuard(!!draft && form.formState.isDirty);
  const build = (): { dto: Record<string, unknown>; errors: DraftFieldError[] } => (draft ? toDto(fields, form.getValues(), draft.dto) : { dto: {}, errors: [] });
  return { draft, fields, form, build };
}
export type DraftForm = ReturnType<typeof useDraftForm>;
