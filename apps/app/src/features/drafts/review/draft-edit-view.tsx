import { Controller } from 'react-hook-form';
import { tr } from '@/i18n';
import { Field, FlexBox, IconButton, Input, Select, SheetFooter, Surface, Switch, Text, Textarea, TopBar } from '@/ui';
import type { DraftFieldError } from '@/contracts/tasker';
import { ENUM_LABEL, errorField, fieldTitle, PRIORITY_LABEL, refText, toSnake, TOOL_LABEL } from '../draft.lib';
import type { DraftFormField } from '../draft-form.lib';
import type { DraftForm } from './use-draft-form';

const FORM_ID = 'draft-edit';

const optionLabel = (f: DraftFormField, o: string | number) =>
  toSnake(f.key) === 'priority' && typeof o === 'number' ? tr(PRIORITY_LABEL[o] ?? String(o)) : tr(ENUM_LABEL[String(o)] ?? String(o));

/**
 * «Змінити»: a plain form over the draft's DTO, one control per field by its schema kind. Saving re-runs the server's
 * validation; its field errors show under the fields.
 */
export function DraftEditView({ edit, errors, saving, onBack, onSubmit }: { edit: DraftForm; errors: DraftFieldError[]; saving: boolean; onBack: () => void; onSubmit: () => void }) {
  const { draft, fields, form } = edit;
  if (!draft) return null;
  const errorFor = (key: string) => errors.filter((e) => errorField(e) === key).map((e) => e.message).join(' ') || undefined;
  const general = errors.filter((e) => !fields.some((f) => f.key === errorField(e)));

  return (
    <FlexBox gap="md">
      <TopBar leading={<IconButton label={tr('Back')} icon="back" onClick={onBack} />} title={tr(TOOL_LABEL[draft.tool] ?? draft.tool)} />
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Surface>
          {general.map((e, i) => (
            <Text key={i} variant="label" tone="danger">
              {e.path ? `${e.path}: ${e.message}` : e.message}
            </Text>
          ))}
          {fields.map((f) => {
            const id = `${FORM_ID}-${f.key}`;
            const error = errorFor(f.key);
            const label = fieldTitle(draft.tool, f.key);
            return (
              <Field key={f.key} label={label} htmlFor={id} error={error}>
                {f.kind === 'ref' ? (
                  <Text>{refText(draft, toSnake(f.key)) ?? String(draft.dto[f.key] ?? '')}</Text>
                ) : f.kind === 'boolean' ? (
                  <Controller control={form.control} name={f.key} render={({ field }) => <Switch label={label} checked={field.value === true} onChange={field.onChange} />} />
                ) : f.kind === 'enum' ? (
                  <Select
                    id={id}
                    invalid={!!error}
                    options={[...(f.nullable ? [{ value: '', label: '—' }] : []), ...(f.options ?? []).map((o) => ({ value: String(o), label: optionLabel(f, o) }))]}
                    {...form.register(f.key)}
                  />
                ) : f.kind === 'text' || f.kind === 'array' || f.kind === 'object' ? (
                  <Textarea id={id} rows={f.kind === 'text' ? 3 : 5} {...form.register(f.key)} />
                ) : (
                  <Input
                    id={id}
                    invalid={!!error}
                    type={f.kind === 'date' ? 'date' : f.kind === 'datetime' ? 'datetime-local' : 'text'}
                    inputMode={f.kind === 'number' ? 'decimal' : undefined}
                    {...form.register(f.key)}
                  />
                )}
              </Field>
            );
          })}
        </Surface>
      </form>
      <SheetFooter
        actions={[
          { label: tr('Cancel'), variant: 'secondary', onClick: onBack },
          { label: tr('Save'), type: 'submit', form: FORM_ID, loading: saving },
        ]}
      />
    </FlexBox>
  );
}
