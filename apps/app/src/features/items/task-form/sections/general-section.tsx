import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { DateRow, Field, Input, NavRow, SectionCard, Select, Switch } from '@/ui';
import { useAgents } from '@/features/agents/agents.queries';
import { USER_ASSIGNEE, type ItemView } from '@/contracts/tasker';
import { ConnectorRow } from '@/features/agents/connector-mark';
import { PriorityRow } from '@/components/priority';
import { CategoryRow } from '@/features/categories/category-row';
import type { TaskFormValues } from '../task-form.lib';

/** Name, category, assignee (when there are agents), the hub connector (read-only), date (or start / end), priority. */
export function GeneralSection({ connector }: { connector?: Pick<ItemView, 'connector' | 'connectorTools'> }) {
  const { register, control, watch, formState } = useFormContext<TaskFormValues>();
  const agents = useAgents();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [periodic, hasEnd, date, startsOn, endsOn] = watch(['periodic', 'hasEnd', 'date', 'startsOn', 'endsOn']);

  return (
    <SectionCard title={tr('General information')} marker="required">
      <Field label={tr('Task name')} htmlFor="task-title" error={formState.errors.title?.message}>
        <Input id="task-title" placeholder={tr('Enter task name')} invalid={!!formState.errors.title} {...register('title', { validate: (v) => !!v.trim() || tr('Name is required') })} />
      </Field>
      <Controller control={control} name="categoryId" render={({ field }) => <CategoryRow value={field.value} onChange={field.onChange} />} />
      {agents.length > 0 && (
        <Field label={tr('Assignee')} htmlFor="task-assignee">
          <Select
            id="task-assignee"
            {...register('assignee')}
            options={[{ value: USER_ASSIGNEE, label: tr('Me') }, ...agents.map((a) => ({ value: a.slug, label: `${a.icon ?? ''} ${a.name}`.trim() }))]}
          />
        </Field>
      )}
      {connector && <ConnectorRow {...connector} />}
      {periodic ? (
        <>
          <DateRow label={tr('Start date')} shown={startsOn} {...register('startsOn')} />
          <Controller
            control={control}
            name="hasEnd"
            render={({ field }) => <NavRow label={tr('End date')} trailing={<Switch label={tr('Has end date')} checked={field.value} onChange={field.onChange} />} />}
          />
          {hasEnd && <DateRow label={tr('End date')} shown={endsOn} {...register('endsOn')} />}
        </>
      ) : (
        <DateRow label={tr('Date')} shown={date} {...register('date')} />
      )}
      <Controller control={control} name="priority" render={({ field }) => <PriorityRow value={field.value} onChange={field.onChange} open={priorityOpen} setOpen={setPriorityOpen} />} />
    </SectionCard>
  );
}
