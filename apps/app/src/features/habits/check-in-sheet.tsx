import { useEffect, useState } from 'react';
import { tr } from '@/i18n';
import { FlexBox, Field, Input, Sheet, Spinner, Textarea, ToggleRow, type SheetAction } from '@/ui';
import type { CheckInInput, HabitEvaluation, TodayEntry } from '@/contracts/tasker';
import { useCheckIn, useCheckins, useHabit } from './habits.queries';

/** What the value input means per evaluation; yes_no has no sheet (the row toggles it). */
const VALUE_INPUT: Partial<Record<HabitEvaluation, { label: string; toSeconds: boolean; additive: boolean }>> = {
  numeric: { label: 'Value', toSeconds: false, additive: false },
  timer: { label: 'Minutes', toSeconds: true, additive: false },
  stopwatch: { label: 'Add session (minutes)', toSeconds: true, additive: true },
};

/**
 * @ui CheckInSheet
 * @spec Check-in for a non yes/no habit on one day: value (numeric / timer / stopwatch) or ticked sub-items (checklist), note, skip / clear.
 * @keywords habit check-in, log value, timer, checklist habit
 */
export function CheckInSheet({ entry, onClose }: { entry: TodayEntry | null; onClose: () => void }) {
  const habitId = entry?.habitId;
  const { data: habit } = useHabit(habitId);
  const { data: checkins, isLoading } = useCheckins(habitId, entry?.date ?? '');
  const checkIn = useCheckIn();
  const current = checkins?.find((c) => c.slot === (entry?.slot ?? 0));
  const evaluation = entry?.habit?.evaluation ?? 'yes_no';
  const input = VALUE_INPUT[evaluation];

  const [value, setValue] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!entry) return;
    const v = entry.habit?.value;
    setValue(input && !input.additive && v !== null && v !== undefined ? String(input.toSeconds ? Math.round(v / 60) : v) : '');
    setTicked(current?.checklistDone ?? []);
    setNote(current?.note ?? '');
  }, [entry, current, input]);

  if (!entry) return null;
  const base: CheckInInput = { habitId: entry.habitId!, date: entry.date, slot: entry.slot };
  const run = async (patch: Partial<CheckInInput>) => {
    await checkIn.mutateAsync({ ...base, ...(habit?.notesEnabled && note ? { note } : {}), ...patch });
    onClose();
  };
  const save = () => {
    if (evaluation === 'checklist') return run({ checklistDone: ticked });
    const n = Number(value.replace(',', '.'));
    if (!value || Number.isNaN(n)) return;
    return run({ value: input?.toSeconds ? Math.round(n * 60) : n });
  };

  const actions: SheetAction[] = [
    { label: tr('Skip'), variant: 'secondary', onClick: () => run({ status: 'skipped' }), disabled: checkIn.isPending },
    { label: tr('Clear'), variant: 'secondary', onClick: () => run({ status: 'none' }), disabled: checkIn.isPending },
    { label: tr('Save'), onClick: save, loading: checkIn.isPending },
  ];

  return (
    <Sheet open onClose={onClose} title={entry.title} actions={actions}>
      {isLoading ? (
        <Spinner />
      ) : (
        <FlexBox gap="md">
          {input && (
            <Field label={tr(input.label)} hint={entry.habit?.target ? `${tr('Target')}: ${input.toSeconds ? Math.round(entry.habit.target / 60) : entry.habit.target}${entry.habit.unit ? ` ${entry.habit.unit}` : ''}` : undefined}>
              <Input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
          )}
          {evaluation === 'checklist' && (
            <FlexBox gap="xs">
              {(habit?.checklist ?? []).map((line) => {
                const on = ticked.includes(line.id);
                return <ToggleRow key={line.id} label={line.title} on={on} onToggle={() => setTicked((t) => (on ? t.filter((x) => x !== line.id) : [...t, line.id]))} />;
              })}
            </FlexBox>
          )}
          {habit?.notesEnabled && (
            <Field label={tr('Notes')}>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
        </FlexBox>
      )}
    </Sheet>
  );
}
