import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useCloseGuard } from '@/lib/close-guard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tr } from '@/i18n';
import { host } from '@/lib/host';
import { Button, FlexForm, QueryState, showToast } from '@/ui';
import { FormHeader } from '@/components/form-header';
import { usePageAgent } from '@/lib/page-agent';
import { useCategories, useDefaultCategory } from '@/features/categories/categories.queries';
import type { ItemView } from '@/contracts/tasker';
import { useCreateItem, useDeleteItem, useItem, useSplitItem, useUpdateItem } from '../items.queries';
import { taskFormScope } from '../assistant/task-form.tools';
import { useAgents } from '@/features/agents/agents.queries';
import { toTaskFormData, toTaskReqData, type TaskFormValues } from './task-form.lib';
import { GeneralSection } from './sections/general-section';
import { RemindersSection } from './sections/reminders-section';
import { ChecklistSection } from './sections/checklist-section';
import { PeriodicSection } from './sections/periodic-section';
import { OtherSection } from './sections/other-section';
import { ThreadsSection } from './sections/threads-section';

const FORM_ID = 'task-form';

/** Create / edit a single or periodic task. `id` = edit; `?periodic=1&date=` seed a new one. */
export function TaskFormScreen({ id }: { id?: string }) {
  const item = useItem(id);
  return (
    <QueryState isLoading={!!id && item.isLoading} error={item.error} onRetry={() => item.refetch()}>
      {(!id || item.data) && <TaskForm item={item.data} />}
    </QueryState>
  );
}

function TaskForm({ item }: { item?: ItemView }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const defaultCategory = useDefaultCategory();
  const defaults = useMemo(
    () => toTaskFormData(item, { periodic: sp.get('periodic') === '1', date: sp.get('date') ?? undefined, categoryId: defaultCategory?.id }),
    [item, sp, defaultCategory?.id],
  );
  const form = useForm<TaskFormValues>({ defaultValues: defaults });
  useCloseGuard(form.formState.isDirty);
  useEffect(() => {
    if (!form.getValues('categoryId') && defaultCategory) form.setValue('categoryId', defaultCategory.id);
  }, [defaultCategory, form]);

  const create = useCreateItem();
  const update = useUpdateItem();
  const remove = useDeleteItem();
  const periodic = form.watch('periodic');

  async function onValid(v: TaskFormValues) {
    const dto = toTaskReqData(v);
    if (item) await update.mutateAsync({ ...dto, id: item.id });
    else await create.mutateAsync(dto);
    showToast('Task saved');
    navigate(-1);
  }
  async function onDelete() {
    if (!item || !(await host.confirm(tr('Delete task?')))) return;
    await remove.mutateAsync(item.id);
    navigate(-1);
  }

  const categories = useCategories();
  const agents = useAgents();
  const split = useSplitItem();
  form.watch(); // re-render on every change, so the agent's context follows the form
  usePageAgent(
    taskFormScope({
      form,
      item,
      categories,
      agents,
      onValid,
      split: split.mutateAsync,
      remove: async () => {
        await remove.mutateAsync(item!.id);
        navigate(-1);
      },
      close: () => navigate(-1),
    }),
  );

  const title = item ? tr('Edit task') : periodic ? tr('New periodic task') : tr('Create task');
  return (
    <FormProvider {...form}>
      <FlexForm id={FORM_ID} gap="md" onSubmit={form.handleSubmit(onValid)} noValidate>
        <FormHeader title={title} formId={FORM_ID} saving={create.isPending || update.isPending} />
        <GeneralSection connector={item ? { connector: item.connector, connectorTools: item.connectorTools } : undefined} />
        {periodic && <PeriodicSection />}
        <RemindersSection />
        <ChecklistSection />
        <OtherSection />
        {item && !periodic && !item.parentId && <ThreadsSection item={item} />}
        {item && (
          <Button variant="danger" icon="delete" onClick={onDelete} loading={remove.isPending}>
            {tr('Delete')}
          </Button>
        )}
      </FlexForm>
    </FormProvider>
  );
}
