import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Field, FlexRow, Input, OptionList, SectionCard, Segmented } from '@/ui';
import { ListEditor } from '@/components/list-editor';
import { HABIT_EVALUATIONS, type TargetCondition } from '@/contracts/tasker';
import { CONDITION_LABEL, EVALUATION_DESCRIPTION, EVALUATION_LABEL } from '../../habit.constants';
import { isTimeEvaluation, type HabitFormValues } from '../habit-form.lib';

/** The five evaluation types and the fields each one needs. */
export function EvaluationSection() {
  const { control, register, watch } = useFormContext<HabitFormValues>();
  const ev = watch('evaluation');
  return (
    <SectionCard title={tr('Evaluation type')}>
      <Controller
        control={control}
        name="evaluation"
        render={({ field }) => (
          <OptionList
            label={tr('Evaluation type')}
            value={field.value}
            onChange={field.onChange}
            options={HABIT_EVALUATIONS.map((e) => ({ value: e, label: tr(EVALUATION_LABEL[e]), description: tr(EVALUATION_DESCRIPTION[e]) }))}
          />
        )}
      />
      {ev === 'numeric' && (
        <>
          <Controller
            control={control}
            name="targetCondition"
            render={({ field }) => (
              <Segmented<TargetCondition>
                value={field.value}
                onChange={field.onChange}
                options={(Object.keys(CONDITION_LABEL) as TargetCondition[]).map((c) => ({ value: c, label: tr(CONDITION_LABEL[c]) }))}
              />
            )}
          />
          <FlexRow gap="sm" align="start">
            <Field label={tr('Target')} htmlFor="habit-target">
              <Input id="habit-target" inputMode="decimal" {...register('target')} />
            </Field>
            <Field label={tr('Unit')} htmlFor="habit-unit">
              <Input id="habit-unit" {...register('unit')} />
            </Field>
          </FlexRow>
        </>
      )}
      {isTimeEvaluation(ev) && (
        <Field label={tr('Target (minutes)')} htmlFor="habit-target-min">
          <Input id="habit-target-min" inputMode="numeric" {...register('target')} />
        </Field>
      )}
      {ev === 'checklist' && (
        <>
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
          <Field label={tr('Items to mark the day done')} hint={tr('All items')} htmlFor="habit-cl-min">
            <Input id="habit-cl-min" inputMode="numeric" {...register('checklistMin')} />
          </Field>
        </>
      )}
    </SectionCard>
  );
}
