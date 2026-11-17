import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Input, SectionCard } from '@/ui';
import { ListEditor } from '@/components/list-editor';
import type { TaskFormValues } from '../task-form.lib';

/** Ordered checklist; on update the list replaces the server's one (ids keep existing lines). */
export function ChecklistSection() {
  const { control } = useFormContext<TaskFormValues>();
  return (
    <SectionCard title={tr('Checklist')} marker="optional">
      <Controller
        control={control}
        name="checklist"
        render={({ field }) => (
          <ListEditor
            items={field.value}
            onChange={field.onChange}
            addLabel={tr('Add item')}
            itemLabel={(i) => tr('Item {n}', { n: i + 1 })}
            makeNew={() => ({ title: '' })}
            renderItem={(line, set, id) => <Input id={id} placeholder={tr('Enter item')} value={line.title} onChange={(e) => set({ ...line, title: e.target.value })} />}
          />
        )}
      />
    </SectionCard>
  );
}
