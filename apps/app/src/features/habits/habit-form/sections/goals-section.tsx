import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { FlexBox, FlexRow, Input, Segmented, SectionCard, Switch } from '@/ui';
import { GOAL_WINDOWS } from '@/contracts/tasker';
import { GOAL_LABEL } from '../../habit.constants';
import type { HabitFormValues } from '../habit-form.lib';

/** Extra goals per window: done days or a sum of values. */
export function GoalsSection() {
  const { control, register, watch } = useFormContext<HabitFormValues>();
  const goals = watch('goals');
  return (
    <SectionCard title={tr('Extra goals')} marker="optional">
      {GOAL_WINDOWS.map((w) => (
        <FlexBox key={w} gap="sm" className="rounded-xl border border-line px-3 py-2.5">
          <FlexRow justify="between">
            <span className="text-[15px]">{tr(GOAL_LABEL[w])}</span>
            <Controller control={control} name={`goals.${w}.enabled`} render={({ field }) => <Switch label={tr(GOAL_LABEL[w])} checked={field.value} onChange={field.onChange} />} />
          </FlexRow>
          {goals[w].enabled && (
            <FlexRow gap="sm">
              <Input aria-label={tr('Target')} inputMode="decimal" className="w-24" {...register(`goals.${w}.value`)} />
              <Controller
                control={control}
                name={`goals.${w}.metric`}
                render={({ field }) => (
                  <Segmented
                    className="flex-1"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'days', label: tr('days') },
                      { value: 'sum', label: tr('sum') },
                    ]}
                  />
                )}
              />
            </FlexRow>
          )}
        </FlexBox>
      ))}
    </SectionCard>
  );
}
