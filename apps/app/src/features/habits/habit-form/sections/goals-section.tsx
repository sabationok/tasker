import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { FlexRow, Inset, Input, Segmented, SectionCard, Switch, Text } from '@/ui';
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
        <Inset key={w}>
          <FlexRow justify="between">
            <Text>{tr(GOAL_LABEL[w])}</Text>
            <Controller control={control} name={`goals.${w}.enabled`} render={({ field }) => <Switch label={tr(GOAL_LABEL[w])} checked={field.value} onChange={field.onChange} />} />
          </FlexRow>
          {goals[w].enabled && (
            <FlexRow gap="sm">
              <Input aria-label={tr('Target')} inputMode="decimal" width="narrow" {...register(`goals.${w}.value`)} />
              <Controller
                control={control}
                name={`goals.${w}.metric`}
                render={({ field }) => (
                  <Segmented
                    fill
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
        </Inset>
      ))}
    </SectionCard>
  );
}
