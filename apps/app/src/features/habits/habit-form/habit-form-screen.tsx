import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useCloseGuard } from '@/lib/close-guard';
import { useNavigate } from 'react-router-dom';
import { tr } from '@/i18n';
import { host } from '@/lib/host';
import { Button, FlexBox, FlexForm, QueryState, showToast } from '@/ui';
import { FormHeader } from '@/components/form-header';
import { usePageAgent } from '@/lib/page-agent';
import { useCategories, useDefaultCategory } from '@/features/categories/categories.queries';
import type { HabitView } from '@/contracts/tasker';
import { useArchiveHabit, useCreateHabit, useDeleteHabit, useHabit, useRestoreHabit, useUpdateHabit } from '../habits.queries';
import { toHabitFormData, toHabitReqData, type HabitFormValues } from './habit-form.lib';
import { habitFormScope } from '../assistant/habit-form.tools';
import { HabitGeneralSection } from './sections/habit-general-section';
import { EvaluationSection } from './sections/evaluation-section';
import { GoalsSection } from './sections/goals-section';
import { HabitFrequencySection, HabitOtherSection, HabitRemindersSection } from './sections/habit-other-section';

const FORM_ID = 'habit-form';

export function HabitFormScreen({ id }: { id?: string }) {
  const habit = useHabit(id);
  return (
    <QueryState isLoading={!!id && habit.isLoading} error={habit.error} onRetry={() => habit.refetch()}>
      {(!id || habit.data) && <HabitForm habit={habit.data} />}
    </QueryState>
  );
}

function HabitForm({ habit }: { habit?: HabitView }) {
  const navigate = useNavigate();
  const defaultCategory = useDefaultCategory();
  const defaults = useMemo(() => toHabitFormData(habit, defaultCategory?.id), [habit, defaultCategory?.id]);
  const form = useForm<HabitFormValues>({ defaultValues: defaults });
  useCloseGuard(form.formState.isDirty);
  useEffect(() => {
    if (!form.getValues('categoryId') && defaultCategory) form.setValue('categoryId', defaultCategory.id);
  }, [defaultCategory, form]);

  const create = useCreateHabit();
  const update = useUpdateHabit();
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const remove = useDeleteHabit();

  async function onValid(v: HabitFormValues) {
    const dto = toHabitReqData(v);
    if (habit) await update.mutateAsync({ ...dto, id: habit.id });
    else await create.mutateAsync(dto);
    showToast('Habit saved');
    navigate(-1);
  }
  async function onDelete() {
    if (!habit || !(await host.confirm(tr('Delete habit?')))) return;
    await remove.mutateAsync(habit.id);
    navigate(-1);
  }

  const categories = useCategories();
  form.watch(); // re-render on every change, so the agent's context follows the form
  usePageAgent(
    habitFormScope({
      form,
      habit,
      categories,
      onValid,
      archive: () => archive.mutateAsync(habit!.id).then(() => navigate(-1)),
      restore: () => restore.mutateAsync(habit!.id).then(() => navigate(-1)),
      remove: async () => {
        await remove.mutateAsync(habit!.id);
        navigate(-1);
      },
      close: () => navigate(-1),
    }),
  );

  return (
    <FormProvider {...form}>
      <FlexForm id={FORM_ID} gap="md" onSubmit={form.handleSubmit(onValid)} noValidate>
        <FormHeader title={habit ? tr('Edit habit') : tr('New habit')} formId={FORM_ID} saving={create.isPending || update.isPending} />
        <HabitGeneralSection />
        <EvaluationSection />
        <HabitFrequencySection />
        <GoalsSection />
        <HabitRemindersSection />
        <HabitOtherSection />
        {habit && (
          <FlexBox gap="xs">
            {habit.status === 'active' ? (
              <Button variant="secondary" icon="archive" loading={archive.isPending} onClick={() => archive.mutateAsync(habit.id).then(() => navigate(-1))}>
                {tr('Archive')}
              </Button>
            ) : (
              <Button variant="secondary" icon="restore" loading={restore.isPending} onClick={() => restore.mutateAsync(habit.id).then(() => navigate(-1))}>
                {tr('Restore')}
              </Button>
            )}
            <Button variant="danger" icon="delete" onClick={onDelete} loading={remove.isPending}>
              {tr('Delete')}
            </Button>
          </FlexBox>
        )}
      </FlexForm>
    </FormProvider>
  );
}
